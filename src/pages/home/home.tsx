import { MoreHorizontal, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import "./home.css";

type StatusInstituto = "ativo" | "em-rota";

interface Instituto {
  id: string;
  nome: string;
  distancia: string;
  status: StatusInstituto;
  statusLabel: string;
}

type TagNoticia = "urgente" | "resolvido";

interface Noticia {
  id: string;
  tag: TagNoticia;
  titulo: string;
  fonte: string;
  tempo: string;
}

const INSTITUTOS: Instituto[] = [
  { id: "biomas", nome: "Instituto Biomas", distancia: "4.2 km", status: "ativo", statusLabel: "ativo" },
  { id: "guarda", nome: "Guarda Ambiental", distancia: "11 km", status: "ativo", statusLabel: "ativo" },
  { id: "fiscalizacao", nome: "Fiscalização Amaz.", distancia: "23 km", status: "em-rota", statusLabel: "em rota" },
];

const NOTICIAS: Noticia[] = [
  {
    id: "garimpo-para",
    tag: "urgente",
    titulo: "Garimpo identificado no Pará",
    fonte: "Instituto Biomas",
    tempo: "há 2h",
  },
  {
    id: "animais-resgatados",
    tag: "resolvido",
    titulo: "Animais resgatados em operação",
    fonte: "Guarda Ambiental",
    tempo: "1 dia",
  },
];

export default function Home() {
  return (
    <div className="home-conteudo">
      <section className="home-secao">
        <div className="home-secao-cabecalho">
          <h2 className="home-secao-titulo">INSTITUTOS PRÓXIMOS</h2>
          <button className="home-icone-botao">
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div className="home-institutos-grade">
          {INSTITUTOS.map((instituto) => (
            <div key={instituto.id} className="home-instituto-card">
              <div className={`home-status home-status--${instituto.status}`}>
                <span className="home-status-quadrado" />
                {instituto.statusLabel}
              </div>
              <div className="home-instituto-nome">{instituto.nome}</div>
              <div className="home-instituto-distancia">{instituto.distancia}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-secao">
        <div className="home-secao-cabecalho">
          <h2 className="home-secao-titulo">MURAL DE NOTÍCIAS</h2>
          <a className="home-chat-rapido" href="#">
            chat rápido
            <ArrowUpRight size={14} />
          </a>
        </div>

        <div className="home-noticias-grade">
          {NOTICIAS.map((noticia) => (
            <article key={noticia.id} className="home-noticia-card">
              <div className="home-noticia-imagem">
                <ImageIcon size={22} />
              </div>
              <div className="home-noticia-corpo">
                <span className={`home-tag home-tag--${noticia.tag}`}>{noticia.tag}</span>
                <div className="home-noticia-titulo">{noticia.titulo}</div>
                <div className="home-noticia-meta">
                  {noticia.fonte} · {noticia.tempo}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}