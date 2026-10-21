from datetime import datetime

from sqlalchemy import ForeignKey, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .util import agora_utc


class Instituto(Base):
    __tablename__ = "institutos"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    tipo: Mapped[str] = mapped_column(String(80))  # área de atuação
    senha_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="ativo")
    verificado: Mapped[bool] = mapped_column(default=False)
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    notificar_chamados: Mapped[bool] = mapped_column(default=True)
    notificar_mensagens: Mapped[bool] = mapped_column(default=True)
    resumo_email: Mapped[bool] = mapped_column(default=False)
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc)

    dispositivos: Mapped[list["DispositivoMobile"]] = relationship(
        back_populates="instituto", cascade="all, delete-orphan"
    )


class Chamado(Base):
    """Ocorrência ambiental. Descrição, local e valores medidos ficam cifrados em dados_cifrados."""

    __tablename__ = "chamados"

    id: Mapped[int] = mapped_column(primary_key=True)
    instituto_id: Mapped[int] = mapped_column(ForeignKey("institutos.id"), index=True)
    categoria: Mapped[str] = mapped_column(String(40), index=True)
    status: Mapped[str] = mapped_column(String(20), default="aberto", index=True)
    dados_cifrados: Mapped[bytes] = mapped_column(LargeBinary)
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc)
    atualizado_em: Mapped[datetime] = mapped_column(default=agora_utc, onupdate=agora_utc, index=True)

    instituto: Mapped[Instituto] = relationship()
    anexos: Mapped[list["Anexo"]] = relationship(back_populates="chamado", cascade="all, delete-orphan")


class Anexo(Base):
    """Imagem ou arquivo de evidência. O conteúdo fica cifrado no disco (PASTA_UPLOADS/arquivo)."""

    __tablename__ = "anexos"

    id: Mapped[int] = mapped_column(primary_key=True)
    chamado_id: Mapped[int] = mapped_column(ForeignKey("chamados.id"), index=True)
    nome_arquivo: Mapped[str] = mapped_column(String(255))
    tipo_mime: Mapped[str] = mapped_column(String(100))
    tamanho_bytes: Mapped[int]
    hash_sha256: Mapped[str] = mapped_column(String(64))  # do arquivo original, para conferir integridade
    arquivo: Mapped[str] = mapped_column(String(64))
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc)

    chamado: Mapped[Chamado] = relationship(back_populates="anexos")


class Mensagem(Base):
    __tablename__ = "mensagens"

    id: Mapped[int] = mapped_column(primary_key=True)
    remetente_id: Mapped[int] = mapped_column(ForeignKey("institutos.id"), index=True)
    destinatario_id: Mapped[int] = mapped_column(ForeignKey("institutos.id"), index=True)
    conteudo_cifrado: Mapped[bytes] = mapped_column(LargeBinary)
    lida: Mapped[bool] = mapped_column(default=False)
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc, index=True)


class DispositivoMobile(Base):
    """Aparelho do app mobile registrado para receber notificações push."""

    __tablename__ = "dispositivos_mobile"

    id: Mapped[int] = mapped_column(primary_key=True)
    instituto_id: Mapped[int] = mapped_column(ForeignKey("institutos.id"), index=True)
    token_push: Mapped[str] = mapped_column(String(512), unique=True)
    plataforma: Mapped[str] = mapped_column(String(20))
    criado_em: Mapped[datetime] = mapped_column(default=agora_utc)
    ultimo_acesso: Mapped[datetime] = mapped_column(default=agora_utc)

    instituto: Mapped[Instituto] = relationship(back_populates="dispositivos")
