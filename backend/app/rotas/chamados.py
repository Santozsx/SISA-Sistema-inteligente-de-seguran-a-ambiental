import hashlib
import uuid
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..conversores import anexo_saida, chamado_saida
from ..database import get_db
from ..dominio import CATEGORIAS, STATUS_CHAMADO, TIPOS_ANEXO_PERMITIDOS, CategoriaChamado, StatusChamado
from ..models import Anexo, Chamado, Instituto
from ..schemas import AnexoSaida, ChamadoEntrada, ChamadoSaida, OpcaoSaida, StatusEntrada
from ..seguranca import instituto_atual
from ..servicos import cifragem
from ..servicos.notificacoes import notificar_novo_chamado
from ..util import agora_utc

router = APIRouter(prefix="/chamados", tags=["Chamados"])


def _buscar(db: Session, chamado_id: int) -> Chamado:
    chamado = db.get(Chamado, chamado_id)
    if chamado is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chamado não encontrado.")
    return chamado


@router.get("/categorias", response_model=list[OpcaoSaida])
def categorias():
    """Opções para o campo Categoria da tela Registro."""
    return [OpcaoSaida(valor=v, label=l) for v, l in CATEGORIAS.items()]


@router.get("/status", response_model=list[OpcaoSaida])
def opcoes_status():
    return [OpcaoSaida(valor=v, label=l) for v, l in STATUS_CHAMADO.items()]


@router.post("", response_model=ChamadoSaida, status_code=status.HTTP_201_CREATED)
def criar(dados: ChamadoEntrada, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Novo registro de ocorrência. Descrição, local e valores são guardados cifrados."""
    chamado = Chamado(instituto_id=eu.id, categoria=dados.categoria, dados_cifrados=b"")
    db.add(chamado)
    db.flush()  # gera o id, que entra na chave do contexto
    sensiveis = dados.model_dump(exclude={"categoria"})
    chamado.dados_cifrados = cifragem.cifrar_json(sensiveis, cifragem.contexto_chamado(chamado.id))
    db.commit()
    notificar_novo_chamado(db, chamado)
    return chamado_saida(chamado)


@router.get("", response_model=list[ChamadoSaida])
def listar(
    status_filtro: StatusChamado | None = Query(None, alias="status"),
    categoria: CategoriaChamado | None = None,
    meus: bool = Query(False, description="Somente os chamados abertos pelo meu instituto"),
    limite: int = Query(50, ge=1, le=200),
    deslocamento: int = Query(0, ge=0),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Tela Chamados. Filtros: ?status=aberto|em-analise|resolvido, ?categoria=..., ?meus=true."""
    consulta = select(Chamado).order_by(Chamado.criado_em.desc(), Chamado.id.desc())
    if status_filtro:
        consulta = consulta.where(Chamado.status == status_filtro)
    if categoria:
        consulta = consulta.where(Chamado.categoria == categoria)
    if meus:
        consulta = consulta.where(Chamado.instituto_id == eu.id)
    chamados = db.scalars(consulta.limit(limite).offset(deslocamento))
    return [chamado_saida(c) for c in chamados]


@router.get("/{chamado_id}", response_model=ChamadoSaida)
def detalhar(chamado_id: int, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    return chamado_saida(_buscar(db, chamado_id))


@router.patch("/{chamado_id}/status", response_model=ChamadoSaida)
def atualizar_status(
    chamado_id: int, dados: StatusEntrada, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)
):
    """Qualquer instituto pode colocar um chamado em análise ou resolvê-lo (atuação conjunta)."""
    chamado = _buscar(db, chamado_id)
    chamado.status = dados.status
    chamado.atualizado_em = agora_utc()
    db.commit()
    return chamado_saida(chamado)


@router.post("/{chamado_id}/anexos", response_model=AnexoSaida, status_code=status.HTTP_201_CREATED)
def enviar_anexo(
    chamado_id: int,
    arquivo: UploadFile = File(..., description="Imagem (jpg/png/webp), PDF, CSV, JSON ou TXT"),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Evidência do chamado (ex.: foto de desmatamento ou garimpo). Fica cifrada no disco."""
    chamado = _buscar(db, chamado_id)
    if chamado.instituto_id != eu.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só o instituto que abriu o chamado pode anexar arquivos.")

    tipo = (arquivo.content_type or "").split(";")[0].strip().lower()
    if tipo not in TIPOS_ANEXO_PERMITIDOS:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Tipo de arquivo não permitido: {tipo or 'desconhecido'}.")

    limite = config.TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024
    conteudo = arquivo.file.read(limite + 1)
    if len(conteudo) > limite:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Arquivo maior que {config.TAMANHO_MAXIMO_ANEXO_MB} MB.")
    if not conteudo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Arquivo vazio.")

    nome_disco = f"{uuid.uuid4().hex}.sisa"
    cifrado = cifragem.cifrar(conteudo, cifragem.contexto_anexo(chamado.id), config.CIFRA_ANEXOS)
    (config.PASTA_UPLOADS / nome_disco).write_bytes(cifrado)

    anexo = Anexo(
        chamado_id=chamado.id,
        nome_arquivo=Path(arquivo.filename or "anexo").name[:255],
        tipo_mime=tipo,
        tamanho_bytes=len(conteudo),
        hash_sha256=hashlib.sha256(conteudo).hexdigest(),
        arquivo=nome_disco,
    )
    db.add(anexo)
    chamado.atualizado_em = agora_utc()
    db.commit()
    return anexo_saida(anexo)


@router.get("/{chamado_id}/anexos/{anexo_id}", response_class=Response)
def baixar_anexo(chamado_id: int, anexo_id: int, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Decifra o anexo e confere o SHA-256 antes de entregar."""
    anexo = db.get(Anexo, anexo_id)
    if anexo is None or anexo.chamado_id != chamado_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anexo não encontrado.")

    caminho = config.PASTA_UPLOADS / anexo.arquivo
    if not caminho.is_file():
        raise HTTPException(status.HTTP_410_GONE, "Arquivo do anexo não está mais disponível.")
    conteudo = cifragem.decifrar(caminho.read_bytes(), cifragem.contexto_anexo(chamado_id))
    if hashlib.sha256(conteudo).hexdigest() != anexo.hash_sha256:
        raise cifragem.ErroIntegridade("Hash do anexo não confere.")

    return Response(
        content=conteudo,
        media_type=anexo.tipo_mime,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(anexo.nome_arquivo)}"},
    )
