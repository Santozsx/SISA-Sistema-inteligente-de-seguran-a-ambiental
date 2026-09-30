import { useNavigate, Link } from "react-router-dom";
import './cadastro.css'

function App() {
    const navigate = useNavigate();
  return (
    <div className="pagina">

      {/* Logo */}
      <header className="header">
        <span className="logo-ponto"></span>

        <span className="logo">
          Sentinela
        </span>

        <span className="logo-descricao">
          Sistema Inteligente de Segurança Ambiental
        </span>
      </header>


      <main className="conteudo">

        {/* Lado esquerdo */}
        <section className="apresentacao">

          <span className="titulo-pequeno">
            CADASTRO DE INSTITUTO
          </span>

          <h1>
            Faça parte do Sentinela.
            <br />
            Proteja dados
            <br />
            ambientais.
          </h1>

          <p>
            Cadastre seu instituto para ter acesso
            ao sistema e registrar informações
            ambientais de forma segura.
          </p>

        </section>


        {/* Card de cadastro */}
        <section className="card">

          <h2>
            Cadastrar instituto
          </h2>

          <p className="card-subtitulo">
            Preencha os dados para liberar o acesso ao sistema.
          </p>


          {/* Nome */}
          <div className="campo">

            <label>
              Nome do instituto
            </label>

            <input
              type="text"
              placeholder="Instituto de Preservação Ambiental"
            />

          </div>


          {/* E-mail */}
          <div className="campo">

            <label>
              E-mail institucional
            </label>

            <input
              type="email"
              placeholder="contato@instituto.org"
            />

          </div>


          {/* Área */}
          <div className="campo">

            <label>
              Área de atuação
            </label>

            <select>

              <option>
                Fiscalização florestal
              </option>

              <option>
                Preservação ambiental
              </option>

              <option>
                Monitoramento ambiental
              </option>

              <option>
                Pesquisa ambiental
              </option>

            </select>

          </div>


          {/* Senha */}
          <div className="campo">

            <label>
              Senha
            </label>

            <input
              type="password"
              placeholder="Digite sua senha"
            />

          </div>


          <button className="botao" onClick={() => navigate("/login")}>
            Criar conta
          </button>


          <p className="rodape">
            Já possui uma conta?
            <Link className="destaque" to="/login">Entrar</Link>
          </p>

        </section>

      </main>

    </div>
  )
}

export default App