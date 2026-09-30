import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./chamdos.css";

type StatusChamado = "aberto" | "em-analise" | "resolvido";

type Filtro = "todos" | StatusChamado;

interface ChamadoItem {
  id: string;
  categoria: string;
  instituto: string;
  status: StatusChamado;
  statusLabel: string;
  data: string;
}

interface FiltroItem {
  valor: Filtro;
  label: string;
}

const CHAMADOS: ChamadoItem[] = [
  {
    id: "4471",
    categoria: "Derrubada de árvores",
    instituto: "Instituto Biomas",
    status: "aberto",
    statusLabel: "aberto",
    data: "há 2h",
  },
  {
    id: "4468",
    categoria: "Poluição hídrica",
    instituto: "Fiscalização Amaz.",
    status: "em-analise",
    statusLabel: "em análise",
    data: "3 dias",
  },
  {
    id: "4390",
    categoria: "Apreensão de animais",
    instituto: "Guarda Ambiental",
    status: "resolvido",
    statusLabel: "resolvido",
    data: "1 dia",
  },
  {
    id: "4381",
    categoria: "Garimpo clandestino",
    instituto: "Instituto Biomas",
    status: "resolvido",
    statusLabel: "resolvido",
    data: "5 dias",
  },
];

const FILTROS: FiltroItem[] = [
  { valor: "todos", label: "Todos" },
  { valor: "aberto", label: "Abertos" },
  { valor: "em-analise", label: "Em análise" },
  { valor: "resolvido", label: "Resolvidos" },
];


   

export default function Chamados() {
  
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const navigate = useNavigate();


  const chamadosFiltrados =
    filtro === "todos"
      ? CHAMADOS
      : CHAMADOS.filter((chamado) => chamado.status === filtro);

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
            {chamadosFiltrados.map((chamado) => (
              <tr key={chamado.id}>
                <td className="chamados-id">{chamado.id}</td>
                <td className="chamados-categoria">{chamado.categoria}</td>
                <td>{chamado.instituto}</td>
                <td>
                  <span
                    className={`chamados-status chamados-status--${chamado.status}`}
                  >
                    {chamado.statusLabel}
                  </span>
                </td>
                <td className="chamados-data">{chamado.data}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {chamadosFiltrados.length === 0 && (
          <div className="chamados-vazio">Nenhum chamado encontrado.</div>
        )}
      </div>
    </div>
  );
}