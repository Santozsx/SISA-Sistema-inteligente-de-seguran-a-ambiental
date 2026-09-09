import { Map } from "lucide-react";
import "./instituto.css";

type StatusInstituto = "ativo" | "em-rota";

interface InstitutoItem {
  id: string;
  iniciais: string;
  corFundo: string;
  corTexto: string;
  nome: string;
  tipo: string;
  distancia: string;
  status: StatusInstituto;
  statusLabel: string;
}

const INSTITUTOS: InstitutoItem[] = [
  {
    id: "biomas",
    iniciais: "IB",
    corFundo: "#4c8eff",
    corTexto: "#ffffff",
    nome: "Instituto Biomas",
    tipo: "Fiscalização florestal",
    distancia: "4.2 km",
    status: "ativo",
    statusLabel: "ativo",
  },
  {
    id: "guarda",
    iniciais: "GA",
    corFundo: "#2c3b47",
    corTexto: "#dbe4ea",
    nome: "Guarda Ambiental",
    tipo: "Resgate de fauna",
    distancia: "11 km",
    status: "ativo",
    statusLabel: "ativo",
  },
  {
    id: "fiscalizacao",
    iniciais: "FA",
    corFundo: "#e0a83e",
    corTexto: "#1a1406",
    nome: "Fiscalização Amazônia",
    tipo: "Monitoramento hídrico",
    distancia: "23 km",
    status: "em-rota",
    statusLabel: "em rota",
  },
];

const MAPA_PONTOS = [
  { id: "p1", cor: "#34d399", top: "28%", left: "18%" },
  { id: "p2", cor: "#4c8eff", top: "38%", left: "52%" },
  { id: "p3", cor: "#34d399", top: "58%", left: "34%" },
  { id: "p4", cor: "#f5a524", top: "68%", left: "58%" },
];

export default function Institutos() {
  return (
    <div className="institutos-conteudo">
      <div className="institutos-cabecalho">
        <h2 className="institutos-titulo">Institutos próximos</h2>
        <span className="institutos-subtitulo">3 num raio de 30 km</span>
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

      <div className="institutos-lista">
        {INSTITUTOS.map((instituto) => (
          <div key={instituto.id} className="institutos-card">
            <span
              className="institutos-avatar"
              style={{ background: instituto.corFundo, color: instituto.corTexto }}
            >
              {instituto.iniciais}
            </span>

            <div className="institutos-info">
              <div className="institutos-nome">{instituto.nome}</div>
              <div className="institutos-detalhe">
                {instituto.tipo} · {instituto.distancia}
              </div>
            </div>

            <div className="institutos-acoes">
              <div className={`institutos-status institutos-status--${instituto.status}`}>
                <span className="institutos-status-quadrado" />
                {instituto.statusLabel}
              </div>
              <a className="institutos-conversar" href="#">
                conversar
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}