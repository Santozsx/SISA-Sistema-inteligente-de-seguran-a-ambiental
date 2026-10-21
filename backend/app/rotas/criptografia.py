"""
Laboratório de criptografia: demonstra e compara os algoritmos (objetivos
"analisar" e "comparar as várias técnicas de criptografia").

Rotas públicas, com tamanho de entrada limitado. A chave digitada vira uma
chave de 32 bytes via SHA-256, para todos os algoritmos usarem a mesma.
"""

import base64
import binascii
import hashlib
import math
import time
from collections import Counter

from fastapi import APIRouter, HTTPException, status

from ..cripto import ALGORITMOS, Algoritmo, ErroIntegridade
from ..schemas import (
    AlgoritmoSaida,
    CifrarEntrada,
    CifrarSaida,
    CompararEntrada,
    CompararSaida,
    DecifrarEntrada,
    DecifrarSaida,
    ResultadoAlgoritmo,
)

router = APIRouter(prefix="/cripto", tags=["Criptografia"])

_EXEMPLO = "Garimpo clandestino detectado no Rio Tapajós em -4.2711, -55.9946; 3 balsas. ".encode("utf-8")


def _algoritmo(algoritmo_id: str) -> Algoritmo:
    if algoritmo_id not in ALGORITMOS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Algoritmo desconhecido. Use: {', '.join(ALGORITMOS)}.")
    return ALGORITMOS[algoritmo_id]


def _chave(texto: str) -> bytes:
    return hashlib.sha256(texto.encode("utf-8")).digest()


def entropia(dados: bytes) -> float:
    """Entropia de Shannon em bits por byte: H = −Σ p·log2(p). Máximo 8 (bytes uniformes)."""
    if not dados:
        return 0.0
    total = len(dados)
    return -sum((n / total) * math.log2(n / total) for n in Counter(dados).values())


@router.get("/algoritmos", response_model=list[AlgoritmoSaida])
def algoritmos():
    return [AlgoritmoSaida(**{campo: getattr(a, campo) for campo in AlgoritmoSaida.model_fields}) for a in ALGORITMOS.values()]


@router.post("/cifrar", response_model=CifrarSaida)
def cifrar(dados: CifrarEntrada):
    alg = _algoritmo(dados.algoritmo)
    claro = dados.texto.encode("utf-8")
    pacote = alg.cifrar(claro, _chave(dados.chave))
    return CifrarSaida(
        algoritmo=alg.id,
        cifrado_base64=base64.b64encode(pacote).decode(),
        tamanho_original=len(claro),
        tamanho_cifrado=len(pacote),
    )


@router.post("/decifrar", response_model=DecifrarSaida)
def decifrar(dados: DecifrarEntrada):
    alg = _algoritmo(dados.algoritmo)
    try:
        pacote = base64.b64decode(dados.cifrado_base64, validate=True)
    except binascii.Error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "cifrado_base64 não é Base64 válido.")
    try:
        claro = alg.decifrar(pacote, _chave(dados.chave))
    except ErroIntegridade as erro:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(erro))
    return DecifrarSaida(algoritmo=alg.id, texto=claro.decode("utf-8", errors="replace"))


@router.post("/comparar", response_model=CompararSaida)
def comparar(dados: CompararEntrada):
    """Mede tempo, tamanho, entropia e propriedades de segurança de cada algoritmo sobre o mesmo dado."""
    if dados.texto:
        claro = dados.texto.encode("utf-8")
    else:
        claro = (_EXEMPLO * (dados.tamanho_bytes // len(_EXEMPLO) + 1))[:dados.tamanho_bytes]
    chave = _chave(dados.chave)

    resultados = []
    for alg in ALGORITMOS.values():
        inicio = time.perf_counter()
        for _ in range(dados.repeticoes):
            pacote = alg.cifrar(claro, chave)
        tempo_cifrar = (time.perf_counter() - inicio) / dados.repeticoes

        inicio = time.perf_counter()
        for _ in range(dados.repeticoes):
            recuperado = alg.decifrar(pacote, chave)
        tempo_decifrar = (time.perf_counter() - inicio) / dados.repeticoes

        # Adulteração: inverte um bit do último byte e tenta decifrar.
        adulterado = pacote[:-1] + bytes([pacote[-1] ^ 1]) if pacote else pacote
        try:
            alg.decifrar(adulterado, chave)
            detecta = False  # devolveu um texto errado sem perceber
        except ErroIntegridade:
            detecta = True

        resultados.append(ResultadoAlgoritmo(
            algoritmo=alg.id,
            nome=alg.nome,
            tempo_cifrar_ms=round(tempo_cifrar * 1000, 3),
            tempo_decifrar_ms=round(tempo_decifrar * 1000, 3),
            tamanho_cifrado=len(pacote),
            acrescimo_bytes=len(pacote) - len(claro),
            entropia_bits_por_byte=round(entropia(pacote), 3),
            ida_e_volta_ok=recuperado == claro,
            saida_muda_a_cada_cifragem=alg.cifrar(claro, chave) != pacote,
            detecta_adulteracao=detecta,
            segura_para_producao=alg.segura_para_producao,
        ))

    return CompararSaida(
        tamanho_original=len(claro),
        entropia_original=round(entropia(claro), 3),
        resultados=resultados,
    )
