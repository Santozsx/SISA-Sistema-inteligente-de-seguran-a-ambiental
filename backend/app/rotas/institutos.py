from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..conversores import instituto_saida, perfil_saida
from ..database import get_db
from ..models import Instituto
from ..schemas import AtualizarPerfilEntrada, InstitutoSaida, PerfilSaida
from ..seguranca import gerar_hash_senha, instituto_atual, verificar_senha
from ..util import distancia_km

router = APIRouter(prefix="/institutos", tags=["Institutos"])


@router.get("", response_model=list[InstitutoSaida])
def listar(
    lat: float | None = Query(None, ge=-90, le=90, description="Ponto de referência (ex.: GPS do celular)"),
    lon: float | None = Query(None, ge=-180, le=180),
    raio_km: float | None = Query(None, gt=0),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Outros institutos, ordenados pela distância (telas Home e Institutos).

    Sem lat/lon, usa a localização cadastrada do próprio instituto.
    """
    if lat is None or lon is None:
        lat, lon = eu.latitude, eu.longitude

    consulta = select(Instituto).where(Instituto.id != eu.id, Instituto.status != "inativo")
    if config.EXIGIR_VERIFICACAO:
        consulta = consulta.where(Instituto.verificado)

    resultado = []
    for inst in db.scalars(consulta):
        distancia = None
        if None not in (lat, lon, inst.latitude, inst.longitude):
            distancia = distancia_km(lat, lon, inst.latitude, inst.longitude)
        if raio_km is not None and (distancia is None or distancia > raio_km):
            continue
        resultado.append(instituto_saida(inst, distancia))

    resultado.sort(key=lambda i: (i.distancia_km is None, i.distancia_km or 0, i.nome))
    return resultado


@router.get("/eu", response_model=PerfilSaida)
def meu_perfil(eu: Instituto = Depends(instituto_atual)):
    return perfil_saida(eu)


@router.patch("/eu", response_model=PerfilSaida)
def atualizar_perfil(dados: AtualizarPerfilEntrada, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Tela Configurações: conta, notificações e senha."""
    if dados.email is not None and dados.email.lower() != eu.email:
        if db.scalar(select(Instituto).where(Instituto.email == dados.email.lower())):
            raise HTTPException(status.HTTP_409_CONFLICT, "Já existe um instituto com este e-mail.")
        eu.email = dados.email.lower()

    for campo in ("nome", "tipo", "status", "latitude", "longitude"):
        valor = getattr(dados, campo)
        if valor is not None:
            setattr(eu, campo, valor.strip() if isinstance(valor, str) else valor)

    if dados.notificacoes:
        if dados.notificacoes.chamados is not None:
            eu.notificar_chamados = dados.notificacoes.chamados
        if dados.notificacoes.mensagens is not None:
            eu.notificar_mensagens = dados.notificacoes.mensagens
        if dados.notificacoes.email is not None:
            eu.resumo_email = dados.notificacoes.email

    if dados.nova_senha:
        if not dados.senha_atual or not verificar_senha(dados.senha_atual, eu.senha_hash):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Senha atual incorreta.")
        eu.senha_hash = gerar_hash_senha(dados.nova_senha)

    db.commit()
    return perfil_saida(eu)


@router.get("/{instituto_id}", response_model=InstitutoSaida)
def detalhar(instituto_id: int, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    inst = db.get(Instituto, instituto_id)
    if inst is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Instituto não encontrado.")
    distancia = None
    if None not in (eu.latitude, eu.longitude, inst.latitude, inst.longitude):
        distancia = distancia_km(eu.latitude, eu.longitude, inst.latitude, inst.longitude)
    return instituto_saida(inst, distancia)
