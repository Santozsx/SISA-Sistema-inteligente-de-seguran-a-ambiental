import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { MoreHorizontal, Lock } from "lucide-react";
import {
  enviarMensagem,
  listarConversas,
  listarMensagens,
  obterInstituto,
  type Conversa,
  type Instituto,
  type Mensagem,
} from "../../services/api";
import { corAvatar, distancia, hora } from "../../utils/formatar";
import "./mensagens.css";

// Intervalo para buscar mensagens novas enquanto a tela está aberta.
const ATUALIZAR_A_CADA_MS = 5000;

export default function Mensagens() {
  const [parametros, setParametros] = useSearchParams();
  const selecionadoId = parametros.get("com") ? Number(parametros.get("com")) : null;

  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [contatoCarregado, setContato] = useState<Instituto | null>(null);
  // Histórico junto com o id da conversa, para não exibir mensagens de outra conversa ao trocar.
  const [historico, setHistorico] = useState<{ com: number; mensagens: Mensagem[] } | null>(null);
  const [mostrarCifrado, setMostrarCifrado] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fimDaConversa = useRef<HTMLDivElement>(null);

  // Lista de conversas; abre a mais recente se nenhuma estiver escolhida.
  useEffect(() => {
    listarConversas()
      .then((lista) => {
        setConversas(lista);
        if (selecionadoId === null && lista.length > 0) {
          setParametros({ com: String(lista[0].instituto.id) }, { replace: true });
        }
      })
      .catch((e: Error) => setErro(e.message));
  }, [selecionadoId, setParametros]);

  // Dados do contato e histórico, atualizado periodicamente.
  useEffect(() => {
    if (selecionadoId === null) return;
    let ativo = true;
    obterInstituto(selecionadoId)
      .then((inst) => ativo && setContato(inst))
      .catch((e: Error) => ativo && setErro(e.message));

    const carregar = () =>
      listarMensagens(selecionadoId, mostrarCifrado)
        .then((lista) => {
          if (!ativo) return;
          setHistorico({ com: selecionadoId, mensagens: lista });
          setErro("");
        })
        .catch((e: Error) => ativo && setErro(e.message));
    carregar();
    const intervalo = window.setInterval(carregar, ATUALIZAR_A_CADA_MS);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [selecionadoId, mostrarCifrado]);

  const contato = contatoCarregado?.id === selecionadoId ? contatoCarregado : null;
  const mensagens = historico?.com === selecionadoId ? historico.mensagens : [];

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || selecionadoId === null) return;
    setEnviando(true);
    try {
      const nova = await enviarMensagem(selecionadoId, conteudo);
      setHistorico((atual) =>
        atual?.com === selecionadoId ? { com: selecionadoId, mensagens: [...atual.mensagens, nova] } : atual,
      );
      setTexto("");
      if (!conversas.some((c) => c.instituto.id === selecionadoId)) {
        setConversas(await listarConversas());
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // Quem veio de "conversar" ainda pode não ter histórico: mostra o contato no topo da lista.
  const listaLateral: Conversa[] =
    contato && !conversas.some((c) => c.instituto.id === contato.id)
      ? [{ instituto: contato, ultima_mensagem: null, ultima_em: null, nao_lidas: 0 }, ...conversas]
      : conversas;

  return (
    <div className="mensagens-page">
      <section className="mensagens-lista-conversas">
        <div className="mensagens-lista-titulo">CONVERSAS</div>
        <div className="mensagens-conversas">
          {listaLateral.length === 0 && (
            <p className="estado-vazio">Nenhuma conversa. Use "conversar" na tela Institutos.</p>
          )}
          {listaLateral.map((conversa) => {
            const cor = corAvatar(conversa.instituto.id);
            const ativa = conversa.instituto.id === selecionadoId;
            return (
              <button
                key={conversa.instituto.id}
                className={`mensagens-conversa-item${ativa ? " mensagens-conversa-item--ativa" : ""}`}
                onClick={() => setParametros({ com: String(conversa.instituto.id) })}
                title={conversa.ultima_mensagem ?? undefined}
              >
                <span
                  className="mensagens-avatar"
                  style={{ background: cor.fundo, color: cor.texto }}
                >
                  {conversa.instituto.iniciais}
                </span>
                <span className="mensagens-conversa-nome">
                  {conversa.instituto.nome}
                  {conversa.nao_lidas > 0 && !ativa && ` (${conversa.nao_lidas})`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <main className="mensagens-chat">
        <header className="mensagens-chat-topo">
          <div>
            <div className="mensagens-chat-nome">{contato?.nome ?? "Selecione uma conversa"}</div>
            {contato && (
              <div className="mensagens-chat-sub">
                {contato.tipo} · {distancia(contato.distancia_km)}
              </div>
            )}
          </div>
          <div className="mensagens-chat-topo-direita">
            <span className="mensagens-canal-seguro">
              <Lock size={11} />
              canal seguro
            </span>
            <button
              className="mensagens-icone-botao"
              onClick={() => setMostrarCifrado((v) => !v)}
              title={mostrarCifrado ? "Ocultar conteúdo cifrado" : "Ver como as mensagens estão guardadas (cifradas)"}
              aria-pressed={mostrarCifrado}
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </header>

        <div className="mensagens-corpo">
          {erro && <p className="aviso aviso--erro">{erro}</p>}
          {mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`mensagens-msg mensagens-msg--${msg.enviada_por_mim ? "posto" : "instituto"}`}
            >
              <div className="mensagens-msg-bolha">
                {msg.texto}
                {msg.cifrado_base64 && <code className="mensagens-cifrado">{msg.cifrado_base64}</code>}
              </div>
              <div className="mensagens-msg-meta">cifrada · {hora(msg.criado_em)}</div>
            </div>
          ))}
          <div ref={fimDaConversa} />
        </div>

        <form className="mensagens-rodape" onSubmit={enviar}>
          <input
            className="mensagens-input"
            type="text"
            placeholder="Escrever mensagem..."
            maxLength={4000}
            disabled={selecionadoId === null}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button
            className="mensagens-botao-enviar"
            type="submit"
            disabled={enviando || selecionadoId === null || !texto.trim()}
          >
            Enviar
          </button>
        </form>
      </main>
    </div>
  );
}
