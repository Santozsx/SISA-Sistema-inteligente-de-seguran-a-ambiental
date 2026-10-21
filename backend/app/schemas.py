"""Formatos de entrada e saída da API (validados pelo Pydantic)."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from .dominio import CategoriaChamado, PlataformaMobile, StatusChamado, StatusInstituto

Latitude = Field(None, ge=-90, le=90)
Longitude = Field(None, ge=-180, le=180)


# ---------------------------------------------------------------- institutos

class CadastroEntrada(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    tipo: str = Field(min_length=2, max_length=80, description="Área de atuação")
    senha: str = Field(min_length=8, max_length=128)
    latitude: float | None = Latitude
    longitude: float | None = Longitude


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str = Field(max_length=128)


class InstitutoResumo(BaseModel):
    id: int
    nome: str
    iniciais: str


class InstitutoSaida(InstitutoResumo):
    email: str
    tipo: str
    status: StatusInstituto
    status_label: str
    verificado: bool
    latitude: float | None
    longitude: float | None
    distancia_km: float | None = None


class Notificacoes(BaseModel):
    chamados: bool
    mensagens: bool
    email: bool


class PerfilSaida(InstitutoSaida):
    notificacoes: Notificacoes
    criado_em: datetime


class NotificacoesEntrada(BaseModel):
    chamados: bool | None = None
    mensagens: bool | None = None
    email: bool | None = None


class AtualizarPerfilEntrada(BaseModel):
    nome: str | None = Field(None, min_length=2, max_length=120)
    email: EmailStr | None = None
    tipo: str | None = Field(None, min_length=2, max_length=80)
    status: StatusInstituto | None = None
    latitude: float | None = Latitude
    longitude: float | None = Longitude
    notificacoes: NotificacoesEntrada | None = None
    senha_atual: str | None = Field(None, max_length=128, description="Obrigatória para trocar a senha")
    nova_senha: str | None = Field(None, min_length=8, max_length=128)


class TokenSaida(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expira_em_segundos: int
    instituto: PerfilSaida


# ----------------------------------------------------------------- chamados

class ChamadoEntrada(BaseModel):
    categoria: CategoriaChamado
    descricao: str = Field(min_length=3, max_length=5000)
    local: str | None = Field(None, max_length=255, description="Texto livre, ex.: '-23.55, -46.63' ou 'Rio Tapajós'")
    latitude: float | None = Latitude
    longitude: float | None = Longitude
    valor_numerico: float | None = Field(None, description="Ex.: índice de poluição ou nº de animais apreendidos")
    unidade: str | None = Field(None, max_length=40, description="Ex.: 'IQA', 'animais', 'hectares'")


class StatusEntrada(BaseModel):
    status: StatusChamado


class AnexoSaida(BaseModel):
    id: int
    nome_arquivo: str
    tipo_mime: str
    tamanho_bytes: int
    hash_sha256: str
    url: str
    criado_em: datetime


class ChamadoSaida(BaseModel):
    id: int
    categoria: CategoriaChamado
    categoria_label: str
    status: StatusChamado
    status_label: str
    instituto: InstitutoResumo
    descricao: str
    local: str | None
    latitude: float | None
    longitude: float | None
    valor_numerico: float | None
    unidade: str | None
    anexos: list[AnexoSaida]
    criado_em: datetime
    atualizado_em: datetime


class OpcaoSaida(BaseModel):
    valor: str
    label: str


# ---------------------------------------------------------------- mensagens

class MensagemEntrada(BaseModel):
    texto: str = Field(min_length=1, max_length=4000)


class MensagemSaida(BaseModel):
    id: int
    remetente_id: int
    destinatario_id: int
    enviada_por_mim: bool
    texto: str
    lida: bool
    criado_em: datetime
    cifrado_base64: str | None = Field(None, description="Como a mensagem está guardada (só com ?mostrar_cifrado=true)")


class ConversaSaida(BaseModel):
    instituto: InstitutoResumo
    ultima_mensagem: str | None
    ultima_em: datetime | None
    nao_lidas: int


# -------------------------------------------------------------------- mural

class NoticiaSaida(BaseModel):
    id: int
    tag: str
    titulo: str
    resumo: str
    fonte: str
    criado_em: datetime


# ------------------------------------------------------------- criptografia

class AlgoritmoSaida(BaseModel):
    id: str
    nome: str
    tipo: str
    descricao: str
    autenticada: bool
    segura_para_producao: bool


class CifrarEntrada(BaseModel):
    algoritmo: str = "sisa"
    texto: str = Field(max_length=100_000)
    chave: str = Field(min_length=1, max_length=256)


class CifrarSaida(BaseModel):
    algoritmo: str
    cifrado_base64: str
    tamanho_original: int
    tamanho_cifrado: int


class DecifrarEntrada(BaseModel):
    algoritmo: str = "sisa"
    cifrado_base64: str = Field(max_length=200_000)
    chave: str = Field(min_length=1, max_length=256)


class DecifrarSaida(BaseModel):
    algoritmo: str
    texto: str


class CompararEntrada(BaseModel):
    texto: str | None = Field(None, max_length=65_536, description="Se vazio, usa um relato de exemplo repetido")
    tamanho_bytes: int = Field(4096, ge=16, le=65_536)
    chave: str = Field("chave-de-teste", min_length=1, max_length=256)
    repeticoes: int = Field(3, ge=1, le=20)


class ResultadoAlgoritmo(BaseModel):
    algoritmo: str
    nome: str
    tempo_cifrar_ms: float
    tempo_decifrar_ms: float
    tamanho_cifrado: int
    acrescimo_bytes: int
    entropia_bits_por_byte: float
    ida_e_volta_ok: bool
    saida_muda_a_cada_cifragem: bool
    detecta_adulteracao: bool
    segura_para_producao: bool


class CompararSaida(BaseModel):
    tamanho_original: int
    entropia_original: float
    resultados: list[ResultadoAlgoritmo]


# ------------------------------------------------------------------- mobile

class DispositivoEntrada(BaseModel):
    token_push: str = Field(min_length=10, max_length=512)
    plataforma: PlataformaMobile


class VersaoSaida(BaseModel):
    versao_api: str
    versao_minima_app: str


class SincronizacaoSaida(BaseModel):
    servidor_agora: datetime
    chamados: list[ChamadoSaida]
    mensagens: list[MensagemSaida]
