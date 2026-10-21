import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { atualizarPerfil, logout, meuPerfil, type AtualizarPerfil, type Perfil } from "../../services/api";
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

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");

  const [notificacoes, setNotificacoes] = useState<
    Record<ChaveNotificacao, boolean>
  >({
    chamados: true,
    mensagens: true,
    email: false,
  });

  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(null);

  function preencher(dados: Perfil) {
    setPerfil(dados);
    setNome(dados.nome);
    setEmail(dados.email);
    setNotificacoes(dados.notificacoes);
  }

  useEffect(() => {
    meuPerfil()
      .then(preencher)
      .catch((e: Error) => setAviso({ tipo: "erro", texto: e.message }));
  }, []);

  function alternarNotificacao(chave: ChaveNotificacao) {
    setNotificacoes({ ...notificacoes, [chave]: !notificacoes[chave] });
  }

  async function salvar(extra: AtualizarPerfil = {}) {
    setAviso(null);
    setSalvando(true);
    try {
      const dados: AtualizarPerfil = { nome: nome.trim(), email: email.trim(), notificacoes, ...extra };
      if (novaSenha) {
        dados.senha_atual = senhaAtual;
        dados.nova_senha = novaSenha;
      }
      preencher(await atualizarPerfil(dados));
      setSenhaAtual("");
      setNovaSenha("");
      setAviso({ tipo: "sucesso", texto: "Alterações salvas." });
    } catch (e) {
      setAviso({ tipo: "erro", texto: (e as Error).message });
    } finally {
      setSalvando(false);
    }
  }

  // A distância até os outros institutos é calculada a partir desta localização.
  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setAviso({ tipo: "erro", texto: "Este navegador não informa a localização." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicao) => salvar({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
      () => setAviso({ tipo: "erro", texto: "Não foi possível obter a localização (permissão negada?)." }),
    );
  }

  function sair() {
    logout();
    navigate("/login", { replace: true });
  }

  const localizacao =
    perfil?.latitude != null && perfil.longitude != null
      ? `${perfil.latitude.toFixed(4)}, ${perfil.longitude.toFixed(4)}`
      : "não definida";

  return (
    <div className="config-conteudo">
      <div className="config-cabecalho">
        <h2 className="config-titulo">Configurações</h2>
      </div>

      {aviso && <p className={`aviso aviso--${aviso.tipo}`}>{aviso.texto}</p>}

      <div className="config-secao">
        <h3 className="config-secao-titulo">Conta do instituto</h3>

        <div className="config-campo">
          <label htmlFor="config-nome">Nome do instituto</label>
          <input
            id="config-nome"
            type="text"
            placeholder="Instituto de Preservação Ambiental"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="config-campo">
          <label htmlFor="config-email">E-mail institucional</label>
          <input
            id="config-email"
            type="email"
            placeholder="contato@instituto.org"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="config-linha">
          <div className="config-linha-info">
            <div className="config-linha-titulo">Localização do instituto</div>
            <div className="config-linha-detalhe">{localizacao} · usada para calcular a distância dos institutos</div>
          </div>
          <button type="button" className="config-botao-sair" onClick={usarMinhaLocalizacao} disabled={salvando}>
            Usar localização atual
          </button>
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
          <label htmlFor="config-senha-atual">Senha atual</label>
          <input
            id="config-senha-atual"
            type="password"
            placeholder="Necessária para trocar a senha"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />
        </div>

        <div className="config-campo">
          <label htmlFor="config-nova-senha">Nova senha</label>
          <input
            id="config-nova-senha"
            type="password"
            placeholder="Digite a nova senha (mínimo de 8 caracteres)"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>
      </div>

      <div className="config-acoes">
        <button className="config-botao-salvar" onClick={() => salvar()} disabled={salvando || !perfil}>
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>

        <button className="config-botao-sair" onClick={sair}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
