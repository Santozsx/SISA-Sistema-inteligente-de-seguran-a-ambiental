"""Configurações do back end, lidas de variáveis de ambiente ou do arquivo backend/.env."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

logger = logging.getLogger("sisa")


def _bool(nome: str, padrao: bool) -> bool:
    return os.getenv(nome, str(padrao)).strip().lower() in {"1", "true", "sim", "yes"}


_JWT_PADRAO = "dev-troque-este-segredo-antes-de-publicar"
_CHAVE_PADRAO = "dev-troque-esta-chave-mestra"

PREFIXO_API = "/api/v1"
VERSAO_API = "1.0.0"

DATABASE_URL = os.getenv("SISA_DATABASE_URL", f"sqlite:///{(BASE_DIR / 'sisa.db').as_posix()}")

JWT_SEGREDO = os.getenv("SISA_JWT_SEGREDO", _JWT_PADRAO)
JWT_EXPIRACAO_MINUTOS = int(os.getenv("SISA_JWT_EXPIRACAO_MINUTOS", "120"))

# Chave mestra da qual saem as chaves de cada contexto (chamado, conversa, anexo).
CHAVE_MESTRA = os.getenv("SISA_CHAVE_MESTRA", _CHAVE_PADRAO).encode("utf-8")
# "sisa" (cifra da equipe) ou "aes-gcm".
CIFRA_PADRAO = os.getenv("SISA_CIFRA_PADRAO", "sisa")
# Anexos podem ser grandes; a SISA-Cifra em Python puro processa ~0,4 MB/s.
CIFRA_ANEXOS = os.getenv("SISA_CIFRA_ANEXOS", CIFRA_PADRAO)

PASTA_UPLOADS = Path(os.getenv("SISA_PASTA_UPLOADS", str(BASE_DIR / "uploads")))
TAMANHO_MAXIMO_ANEXO_MB = int(os.getenv("SISA_TAMANHO_MAXIMO_ANEXO_MB", "5"))

# Origens liberadas no CORS: front web (Vite) e, se usar Expo Web, o app mobile no navegador.
# Apps mobile nativos (Android/iOS) não passam por CORS.
CORS_ORIGENS = [
    origem.strip()
    for origem in os.getenv(
        "SISA_CORS_ORIGENS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081",
    ).split(",")
    if origem.strip()
]

# "Acesso exclusivo. Somente institutos verificados." — quando ativo, o login exige verificado=True.
EXIGIR_VERIFICACAO = _bool("SISA_EXIGIR_VERIFICACAO", False)

# Versão mínima do app mobile aceita; o app consulta /mobile/versao ao abrir.
VERSAO_MINIMA_APP = os.getenv("SISA_VERSAO_MINIMA_APP", "1.0.0")


def validar() -> None:
    from .cripto import ALGORITMOS

    for nome, valor in [("SISA_CIFRA_PADRAO", CIFRA_PADRAO), ("SISA_CIFRA_ANEXOS", CIFRA_ANEXOS)]:
        if valor not in ("sisa", "aes-gcm"):
            raise RuntimeError(f"{nome} deve ser 'sisa' ou 'aes-gcm' (recebido: {valor!r}).")
        assert valor in ALGORITMOS
    if JWT_SEGREDO == _JWT_PADRAO or CHAVE_MESTRA == _CHAVE_PADRAO.encode():
        logger.warning("Usando segredos de desenvolvimento. Defina SISA_JWT_SEGREDO e SISA_CHAVE_MESTRA no .env.")
