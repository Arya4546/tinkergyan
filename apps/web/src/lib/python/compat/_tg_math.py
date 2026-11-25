# math for programs that run in the browser: adds the whole-number helpers
# MicroPython's version lacks (gcd, lcm, comb, perm, isqrt, prod, ...).
from _tg_real_math import *


def _int(n):
    if isinstance(n, int):
        return n
    raise TypeError("'" + type(n).__name__ + "' object cannot be interpreted as an integer")


def gcd(*integers):
    result = 0
    for n in integers:
        b = abs(_int(n))
        a = result
        while b:
            a, b = b, a % b
        result = a
    return result


def lcm(*integers):
    result = 1
    for n in integers:
        n = abs(_int(n))
        if n == 0:
            return 0
        result = result // gcd(result, n) * n
    return result


def isqrt(n):
    n = _int(n)
    if n < 0:
        raise ValueError("isqrt() argument must be nonnegative")
    if n == 0:
        return 0
    x = 1 << ((len(bin(n)) - 2 + 1) // 2)  # a power of two at least sqrt(n)
    while True:
        y = (x + n // x) // 2
        if y >= x:
            return x
        x = y


def comb(n, k):
    n = _int(n)
    k = _int(k)
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if k < 0:
        raise ValueError("k must be a non-negative integer")
    if k > n:
        return 0
    k = min(k, n - k)
    result = 1
    for i in range(1, k + 1):
        result = result * (n - k + i) // i
    return result


def perm(n, k=None):
    n = _int(n)
    if n < 0:
        raise ValueError("n must be a non-negative integer")
    if k is None:
        k = n
    k = _int(k)
    if k < 0:
        raise ValueError("k must be a non-negative integer")
    if k > n:
        return 0
    result = 1
    for i in range(n - k + 1, n + 1):
        result *= i
    return result


def prod(iterable, *, start=1):
    result = start
    for x in iterable:
        result = result * x
    return result


def hypot(*coordinates):
    return sqrt(sum(x * x for x in coordinates))


def dist(p, q):
    if len(p) != len(q):
        raise ValueError("both points must have the same number of dimensions")
    return sqrt(sum((a - b) * (a - b) for a, b in zip(p, q)))
