import os

import pytest

from app.cripto import ALGORITMOS, ErroIntegridade
from app.cripto.sisa_cifra import SisaCifra


@pytest.mark.parametrize("algoritmo", list(ALGORITMOS))
@pytest.mark.parametrize("tamanho", [0, 1, 31, 32, 33, 1000])
def test_ida_e_volta(algoritmo, tamanho):
    chave, dados = os.urandom(32), os.urandom(tamanho)
    alg = ALGORITMOS[algoritmo]
    assert alg.decifrar(alg.cifrar(dados, chave), chave) == dados


def test_sisa_usa_nonce_aleatorio():
    cifra = SisaCifra(os.urandom(32))
    assert cifra.cifrar(b"mesmo texto") != cifra.cifrar(b"mesmo texto")


def test_sisa_detecta_adulteracao_e_chave_errada():
    cifra = SisaCifra(os.urandom(32))
    pacote = bytearray(cifra.cifrar(b"coordenadas do garimpo"))
    pacote[25] ^= 1
    with pytest.raises(ErroIntegridade):
        cifra.decifrar(bytes(pacote))
    with pytest.raises(ErroIntegridade):
        SisaCifra(os.urandom(32)).decifrar(cifra.cifrar(b"x"))


def test_sisa_rejeita_chave_de_tamanho_errado():
    with pytest.raises(ValueError):
        SisaCifra(b"curta")
