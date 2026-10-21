"""
SISA-Cifra — algoritmo de criptografia proposto pela equipe.

Ideia geral
-----------
Os dados são divididos em blocos de 32 bytes. Cada bloco passa por 4 rodadas,
e cada rodada aplica quatro operações reversíveis (todas em aritmética módulo 256):

1. Fluxo (confusão com a chave):   x = x XOR f
   f é um fluxo de bytes gerado por HMAC-SHA256(chave, nonce || bloco || rodada).

2. Substituição afim:              x = (a·x + b) mod 256
   'a' é sempre ímpar. Como mdc(a, 256) = 1, 'a' tem inverso multiplicativo
   módulo 256 (a⁻¹), e a operação inversa é x = a⁻¹·(y − b) mod 256.

3. Permutação:                      os bytes do bloco trocam de posição
   A ordem é sorteada pelo algoritmo de Fisher–Yates usando bytes derivados da
   chave. A inversa é recolocar cada byte na posição de origem.

4. Difusão encadeada:               y[j] = (x[j] + y[j−1]) mod 256
   Uma mudança em um byte se propaga para todos os seguintes do bloco.
   A inversa é x[j] = (y[j] − y[j−1]) mod 256.

Para decifrar, as rodadas são desfeitas na ordem contrária, com as operações
inversas.

Segurança do pacote
-------------------
- Um nonce aleatório de 16 bytes por mensagem: cifrar duas vezes o mesmo dado
  gera resultados diferentes.
- Encrypt-then-MAC: um HMAC-SHA256 cobre cabeçalho, nonce e texto cifrado.
  Qualquer alteração (ou chave errada) é detectada antes de decifrar.
- Subchaves independentes para fluxo, mistura e MAC, derivadas por HMAC.

Formato:  "SISA" | versão (1 byte) | nonce (16) | texto cifrado (n) | tag (32)

Aviso: é um algoritmo acadêmico, sem auditoria criptográfica. Por isso o
sistema permite trocar para AES-GCM (padrão de mercado) pela configuração
SISA_CIFRA_PADRAO.
"""

import hashlib
import hmac
import os
from itertools import accumulate

ASSINATURA = b"SISA"
VERSAO = 1
TAMANHO_CHAVE = 32
TAMANHO_NONCE = 16
TAMANHO_TAG = 32
TAMANHO_BLOCO = 32
RODADAS = 4

_CABECALHO = ASSINATURA + bytes([VERSAO])


class ErroIntegridade(ValueError):
    """O pacote foi adulterado, está corrompido ou a chave está errada."""


def derivar_chave_de_senha(senha: str, sal: bytes, iteracoes: int = 200_000) -> bytes:
    """Transforma uma senha digitada em uma chave de 32 bytes (PBKDF2-HMAC-SHA256)."""
    return hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, iteracoes, dklen=TAMANHO_CHAVE)


def _soma_mod_256(anterior: int, atual: int) -> int:
    return (anterior + atual) & 0xFF


class SisaCifra:
    def __init__(self, chave: bytes):
        if len(chave) != TAMANHO_CHAVE:
            raise ValueError(f"A chave deve ter {TAMANHO_CHAVE} bytes.")
        # Objetos HMAC já inicializados com cada subchave; .copy() evita refazer o preparo da chave.
        self._hmac_fluxo = hmac.new(self._subchave(chave, b"sisa/fluxo"), digestmod=hashlib.sha256)
        self._hmac_mistura = hmac.new(self._subchave(chave, b"sisa/mistura"), digestmod=hashlib.sha512)
        self._chave_mac = self._subchave(chave, b"sisa/mac")

    @staticmethod
    def _subchave(chave: bytes, rotulo: bytes) -> bytes:
        return hmac.new(chave, rotulo, hashlib.sha256).digest()

    # ------------------------------------------------------------------ API

    def cifrar(self, dados: bytes) -> bytes:
        nonce = os.urandom(TAMANHO_NONCE)
        corpo = bytearray()
        for indice, inicio in enumerate(range(0, len(dados), TAMANHO_BLOCO)):
            bloco = list(dados[inicio:inicio + TAMANHO_BLOCO])
            corpo.extend(self._cifrar_bloco(bloco, nonce, indice))
        autenticado = _CABECALHO + nonce + bytes(corpo)
        return autenticado + self._tag(autenticado)

    def decifrar(self, pacote: bytes) -> bytes:
        minimo = len(_CABECALHO) + TAMANHO_NONCE + TAMANHO_TAG
        if len(pacote) < minimo or not pacote.startswith(_CABECALHO):
            raise ErroIntegridade("Pacote SISA inválido.")

        fim_corpo = len(pacote) - TAMANHO_TAG
        autenticado, tag = pacote[:fim_corpo], pacote[fim_corpo:]
        if not hmac.compare_digest(tag, self._tag(autenticado)):
            raise ErroIntegridade("Dados adulterados ou chave incorreta.")

        nonce = autenticado[len(_CABECALHO):len(_CABECALHO) + TAMANHO_NONCE]
        corpo = autenticado[len(_CABECALHO) + TAMANHO_NONCE:]
        claro = bytearray()
        for indice, inicio in enumerate(range(0, len(corpo), TAMANHO_BLOCO)):
            bloco = list(corpo[inicio:inicio + TAMANHO_BLOCO])
            claro.extend(self._decifrar_bloco(bloco, nonce, indice))
        return bytes(claro)

    # ------------------------------------------------------------ internos

    def _tag(self, dados: bytes) -> bytes:
        return hmac.new(self._chave_mac, dados, hashlib.sha256).digest()

    def _parametros(self, nonce: bytes, indice: int, rodada: int, n: int):
        """Gera, para um bloco e uma rodada, o fluxo XOR, os coeficientes (a, b) e a permutação."""
        contador = nonce + indice.to_bytes(8, "big") + bytes([rodada])

        h = self._hmac_fluxo.copy()
        h.update(contador)
        fluxo = h.digest()[:n]

        h = self._hmac_mistura.copy()
        h.update(contador)
        mistura = h.digest()  # 64 bytes

        a = mistura[0] | 1  # força 'a' ímpar -> inversível módulo 256
        b = mistura[1]

        # Fisher–Yates: para j de n-1 até 1, troca a posição j com uma posição sorteada em [0, j].
        permutacao = list(range(n))
        for j in range(n - 1, 0, -1):
            k = mistura[2 + (n - 1 - j)] % (j + 1)
            permutacao[j], permutacao[k] = permutacao[k], permutacao[j]

        return fluxo, a, b, permutacao

    def _cifrar_bloco(self, x: list[int], nonce: bytes, indice: int) -> list[int]:
        n = len(x)
        for rodada in range(RODADAS):
            fluxo, a, b, permutacao = self._parametros(nonce, indice, rodada, n)
            x = [v ^ f for v, f in zip(x, fluxo)]                # 1. XOR com o fluxo
            x = [(a * v + b) & 0xFF for v in x]                  # 2. afim mod 256
            x = [x[p] for p in permutacao]                       # 3. permutação
            x = list(accumulate(x, _soma_mod_256))               # 4. difusão encadeada
        return x

    def _decifrar_bloco(self, y: list[int], nonce: bytes, indice: int) -> list[int]:
        n = len(y)
        for rodada in reversed(range(RODADAS)):
            fluxo, a, b, permutacao = self._parametros(nonce, indice, rodada, n)
            y = [y[0]] + [(y[j] - y[j - 1]) & 0xFF for j in range(1, n)]  # 4⁻¹
            original = [0] * n                                              # 3⁻¹
            for destino, origem in enumerate(permutacao):
                original[origem] = y[destino]
            a_inv = pow(a, -1, 256)                                         # 2⁻¹
            y = [(a_inv * (v - b)) & 0xFF for v in original]
            y = [v ^ f for v, f in zip(y, fluxo)]                           # 1⁻¹
        return y
