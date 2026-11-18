import base64

from app import config
from app.database import SessionLocal
from app.models import ItemCofre

from .conftest import cadastrar_e_logar

API = "/api/v1"
IMAGEM = b"\x89PNG\r\n\x1a\n" + b"pixels de garimpo " * 200


def _enviar(cliente, cab, destinatario_id=None, legenda="Balsas no Rio Tapajós"):
    dados = {"legenda": legenda}
    if destinatario_id is not None:
        dados["destinatario_id"] = str(destinatario_id)
    return cliente.post(f"{API}/cofre", data=dados, files={"arquivo": ("balsas.png", IMAGEM, "image/png")}, headers=cab)


def _desbloquear(cliente, cab, senha="senha-forte-1"):
    return cliente.post(f"{API}/cofre/desbloquear", json={"senha": senha}, headers=cab)


def test_foto_fica_cifrada_e_so_abre_com_senha(cliente):
    cab_a = cadastrar_e_logar(cliente, "cofre-a@teste.org", "Guarda Cofre")
    cab_b = cadastrar_e_logar(cliente, "cofre-b@teste.org", "Fiscal Cofre")
    cab_c = cadastrar_e_logar(cliente, "cofre-c@teste.org", "Intruso")
    id_b = cliente.get(f"{API}/institutos/eu", headers=cab_b).json()["id"]

    resposta = _enviar(cliente, cab_a, id_b)
    assert resposta.status_code == 201
    item = resposta.json()
    assert item["entropia_cifrado"] > item["entropia_original"]
    assert item["tamanho_cifrado"] > item["tamanho_bytes"]

    # Nada legível no disco nem no banco.
    with SessionLocal() as db:
        guardado = db.get(ItemCofre, item["id"])
        assert b"Tapaj" not in guardado.metadados_cifrados and b"balsas" not in guardado.metadados_cifrados
        bruto = (config.PASTA_UPLOADS / guardado.arquivo).read_bytes()
    assert b"pixels" not in bruto and b"PNG" not in bruto
    assert cliente.get(f"{API}/cofre/{item['id']}/cifrado", headers=cab_b).content == bruto

    recebido = cliente.get(f"{API}/cofre?caixa=recebidos", headers=cab_b).json()
    assert [i["id"] for i in recebido] == [item["id"]] and not recebido[0]["visualizado"]

    # Sem confirmar a senha, não abre; senha errada é 403 (não derruba a sessão).
    url = f"{API}/cofre/{item['id']}/conteudo"
    assert cliente.get(url, headers=cab_b).status_code == 403
    assert _desbloquear(cliente, cab_b, "errada").status_code == 403

    token_b = _desbloquear(cliente, cab_b).json()["token_cofre"]
    aberto = cliente.get(url, headers={**cab_b, "X-Token-Cofre": token_b})
    assert aberto.status_code == 200 and aberto.headers["cache-control"] == "no-store"
    conteudo = aberto.json()
    assert conteudo["legenda"] == "Balsas no Rio Tapajós" and conteudo["nome_arquivo"] == "balsas.png"
    assert base64.b64decode(conteudo["imagem_base64"]) == IMAGEM
    assert cliente.get(f"{API}/cofre?caixa=recebidos", headers=cab_b).json()[0]["visualizado"]

    # Outro instituto não vê o item, nem com o próprio token do cofre.
    token_c = _desbloquear(cliente, cab_c).json()["token_cofre"]
    assert cliente.get(url, headers={**cab_c, "X-Token-Cofre": token_c}).status_code == 404
    assert cliente.get(f"{API}/cofre/{item['id']}/cifrado", headers=cab_c).status_code == 404
    # Token do cofre de B não serve para A, nem como token de login.
    assert cliente.get(url, headers={**cab_a, "X-Token-Cofre": token_b}).status_code == 403
    assert cliente.get(f"{API}/cofre", headers={"Authorization": f"Bearer {token_b}"}).status_code == 401
    # Token de login não serve como token do cofre.
    assert cliente.get(url, headers={**cab_b, "X-Token-Cofre": cab_b["Authorization"][7:]}).status_code == 403

    # Só quem enviou exclui; o arquivo some do disco.
    assert cliente.delete(f"{API}/cofre/{item['id']}", headers=cab_b).status_code == 403
    assert cliente.delete(f"{API}/cofre/{item['id']}", headers=cab_a).status_code == 204
    assert cliente.get(f"{API}/cofre", headers=cab_a).json() == []


def test_cofre_pessoal_e_tipos_recusados(cliente):
    cab = cadastrar_e_logar(cliente, "cofre-eu@teste.org")
    item = _enviar(cliente, cab, legenda="").json()
    assert item["remetente"]["id"] == item["destinatario"]["id"]
    token = _desbloquear(cliente, cab).json()["token_cofre"]
    conteudo = cliente.get(f"{API}/cofre/{item['id']}/conteudo", headers={**cab, "X-Token-Cofre": token}).json()
    assert conteudo["legenda"] is None

    recusado = cliente.post(f"{API}/cofre", files={"arquivo": ("x.pdf", b"%PDF", "application/pdf")}, headers=cab)
    assert recusado.status_code == 415
    assert _enviar(cliente, cab, 999_999).status_code == 404
