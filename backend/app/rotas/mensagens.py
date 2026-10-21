from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..conversores import instituto_resumo, mensagem_saida
from ..database import get_db
from ..models import Instituto, Mensagem
from ..schemas import ConversaSaida, MensagemEntrada, MensagemSaida
from ..seguranca import instituto_atual
from ..servicos import cifragem
from ..servicos.notificacoes import notificar_nova_mensagem

router = APIRouter(prefix="/mensagens", tags=["Mensagens"])


def _outro_instituto(db: Session, eu: Instituto, outro_id: int) -> Instituto:
    if outro_id == eu.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Não é possível conversar consigo mesmo.")
    outro = db.get(Instituto, outro_id)
    if outro is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Instituto não encontrado.")
    return outro


@router.get("/conversas", response_model=list[ConversaSaida])
def conversas(eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Lista lateral da tela Mensagens: uma entrada por instituto, a mais recente primeiro."""
    mensagens = db.scalars(
        select(Mensagem)
        .where(or_(Mensagem.remetente_id == eu.id, Mensagem.destinatario_id == eu.id))
        .order_by(Mensagem.criado_em.desc(), Mensagem.id.desc())
    )
    ultima: dict[int, Mensagem] = {}
    nao_lidas: dict[int, int] = {}
    for msg in mensagens:
        outro_id = msg.destinatario_id if msg.remetente_id == eu.id else msg.remetente_id
        ultima.setdefault(outro_id, msg)
        if msg.destinatario_id == eu.id and not msg.lida:
            nao_lidas[outro_id] = nao_lidas.get(outro_id, 0) + 1

    resultado = []
    for outro_id, msg in ultima.items():
        outro = db.get(Instituto, outro_id)
        resultado.append(ConversaSaida(
            instituto=instituto_resumo(outro),
            ultima_mensagem=mensagem_saida(msg, eu.id).texto,
            ultima_em=msg.criado_em,
            nao_lidas=nao_lidas.get(outro_id, 0),
        ))
    return resultado


@router.get("/{outro_id}", response_model=list[MensagemSaida])
def historico(
    outro_id: int,
    mostrar_cifrado: bool = Query(False, description="Inclui o conteúdo como está guardado no banco"),
    limite: int = Query(100, ge=1, le=500),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Conversa com outro instituto, em ordem cronológica. Marca as recebidas como lidas."""
    _outro_instituto(db, eu, outro_id)
    mensagens = list(db.scalars(
        select(Mensagem)
        .where(or_(
            (Mensagem.remetente_id == eu.id) & (Mensagem.destinatario_id == outro_id),
            (Mensagem.remetente_id == outro_id) & (Mensagem.destinatario_id == eu.id),
        ))
        .order_by(Mensagem.criado_em.desc(), Mensagem.id.desc())
        .limit(limite)
    ))
    mensagens.reverse()

    saida = [mensagem_saida(m, eu.id, mostrar_cifrado) for m in mensagens]
    for msg in mensagens:
        if msg.destinatario_id == eu.id and not msg.lida:
            msg.lida = True
    db.commit()
    return saida


@router.post("/{outro_id}", response_model=MensagemSaida, status_code=status.HTTP_201_CREATED)
def enviar(outro_id: int, dados: MensagemEntrada, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Envia uma mensagem; ela é cifrada com a chave da conversa antes de ir para o banco."""
    _outro_instituto(db, eu, outro_id)
    msg = Mensagem(
        remetente_id=eu.id,
        destinatario_id=outro_id,
        conteudo_cifrado=cifragem.cifrar(dados.texto.encode("utf-8"), cifragem.contexto_conversa(eu.id, outro_id)),
    )
    db.add(msg)
    db.commit()
    notificar_nova_mensagem(db, eu, outro_id)
    return mensagem_saida(msg, eu.id)
