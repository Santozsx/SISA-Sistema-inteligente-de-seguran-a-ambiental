import os
import tempfile
from pathlib import Path

import pytest

# Banco e uploads temporários; precisa vir antes de importar o app.
_pasta = Path(tempfile.mkdtemp(prefix="sisa-testes-"))
os.environ["SISA_DATABASE_URL"] = f"sqlite:///{(_pasta / 'teste.db').as_posix()}"
os.environ["SISA_PASTA_UPLOADS"] = str(_pasta / "uploads")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def cliente():
    with TestClient(app) as c:
        yield c


def cadastrar_e_logar(cliente, email: str, nome: str = "Instituto Teste", **extra) -> dict:
    dados = {"nome": nome, "email": email, "tipo": "Fiscalização florestal", "senha": "senha-forte-1", **extra}
    assert cliente.post("/api/v1/auth/cadastro", json=dados).status_code == 201
    resposta = cliente.post("/api/v1/auth/login", json={"email": email, "senha": "senha-forte-1"})
    assert resposta.status_code == 200
    return {"Authorization": f"Bearer {resposta.json()['access_token']}"}
