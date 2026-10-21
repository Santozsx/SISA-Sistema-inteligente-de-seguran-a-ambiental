from sqlalchemy import select

from app.database import SessionLocal
from app.models import Chamado, Mensagem

from .conftest import cadastrar_e_logar

API = "/api/v1"


def test_login_invalido_e_rota_protegida(cliente):
    assert cliente.post(f"{API}/auth/login", json={"email": "nao@existe.org", "senha": "x"}).status_code == 401
    assert cliente.get(f"{API}/chamados").status_code == 401


def test_cadastro_duplicado(cliente):
    cadastrar_e_logar(cliente, "dup@teste.org")
    dados = {"nome": "Outro", "email": "DUP@teste.org", "tipo": "Pesquisa", "senha": "senha-forte-1"}
    assert cliente.post(f"{API}/auth/cadastro", json=dados).status_code == 409


def test_chamado_fica_cifrado_no_banco(cliente):
    cab = cadastrar_e_logar(cliente, "biomas@teste.org", "Instituto Biomas")
    dados = {"categoria": "garimpo-clandestino", "descricao": "Balsas no rio", "local": "Rio Tapajós", "valor_numerico": 3}
    criado = cliente.post(f"{API}/chamados", json=dados, headers=cab).json()
    assert criado["descricao"] == "Balsas no rio"
    assert criado["status"] == "aberto"

    with SessionLocal() as db:
        bruto = db.get(Chamado, criado["id"]).dados_cifrados
    assert b"Balsas" not in bruto and b"Tapaj" not in bruto

    alterado = cliente.patch(f"{API}/chamados/{criado['id']}/status", json={"status": "resolvido"}, headers=cab).json()
    assert alterado["status_label"] == "resolvido"
    assert [c["id"] for c in cliente.get(f"{API}/chamados?status=resolvido", headers=cab).json()] == [criado["id"]]
    assert cliente.get(f"{API}/mural", headers=cab).json()[0]["tag"] == "resolvido"


def test_anexo_cifrado_e_recuperado(cliente):
    cab = cadastrar_e_logar(cliente, "anexo@teste.org")
    chamado = cliente.post(f"{API}/chamados", json={"categoria": "derrubada-arvores", "descricao": "Corte raso"}, headers=cab).json()
    imagem = b"\x89PNG\r\n\x1a\n" + b"pixels" * 100
    anexo = cliente.post(
        f"{API}/chamados/{chamado['id']}/anexos",
        files={"arquivo": ("foto.png", imagem, "image/png")},
        headers=cab,
    ).json()
    baixado = cliente.get(anexo["url"], headers=cab)
    assert baixado.status_code == 200 and baixado.content == imagem

    recusado = cliente.post(
        f"{API}/chamados/{chamado['id']}/anexos", files={"arquivo": ("x.exe", b"MZ", "application/x-msdownload")}, headers=cab
    )
    assert recusado.status_code == 415


def test_mensagens_cifradas_entre_institutos(cliente):
    cab_a = cadastrar_e_logar(cliente, "a@teste.org", "Guarda Ambiental")
    cab_b = cadastrar_e_logar(cliente, "b@teste.org", "Fiscalização Amazônia")
    id_b = cliente.get(f"{API}/institutos/eu", headers=cab_b).json()["id"]

    enviada = cliente.post(f"{API}/mensagens/{id_b}", json={"texto": "Coordenadas: -3.46, -62.21"}, headers=cab_a).json()
    with SessionLocal() as db:
        assert b"-62.21" not in db.scalar(select(Mensagem).where(Mensagem.id == enviada["id"])).conteudo_cifrado

    conversas = cliente.get(f"{API}/mensagens/conversas", headers=cab_b).json()
    assert conversas[0]["nao_lidas"] == 1
    assert conversas[0]["ultima_mensagem"] == "Coordenadas: -3.46, -62.21"

    id_a = conversas[0]["instituto"]["id"]
    historico = cliente.get(f"{API}/mensagens/{id_a}?mostrar_cifrado=true", headers=cab_b).json()
    assert historico[0]["cifrado_base64"]
    assert cliente.get(f"{API}/mensagens/conversas", headers=cab_b).json()[0]["nao_lidas"] == 0


def test_institutos_ordenados_por_distancia(cliente):
    cab = cadastrar_e_logar(cliente, "centro@teste.org", latitude=-23.55, longitude=-46.63)
    cadastrar_e_logar(cliente, "perto@teste.org", "Perto", latitude=-23.56, longitude=-46.64)
    cadastrar_e_logar(cliente, "longe@teste.org", "Longe", latitude=-3.10, longitude=-60.02)
    lista = cliente.get(f"{API}/institutos?raio_km=30", headers=cab).json()
    assert [i["nome"] for i in lista] == ["Perto"]


def test_comparacao_de_algoritmos(cliente):
    resultado = cliente.post(f"{API}/cripto/comparar", json={"tamanho_bytes": 1024, "repeticoes": 1}).json()
    por_id = {r["algoritmo"]: r for r in resultado["resultados"]}
    assert all(r["ida_e_volta_ok"] for r in por_id.values())
    assert por_id["sisa"]["detecta_adulteracao"] and por_id["aes-gcm"]["detecta_adulteracao"]
    assert not por_id["cesar"]["detecta_adulteracao"]
    assert por_id["sisa"]["entropia_bits_por_byte"] > por_id["cesar"]["entropia_bits_por_byte"]


def test_rotas_mobile(cliente):
    assert cliente.get(f"{API}/mobile/versao").json()["versao_api"]
    cab = cadastrar_e_logar(cliente, "mobile@teste.org")
    token = "ExponentPushToken[abc123xyz]"
    assert cliente.post(f"{API}/mobile/dispositivos", json={"token_push": token, "plataforma": "android"}, headers=cab).status_code == 204

    primeira = cliente.get(f"{API}/mobile/sincronizar", headers=cab).json()
    cliente.post(f"{API}/chamados", json={"categoria": "outro", "descricao": "Nova ocorrência"}, headers=cab)
    delta = cliente.get(f"{API}/mobile/sincronizar", params={"desde": primeira["servidor_agora"]}, headers=cab).json()
    assert [c["descricao"] for c in delta["chamados"]] == ["Nova ocorrência"]

    assert cliente.delete(f"{API}/mobile/dispositivos/{token}", headers=cab).status_code == 204
