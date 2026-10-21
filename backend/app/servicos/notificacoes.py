"""
Notificações push para o app mobile.

PONTO DE INTEGRAÇÃO MOBILE: hoje enviar_push só registra no log. Para enviar
de verdade, implemente-a com o serviço escolhido pelo app, por exemplo:
  - Firebase Cloud Messaging (pacote firebase-admin), ou
  - Expo Push (POST https://exp.host/--/api/v2/push/send), se o app usar Expo.
Os tokens chegam pela rota POST /api/v1/mobile/dispositivos.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..dominio import CATEGORIAS
from ..models import Chamado, DispositivoMobile, Instituto

logger = logging.getLogger("sisa.push")


def enviar_push(dispositivo: DispositivoMobile, titulo: str, corpo: str, dados: dict) -> None:
    # TODO(mobile): trocar o log pelo envio real (FCM / Expo).
    logger.info("push -> %s [%s] %s: %s %s", dispositivo.plataforma, dispositivo.token_push[:12], titulo, corpo, dados)


def notificar_novo_chamado(db: Session, chamado: Chamado) -> None:
    dispositivos = db.scalars(
        select(DispositivoMobile)
        .join(Instituto)
        .where(Instituto.notificar_chamados, Instituto.id != chamado.instituto_id)
    )
    for dispositivo in dispositivos:
        enviar_push(
            dispositivo,
            "Novo chamado",
            f"{CATEGORIAS[chamado.categoria]} — {chamado.instituto.nome}",
            {"tipo": "chamado", "chamado_id": chamado.id},
        )


def notificar_nova_mensagem(db: Session, remetente: Instituto, destinatario_id: int) -> None:
    # O conteúdo não vai no push: ele passaria em claro pelo serviço de notificação.
    dispositivos = db.scalars(
        select(DispositivoMobile)
        .join(Instituto)
        .where(Instituto.id == destinatario_id, Instituto.notificar_mensagens)
    )
    for dispositivo in dispositivos:
        enviar_push(
            dispositivo,
            "Nova mensagem",
            f"{remetente.nome} enviou uma mensagem cifrada",
            {"tipo": "mensagem", "remetente_id": remetente.id},
        )
