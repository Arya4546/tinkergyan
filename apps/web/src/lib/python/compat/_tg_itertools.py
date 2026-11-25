# itertools for programs that run in the browser: adds what MicroPython's
# version lacks (permutations, combinations, product, groupby, ...), written
# to give the same results in the same order as Python's.
from _tg_real_itertools import *


def _chain(iterables):
    for it in iterables:
        for x in it:
            yield x


class chain:
    # chain(...) is a plain generator; chain.from_iterable(...) also works.
    def __new__(cls, *iterables):
        return _chain(iterables)

    @staticmethod
    def from_iterable(iterables):
        return _chain(iterables)


def accumulate(iterable, func=None, *, initial=None):
    it = iter(iterable)
    total = initial
    if initial is None:
        try:
            total = next(it)
        except StopIteration:
            return
    yield total
    for x in it:
        total = total + x if func is None else func(total, x)
        yield total


def permutations(iterable, r=None):
    pool = tuple(iterable)
    n = len(pool)
    r = n if r is None else r
    if r < 0:
        raise ValueError("r must be non-negative")
    if r > n:
        return
    indices = list(range(n))
    cycles = list(range(n, n - r, -1))
    yield tuple(pool[i] for i in indices[:r])
    while n:
        for i in range(r - 1, -1, -1):
            cycles[i] -= 1
            if cycles[i] == 0:
                indices[i:] = indices[i + 1 :] + indices[i : i + 1]
                cycles[i] = n - i
            else:
                j = cycles[i]
                indices[i], indices[-j] = indices[-j], indices[i]
                yield tuple(pool[i] for i in indices[:r])
                break
        else:
            return


def combinations(iterable, r):
    pool = tuple(iterable)
    n = len(pool)
    if r < 0:
        raise ValueError("r must be non-negative")
    if r > n:
        return
    indices = list(range(r))
    yield tuple(pool[i] for i in indices)
    while True:
        for i in range(r - 1, -1, -1):
            if indices[i] != i + n - r:
                break
        else:
            return
        indices[i] += 1
        for j in range(i + 1, r):
            indices[j] = indices[j - 1] + 1
        yield tuple(pool[i] for i in indices)


def combinations_with_replacement(iterable, r):
    pool = tuple(iterable)
    n = len(pool)
    if r < 0:
        raise ValueError("r must be non-negative")
    if not n and r:
        return
    indices = [0] * r
    yield tuple(pool[i] for i in indices)
    while True:
        for i in range(r - 1, -1, -1):
            if indices[i] != n - 1:
                break
        else:
            return
        indices[i:] = [indices[i] + 1] * (r - i)
        yield tuple(pool[i] for i in indices)


def product(*iterables, repeat=1):
    if repeat < 0:
        raise ValueError("repeat argument cannot be negative")
    pools = [tuple(p) for p in iterables] * repeat
    for pool in pools:
        if not pool:
            return
    n = len(pools)
    indices = [0] * n  # counts up like an odometer, one item at a time
    yield tuple(pool[0] for pool in pools)
    while True:
        for i in range(n - 1, -1, -1):
            indices[i] += 1
            if indices[i] < len(pools[i]):
                break
            indices[i] = 0
        else:
            return
        yield tuple(pools[i][indices[i]] for i in range(n))


def zip_longest(*iterables, fillvalue=None):
    iterators = [iter(it) for it in iterables]
    active = len(iterators)
    if not active:
        return
    while True:
        values = []
        for i in range(len(iterators)):
            it = iterators[i]
            if it is None:
                values.append(fillvalue)
                continue
            try:
                values.append(next(it))
            except StopIteration:
                active -= 1
                if not active:
                    return
                iterators[i] = None
                values.append(fillvalue)
        yield tuple(values)


def groupby(iterable, key=None):
    # Each group is a list's iterator (Python's is lazier, but the items and
    # their order are the same).
    keyfunc = (lambda x: x) if key is None else key
    group = []
    current = None
    started = False
    for item in iterable:
        k = keyfunc(item)
        if started and k == current:
            group.append(item)
            continue
        if started:
            yield current, iter(group)
        current = k
        group = [item]
        started = True
    if started:
        yield current, iter(group)


def pairwise(iterable):
    it = iter(iterable)
    try:
        prev = next(it)
    except StopIteration:
        return
    for x in it:
        yield prev, x
        prev = x


def compress(data, selectors):
    for d, s in zip(data, selectors):
        if s:
            yield d


def dropwhile(predicate, iterable):
    it = iter(iterable)
    for x in it:
        if not predicate(x):
            yield x
            break
    for x in it:
        yield x


def takewhile(predicate, iterable):
    for x in iterable:
        if not predicate(x):
            return
        yield x


def filterfalse(predicate, iterable):
    if predicate is None:
        predicate = bool
    for x in iterable:
        if not predicate(x):
            yield x


def batched(iterable, n):
    if n < 1:
        raise ValueError("n must be at least one")
    batch = []
    for x in iterable:
        batch.append(x)
        if len(batch) == n:
            yield tuple(batch)
            batch = []
    if batch:
        yield tuple(batch)
