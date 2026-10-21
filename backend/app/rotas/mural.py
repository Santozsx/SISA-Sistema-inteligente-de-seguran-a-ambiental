from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..conversores import chamado_saida
from ..database import get_db
from ..models import Chamado, Instituto
from ..schemas import NoticiaSaida
from ..seguranca import instituto_atual

router = APIRouter(prefix="/mural", tags=["Mural"])

_TAG_POR_STATUS = {"aberto": "urgente", "em-analise": "em-analise", "resolvido": "resolvido"}


@router.get("", response_model=list[NoticiaSaida])
def mural(
    limite: int = Query(10, ge=1, le=50),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Mural de notícias da Home, montado a partir dos chamados mais recentes."""
    chamados = db.scalars(select(Chamado).order_by(Chamado.atualizado_em.desc()).limit(limite))
    noticias = []
    for c in chamados:
        dados = chamado_saida(c)
        titulo = dados.categoria_label + (f" — {dados.local}" if dados.local else "")
        resumo = dados.descricao if len(dados.descricao) <= 140 else dados.descricao[:137] + "..."
        noticias.append(NoticiaSaida(
            id=c.id,
            tag=_TAG_POR_STATUS[c.status],
            titulo=titulo,
            resumo=resumo,
            fonte=c.instituto.nome,
            criado_em=c.atualizado_em,
        ))
    return noticias
