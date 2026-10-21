// O back end devolve datas em UTC sem fuso ("2026-10-21T03:04:34"); o "Z" faz o navegador ler como UTC.
function paraData(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function tempoRelativo(iso: string): string {
  const minutos = Math.floor((Date.now() - paraData(iso).getTime()) / 60000);
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? "1 dia" : `${dias} dias`;
}

export function hora(iso: string): string {
  return paraData(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function distancia(km: number | null): string {
  if (km === null) return "distância desconhecida";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

// Mesma paleta das telas originais, escolhida pelo id para cada instituto manter a sua cor.
const CORES_AVATAR = [
  { fundo: "#4c8eff", texto: "#ffffff" },
  { fundo: "#2c3b47", texto: "#dbe4ea" },
  { fundo: "#e0a83e", texto: "#1a1406" },
  { fundo: "#2e9b63", texto: "#ffffff" },
];

export function corAvatar(id: number) {
  return CORES_AVATAR[id % CORES_AVATAR.length];
}

// Aceita "-23.55, -46.63" no campo de local e devolve as coordenadas, se forem válidas.
export function extrairCoordenadas(texto: string): { latitude: number; longitude: number } | null {
  const partes = texto.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!partes) return null;
  const latitude = Number(partes[1]);
  const longitude = Number(partes[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
