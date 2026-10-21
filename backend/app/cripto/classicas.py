"""
Cifras clássicas, implementadas sobre bytes, usadas apenas para estudo e comparação.

Nenhuma delas é segura: servem para mostrar, na comparação, por que a SISA-Cifra
e o AES-GCM precisam de nonce, difusão e autenticação.
"""


def cesar_cifrar(dados: bytes, chave: bytes) -> bytes:
    """Desloca todos os bytes pelo mesmo valor: y = (x + k) mod 256."""
    deslocamento = chave[0]
    return bytes((b + deslocamento) & 0xFF for b in dados)


def cesar_decifrar(dados: bytes, chave: bytes) -> bytes:
    deslocamento = chave[0]
    return bytes((b - deslocamento) & 0xFF for b in dados)


def vigenere_cifrar(dados: bytes, chave: bytes) -> bytes:
    """Deslocamento diferente por posição, repetindo a chave: y[i] = (x[i] + k[i mod m]) mod 256."""
    m = len(chave)
    return bytes((b + chave[i % m]) & 0xFF for i, b in enumerate(dados))


def vigenere_decifrar(dados: bytes, chave: bytes) -> bytes:
    m = len(chave)
    return bytes((b - chave[i % m]) & 0xFF for i, b in enumerate(dados))


def xor_cifrar(dados: bytes, chave: bytes) -> bytes:
    """XOR com a chave repetida. Cifrar e decifrar são a mesma operação."""
    m = len(chave)
    return bytes(b ^ chave[i % m] for i, b in enumerate(dados))


xor_decifrar = xor_cifrar
