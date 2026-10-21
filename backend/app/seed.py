"""
Popula o banco com os institutos e dados de exemplo usados nas telas do front.

Uso (dentro da pasta backend):  python -m app.seed
Todos os institutos de exemplo usam a senha: sisa12345
"""

from sqlalchemy import select

from .database import Base, SessionLocal, engine
from .models import Chamado, Instituto, Mensagem
from .seguranca import gerar_hash_senha
from .servicos import cifragem

SENHA_EXEMPLO = "sisa12345"

INSTITUTOS = [
    ("Instituto Biomas", "contato@biomas.org", "Fiscalização florestal", "ativo", -23.5505, -46.6333),
    ("Guarda Ambiental", "contato@guardaambiental.org", "Resgate de fauna", "ativo", -23.6100, -46.6950),
    ("Fiscalização Amazônia", "contato@fiscalizacaoamazonia.org", "Monitoramento hídrico", "em-rota", -23.7300, -46.5600),
]

CHAMADOS = [
    (0, "derrubada-arvores", "aberto", {"descricao": "Área de aproximadamente 2 ha com corte raso recente.", "local": "-23.55, -46.63", "latitude": -23.55, "longitude": -46.63, "valor_numerico": 2, "unidade": "hectares"}),
    (2, "poluicao-hidrica", "em-analise", {"descricao": "Mancha escura no rio próxima a ponto de descarte.", "local": "Rio Pinheiros", "latitude": None, "longitude": None, "valor_numerico": 38, "unidade": "IQA"}),
    (0, "garimpo-clandestino", "aberto", {"descricao": "Balsas de garimpo identificadas por imagem de satélite.", "local": "Pará", "latitude": None, "longitude": None, "valor_numerico": 3, "unidade": "balsas"}),
    (1, "animais-apreendidos", "resolvido", {"descricao": "Aves silvestres apreendidas em feira e encaminhadas ao CETAS.", "local": "São Paulo", "latitude": None, "longitude": None, "valor_numerico": 14, "unidade": "animais"}),
]

MENSAGENS = [
    (1, 0, "Equipe a caminho da área do chamado 1."),
    (0, 1, "Recebido. Enviamos as coordenadas atualizadas."),
]


def popular() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(Instituto).limit(1)):
            print("Banco já possui dados; nada foi alterado.")
            return

        hash_senha = gerar_hash_senha(SENHA_EXEMPLO)
        institutos = [
            Instituto(nome=n, email=e, tipo=t, status=s, latitude=lat, longitude=lon, senha_hash=hash_senha, verificado=True)
            for n, e, t, s, lat, lon in INSTITUTOS
        ]
        db.add_all(institutos)
        db.flush()

        for indice, categoria, status, dados in CHAMADOS:
            chamado = Chamado(instituto_id=institutos[indice].id, categoria=categoria, status=status, dados_cifrados=b"")
            db.add(chamado)
            db.flush()
            chamado.dados_cifrados = cifragem.cifrar_json(dados, cifragem.contexto_chamado(chamado.id))

        for de, para, texto in MENSAGENS:
            a, b = institutos[de].id, institutos[para].id
            db.add(Mensagem(
                remetente_id=a,
                destinatario_id=b,
                conteudo_cifrado=cifragem.cifrar(texto.encode("utf-8"), cifragem.contexto_conversa(a, b)),
            ))

        db.commit()
        print(f"Criados {len(INSTITUTOS)} institutos (senha: {SENHA_EXEMPLO}), {len(CHAMADOS)} chamados e {len(MENSAGENS)} mensagens.")


if __name__ == "__main__":
    popular()
