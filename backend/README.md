# SISA — Back end

API em Python (FastAPI + SQLite) do Sistema Inteligente de Segurança Ambiental.
Ela atende o site (React) e o futuro app mobile, e cuida da troca **cifrada** de dados
ecológicos sensíveis entre institutos de preservação.

## Como rodar

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env            # e troque os segredos
python -m app.seed                # opcional: institutos de exemplo (senha: sisa12345)
uvicorn app.main:app --reload
```

- Documentação interativa (testar as rotas): http://localhost:8000/docs
- Com `npm run dev` rodando, o front acessa a API por `/api/...` (proxy no `vite.config.ts`).
- Testes: `pip install -r requirements-dev.txt` e `pytest`.

## Como o projeto atende ao plano de ensino

| Objetivo | Onde está |
|---|---|
| Cadastro e autenticação de locais de fiscalização | `rotas/auth.py`, `rotas/institutos.py`, `seguranca.py` (senha com PBKDF2, login com token JWT) |
| Troca de informação com dados criptografados | `servicos/cifragem.py`: chamados, mensagens e anexos são guardados cifrados, com uma chave por contexto |
| Dados sensíveis (derrubada de árvores, garimpo, poluição, animais apreendidos) | `dominio.py` (categorias), `rotas/chamados.py` (descrição, local, valor medido e imagens) |
| Analisar e comparar técnicas de criptografia | `cripto/classicas.py` (César, Vigenère, XOR), `cripto/aes.py` (AES-GCM), rota `POST /cripto/comparar` |
| Propor uma nova forma de criptografar, com lógica matemática | `cripto/sisa_cifra.py` — a **SISA-Cifra** |
| Demonstrar em Python | rotas `/cripto/cifrar`, `/cripto/decifrar`, `/cripto/comparar` e `?mostrar_cifrado=true` nas mensagens |

### SISA-Cifra (proposta da equipe)

Blocos de 32 bytes, 4 rodadas, cada uma com operações reversíveis módulo 256:

1. **XOR** com um fluxo gerado por HMAC-SHA256 (chave + nonce + bloco + rodada)
2. **Substituição afim** `y = (a·x + b) mod 256`, com `a` ímpar, logo inversível (`a⁻¹ mod 256`)
3. **Permutação** das posições (Fisher–Yates com bytes derivados da chave)
4. **Difusão encadeada** `y[j] = (x[j] + y[j−1]) mod 256`

Além disso: nonce aleatório por mensagem (o mesmo texto nunca gera a mesma saída) e
HMAC-SHA256 sobre o resultado (detecta adulteração e chave errada).

Resultado de `POST /cripto/comparar` com 4 KB de texto:

| Algoritmo | Entropia (bits/byte, máx. 8) | Detecta adulteração | Saída muda a cada cifragem |
|---|---|---|---|
| César | 4,65 (igual ao original) | não | não |
| Vigenère | 7,73 | não | não |
| XOR | 7,74 | não | não |
| **SISA-Cifra** | **7,96** | **sim** | **sim** |
| AES-256-GCM | 7,96 | sim | sim |

Em Python puro, a SISA-Cifra é cerca de 20× mais lenta que o AES (≈ 0,4 MB/s). Por isso:
ela é a cifra padrão (`SISA_CIFRA_PADRAO=sisa`), mas dá para usar AES-GCM só nos anexos
(`SISA_CIFRA_ANEXOS=aes-gcm`) ou em tudo. Por ser um algoritmo acadêmico sem auditoria,
num sistema real o recomendado é AES-GCM.

## Rotas principais (`/api/v1`)

| Tela do front | Rotas |
|---|---|
| Login / Cadastro | `POST /auth/login`, `POST /auth/cadastro`, `POST /auth/renovar` |
| Home / Institutos | `GET /institutos?lat=&lon=&raio_km=`, `GET /institutos/{id}`, `GET /mural` |
| Registro | `GET /chamados/categorias`, `POST /chamados`, `POST /chamados/{id}/anexos` |
| Chamados | `GET /chamados?status=aberto`, `GET /chamados/{id}`, `PATCH /chamados/{id}/status`, `GET /chamados/{id}/anexos/{anexo_id}` |
| Mensagens | `GET /mensagens/conversas`, `GET /mensagens/{instituto_id}`, `POST /mensagens/{instituto_id}` |
| Configurações | `GET /institutos/eu`, `PATCH /institutos/eu` (trocar senha exige `senha_atual`) |

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <access_token>` (devolvido no login).

## Integração com o app mobile

O app usa **as mesmas rotas** do site, com o mesmo token Bearer (não depende de cookies).
Pontos já preparados para o mobile:

| O quê | Onde |
|---|---|
| Checar versão mínima do app ao abrir | `GET /mobile/versao` (configure `SISA_VERSAO_MINIMA_APP`) |
| Registrar o aparelho para push (após login) | `POST /mobile/dispositivos` `{token_push, plataforma}` |
| Remover o aparelho (logout) | `DELETE /mobile/dispositivos/{token_push}` |
| Sincronização incremental (internet ruim em campo) | `GET /mobile/sincronizar?desde=<servidor_agora anterior>` |
| Manter a sessão sem novo login | `POST /auth/renovar` |
| Foto tirada pela câmera | `POST /chamados/{id}/anexos` (multipart, campo `arquivo`) |
| Localização do GPS | `GET /institutos?lat=&lon=` e `latitude`/`longitude` em `POST /chamados` |
| **A fazer:** envio real das notificações | `app/servicos/notificacoes.py` → `enviar_push` (hoje só registra no log; ligar ao Firebase ou Expo) |

Para testar no celular na mesma rede: `uvicorn app.main:app --host 0.0.0.0` e use o IP do computador.
Se o app rodar no navegador (Expo Web), inclua a origem dele em `SISA_CORS_ORIGENS`.

## Estrutura

```
backend/
├── app/
│   ├── main.py            # cria a API, CORS, registra as rotas
│   ├── config.py          # configurações (.env)
│   ├── database.py        # conexão SQLAlchemy
│   ├── models.py          # tabelas: institutos, chamados, anexos, mensagens, dispositivos_mobile
│   ├── schemas.py         # formatos de entrada/saída
│   ├── conversores.py     # modelo -> resposta (decifra o necessário)
│   ├── dominio.py         # categorias e status
│   ├── seguranca.py       # senhas e token JWT
│   ├── seed.py            # dados de exemplo
│   ├── cripto/            # SISA-Cifra, cifras clássicas e AES-GCM
│   ├── servicos/          # cifragem dos dados guardados, notificações push
│   └── rotas/             # auth, institutos, chamados, mensagens, mural, cripto, mobile
└── tests/
```

## Limitações conhecidas

- A cifragem é feita **no servidor** (com a chave mestra): protege os dados no banco e nos
  arquivos, mas não é ponta a ponta. O tráfego deve usar HTTPS em produção.
- Com `SISA_EXIGIR_VERIFICACAO=true`, ainda não há tela de administrador para aprovar institutos.
- O banco é criado automaticamente; mudanças nas tabelas exigem apagar `sisa.db` (não há migrações).
