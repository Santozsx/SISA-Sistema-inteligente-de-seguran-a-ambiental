"""
Registro dos algoritmos de criptografia do SISA.

Todos seguem a mesma interface: cifrar(dados, chave) -> bytes e
decifrar(pacote, chave) -> bytes, com chave de 32 bytes. Isso permite
compará-los lado a lado (rota /cripto/comparar) e trocar a cifra usada
pela plataforma sem mudar o resto do código.
"""

from dataclasses import dataclass
from typing import Callable

from . import classicas
from .aes import aes_gcm_cifrar, aes_gcm_decifrar
from .sisa_cifra import ErroIntegridade, SisaCifra


@dataclass(frozen=True)
class Algoritmo:
    id: str
    nome: str
    tipo: str
    descricao: str
    autenticada: bool
    segura_para_producao: bool
    cifrar: Callable[[bytes, bytes], bytes]
    decifrar: Callable[[bytes, bytes], bytes]


ALGORITMOS: dict[str, Algoritmo] = {
    a.id: a
    for a in [
        Algoritmo(
            id="cesar",
            nome="Cifra de César",
            tipo="clássica (substituição monoalfabética)",
            descricao="Soma o mesmo deslocamento a todos os bytes. Só existem 256 chaves possíveis.",
            autenticada=False,
            segura_para_producao=False,
            cifrar=classicas.cesar_cifrar,
            decifrar=classicas.cesar_decifrar,
        ),
        Algoritmo(
            id="vigenere",
            nome="Cifra de Vigenère",
            tipo="clássica (substituição polialfabética)",
            descricao="Deslocamento varia conforme a posição, repetindo a chave. Vulnerável a análise de frequência.",
            autenticada=False,
            segura_para_producao=False,
            cifrar=classicas.vigenere_cifrar,
            decifrar=classicas.vigenere_decifrar,
        ),
        Algoritmo(
            id="xor",
            nome="XOR com chave repetida",
            tipo="clássica (fluxo)",
            descricao="XOR de cada byte com a chave repetida. Sem nonce: mesma entrada gera a mesma saída.",
            autenticada=False,
            segura_para_producao=False,
            cifrar=classicas.xor_cifrar,
            decifrar=classicas.xor_decifrar,
        ),
        Algoritmo(
            id="sisa",
            nome="SISA-Cifra (proposta da equipe)",
            tipo="moderna experimental (rede de substituição-permutação + HMAC)",
            descricao=(
                "4 rodadas por bloco de 32 bytes: XOR com fluxo HMAC, substituição afim mod 256, "
                "permutação Fisher–Yates e difusão encadeada. Nonce aleatório e autenticação HMAC-SHA256."
            ),
            autenticada=True,
            segura_para_producao=False,
            cifrar=lambda dados, chave: SisaCifra(chave).cifrar(dados),
            decifrar=lambda pacote, chave: SisaCifra(chave).decifrar(pacote),
        ),
        Algoritmo(
            id="aes-gcm",
            nome="AES-256-GCM",
            tipo="moderna padronizada (cifra de bloco em modo autenticado)",
            descricao="Padrão do NIST, usado em HTTPS. Referência de segurança e desempenho.",
            autenticada=True,
            segura_para_producao=True,
            cifrar=aes_gcm_cifrar,
            decifrar=aes_gcm_decifrar,
        ),
    ]
}

__all__ = ["ALGORITMOS", "Algoritmo", "ErroIntegridade"]
