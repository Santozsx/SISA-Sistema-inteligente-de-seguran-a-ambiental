import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./config.css";

type ChaveNotificacao = "chamados" | "mensagens" | "email";

interface NotificacaoItem {
  chave: ChaveNotificacao;
  titulo: string;
  descricao: string;
}

const NOTIFICACOES: NotificacaoItem[] = [
  {
    chave: "chamados",
    titulo: "Novos chamados",
    descricao: "Avisar quando um chamado for aberto ou atualizado",
  },
  {
    chave: "mensagens",
    titulo: "Mensagens",
    descricao: "Avisar quando chegar uma nova mensagem",
  },
  {
    chave: "email",
    titulo: "Resumo por e-mail",
    descricao: "Receber um resumo diário das ocorrências",
  },
];

export default function Config() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  const [notificacoes, setNotificacoes] = useState<
    Record<ChaveNotificacao, boolean>
  >({
    chamados: true,
    mensagens: true,
    email: false,
  });

  function alternarNotificacao(chave: ChaveNotificacao) {
    setNotificacoes({ ...notificacoes, [chave]: !notificacoes[chave] });
  }

  return (
    <div className="config-conteudo">
      <div className="config-cabecalho">
        <h2 className="config-titulo">Configurações</h2>
      </div>

      <div className="config-secao">
        <h3 className="config-secao-titulo">Conta do instituto</h3>

        <div className="config-campo">
          <label>Nome do instituto</label>
          <input
            type="text"
            placeholder="Instituto de Preservação Ambiental"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="config-campo">
          <label>E-mail institucional</label>
          <input
            type="email"
            placeholder="contato@instituto.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="config-secao">
        <h3 className="config-secao-titulo">Notificações</h3>

        {NOTIFICACOES.map((item) => (
          <div key={item.chave} className="config-linha">
            <div className="config-linha-info">
              <div className="config-linha-titulo">{item.titulo}</div>
              <div className="config-linha-detalhe">{item.descricao}</div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notificacoes[item.chave]}
              className={`config-switch ${
                notificacoes[item.chave] ? "config-switch--ligado" : ""
              }`}
              onClick={() => alternarNotificacao(item.chave)}
            >
              <span className="config-switch-bolinha" />
            </button>
          </div>
        ))}
      </div>

      <div className="config-secao">
        <h3 className="config-secao-titulo">Segurança</h3>

        <div className="config-campo">
          <label>Nova senha</label>
          <input
            type="password"
            placeholder="Digite a nova senha"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>
      </div>

      <div className="config-acoes">
        <button className="config-botao-salvar">Salvar alterações</button>

        <button className="config-botao-sair" onClick={() => navigate("/login")}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}