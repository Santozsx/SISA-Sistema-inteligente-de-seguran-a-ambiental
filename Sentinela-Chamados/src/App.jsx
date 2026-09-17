import { useState } from "react";
import "./App.css";

function App() {
  // Guarda o filtro selecionado
  const [filtro, setFiltro] = useState("todos");

  // Dados dos chamados
  const chamados = [
    {
      id: "4471",
      categoria: "Derrubada de árvores",
      instituto: "Instituto Biomas",
      status: "aberto",
      data: "há 2h",
    },
    {
      id: "4468",
      categoria: "Poluição hídrica",
      instituto: "Fiscalização Amaz.",
      status: "em análise",
      data: "3 dias",
    },
    {
      id: "4390",
      categoria: "Apreensão de animais",
      instituto: "Guarda Ambiental",
      status: "resolvido",
      data: "1 dia",
    },
    {
      id: "4381",
      categoria: "Garimpo clandestino",
      instituto: "Instituto Biomas",
      status: "resolvido",
      data: "5 dias",
    },
  ];

  // Filtra os chamados
  const chamadosFiltrados =
    filtro === "todos"
      ? chamados
      : chamados.filter((chamado) => chamado.status === filtro);

  return (
    <div className="app">

      {/* ================= SIDEBAR ================= */}

      <aside className="sidebar">

        {/* Logo */}
        <div className="logo">
          <div className="logo-icon">◉</div>
          <span>Sentinela</span>
        </div>

        {/* Menu */}
        <nav className="menu">

          <a href="#">
            <span className="menu-icon">▣</span>
            Mural
          </a>

          <a href="#">
            <span className="menu-icon">⌖</span>
            Institutos
          </a>

          <a href="#">
            <span className="menu-icon">▱</span>
            Mensagens
          </a>

          <a href="#" className="active">
            <span className="menu-icon">⚠</span>
            Chamados
          </a>

        </nav>

        {/* Configuração */}
        <div className="config">
          <a href="#">
            <span className="menu-icon">⚙</span>
            Config
          </a>
        </div>

      </aside>


      {/* ================= CONTEÚDO ================= */}

      <main className="content">

        {/* Cabeçalho */}
        <header className="header">

          <h1>Chamados registrados</h1>

          <button className="new-button">
            + Novo chamado
          </button>

        </header>


        {/* ================= FILTROS ================= */}

        <div className="filters">

          {/* TODOS */}
          <button
            className={`filter ${
              filtro === "todos" ? "active-filter" : ""
            }`}
            onClick={() => setFiltro("todos")}
          >
            Todos
          </button>


          {/* ABERTOS */}
          <button
            className={`filter ${
              filtro === "aberto" ? "active-filter" : ""
            }`}
            onClick={() => setFiltro("aberto")}
          >
            Abertos
          </button>


          {/* EM ANÁLISE */}
          <button
            className={`filter ${
              filtro === "em análise" ? "active-filter" : ""
            }`}
            onClick={() => setFiltro("em análise")}
          >
            Em análise
          </button>


          {/* RESOLVIDOS */}
          <button
            className={`filter ${
              filtro === "resolvido" ? "active-filter" : ""
            }`}
            onClick={() => setFiltro("resolvido")}
          >
            Resolvidos
          </button>

        </div>


        {/* ================= TABELA ================= */}

        <div className="table-container">

          <table>

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

                  <td className="id">
                    {chamado.id}
                  </td>

                  <td className="categoria">
                    {chamado.categoria}
                  </td>

                  <td>
                    {chamado.instituto}
                  </td>

                  <td>

                    <span
                      className={`status ${chamado.status
                        .replace(" ", "-")}`}
                    >
                      {chamado.status}
                    </span>

                  </td>

                  <td className="data">
                    {chamado.data}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>


          {/* Caso não exista nenhum chamado */}
          {chamadosFiltrados.length === 0 && (
            <div className="empty">
              Nenhum chamado encontrado.
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

export default App;