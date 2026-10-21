import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import { listarInstitutos, listarMural, type Instituto, type Noticia } from "../../services/api";
import { distancia, tempoRelativo } from "../../utils/formatar";
import "./home.css";

const TAG_LABEL: Record<Noticia["tag"], string> = {
  urgente: "urgente",
  "em-analise": "em análise",
  resolvido: "resolvido",
};

export default function Home() {
  const [institutos, setInstitutos] = useState<Instituto[] | null>(null);
  const [noticias, setNoticias] = useState<Noticia[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([listarInstitutos(), listarMural()])
      .then(([listaInstitutos, listaNoticias]) => {
        setInstitutos(listaInstitutos.slice(0, 3));
        setNoticias(listaNoticias);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  return (
    <div className="home-conteudo">
      {erro && <p className="aviso aviso--erro">{erro}</p>}

      <section className="home-secao">
        <div className="home-secao-cabecalho">
          <h2 className="home-secao-titulo">INSTITUTOS PRÓXIMOS</h2>
          <Link className="home-icone-botao" to="/institutos" aria-label="Ver todos os institutos">
            <MoreHorizontal size={16} />
          </Link>
        </div>

        <div className="home-institutos-grade">
          {institutos === null && !erro && <p className="estado-vazio">Carregando...</p>}
          {institutos?.length === 0 && <p className="estado-vazio">Nenhum outro instituto cadastrado.</p>}
          {institutos?.map((instituto) => (
            <div key={instituto.id} className="home-instituto-card">
              <div className={`home-status home-status--${instituto.status}`}>
                <span className="home-status-quadrado" />
                {instituto.status_label}
              </div>
              <div className="home-instituto-nome">{instituto.nome}</div>
              <div className="home-instituto-distancia">{distancia(instituto.distancia_km)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-secao">
        <div className="home-secao-cabecalho">
          <h2 className="home-secao-titulo">MURAL DE NOTÍCIAS</h2>
          <Link className="home-chat-rapido" to="/mensagens">
            chat rápido
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="home-noticias-grade">
          {noticias === null && !erro && <p className="estado-vazio">Carregando...</p>}
          {noticias?.length === 0 && <p className="estado-vazio">Nenhuma ocorrência registrada ainda.</p>}
          {noticias?.map((noticia) => (
            <article key={noticia.id} className="home-noticia-card">
              <div className="home-noticia-imagem">
                <ImageIcon size={22} />
              </div>
              <div className="home-noticia-corpo">
                <span className={`home-tag home-tag--${noticia.tag}`}>{TAG_LABEL[noticia.tag]}</span>
                <div className="home-noticia-titulo">{noticia.titulo}</div>
                <div className="home-noticia-meta">
                  {noticia.fonte} · {tempoRelativo(noticia.criado_em)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
