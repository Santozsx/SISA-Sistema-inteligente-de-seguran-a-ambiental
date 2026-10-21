"""AES-256-GCM: cifra autenticada padrão de mercado, usada como referência e alternativa."""

import os

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .sisa_cifra import ErroIntegridade

TAMANHO_NONCE = 12


def aes_gcm_cifrar(dados: bytes, chave: bytes) -> bytes:
    nonce = os.urandom(TAMANHO_NONCE)
    return nonce + AESGCM(chave).encrypt(nonce, dados, None)


def aes_gcm_decifrar(pacote: bytes, chave: bytes) -> bytes:
    if len(pacote) < TAMANHO_NONCE + 16:
        raise ErroIntegridade("Pacote AES-GCM inválido.")
    try:
        return AESGCM(chave).decrypt(pacote[:TAMANHO_NONCE], pacote[TAMANHO_NONCE:], None)
    except InvalidTag as erro:
        raise ErroIntegridade("Dados adulterados ou chave incorreta.") from erro
