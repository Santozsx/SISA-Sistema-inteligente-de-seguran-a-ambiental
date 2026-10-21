"""
Rotas pensadas para o app mobile.

O app usa as mesmas rotas do site (login, chamados, mensagens...) com o token
Bearer. Aqui ficam só as necessidades específicas do celular:
  - checar se a versão do app ainda é aceita;
  - registrar o aparelho para notificações push;
  - sincronização incremental (buscar só o que mudou desde a última vez,
    para funcionar com internet ruim em campo).
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import config
from ..conversores import chamado_saida, mensagem_saida
from ..database import get_db
from ..models import Chamado, DispositivoMobile, Instituto, Mensagem
from ..schemas import DispositivoEntrada, SincronizacaoSaida, VersaoSaida
from ..seguranca import instituto_atual
from ..util import agora_utc, para_utc

router = APIRouter(prefix="/mobile", tags=["Mobile"])


@router.get("/versao", response_model=VersaoSaida)
def versao():
    """Pública. Se a versão do app for menor que versao_minima_app, o app deve pedir atualização."""
    return VersaoSaida(versao_api=config.VERSAO_API, versao_minima_app=config.VERSAO_MINIMA_APP)


@router.post("/dispositivos", status_code=status.HTTP_204_NO_CONTENT)
def registrar_dispositivo(dados: DispositivoEntrada, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Chamar após o login, com o token de push do aparelho (FCM ou Expo)."""
    dispositivo = db.scalar(select(DispositivoMobile).where(DispositivoMobile.token_push == dados.token_push))
    if dispositivo is None:
        dispositivo = DispositivoMobile(token_push=dados.token_push)
        db.add(dispositivo)
    dispositivo.instituto_id = eu.id
    dispositivo.plataforma = dados.plataforma
    dispositivo.ultimo_acesso = agora_utc()
    db.commit()


@router.delete("/dispositivos/{token_push}", status_code=status.HTTP_204_NO_CONTENT)
def remover_dispositivo(token_push: str, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Chamar no logout, para o aparelho parar de receber notificações."""
    dispositivo = db.scalar(select(DispositivoMobile).where(DispositivoMobile.token_push == token_push))
    if dispositivo is None or dispositivo.instituto_id != eu.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dispositivo não encontrado.")
    db.delete(dispositivo)
    db.commit()


@router.get("/sincronizar", response_model=SincronizacaoSaida)
def sincronizar(
    desde: datetime | None = Query(None, description="Valor de servidor_agora da sincronização anterior (UTC)"),
    limite: int = Query(200, ge=1, le=500),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Chamados alterados e mensagens recebidas/enviadas desde a última sincronização."""
    servidor_agora = agora_utc()

    consulta_chamados = select(Chamado).order_by(Chamado.atualizado_em.desc()).limit(limite)
    consulta_mensagens = (
        select(Mensagem)
        .where(or_(Mensagem.remetente_id == eu.id, Mensagem.destinatario_id == eu.id))
        .order_by(Mensagem.criado_em.desc())
        .limit(limite)
    )
    if desde is not None:
        desde = para_utc(desde)
        consulta_chamados = consulta_chamados.where(Chamado.atualizado_em > desde)
        consulta_mensagens = consulta_mensagens.where(Mensagem.criado_em > desde)

    return SincronizacaoSaida(
        servidor_agora=servidor_agora,
        chamados=[chamado_saida(c) for c in db.scalars(consulta_chamados)],
        mensagens=[mensagem_saida(m, eu.id) for m in db.scalars(consulta_mensagens)],
    )
