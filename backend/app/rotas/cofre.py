"""
Cofre: envio de fotos cifradas entre institutos (ou para si mesmo).

- A imagem é cifrada no servidor com uma chave própria do item (contexto "cofre/<id>")
  e gravada no disco; nome do arquivo e legenda vão cifrados no banco.
- Os participantes podem ver como o item está guardado (bytes cifrados, entropia).
- Ver a foto exige confirmar a senha (POST /cofre/desbloquear), que devolve um token
  curto enviado no cabeçalho X-Token-Cofre. As respostas não são guardadas em cache.
"""

import base64
import hashlib
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import config
from ..conversores import instituto_resumo
from ..cripto import ALGORITMOS
from ..database import get_db
from ..models import Instituto, ItemCofre
from ..schemas import ConteudoCofreSaida, DesbloquearCofreEntrada, DesbloqueioCofreSaida, ItemCofreSaida
from ..seguranca import criar_token_cofre, instituto_atual, validar_token_cofre, verificar_senha
from ..servicos import cifragem
from ..util import agora_utc
from .criptografia import entropia

router = APIRouter(prefix="/cofre", tags=["Cofre"])

TIPOS_IMAGEM = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_SEM_CACHE = {"Cache-Control": "no-store", "Pragma": "no-cache"}
_TAMANHO_AMOSTRA = 48


def _caminho(item: ItemCofre) -> Path:
    return config.PASTA_UPLOADS / item.arquivo


def _buscar(db: Session, item_id: int, eu: Instituto) -> ItemCofre:
    item = db.get(ItemCofre, item_id)
    # Mesmo 404 para "não existe" e "não é seu", para não revelar quais ids existem.
    if item is None or eu.id not in (item.remetente_id, item.destinatario_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item não encontrado no cofre.")
    return item


def _ler_cifrado(item: ItemCofre) -> bytes:
    caminho = _caminho(item)
    if not caminho.is_file():
        raise HTTPException(status.HTTP_410_GONE, "O arquivo cifrado não está mais disponível.")
    return caminho.read_bytes()


def _amostra(item: ItemCofre) -> bytes:
    try:
        with _caminho(item).open("rb") as arquivo:
            return arquivo.read(_TAMANHO_AMOSTRA)
    except OSError:
        return b""


def _saida(item: ItemCofre, eu_id: int, amostra: bytes) -> ItemCofreSaida:
    return ItemCofreSaida(
        id=item.id,
        remetente=instituto_resumo(item.remetente),
        destinatario=instituto_resumo(item.destinatario),
        enviado_por_mim=item.remetente_id == eu_id,
        tipo_mime=item.tipo_mime,
        algoritmo=item.algoritmo,
        algoritmo_nome=ALGORITMOS[item.algoritmo].nome,
        tamanho_bytes=item.tamanho_bytes,
        tamanho_cifrado=item.tamanho_cifrado,
        entropia_original=item.entropia_original,
        entropia_cifrado=item.entropia_cifrado,
        hash_sha256=item.hash_sha256,
        amostra_hex=amostra[:_TAMANHO_AMOSTRA].hex(" "),
        visualizado=item.visualizado_em is not None,
        criado_em=item.criado_em,
    )


@router.post("", response_model=ItemCofreSaida, status_code=status.HTTP_201_CREATED)
def enviar(
    arquivo: UploadFile = File(..., description="Foto (jpg, png, webp ou gif)"),
    destinatario_id: int | None = Form(None, description="Instituto que vai receber; vazio = só para mim"),
    legenda: str | None = Form(None, max_length=1000),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Cifra a foto e a legenda e guarda no cofre."""
    destinatario = eu if destinatario_id in (None, eu.id) else db.get(Instituto, destinatario_id)
    if destinatario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Instituto destinatário não encontrado.")

    tipo = (arquivo.content_type or "").split(";")[0].strip().lower()
    if tipo not in TIPOS_IMAGEM:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Envie uma imagem (jpg, png, webp ou gif).")

    limite = config.TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024
    conteudo = arquivo.file.read(limite + 1)
    if len(conteudo) > limite:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"Imagem maior que {config.TAMANHO_MAXIMO_ANEXO_MB} MB.")
    if not conteudo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Arquivo vazio.")

    item = ItemCofre(
        remetente_id=eu.id,
        destinatario_id=destinatario.id,
        metadados_cifrados=b"",
        tipo_mime=tipo,
        tamanho_bytes=len(conteudo),
        tamanho_cifrado=0,
        algoritmo=config.CIFRA_ANEXOS,
        entropia_original=round(entropia(conteudo), 3),
        entropia_cifrado=0.0,
        hash_sha256=hashlib.sha256(conteudo).hexdigest(),
        arquivo=f"{uuid.uuid4().hex}.sisa",
    )
    db.add(item)
    db.flush()  # gera o id, que entra na chave do contexto

    contexto = cifragem.contexto_cofre(item.id)
    cifrado = cifragem.cifrar(conteudo, contexto, config.CIFRA_ANEXOS)
    item.tamanho_cifrado = len(cifrado)
    item.entropia_cifrado = round(entropia(cifrado), 3)
    item.metadados_cifrados = cifragem.cifrar_json(
        {"nome_arquivo": Path(arquivo.filename or "foto").name[:255], "legenda": (legenda or "").strip() or None},
        contexto,
    )
    _caminho(item).write_bytes(cifrado)
    try:
        db.commit()
    except Exception:
        _caminho(item).unlink(missing_ok=True)
        raise
    return _saida(item, eu.id, cifrado)


@router.get("", response_model=list[ItemCofreSaida])
def listar(
    caixa: str = Query("todos", pattern="^(todos|recebidos|enviados)$"),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Itens que enviei ou recebi, o mais recente primeiro. Não inclui o conteúdo."""
    consulta = select(ItemCofre).order_by(ItemCofre.criado_em.desc(), ItemCofre.id.desc())
    if caixa == "recebidos":
        consulta = consulta.where(ItemCofre.destinatario_id == eu.id)
    elif caixa == "enviados":
        consulta = consulta.where(ItemCofre.remetente_id == eu.id)
    else:
        consulta = consulta.where(or_(ItemCofre.remetente_id == eu.id, ItemCofre.destinatario_id == eu.id))
    return [_saida(item, eu.id, _amostra(item)) for item in db.scalars(consulta.limit(200))]


@router.post("/desbloquear", response_model=DesbloqueioCofreSaida)
def desbloquear(dados: DesbloquearCofreEntrada, eu: Instituto = Depends(instituto_atual)):
    """Confirma a senha e libera a visualização por alguns minutos."""
    if not verificar_senha(dados.senha, eu.senha_hash):
        # 403 e não 401: o front trata 401 como sessão expirada e faria logout.
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Senha incorreta.")
    token, segundos = criar_token_cofre(eu.id)
    return DesbloqueioCofreSaida(token_cofre=token, expira_em_segundos=segundos)


@router.get("/{item_id}/cifrado", response_class=Response)
def baixar_cifrado(
    item_id: int,
    limite_bytes: int | None = Query(None, ge=1, description="Devolve só o começo (para desenhar a prévia)"),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """O arquivo exatamente como está guardado no disco (ilegível sem a chave)."""
    cifrado = _ler_cifrado(_buscar(db, item_id, eu))
    if limite_bytes:
        cifrado = cifrado[:limite_bytes]
    return Response(content=cifrado, media_type="application/octet-stream", headers=_SEM_CACHE)


@router.get("/{item_id}/conteudo", response_model=ConteudoCofreSaida)
def revelar(
    item_id: int,
    response: Response,
    x_token_cofre: str | None = Header(None),
    eu: Instituto = Depends(instituto_atual),
    db: Session = Depends(get_db),
):
    """Decifra a foto e a legenda e confere o SHA-256. Exige o cabeçalho X-Token-Cofre."""
    validar_token_cofre(x_token_cofre, eu.id)
    item = _buscar(db, item_id, eu)
    contexto = cifragem.contexto_cofre(item.id)
    imagem = cifragem.decifrar(_ler_cifrado(item), contexto)
    if hashlib.sha256(imagem).hexdigest() != item.hash_sha256:
        raise cifragem.ErroIntegridade("Hash da imagem do cofre não confere.")
    metadados = cifragem.decifrar_json(item.metadados_cifrados, contexto)

    if item.destinatario_id == eu.id and item.visualizado_em is None:
        item.visualizado_em = agora_utc()
        db.commit()

    response.headers.update(_SEM_CACHE)
    return ConteudoCofreSaida(
        id=item.id,
        nome_arquivo=metadados["nome_arquivo"],
        legenda=metadados.get("legenda"),
        tipo_mime=item.tipo_mime,
        imagem_base64=base64.b64encode(imagem).decode(),
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir(item_id: int, eu: Instituto = Depends(instituto_atual), db: Session = Depends(get_db)):
    """Só quem enviou pode excluir. Apaga o arquivo cifrado do disco."""
    item = _buscar(db, item_id, eu)
    if item.remetente_id != eu.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Só quem enviou pode excluir.")
    _caminho(item).unlink(missing_ok=True)
    db.delete(item)
    db.commit()
