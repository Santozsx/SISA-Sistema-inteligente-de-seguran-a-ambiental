from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..conversores import perfil_saida
from ..database import get_db
from ..models import Instituto
from ..schemas import CadastroEntrada, LoginEntrada, PerfilSaida, TokenSaida
from ..seguranca import HASH_FICTICIO, criar_token, gerar_hash_senha, instituto_atual, verificar_senha

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def _token_saida(instituto: Instituto) -> TokenSaida:
    token, segundos = criar_token(instituto.id)
    return TokenSaida(access_token=token, expira_em_segundos=segundos, instituto=perfil_saida(instituto))


@router.post("/cadastro", response_model=PerfilSaida, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroEntrada, db: Session = Depends(get_db)):
    """Cadastro de instituto / local de fiscalização (tela Cadastro)."""
    email = dados.email.lower()
    if db.scalar(select(Instituto).where(Instituto.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um instituto com este e-mail.")

    instituto = Instituto(
        nome=dados.nome.strip(),
        email=email,
        tipo=dados.tipo.strip(),
        senha_hash=gerar_hash_senha(dados.senha),
        # TODO: com SISA_EXIGIR_VERIFICACAO=true, um administrador precisa marcar verificado=True.
        verificado=not config.EXIGIR_VERIFICACAO,
        latitude=dados.latitude,
        longitude=dados.longitude,
    )
    db.add(instituto)
    db.commit()
    return perfil_saida(instituto)


@router.post("/login", response_model=TokenSaida)
def login(dados: LoginEntrada, db: Session = Depends(get_db)):
    """Login com e-mail institucional e senha (tela Login). Devolve o token Bearer."""
    instituto = db.scalar(select(Instituto).where(Instituto.email == dados.email.lower()))
    senha_ok = verificar_senha(dados.senha, instituto.senha_hash if instituto else HASH_FICTICIO)
    if instituto is None or not senha_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    if config.EXIGIR_VERIFICACAO and not instituto.verificado:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Instituto ainda não verificado.")
    return _token_saida(instituto)


@router.post("/renovar", response_model=TokenSaida)
def renovar(eu: Instituto = Depends(instituto_atual)):
    """Troca um token ainda válido por um novo (útil para o app mobile manter a sessão)."""
    return _token_saida(eu)
