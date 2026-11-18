"""Senhas (PBKDF2) e autenticação por token JWT no cabeçalho Authorization: Bearer <token>.

O token Bearer funciona igual no navegador e no app mobile (não depende de cookies).
"""

import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .models import Instituto

ITERACOES_SENHA = 310_000
_ALGORITMO_JWT = "HS256"


def gerar_hash_senha(senha: str) -> str:
    sal = os.urandom(16)
    derivada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, ITERACOES_SENHA)
    return "$".join([
        "pbkdf2_sha256",
        str(ITERACOES_SENHA),
        base64.b64encode(sal).decode(),
        base64.b64encode(derivada).decode(),
    ])


def verificar_senha(senha: str, armazenado: str) -> bool:
    try:
        _, iteracoes, sal, esperado = armazenado.split("$")
        derivada = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), base64.b64decode(sal), int(iteracoes))
        return hmac.compare_digest(derivada, base64.b64decode(esperado))
    except ValueError:
        return False


# Usado quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos.
HASH_FICTICIO = gerar_hash_senha("senha-ficticia")


def criar_token(instituto_id: int) -> tuple[str, int]:
    segundos = config.JWT_EXPIRACAO_MINUTOS * 60
    agora = datetime.now(timezone.utc)
    carga = {"sub": str(instituto_id), "iat": agora, "exp": agora + timedelta(seconds=segundos)}
    return jwt.encode(carga, config.JWT_SEGREDO, algorithm=_ALGORITMO_JWT), segundos


_esquema_bearer = HTTPBearer(auto_error=False)


def _nao_autorizado(detalhe: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detalhe, headers={"WWW-Authenticate": "Bearer"})


def instituto_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(_esquema_bearer),
    db: Session = Depends(get_db),
) -> Instituto:
    if credenciais is None:
        raise _nao_autorizado("Faça login para continuar.")
    try:
        carga = jwt.decode(credenciais.credentials, config.JWT_SEGREDO, algorithms=[_ALGORITMO_JWT])
        instituto_id = int(carga["sub"])
    except jwt.ExpiredSignatureError:
        raise _nao_autorizado("Sessão expirada. Faça login novamente.")
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise _nao_autorizado("Token inválido.")
    if "escopo" in carga:
        # Token do Cofre não serve como login.
        raise _nao_autorizado("Token inválido.")

    instituto = db.get(Instituto, instituto_id)
    if instituto is None:
        raise _nao_autorizado("Instituto não encontrado.")
    if config.EXIGIR_VERIFICACAO and not instituto.verificado:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Instituto ainda não verificado.")
    return instituto


# ------------------------------------------------------------------ cofre
# Ver uma foto do Cofre exige confirmar a senha. A confirmação gera um token curto,
# com escopo "cofre", enviado no cabeçalho X-Token-Cofre. Ele não substitui o login
# (instituto_atual o recusa) e o token de login não abre o Cofre.

ESCOPO_COFRE = "cofre"


def criar_token_cofre(instituto_id: int) -> tuple[str, int]:
    segundos = config.COFRE_DESBLOQUEIO_SEGUNDOS
    agora = datetime.now(timezone.utc)
    carga = {"sub": str(instituto_id), "escopo": ESCOPO_COFRE, "iat": agora, "exp": agora + timedelta(seconds=segundos)}
    return jwt.encode(carga, config.JWT_SEGREDO, algorithm=_ALGORITMO_JWT), segundos


def validar_token_cofre(token: str | None, instituto_id: int) -> None:
    """Usa 403 (não 401) para o front não confundir com sessão expirada."""
    if not token:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Confirme sua senha para abrir o cofre.")
    try:
        carga = jwt.decode(token, config.JWT_SEGREDO, algorithms=[_ALGORITMO_JWT])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "O cofre foi bloqueado novamente. Confirme sua senha.")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Token do cofre inválido.")
    if carga.get("escopo") != ESCOPO_COFRE or carga.get("sub") != str(instituto_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Token do cofre inválido.")
