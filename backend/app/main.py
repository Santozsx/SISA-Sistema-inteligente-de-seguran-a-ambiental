import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .cripto import ErroIntegridade
from .database import Base, engine
from .rotas import auth, chamados, criptografia, institutos, mensagens, mobile, mural

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sisa")


@asynccontextmanager
async def ciclo_de_vida(_: FastAPI):
    config.validar()
    config.PASTA_UPLOADS.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title="SISA API",
    description="Sistema Inteligente de Segurança Ambiental — troca cifrada de dados ecológicos entre institutos.",
    version=config.VERSAO_API,
    lifespan=ciclo_de_vida,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGENS,
    allow_methods=["*"],
    allow_headers=["*"],
)

for modulo in (auth, institutos, chamados, mensagens, mural, criptografia, mobile):
    app.include_router(modulo.router, prefix=config.PREFIXO_API)


@app.exception_handler(ErroIntegridade)
def erro_integridade(_: Request, erro: ErroIntegridade):
    logger.error("Falha de integridade em dado armazenado: %s", erro)
    return JSONResponse(status_code=500, content={"detail": "Um dado armazenado falhou na verificação de integridade."})


@app.get(f"{config.PREFIXO_API}/saude", tags=["Sistema"])
def saude():
    return {"status": "ok", "versao": config.VERSAO_API, "cifra": config.CIFRA_PADRAO}
