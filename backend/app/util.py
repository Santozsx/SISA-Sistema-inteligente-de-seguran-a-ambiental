import math
from datetime import datetime, timezone


def agora_utc() -> datetime:
    """Data/hora atual em UTC, sem fuso (o SQLite não guarda fuso horário)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def para_utc(data: datetime) -> datetime:
    if data.tzinfo is None:
        return data
    return data.astimezone(timezone.utc).replace(tzinfo=None)


def distancia_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distância entre dois pontos na superfície da Terra (fórmula de Haversine)."""
    raio_terra = 6371.0
    fi1, fi2 = math.radians(lat1), math.radians(lat2)
    d_fi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    h = math.sin(d_fi / 2) ** 2 + math.cos(fi1) * math.cos(fi2) * math.sin(d_lambda / 2) ** 2
    return 2 * raio_terra * math.asin(math.sqrt(h))


def iniciais(nome: str) -> str:
    palavras = [p for p in nome.split() if p[:1].isupper()] or nome.split()
    return "".join(p[0] for p in palavras[:2]).upper()
