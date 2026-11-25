# random for programs that run in the browser: adds shuffle, sample and
# choices to MicroPython's randint, choice, random, ...
from _tg_real_random import *


def shuffle(x):
    for i in range(len(x) - 1, 0, -1):
        j = randrange(i + 1)
        x[i], x[j] = x[j], x[i]


def sample(population, k):
    pool = list(population)
    if not 0 <= k <= len(pool):
        raise ValueError("Sample larger than population or is negative")
    result = []
    for i in range(k):
        j = randrange(len(pool) - i)
        result.append(pool[j])
        pool[j] = pool[len(pool) - i - 1]
    return result


def choices(population, weights=None, *, cum_weights=None, k=1):
    pool = list(population)
    if not pool:
        raise IndexError("Cannot choose from an empty sequence")
    if weights is None and cum_weights is None:
        return [pool[randrange(len(pool))] for _ in range(k)]
    if cum_weights is None:
        cum_weights = []
        total = 0
        for w in weights:
            total += w
            cum_weights.append(total)
    if len(cum_weights) != len(pool):
        raise ValueError("The number of weights does not match the population")
    total = cum_weights[-1]
    if total <= 0:
        raise ValueError("Total of weights must be greater than zero")
    result = []
    for _ in range(k):
        r = random() * total
        lo, hi = 0, len(cum_weights) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if r < cum_weights[mid]:
                hi = mid
            else:
                lo = mid + 1
        result.append(pool[lo])
    return result
