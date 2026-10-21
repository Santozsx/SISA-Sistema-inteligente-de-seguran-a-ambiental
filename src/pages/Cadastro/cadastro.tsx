import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { cadastrar } from "../../services/api";
import './cadastro.css'

const AREAS = [
  "Fiscalização florestal",
  "Preservação ambiental",
  "Monitoramento ambiental",
  "Pesquisa ambiental",
];

function App() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState(AREAS[0]);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function criarConta(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await cadastrar({ nome: nome.trim(), email: email.trim(), tipo, senha });
      navigate("/login", {
        state: { email: email.trim(), mensagem: "Conta criada. Entre com seu e-mail e senha." },
      });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="pagina">

      {/* Logo */}
      <header className="header">
        <span className="logo-ponto"></span>

        <span className="logo">
          SISA
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
        <form className="card" onSubmit={criarConta}>

          <h2>
            Cadastrar instituto
          </h2>

          <p className="card-subtitulo">
            Preencha os dados para liberar o acesso ao sistema.
          </p>

          {erro && <p className="aviso aviso--erro">{erro}</p>}


          {/* Nome */}
          <div className="campo">

            <label htmlFor="cadastro-nome">
              Nome do instituto
            </label>

            <input
              id="cadastro-nome"
              type="text"
              placeholder="Instituto de Preservação Ambiental"
              required
              minLength={2}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

          </div>


          {/* E-mail */}
          <div className="campo">

            <label htmlFor="cadastro-email">
              E-mail institucional
            </label>

            <input
              id="cadastro-email"
              type="email"
              placeholder="contato@instituto.org"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

          </div>


          {/* Área */}
          <div className="campo">

            <label htmlFor="cadastro-area">
              Área de atuação
            </label>

            <select id="cadastro-area" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {AREAS.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>

          </div>


          {/* Senha */}
          <div className="campo">

            <label htmlFor="cadastro-senha">
              Senha
            </label>

            <input
              id="cadastro-senha"
              type="password"
              placeholder="Mínimo de 8 caracteres"
              autoComplete="new-password"
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

          </div>


          <button className="botao" type="submit" disabled={carregando}>
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>


          <p className="rodape">
            Já possui uma conta?
            <Link className="destaque" to="/login">Entrar</Link>
          </p>

        </form>

      </main>

    </div>
  )
}

export default App
