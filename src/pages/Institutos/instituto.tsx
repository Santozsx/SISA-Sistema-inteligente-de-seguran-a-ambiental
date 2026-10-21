import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";
import { listarInstitutos, type Instituto } from "../../services/api";
import { corAvatar, distancia } from "../../utils/formatar";
import "./instituto.css";

const RAIO_KM = 30;

const MAPA_PONTOS = [
  { id: "p1", cor: "#34d399", top: "28%", left: "18%" },
  { id: "p2", cor: "#4c8eff", top: "38%", left: "52%" },
  { id: "p3", cor: "#34d399", top: "58%", left: "34%" },
  { id: "p4", cor: "#f5a524", top: "68%", left: "58%" },
];

function subtitulo(institutos: Instituto[]): string {
  const comDistancia = institutos.filter((i) => i.distancia_km !== null);
  if (comDistancia.length === 0) {
    return `${institutos.length} cadastrados · defina sua localização em Config`;
  }
  const noRaio = comDistancia.filter((i) => (i.distancia_km ?? Infinity) <= RAIO_KM).length;
  return `${noRaio} num raio de ${RAIO_KM} km`;
}

export default function Institutos() {
  const [institutos, setInstitutos] = useState<Instituto[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarInstitutos()
      .then(setInstitutos)
      .catch((e: Error) => setErro(e.message));
  }, []);

  return (
    <div className="institutos-conteudo">
      <div className="institutos-cabecalho">
        <h2 className="institutos-titulo">Institutos próximos</h2>
        {institutos && <span className="institutos-subtitulo">{subtitulo(institutos)}</span>}
      </div>

      <div className="institutos-mapa">
        {MAPA_PONTOS.map((ponto) => (
          <span
            key={ponto.id}
            className="institutos-mapa-ponto"
            style={{ top: ponto.top, left: ponto.left, background: ponto.cor }}
          />
        ))}
        <div className="institutos-mapa-icone">
          <Map size={26} />
        </div>
      </div>

      {erro && <p className="aviso aviso--erro">{erro}</p>}
      {institutos === null && !erro && <p className="estado-vazio">Carregando...</p>}
      {institutos?.length === 0 && <p className="estado-vazio">Nenhum outro instituto cadastrado.</p>}

      <div className="institutos-lista">
        {institutos?.map((instituto) => {
          const cor = corAvatar(instituto.id);
          return (
            <div key={instituto.id} className="institutos-card">
              <span
                className="institutos-avatar"
                style={{ background: cor.fundo, color: cor.texto }}
              >
                {instituto.iniciais}
              </span>

              <div className="institutos-info">
                <div className="institutos-nome">{instituto.nome}</div>
                <div className="institutos-detalhe">
                  {instituto.tipo} · {distancia(instituto.distancia_km)}
                </div>
              </div>

              <div className="institutos-acoes">
                <div className={`institutos-status institutos-status--${instituto.status}`}>
                  <span className="institutos-status-quadrado" />
                  {instituto.status_label}
                </div>
                <Link className="institutos-conversar" to={`/mensagens?com=${instituto.id}`}>
                  conversar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
