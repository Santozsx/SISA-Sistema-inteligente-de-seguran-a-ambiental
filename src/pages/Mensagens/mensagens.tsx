import { MoreHorizontal, Lock } from "lucide-react";
import "./mensagens.css";

interface Conversa {
  id: string;
  iniciais: string;
  corFundo: string;
  corTexto: string;
  nome: string;
  ativa: boolean;
}

type Autor = "instituto" | "posto";

interface Mensagem {
  id: string;
  autor: Autor;
  texto: string;
  hora: string;
  cifrada?: boolean;
}

const CONVERSAS: Conversa[] = [
  {
    id: "biomas",
    iniciais: "IB",
    corFundo: "#4c8eff",
    corTexto: "#ffffff",
    nome: "Biomas",
    ativa: true,
  },
  {
    id: "guarda",
    iniciais: "GA",
    corFundo: "#2c3b47",
    corTexto: "#dbe4ea",
    nome: "Guarda Amb.",
    ativa: false,
  },
  {
    id: "fiscalizacao",
    iniciais: "FA",
    corFundo: "#e0a83e",
    corTexto: "#1a1406",
    nome: "Fiscalização",
    ativa: false,
  },
];

const MENSAGENS: Mensagem[] = [
  {
    id: "m1",
    autor: "instituto",
    texto: "Identificamos derrubada de árvores na coordenada -23.55, -46.63",
    hora: "09:14",
  },
  {
    id: "m2",
    autor: "posto",
    texto: "Chamado recebido, enviando equipe de campo",
    hora: "09:16",
    cifrada: true,
  },
  {
    id: "m3",
    autor: "instituto",
    texto: "Equipe deve chegar ao local em 40 minutos",
    hora: "09:18",
  },
];

export default function Mensagens() {
  return (
    <div className="mensagens-page">
      <section className="mensagens-lista-conversas">
        <div className="mensagens-lista-titulo">CONVERSAS</div>
        <div className="mensagens-conversas">
          {CONVERSAS.map((conversa) => (
            <button
              key={conversa.id}
              className={`mensagens-conversa-item${
                conversa.ativa ? " mensagens-conversa-item--ativa" : ""
              }`}
            >
              <span
                className="mensagens-avatar"
                style={{ background: conversa.corFundo, color: conversa.corTexto }}
              >
                {conversa.iniciais}
              </span>
              <span className="mensagens-conversa-nome">{conversa.nome}</span>
            </button>
          ))}
        </div>
      </section>

      <main className="mensagens-chat">
        <header className="mensagens-chat-topo">
          <div>
            <div className="mensagens-chat-nome">Instituto Biomas</div>
            <div className="mensagens-chat-sub">Fiscalização florestal · 4.2 km</div>
          </div>
          <div className="mensagens-chat-topo-direita">
            <span className="mensagens-canal-seguro">
              <Lock size={11} />
              canal segur...
            </span>
            <button className="mensagens-icone-botao">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </header>

        <div className="mensagens-corpo">
          {MENSAGENS.map((msg) => (
            <div key={msg.id} className={`mensagens-msg mensagens-msg--${msg.autor}`}>
              <div className="mensagens-msg-bolha">{msg.texto}</div>
              <div className="mensagens-msg-meta">
                {msg.cifrada ? `cifrada · ${msg.hora}` : msg.hora}
              </div>
            </div>
          ))}
        </div>

        <footer className="mensagens-rodape">
          <input className="mensagens-input" type="text" placeholder="Escrever mensagem..." />
          <button className="mensagens-botao-enviar">Enviar</button>
        </footer>
      </main>
    </div>
  );
}