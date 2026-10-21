"""
Cifragem dos dados sensíveis guardados e trocados pela plataforma.

Cada contexto (um chamado, uma conversa entre dois institutos, os anexos de um
chamado) usa uma chave própria, derivada da chave mestra:
    chave = HMAC-SHA256(CHAVE_MESTRA, contexto)
Assim, um dado copiado para outro registro não decifra.

O primeiro byte do pacote guarda qual algoritmo foi usado, para que dados
antigos continuem legíveis se SISA_CIFRA_PADRAO for trocada.
"""

import hashlib
import hmac
import json

from .. import config
from ..cripto import ALGORITMOS, ErroIntegridade

_ID_POR_ALGORITMO = {"sisa": 1, "aes-gcm": 2}
_ALGORITMO_POR_ID = {v: k for k, v in _ID_POR_ALGORITMO.items()}


def _chave(contexto: str) -> bytes:
    return hmac.new(config.CHAVE_MESTRA, contexto.encode("utf-8"), hashlib.sha256).digest()


def cifrar(dados: bytes, contexto: str, algoritmo: str | None = None) -> bytes:
    algoritmo = algoritmo or config.CIFRA_PADRAO
    pacote = ALGORITMOS[algoritmo].cifrar(dados, _chave(contexto))
    return bytes([_ID_POR_ALGORITMO[algoritmo]]) + pacote


def decifrar(pacote: bytes, contexto: str) -> bytes:
    algoritmo = _ALGORITMO_POR_ID.get(pacote[0]) if pacote else None
    if algoritmo is None:
        raise ErroIntegridade("Algoritmo do pacote desconhecido.")
    return ALGORITMOS[algoritmo].decifrar(pacote[1:], _chave(contexto))


def cifrar_json(obj: dict, contexto: str) -> bytes:
    return cifrar(json.dumps(obj, ensure_ascii=False).encode("utf-8"), contexto)


def decifrar_json(pacote: bytes, contexto: str) -> dict:
    return json.loads(decifrar(pacote, contexto))


def contexto_chamado(chamado_id: int) -> str:
    return f"chamado/{chamado_id}"


def contexto_anexo(chamado_id: int) -> str:
    return f"anexo/{chamado_id}"


def contexto_conversa(instituto_a: int, instituto_b: int) -> str:
    menor, maior = sorted((instituto_a, instituto_b))
    return f"conversa/{menor}-{maior}"
