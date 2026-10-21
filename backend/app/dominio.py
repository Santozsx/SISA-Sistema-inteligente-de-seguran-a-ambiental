"""Valores fixos do domínio, com os rótulos exibidos no front."""

from typing import Literal

CategoriaChamado = Literal[
    "derrubada-arvores",
    "garimpo-clandestino",
    "poluicao-hidrica",
    "poluicao-atmosferica",
    "animais-apreendidos",
    "outro",
]
CATEGORIAS: dict[str, str] = {
    "derrubada-arvores": "Derrubada de árvores",
    "garimpo-clandestino": "Garimpo clandestino",
    "poluicao-hidrica": "Poluição hídrica",
    "poluicao-atmosferica": "Poluição atmosférica",
    "animais-apreendidos": "Animais silvestres apreendidos",
    "outro": "Outro",
}

StatusChamado = Literal["aberto", "em-analise", "resolvido"]
STATUS_CHAMADO: dict[str, str] = {
    "aberto": "aberto",
    "em-analise": "em análise",
    "resolvido": "resolvido",
}

StatusInstituto = Literal["ativo", "em-rota", "inativo"]
STATUS_INSTITUTO: dict[str, str] = {
    "ativo": "ativo",
    "em-rota": "em rota",
    "inativo": "inativo",
}

PlataformaMobile = Literal["android", "ios", "web"]

TIPOS_ANEXO_PERMITIDOS = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/csv",
    "text/plain",
    "application/json",
}
