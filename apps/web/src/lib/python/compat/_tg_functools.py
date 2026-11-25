# functools for programs that run in the browser: adds lru_cache, cache,
# cmp_to_key and total_ordering, which MicroPython does not have.
# reduce, partial, wraps, ... are MicroPython's own.
from _tg_real_functools import *
from collections import OrderedDict, namedtuple

CacheInfo = namedtuple("CacheInfo", ("hits", "misses", "maxsize", "currsize"))

_KWARGS = object()  # separates positional from keyword arguments in a cache key


class _CachedFunction:
    def __init__(self, func, maxsize):
        if maxsize is not None and maxsize < 0:
            maxsize = 0
        self.__wrapped__ = func
        self.__name__ = getattr(func, "__name__", "function")
        self._func = func
        self._maxsize = maxsize
        self._cache = {} if maxsize is None else OrderedDict()
        self._hits = 0
        self._misses = 0

    def __call__(self, *args, **kwargs):
        key = args
        if kwargs:
            key = args + (_KWARGS,) + tuple(sorted(kwargs.items()))
        cache = self._cache
        if key in cache:
            self._hits += 1
            if self._maxsize is not None:
                cache.move_to_end(key)
            return cache[key]
        self._misses += 1
        result = self._func(*args, **kwargs)
        if self._maxsize is None:
            cache[key] = result
        elif self._maxsize > 0:
            cache[key] = result
            if len(cache) > self._maxsize:
                cache.popitem(last=False)
        return result

    def cache_info(self):
        return CacheInfo(self._hits, self._misses, self._maxsize, len(self._cache))

    def cache_clear(self):
        self._cache.clear()
        self._hits = 0
        self._misses = 0

    def __get__(self, obj, objtype=None):
        # Used on a method: bind it like a plain function would be.
        if obj is None:
            return self
        return partial(self, obj)


def lru_cache(maxsize=128, typed=False):
    if callable(maxsize) and not isinstance(maxsize, bool):
        return _CachedFunction(maxsize, 128)  # used as @lru_cache without ()
    if maxsize is not None and not isinstance(maxsize, int):
        raise TypeError("Expected first argument to be an integer, a callable, or None")

    def decorate(func):
        return _CachedFunction(func, maxsize)

    return decorate


def cache(func):
    return _CachedFunction(func, None)


def cmp_to_key(mycmp):
    class K:
        def __init__(self, obj):
            self.obj = obj

        def __lt__(self, other):
            return mycmp(self.obj, other.obj) < 0

        def __gt__(self, other):
            return mycmp(self.obj, other.obj) > 0

        def __eq__(self, other):
            return mycmp(self.obj, other.obj) == 0

        def __le__(self, other):
            return mycmp(self.obj, other.obj) <= 0

        def __ge__(self, other):
            return mycmp(self.obj, other.obj) >= 0

        __hash__ = None

    return K


def total_ordering(cls):
    has = lambda name: name in cls.__dict__
    if has("__lt__"):
        lt = cls.__lt__
        if not has("__gt__"):
            cls.__gt__ = lambda a, b: not (lt(a, b) or a == b)
        if not has("__le__"):
            cls.__le__ = lambda a, b: lt(a, b) or a == b
        if not has("__ge__"):
            cls.__ge__ = lambda a, b: not lt(a, b)
    elif has("__le__"):
        le = cls.__le__
        if not has("__lt__"):
            cls.__lt__ = lambda a, b: le(a, b) and not a == b
        if not has("__gt__"):
            cls.__gt__ = lambda a, b: not le(a, b)
        if not has("__ge__"):
            cls.__ge__ = lambda a, b: not le(a, b) or a == b
    elif has("__gt__"):
        gt = cls.__gt__
        if not has("__lt__"):
            cls.__lt__ = lambda a, b: not (gt(a, b) or a == b)
        if not has("__ge__"):
            cls.__ge__ = lambda a, b: gt(a, b) or a == b
        if not has("__le__"):
            cls.__le__ = lambda a, b: not gt(a, b)
    elif has("__ge__"):
        ge = cls.__ge__
        if not has("__le__"):
            cls.__le__ = lambda a, b: not ge(a, b) or a == b
        if not has("__lt__"):
            cls.__lt__ = lambda a, b: not ge(a, b)
        if not has("__gt__"):
            cls.__gt__ = lambda a, b: ge(a, b) and not a == b
    else:
        raise ValueError("must define at least one ordering operation: < > <= >=")
    return cls
