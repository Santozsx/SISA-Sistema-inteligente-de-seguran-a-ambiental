import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listarInstitutos, meuPerfil, type Instituto } from "../../services/api";
import MapaInstitutos from "../../components/MapaInstitutos/mapaInstitutos";
import { corAvatar, distancia } from "../../utils/formatar";
import "./instituto.css";

const RAIO_KM = 30;

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
  const [minhaPosicao, setMinhaPosicao] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    listarInstitutos()
      .then(setInstitutos)
      .catch((e: Error) => setErro(e.message));
    // Minha localização (definida em Config) centraliza o mapa; sem ela, o mapa enquadra os institutos.
    meuPerfil()
      .then((perfil) => {
        if (perfil.latitude !== null && perfil.longitude !== null) {
          setMinhaPosicao({ latitude: perfil.latitude, longitude: perfil.longitude });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="institutos-conteudo">
      <div className="institutos-cabecalho">
        <h2 className="institutos-titulo">Institutos próximos</h2>
        {institutos && <span className="institutos-subtitulo">{subtitulo(institutos)}</span>}
      </div>

      <MapaInstitutos
        institutos={institutos ?? []}
        minhaPosicao={minhaPosicao}
        raioKm={RAIO_KM}
        selecionado={selecionado}
        onConversar={(id) => navigate(`/mensagens?com=${id}`)}
      />

      {erro && <p className="aviso aviso--erro">{erro}</p>}
      {institutos === null && !erro && <p className="estado-vazio">Carregando...</p>}
      {institutos?.length === 0 && <p className="estado-vazio">Nenhum outro instituto cadastrado.</p>}

      <div className="institutos-lista">
        {institutos?.map((instituto) => {
          const cor = corAvatar(instituto.id);
          return (
            <div
              key={instituto.id}
              className={`institutos-card ${selecionado === instituto.id ? "institutos-card--selecionado" : ""}`}
              onClick={() => setSelecionado(instituto.id)}
              title={instituto.latitude !== null ? "Ver no mapa" : "Sem localização cadastrada"}
            >
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
