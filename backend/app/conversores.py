"""Transforma os modelos do banco nos formatos de saída, decifrando o que for preciso."""

import base64

from . import config
from .dominio import CATEGORIAS, STATUS_CHAMADO, STATUS_INSTITUTO
from .models import Anexo, Chamado, Instituto, Mensagem
from .schemas import (
    AnexoSaida,
    ChamadoSaida,
    InstitutoResumo,
    InstitutoSaida,
    MensagemSaida,
    Notificacoes,
    PerfilSaida,
)
from .servicos import cifragem
from .util import iniciais


def instituto_resumo(inst: Instituto) -> InstitutoResumo:
    return InstitutoResumo(id=inst.id, nome=inst.nome, iniciais=iniciais(inst.nome))


def instituto_saida(inst: Instituto, distancia_km: float | None = None) -> InstitutoSaida:
    return InstitutoSaida(
        id=inst.id,
        nome=inst.nome,
        iniciais=iniciais(inst.nome),
        email=inst.email,
        tipo=inst.tipo,
        status=inst.status,
        status_label=STATUS_INSTITUTO[inst.status],
        verificado=inst.verificado,
        latitude=inst.latitude,
        longitude=inst.longitude,
        distancia_km=None if distancia_km is None else round(distancia_km, 1),
    )


def perfil_saida(inst: Instituto) -> PerfilSaida:
    return PerfilSaida(
        **instituto_saida(inst).model_dump(),
        notificacoes=Notificacoes(
            chamados=inst.notificar_chamados,
            mensagens=inst.notificar_mensagens,
            email=inst.resumo_email,
        ),
        criado_em=inst.criado_em,
    )


def anexo_saida(anexo: Anexo) -> AnexoSaida:
    return AnexoSaida(
        id=anexo.id,
        nome_arquivo=anexo.nome_arquivo,
        tipo_mime=anexo.tipo_mime,
        tamanho_bytes=anexo.tamanho_bytes,
        hash_sha256=anexo.hash_sha256,
        url=f"{config.PREFIXO_API}/chamados/{anexo.chamado_id}/anexos/{anexo.id}",
        criado_em=anexo.criado_em,
    )


def chamado_saida(chamado: Chamado) -> ChamadoSaida:
    dados = cifragem.decifrar_json(chamado.dados_cifrados, cifragem.contexto_chamado(chamado.id))
    return ChamadoSaida(
        id=chamado.id,
        categoria=chamado.categoria,
        categoria_label=CATEGORIAS[chamado.categoria],
        status=chamado.status,
        status_label=STATUS_CHAMADO[chamado.status],
        instituto=instituto_resumo(chamado.instituto),
        descricao=dados["descricao"],
        local=dados.get("local"),
        latitude=dados.get("latitude"),
        longitude=dados.get("longitude"),
        valor_numerico=dados.get("valor_numerico"),
        unidade=dados.get("unidade"),
        anexos=[anexo_saida(a) for a in chamado.anexos],
        criado_em=chamado.criado_em,
        atualizado_em=chamado.atualizado_em,
    )


def mensagem_saida(msg: Mensagem, eu_id: int, mostrar_cifrado: bool = False) -> MensagemSaida:
    contexto = cifragem.contexto_conversa(msg.remetente_id, msg.destinatario_id)
    return MensagemSaida(
        id=msg.id,
        remetente_id=msg.remetente_id,
        destinatario_id=msg.destinatario_id,
        enviada_por_mim=msg.remetente_id == eu_id,
        texto=cifragem.decifrar(msg.conteudo_cifrado, contexto).decode("utf-8"),
        lida=msg.lida,
        criado_em=msg.criado_em,
        cifrado_base64=base64.b64encode(msg.conteudo_cifrado).decode() if mostrar_cifrado else None,
    )
