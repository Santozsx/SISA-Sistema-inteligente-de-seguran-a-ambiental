import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarChamados, type Chamado, type StatusChamado } from "../../services/api";
import { tempoRelativo } from "../../utils/formatar";
import "./chamdos.css";

type Filtro = "todos" | StatusChamado;

interface FiltroItem {
  valor: Filtro;
  label: string;
}

const FILTROS: FiltroItem[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aberto", label: "Abertos" },
  { valor: "em-analise", label: "Em análise" },
  { valor: "resolvido", label: "Resolvidos" },
];

export default function Chamados() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  // Guarda a qual filtro a resposta pertence, para não mostrar a lista antiga ao trocar de filtro.
  const [resultado, setResultado] = useState<{ filtro: Filtro; chamados: Chamado[]; erro: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;
    listarChamados(filtro === "todos" ? undefined : filtro)
      .then((lista) => ativo && setResultado({ filtro, chamados: lista, erro: "" }))
      .catch((e: Error) => ativo && setResultado({ filtro, chamados: [], erro: e.message }));
    return () => {
      ativo = false;
    };
  }, [filtro]);

  const atual = resultado?.filtro === filtro ? resultado : null;
  const chamados = atual && !atual.erro ? atual.chamados : null;
  const erro = atual?.erro ?? "";

  return (
    <div className="chamados-conteudo">
      <div className="chamados-cabecalho">
        <h2 className="chamados-titulo">Chamados registrados</h2>
        <button className="chamados-botao-novo"
        onClick={() => navigate("/registro")}>+ Novo chamado</button>
      </div>

      <div className="chamados-filtros">
        {FILTROS.map((item) => (
          <button
            key={item.valor}
            className={`chamados-filtro ${
              filtro === item.valor ? "chamados-filtro--ativo" : ""
            }`}
            onClick={() => setFiltro(item.valor)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="chamados-tabela-container">
        <table className="chamados-tabela">
          <thead>
            <tr>
              <th>#</th>
              <th>Categoria</th>
              <th>Instituto</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>

          <tbody>
            {chamados?.map((chamado) => (
              <tr key={chamado.id} title={chamado.descricao}>
                <td className="chamados-id">{chamado.id}</td>
                <td className="chamados-categoria">{chamado.categoria_label}</td>
                <td>{chamado.instituto.nome}</td>
                <td>
                  <span
                    className={`chamados-status chamados-status--${chamado.status}`}
                  >
                    {chamado.status_label}
                  </span>
                </td>
                <td className="chamados-data">{tempoRelativo(chamado.criado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {erro && <div className="chamados-vazio">{erro}</div>}
        {chamados === null && !erro && <div className="chamados-vazio">Carregando...</div>}
        {chamados?.length === 0 && (
          <div className="chamados-vazio">Nenhum chamado encontrado.</div>
        )}
      </div>
    </div>
  );
}
