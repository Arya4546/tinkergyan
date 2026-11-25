# heapq for programs that run in the browser: adds heappushpop, heapreplace,
# nlargest, nsmallest and merge to MicroPython's heappush/heappop/heapify.
from _tg_real_heapq import *


def heappushpop(heap, item):
    if heap and heap[0] < item:
        smallest = heappop(heap)
        heappush(heap, item)
        return smallest
    return item


def heapreplace(heap, item):
    smallest = heappop(heap)
    heappush(heap, item)
    return smallest


def nlargest(n, iterable, key=None):
    if n <= 0:
        return []
    return sorted(iterable, key=key, reverse=True)[:n]


def nsmallest(n, iterable, key=None):
    if n <= 0:
        return []
    return sorted(iterable, key=key)[:n]


def merge(*iterables, key=None, reverse=False):
    # Same items in the same order as Python's (sorted() keeps equal items in
    # the order they came), but not lazy.
    items = []
    for it in iterables:
        items.extend(it)
    for x in sorted(items, key=key, reverse=reverse):
        yield x
