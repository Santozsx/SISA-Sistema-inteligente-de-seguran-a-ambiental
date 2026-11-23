import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { criarChamado, enviarAnexo, listarCategorias, type Opcao } from "../../services/api";
import { extrairCoordenadas } from "../../utils/formatar";
import "./registro.css";

// Precisam bater com TIPOS_ANEXO_PERMITIDOS e TAMANHO_MAXIMO_ANEXO_MB do back end.
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const TIPOS_DOCUMENTO = "application/pdf,text/csv,text/plain,application/json";
const TAMANHO_MAXIMO_MB = 5;
const MAXIMO_IMAGENS = 5;

interface ImagemSelecionada {
  id: string;
  arquivo: File;
  previa: string; // URL temporária (blob:) para mostrar a miniatura
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Registro() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<Opcao[]>([]);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [imagens, setImagens] = useState<ImagemSelecionada[]>([]);
  const [documento, setDocumento] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [avisoImagens, setAvisoImagens] = useState("");

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [enviado, setEnviado] = useState<number | null>(null);

  const entradaImagens = useRef<HTMLInputElement>(null);
  // Guarda as prévias atuais para liberá-las da memória quando a tela fechar.
  const previasAbertas = useRef<ImagemSelecionada[]>([]);

  useEffect(() => {
    previasAbertas.current = imagens;
  }, [imagens]);

  useEffect(() => {
    return () => previasAbertas.current.forEach((img) => URL.revokeObjectURL(img.previa));
  }, []);

  useEffect(() => {
    listarCategorias()
      .then((lista) => {
        setCategorias(lista);
        setCategoria(lista[0]?.valor ?? "");
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  function adicionarImagens(arquivos: FileList | File[]) {
    const recusados: string[] = [];
    const novas: ImagemSelecionada[] = [];
    let vagas = MAXIMO_IMAGENS - imagens.length;

    for (const arquivo of Array.from(arquivos)) {
      if (!TIPOS_IMAGEM.includes(arquivo.type)) {
        recusados.push(`${arquivo.name} (use JPG, PNG ou WEBP)`);
      } else if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
        recusados.push(`${arquivo.name} (maior que ${TAMANHO_MAXIMO_MB} MB)`);
      } else if (vagas <= 0) {
        recusados.push(`${arquivo.name} (limite de ${MAXIMO_IMAGENS} imagens)`);
      } else {
        novas.push({ id: crypto.randomUUID(), arquivo, previa: URL.createObjectURL(arquivo) });
        vagas--;
      }
    }

    setImagens((atuais) => [...atuais, ...novas]);
    setAvisoImagens(recusados.length ? `Não adicionadas: ${recusados.join("; ")}.` : "");
  }

  function aoEscolherImagens(evento: ChangeEvent<HTMLInputElement>) {
    if (evento.target.files) adicionarImagens(evento.target.files);
    evento.target.value = ""; // permite escolher o mesmo arquivo de novo depois de remover
  }

  function removerImagem(id: string) {
    setImagens((atuais) => {
      const alvo = atuais.find((img) => img.id === id);
      if (alvo) URL.revokeObjectURL(alvo.previa);
      return atuais.filter((img) => img.id !== id);
    });
    setAvisoImagens("");
  }

  function aoArrastar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(evento.type === "dragover");
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    adicionarImagens(evento.dataTransfer.files);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const textoLocal = local.trim();
      setProgresso("Cifrando e enviando registro...");
      const chamado = await criarChamado({
        categoria,
        descricao: descricao.trim(),
        local: textoLocal || null,
        ...extrairCoordenadas(textoLocal),
      });

      // Anexos vão um por vez, depois que o chamado já existe (o id entra na chave da cifra).
      const anexos = [...imagens.map((img) => img.arquivo), ...(documento ? [documento] : [])];
      const falhas: string[] = [];
      for (const [i, arquivo] of anexos.entries()) {
        setProgresso(`Cifrando anexo ${i + 1} de ${anexos.length}...`);
        try {
          await enviarAnexo(chamado.id, arquivo);
        } catch (e) {
          falhas.push(`${arquivo.name}: ${(e as Error).message}`);
        }
      }

      if (falhas.length) {
        setErro(`O registro #${chamado.id} foi salvo, mas ${falhas.length} anexo(s) falharam — ${falhas.join("; ")}`);
        return;
      }
      setEnviado(chamado.id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
      setProgresso("");
    }
  }

  return (
    <div className="registro-pagina">
      <div className="registro-shell">
        <div className="registro-lateral">
          <div className="registro-marca">
            <span className="registro-marca-ponto"></span>
            <span className="registro-marca-nome">Sentinela</span>
            <span className="registro-marca-sub">
              Sistema Inteligente de Segurança Ambiental
            </span>
          </div>

          <div className="registro-etiqueta">Novo registro</div>

          <h2 className="registro-lateral-titulo">
            Todo dado sensível é guardado cifrado.
          </h2>

          <div className="registro-descricao">
            Preencha as informações da ocorrência. Descrição, local, imagens e
            anexos são cifrados com a SISA-Cifra antes de serem salvos no servidor.
          </div>
        </div>

        <form className="registro-formulario" onSubmit={enviar}>
          <h2 className="registro-formulario-titulo">Novo registro</h2>

          <div className="registro-subtitulo">
            Registre um dado ambiental identificado em campo
          </div>

          {erro && <p className="aviso aviso--erro">{erro}</p>}

          <div className="registro-campo">
            <label htmlFor="registro-categoria">Categoria</label>

            <select
              id="registro-categoria"
              required
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categorias.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </div>

          <div className="registro-campo">
            <label htmlFor="registro-descricao">Descrição do ocorrido</label>

            <textarea
              id="registro-descricao"
              rows={3}
              placeholder="Descreva o que foi identificado..."
              required
              minLength={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            ></textarea>
          </div>

          <div className="registro-campo">
            <label htmlFor="registro-local">Local / coordenadas</label>

            <input
              id="registro-local"
              type="text"
              placeholder="Ex: -23.55, -46.63"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>

          <div className="registro-campo">
            <label htmlFor="registro-imagens">
              Imagens da ocorrência ({imagens.length}/{MAXIMO_IMAGENS})
            </label>

            {imagens.length < MAXIMO_IMAGENS && (
              <div
                className={`registro-upload ${arrastando ? "registro-upload--ativo" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => entradaImagens.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    entradaImagens.current?.click();
                  }
                }}
                onDragOver={aoArrastar}
                onDragLeave={aoArrastar}
                onDrop={aoSoltar}
              >
                <span className="registro-upload-icone">📷</span>
                <span className="registro-upload-texto">
                  <strong>Clique para escolher</strong> ou arraste as fotos aqui
                </span>
                <span className="registro-upload-dica">
                  JPG, PNG ou WEBP · até {TAMANHO_MAXIMO_MB} MB cada
                </span>
              </div>
            )}

            <input
              id="registro-imagens"
              ref={entradaImagens}
              className="registro-upload-entrada"
              type="file"
              accept={TIPOS_IMAGEM.join(",")}
              capture="environment"
              multiple
              onChange={aoEscolherImagens}
            />

            {avisoImagens && <p className="registro-upload-aviso">{avisoImagens}</p>}

            {imagens.length > 0 && (
              <ul className="registro-previas">
                {imagens.map((img) => (
                  <li key={img.id} className="registro-previa">
                    <img src={img.previa} alt={img.arquivo.name} />
                    <span className="registro-previa-info">{formatarTamanho(img.arquivo.size)}</span>
                    <button
                      type="button"
                      className="registro-previa-remover"
                      aria-label={`Remover ${img.arquivo.name}`}
                      title="Remover"
                      disabled={enviando}
                      onClick={() => removerImagem(img.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="registro-campo">
            <label htmlFor="registro-anexo">Outro anexo (PDF, CSV, JSON ou TXT, opcional)</label>

            <input
              id="registro-anexo"
              type="file"
              accept={TIPOS_DOCUMENTO}
              onChange={(e) => setDocumento(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="registro-aviso-cifra">
            🔒 Este registro e suas imagens serão cifrados com a chave do seu
            instituto antes de serem salvos
          </div>

          <button className="registro-botao" type="submit" disabled={enviando || !categoria}>
            {enviando ? progresso || "Enviando..." : "Cifrar e enviar registro"}
          </button>

          <button className="registro-botao-voltar" type="button" onClick={() => navigate(-1)}>
            Cancelar
          </button>
        </form>
      </div>

      {enviado !== null && (
        <div className="registro-modal-fundo">
          <div className="registro-modal">
            <div className="registro-modal-icone">✓</div>

            <h3 className="registro-modal-titulo">Registro #{enviado} enviado</h3>

            <button
              className="registro-botao"
              onClick={() => navigate("/chamados")}
            >
              Ver chamados
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
