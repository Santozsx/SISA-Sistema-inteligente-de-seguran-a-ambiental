import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { criarChamado, enviarAnexo, listarCategorias, type Opcao } from "../../services/api";
import { extrairCoordenadas } from "../../utils/formatar";
import "./registro.css";

const TIPOS_ANEXO = "image/jpeg,image/png,image/webp,application/pdf,text/csv,text/plain,application/json";

export default function Registro() {
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<Opcao[]>([]);
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");
  const [local, setLocal] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<number | null>(null);

  useEffect(() => {
    listarCategorias()
      .then((lista) => {
        setCategorias(lista);
        setCategoria(lista[0]?.valor ?? "");
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const textoLocal = local.trim();
      const chamado = await criarChamado({
        categoria,
        descricao: descricao.trim(),
        local: textoLocal || null,
        ...extrairCoordenadas(textoLocal),
      });
      if (arquivo) {
        try {
          await enviarAnexo(chamado.id, arquivo);
        } catch (e) {
          setErro(`O registro #${chamado.id} foi salvo, mas o anexo falhou: ${(e as Error).message}`);
          return;
        }
      }
      setEnviado(chamado.id);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
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
            Preencha as informações da ocorrência. Descrição, local e anexo são
            cifrados com a SISA-Cifra antes de serem salvos no servidor.
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
            <label htmlFor="registro-anexo">Anexo (imagem ou dado, até 5 MB)</label>

            <input
              id="registro-anexo"
              type="file"
              accept={TIPOS_ANEXO}
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="registro-aviso-cifra">
            🔒 Este registro será cifrado com a chave do seu instituto antes de
            ser salvo
          </div>

          <button className="registro-botao" type="submit" disabled={enviando || !categoria}>
            {enviando ? "Cifrando e enviando..." : "Cifrar e enviar registro"}
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
