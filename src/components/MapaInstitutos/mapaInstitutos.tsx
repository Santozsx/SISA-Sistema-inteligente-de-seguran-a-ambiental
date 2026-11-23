import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Instituto, StatusInstituto } from "../../services/api";
import { distancia } from "../../utils/formatar";
import "./mapaInstitutos.css";

// Mapa real (Leaflet + OpenStreetMap, sem chave de API) com os institutos cadastrados.

interface Posicao {
  latitude: number;
  longitude: number;
}

interface Props {
  institutos: Instituto[];
  minhaPosicao: Posicao | null; // localização do meu instituto (definida em Config)
  raioKm: number;
  selecionado: number | null; // id do instituto clicado na lista
  onConversar: (institutoId: number) => void;
}

const COR_STATUS: Record<StatusInstituto, string> = {
  ativo: "#34d399",
  "em-rota": "#f5a524",
  inativo: "#8a93a6",
};

const CENTRO_BRASIL: L.LatLngTuple = [-14.2, -51.9];

// Mapa escuro da CARTO (baseado no OpenStreetMap), combina com o tema do SISA.
const CAMADA_MAPA = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATRIBUICAO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const temCoordenadas = (i: Instituto): i is Instituto & Posicao => i.latitude !== null && i.longitude !== null;

// Conteúdo do balão montado com textContent (nada de HTML vindo da API entra como HTML).
function conteudoPopup(instituto: Instituto, aoConversar: () => void): HTMLElement {
  const caixa = document.createElement("div");
  caixa.className = "mapa-popup";

  const nome = document.createElement("strong");
  nome.className = "mapa-popup-nome";
  nome.textContent = instituto.nome;

  const detalhe = document.createElement("span");
  detalhe.className = "mapa-popup-detalhe";
  detalhe.textContent = `${instituto.tipo} · ${distancia(instituto.distancia_km)}`;

  const status = document.createElement("span");
  status.className = "mapa-popup-status";
  status.style.color = COR_STATUS[instituto.status];
  status.textContent = instituto.status_label;

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "mapa-popup-conversar";
  botao.textContent = "conversar";
  botao.addEventListener("click", aoConversar);

  caixa.append(nome, detalhe, status, botao);
  return caixa;
}

export default function MapaInstitutos({ institutos, minhaPosicao, raioKm, selecionado, onConversar }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<number, L.CircleMarker>());
  const conversar = useRef(onConversar);

  useEffect(() => {
    conversar.current = onConversar;
  }, [onConversar]);

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!elemento.current) return;
    const m = L.map(elemento.current, { center: CENTRO_BRASIL, zoom: 4, scrollWheelZoom: false });
    L.tileLayer(CAMADA_MAPA, { attribution: ATRIBUICAO, subdomains: "abcd", maxZoom: 19 }).addTo(m);
    // Rolar a página não mexe no zoom; depois de clicar no mapa, a rodinha passa a dar zoom.
    m.on("click", () => m.scrollWheelZoom.enable());
    m.on("mouseout", () => m.scrollWheelZoom.disable());
    camada.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => {
      m.remove();
      mapa.current = null;
      camada.current = null;
    };
  }, []);

  // Desenha (ou redesenha) os pontos quando os dados chegam.
  useEffect(() => {
    const m = mapa.current;
    const grupo = camada.current;
    if (!m || !grupo) return;
    grupo.clearLayers();
    marcadores.current.clear();

    const limites = L.latLngBounds([]);

    if (minhaPosicao) {
      const centro: L.LatLngTuple = [minhaPosicao.latitude, minhaPosicao.longitude];
      const raio = L.circle(centro, {
        radius: raioKm * 1000,
        color: "#4c8eff",
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(grupo);
      L.circleMarker(centro, { radius: 7, color: "#ffffff", weight: 2, fillColor: "#4c8eff", fillOpacity: 1 })
        .bindTooltip("Meu instituto", { direction: "top", offset: [0, -6] })
        .addTo(grupo);
      limites.extend(raio.getBounds());
    }

    for (const instituto of institutos.filter(temCoordenadas)) {
      const ponto: L.LatLngTuple = [instituto.latitude, instituto.longitude];
      const marcador = L.circleMarker(ponto, {
        radius: 8,
        color: "#0b0e18",
        weight: 2,
        fillColor: COR_STATUS[instituto.status],
        fillOpacity: 0.95,
      })
        .bindTooltip(instituto.nome, { direction: "top", offset: [0, -6] })
        .bindPopup(() => conteudoPopup(instituto, () => conversar.current(instituto.id)), { closeButton: false })
        .addTo(grupo);
      marcadores.current.set(instituto.id, marcador);
      if (!minhaPosicao) limites.extend(ponto);
    }

    if (limites.isValid()) m.fitBounds(limites, { padding: [24, 24], maxZoom: 12 });
    else m.setView(CENTRO_BRASIL, 4);
  }, [institutos, minhaPosicao, raioKm]);

  // Clique na lista: centraliza e abre o balão do instituto.
  useEffect(() => {
    const m = mapa.current;
    const marcador = selecionado === null ? undefined : marcadores.current.get(selecionado);
    if (!m || !marcador) return;
    m.flyTo(marcador.getLatLng(), Math.max(m.getZoom(), 11), { duration: 0.6 });
    marcador.openPopup();
  }, [selecionado]);

  const semLocal = institutos.filter((i) => !temCoordenadas(i)).length;

  return (
    <div className="mapa-institutos">
      <div ref={elemento} className="mapa-institutos-area" role="region" aria-label="Mapa de institutos" />
      <div className="mapa-legenda">
        <span><i style={{ background: COR_STATUS.ativo }} /> ativo</span>
        <span><i style={{ background: COR_STATUS["em-rota"] }} /> em rota</span>
        <span><i style={{ background: COR_STATUS.inativo }} /> inativo</span>
        {minhaPosicao && <span><i className="mapa-legenda-eu" /> meu instituto</span>}
        {semLocal > 0 && <span className="mapa-legenda-aviso">{semLocal} sem localização</span>}
      </div>
    </div>
  );
}
