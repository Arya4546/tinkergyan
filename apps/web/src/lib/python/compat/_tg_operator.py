# operator for programs that run in the browser: adds itemgetter and
# methodcaller, which MicroPython's version lacks.
from _tg_real_operator import *


def itemgetter(*items):
    if len(items) == 1:
        item = items[0]
        return lambda obj: obj[item]
    return lambda obj: tuple(obj[i] for i in items)


def methodcaller(name, *args, **kwargs):
    return lambda obj: getattr(obj, name)(*args, **kwargs)


def index(a):
    if isinstance(a, int):
        return a
    raise TypeError("'" + type(a).__name__ + "' object cannot be interpreted as an integer")
