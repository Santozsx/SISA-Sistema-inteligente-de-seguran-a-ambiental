import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, EyeOff, ImageUp, Lock, LockOpen, ShieldCheck, Trash2, X } from "lucide-react";
import {
  bytesCifrados,
  desbloquearCofre,
  enviarAoCofre,
  ErroApi,
  excluirDoCofre,
  listarCofre,
  listarInstitutos,
  meuPerfil,
  revelarDoCofre,
  type CaixaCofre,
  type Instituto,
  type ItemCofre,
} from "../../services/api";
import { hora, tempoRelativo } from "../../utils/formatar";
import "./cofre.css";

// Quanto tempo uma foto fica visível depois de revelada.
const VISIVEL_POR_MS = 60_000;
// Prévia do arquivo cifrado: cada 3 bytes viram um pixel RGB.
const LADO_PREVIA = 96;
const TAMANHO_MAXIMO_MB = 5;

interface Revelada {
  url: string;
  nome: string;
  legenda: string | null;
  ate: number;
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function relogio(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function base64ParaBlob(base64: string, tipo: string): Blob {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

// Desenha os bytes cifrados como pixels: mostra que o conteúdo virou ruído.
function PreviaCifrada({ id }: { id: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let ativo = true;
    bytesCifrados(id, LADO_PREVIA * LADO_PREVIA * 3)
      .then((bytes) => {
        const ctx = canvas.current?.getContext("2d");
        if (!ativo || !ctx) return;
        const imagem = ctx.createImageData(LADO_PREVIA, LADO_PREVIA);
        for (let p = 0; p < LADO_PREVIA * LADO_PREVIA; p++) {
          const i = (p * 3) % Math.max(bytes.length - 2, 1);
          imagem.data.set([bytes[i] ?? 0, bytes[i + 1] ?? 0, bytes[i + 2] ?? 0, 255], p * 4);
        }
        ctx.putImageData(imagem, 0, 0);
      })
      .catch(() => ativo && setFalhou(true));
    return () => {
      ativo = false;
    };
  }, [id]);

  return (
    <div className="cofre-previa cofre-previa--cifrada">
      <canvas ref={canvas} width={LADO_PREVIA} height={LADO_PREVIA} aria-label="Bytes cifrados vistos como imagem" />
      <span className="cofre-previa-selo">
        <Lock size={12} /> {falhou ? "indisponível" : "cifrada"}
      </span>
    </div>
  );
}

export default function Cofre() {
  const [eu, setEu] = useState<number | null>(null);
  const [institutos, setInstitutos] = useState<Instituto[]>([]);
  const [caixa, setCaixa] = useState<CaixaCofre>("todos");
  // Lista junto com a caixa de onde veio, para não mostrar itens de outra aba durante a troca.
  const [lista, setLista] = useState<{ caixa: CaixaCofre; itens: ItemCofre[] } | null>(null);
  const [erro, setErro] = useState("");

  // envio
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previaLocal, setPreviaLocal] = useState<string | null>(null);
  const [destino, setDestino] = useState<string>("eu");
  const [legenda, setLegenda] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const campoArquivo = useRef<HTMLInputElement>(null);

  // desbloqueio (token só na memória)
  const [sessao, setSessao] = useState<{ token: string; ate: number } | null>(null);
  const [pedindoSenha, setPedindoSenha] = useState<number | null>(null);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [reveladas, setReveladas] = useState<Record<number, Revelada>>({});
  const [abrindo, setAbrindo] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(
    (qual: CaixaCofre) =>
      listarCofre(qual)
        .then((itens) => {
          setLista({ caixa: qual, itens });
          setErro("");
        })
        .catch((e: Error) => setErro(e.message)),
    [],
  );

  const itens = lista?.caixa === caixa ? lista.itens : [];
  const setItens = (mudar: (atual: ItemCofre[]) => ItemCofre[]) =>
    setLista((atual) => (atual ? { ...atual, itens: mudar(atual.itens) } : atual));

  useEffect(() => {
    meuPerfil()
      .then((p) => setEu(p.id))
      .catch(() => undefined);
    listarInstitutos()
      .then(setInstitutos)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    carregar(caixa);
  }, [caixa, carregar]);

  const bloquear = useCallback(() => {
    setSessao(null);
    setReveladas((atual) => {
      Object.values(atual).forEach((r) => URL.revokeObjectURL(r.url));
      return {};
    });
  }, []);

  // Relógio: a cada segundo, expira o desbloqueio e esconde fotos reveladas há mais de 1 minuto.
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      const instante = Date.now();
      setAgora(instante);
      setSessao((atual) => (atual && instante >= atual.ate ? null : atual));
      setReveladas((atual) => {
        const vencidas = Object.entries(atual).filter(([, r]) => instante >= r.ate);
        if (vencidas.length === 0) return atual;
        const resto = { ...atual };
        for (const [id, r] of vencidas) {
          URL.revokeObjectURL(r.url);
          delete resto[Number(id)];
        }
        return resto;
      });
    }, 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  // Ao sair da aba do navegador, o cofre se fecha.
  useEffect(() => {
    const aoMudar = () => document.hidden && bloquear();
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, [bloquear]);

  // Libera as URLs das fotos (reveladas e prévia local) ao sair da tela.
  const urlsAbertas = useRef<{ reveladas: Record<number, Revelada>; previa: string | null }>({
    reveladas: {},
    previa: null,
  });
  useEffect(() => {
    urlsAbertas.current = { reveladas, previa: previaLocal };
  }, [reveladas, previaLocal]);
  useEffect(
    () => () => {
      Object.values(urlsAbertas.current.reveladas).forEach((r) => URL.revokeObjectURL(r.url));
      if (urlsAbertas.current.previa) URL.revokeObjectURL(urlsAbertas.current.previa);
    },
    [],
  );

  function trocarPrevia(novo: File | null) {
    if (previaLocal) URL.revokeObjectURL(previaLocal);
    setPreviaLocal(novo ? URL.createObjectURL(novo) : null);
    setArquivo(novo);
  }

  function escolherArquivo(novo: File | null) {
    setSucesso("");
    setErro("");
    if (novo && novo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      setErro(`A imagem passa de ${TAMANHO_MAXIMO_MB} MB.`);
      return;
    }
    trocarPrevia(novo);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!arquivo) return;
    setEnviando(true);
    setErro("");
    setSucesso("");
    try {
      const item = await enviarAoCofre(arquivo, destino === "eu" ? null : Number(destino), legenda);
      setSucesso(
        `Foto cifrada com ${item.algoritmo_nome}: ${tamanho(item.tamanho_bytes)} → ${tamanho(item.tamanho_cifrado)}.`,
      );
      trocarPrevia(null);
      setLegenda("");
      if (campoArquivo.current) campoArquivo.current.value = "";
      carregar(caixa);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  async function revelar(id: number, token: string) {
    setAbrindo(id);
    try {
      const conteudo = await revelarDoCofre(id, token);
      const url = URL.createObjectURL(base64ParaBlob(conteudo.imagem_base64, conteudo.tipo_mime));
      setReveladas((atual) => {
        if (atual[id]) URL.revokeObjectURL(atual[id].url);
        return { ...atual, [id]: { url, nome: conteudo.nome_arquivo, legenda: conteudo.legenda, ate: Date.now() + VISIVEL_POR_MS } };
      });
      setItens((atual) => atual.map((i) => (i.id === id && !i.enviado_por_mim ? { ...i, visualizado: true } : i)));
    } catch (e) {
      if (e instanceof ErroApi && e.status === 403) {
        // Desbloqueio venceu no servidor: pede a senha de novo.
        setSessao(null);
        setPedindoSenha(id);
      } else {
        setErro((e as Error).message);
      }
    } finally {
      setAbrindo(null);
    }
  }

  function pedirRevelar(id: number) {
    // O servidor também confere a validade; se tiver vencido, revelar() pede a senha de novo.
    if (sessao && agora < sessao.ate) revelar(id, sessao.token);
    else setPedindoSenha(id);
  }

  function ocultar(id: number) {
    setReveladas((atual) => {
      const resto = { ...atual };
      if (resto[id]) URL.revokeObjectURL(resto[id].url);
      delete resto[id];
      return resto;
    });
  }

  async function confirmarSenha(evento: FormEvent) {
    evento.preventDefault();
    setConferindo(true);
    setErroSenha("");
    try {
      const { token_cofre, expira_em_segundos } = await desbloquearCofre(senha);
      setSessao({ token: token_cofre, ate: Date.now() + expira_em_segundos * 1000 });
      const id = pedindoSenha;
      setPedindoSenha(null);
      setSenha("");
      if (id !== null && id > 0) revelar(id, token_cofre);
    } catch (e) {
      setErroSenha((e as Error).message);
    } finally {
      setConferindo(false);
    }
  }

  function fecharModal() {
    setPedindoSenha(null);
    setSenha("");
    setErroSenha("");
  }

  async function excluir(item: ItemCofre) {
    if (!window.confirm("Excluir esta foto do cofre? O arquivo cifrado será apagado.")) return;
    try {
      await excluirDoCofre(item.id);
      ocultar(item.id);
      setItens((atual) => atual.filter((i) => i.id !== item.id));
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const desbloqueado = sessao !== null && agora < sessao.ate;
  const outros = institutos.filter((i) => i.id !== eu);

  return (
    <div className="cofre-page">
      <header className="cofre-topo">
        <div>
          <h1 className="cofre-titulo">Cofre</h1>
          <p className="cofre-subtitulo">
            Fotos guardadas cifradas. Para ver o conteúdo, confirme sua senha.
          </p>
        </div>
        {desbloqueado ? (
          <div className="cofre-estado cofre-estado--aberto">
            <LockOpen size={14} />
            <span>Desbloqueado · fecha em {relogio(sessao.ate - agora)}</span>
            <button type="button" className="cofre-botao-texto" onClick={bloquear}>
              Bloquear agora
            </button>
          </div>
        ) : (
          <button type="button" className="cofre-estado" onClick={() => setPedindoSenha(0)}>
            <Lock size={14} />
            <span>Bloqueado</span>
          </button>
        )}
      </header>

      <div className="cofre-grade">
        <form className="cofre-envio" onSubmit={enviar}>
          <h2 className="cofre-secao-titulo">Enviar foto cifrada</h2>

          <label className="cofre-rotulo" htmlFor="cofre-destino">
            Para
          </label>
          <select
            id="cofre-destino"
            className="cofre-campo"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            <option value="eu">Só para mim</option>
            {outros.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>

          <label className={`cofre-arquivo${previaLocal ? " cofre-arquivo--com-foto" : ""}`}>
            {previaLocal ? (
              <img src={previaLocal} alt="Foto escolhida, ainda no seu computador" />
            ) : (
              <span className="cofre-arquivo-vazio">
                <ImageUp size={22} />
                Escolher foto (jpg, png, webp, gif · até {TAMANHO_MAXIMO_MB} MB)
              </span>
            )}
            <input
              ref={campoArquivo}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
            />
          </label>
          {arquivo && (
            <p className="cofre-dica">
              {arquivo.name} · {tamanho(arquivo.size)} — será cifrada antes de ser guardada.
            </p>
          )}

          <label className="cofre-rotulo" htmlFor="cofre-legenda">
            Mensagem (também cifrada)
          </label>
          <textarea
            id="cofre-legenda"
            className="cofre-campo cofre-legenda"
            maxLength={1000}
            rows={3}
            placeholder="Ex.: balsas de garimpo no trecho norte, 06:40"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
          />

          {sucesso && <p className="aviso aviso--sucesso">{sucesso}</p>}
          <button className="cofre-botao" type="submit" disabled={!arquivo || enviando}>
            <ShieldCheck size={15} />
            {enviando ? "Cifrando..." : "Cifrar e enviar"}
          </button>
        </form>

        <section className="cofre-lista">
          <div className="cofre-abas" role="tablist">
            {(["todos", "recebidos", "enviados"] as const).map((qual) => (
              <button
                key={qual}
                role="tab"
                aria-selected={caixa === qual}
                className={`cofre-aba${caixa === qual ? " cofre-aba--ativa" : ""}`}
                onClick={() => setCaixa(qual)}
              >
                {qual[0].toUpperCase() + qual.slice(1)}
              </button>
            ))}
          </div>

          {erro && <p className="aviso aviso--erro">{erro}</p>}
          {lista?.caixa === caixa && itens.length === 0 &&<p className="estado-vazio">Nenhuma foto aqui ainda.</p>}

          <div className="cofre-itens">
            {itens.map((item) => {
              const revelada = reveladas[item.id];
              const comQuem = item.enviado_por_mim
                ? item.destinatario.id === item.remetente.id
                  ? "Só para mim"
                  : `Para ${item.destinatario.nome}`
                : `De ${item.remetente.nome}`;
              return (
                <article key={item.id} className="cofre-item">
                  {revelada ? (
                    <div className="cofre-previa cofre-previa--aberta">
                      <img
                        src={revelada.url}
                        alt={revelada.nome}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      <span className="cofre-previa-selo cofre-previa-selo--ok">
                        <ShieldCheck size={12} /> íntegra · some em {relogio(revelada.ate - agora)}
                      </span>
                    </div>
                  ) : (
                    <PreviaCifrada id={item.id} />
                  )}

                  <div className="cofre-item-info">
                    <div className="cofre-item-topo">
                      <span className="cofre-item-quem">{comQuem}</span>
                      <span className="cofre-item-quando" title={hora(item.criado_em)}>
                        {tempoRelativo(item.criado_em)}
                      </span>
                    </div>

                    {revelada ? (
                      <div className="cofre-mensagem">
                        <div className="cofre-mensagem-nome">{revelada.nome}</div>
                        {revelada.legenda ?? <em>Sem mensagem.</em>}
                      </div>
                    ) : (
                      <code className="cofre-hex" title="Primeiros bytes do arquivo como está no disco">
                        {item.amostra_hex}…
                      </code>
                    )}

                    <dl className="cofre-dados">
                      <div>
                        <dt>Algoritmo</dt>
                        <dd>{item.algoritmo_nome}</dd>
                      </div>
                      <div>
                        <dt>Tamanho</dt>
                        <dd>
                          {tamanho(item.tamanho_bytes)} → {tamanho(item.tamanho_cifrado)}
                        </dd>
                      </div>
                      <div>
                        <dt>Entropia (máx. 8)</dt>
                        <dd>
                          {item.entropia_original.toFixed(2)} → <strong>{item.entropia_cifrado.toFixed(2)}</strong>
                        </dd>
                      </div>
                      <div>
                        <dt>SHA-256 original</dt>
                        <dd className="cofre-hash" title={item.hash_sha256}>
                          {item.hash_sha256.slice(0, 16)}…
                        </dd>
                      </div>
                    </dl>

                    <div className="cofre-acoes">
                      {revelada ? (
                        <button type="button" className="cofre-botao cofre-botao--secundario" onClick={() => ocultar(item.id)}>
                          <EyeOff size={14} /> Ocultar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cofre-botao"
                          disabled={abrindo === item.id}
                          onClick={() => pedirRevelar(item.id)}
                        >
                          <Eye size={14} /> {abrindo === item.id ? "Decifrando..." : "Revelar"}
                        </button>
                      )}
                      {!item.enviado_por_mim && (
                        <span className="cofre-status">{item.visualizado ? "vista" : "nova"}</span>
                      )}
                      {item.enviado_por_mim && (
                        <button
                          type="button"
                          className="cofre-icone"
                          title="Excluir do cofre"
                          onClick={() => excluir(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {pedindoSenha !== null && (
        <div className="cofre-modal-fundo" onClick={fecharModal}>
          <form
            className="cofre-modal"
            onSubmit={confirmarSenha}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cofre-modal-titulo"
          >
            <button type="button" className="cofre-icone cofre-modal-fechar" onClick={fecharModal} aria-label="Fechar">
              <X size={16} />
            </button>
            <Lock size={20} className="cofre-modal-icone" />
            <h2 id="cofre-modal-titulo" className="cofre-secao-titulo">
              Confirme sua senha
            </h2>
            <p className="cofre-dica">
              O cofre fica aberto por alguns minutos e fecha sozinho, ou quando você sai desta aba.
            </p>
            <input
              className="cofre-campo"
              type="password"
              autoComplete="current-password"
              autoFocus
              placeholder="Senha do instituto"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            {erroSenha && <p className="aviso aviso--erro">{erroSenha}</p>}
            <button className="cofre-botao" type="submit" disabled={!senha || conferindo}>
              {conferindo ? "Conferindo..." : "Desbloquear"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
