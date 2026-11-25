# collections for programs that run in the browser.
#
# MicroPython's own versions differ from Python's in ways that break ordinary
# programs: deque() needs two arguments, defaultdict cannot be looped over
# (the loop never ends), OrderedDict has no move_to_end() and looks keys up
# one by one, and there is no Counter. These match Python 3 instead.
# Everything else (namedtuple, ...) is MicroPython's own.
from _tg_real_collections import *

_END = object()  # marks both ends of the key chain in _Ordered


def _check_int(n, what):
    if not isinstance(n, int):
        raise TypeError(what + " must be an integer, not '" + type(n).__name__ + "'")


class _Ordered(dict):
    # A dict that remembers the order keys were added, like Python's (a
    # MicroPython dict does not). Each key's neighbours are kept in
    # self._links, so adding, removing and moving a key all take one step.

    def __init__(self, *args, **kwargs):
        super().__init__()
        self._links = {}
        self._head = _END
        self._tail = _END
        if args or kwargs:
            self.update(*args, **kwargs)

    # -- the key chain --
    def _link_last(self, key):
        tail = self._tail
        self._links[key] = [tail, _END]
        if tail is _END:
            self._head = key
        else:
            self._links[tail][1] = key
        self._tail = key

    def _link_first(self, key):
        head = self._head
        self._links[key] = [_END, head]
        if head is _END:
            self._tail = key
        else:
            self._links[head][0] = key
        self._head = key

    def _unlink(self, key):
        prev, nxt = self._links.pop(key)
        if prev is _END:
            self._head = nxt
        else:
            self._links[prev][1] = nxt
        if nxt is _END:
            self._tail = prev
        else:
            self._links[nxt][0] = prev

    def _value(self, key):
        return super().__getitem__(key)

    # -- changing --
    def __setitem__(self, key, value):
        if key not in self._links:
            self._link_last(key)
        super().__setitem__(key, value)

    def __delitem__(self, key):
        super().__delitem__(key)
        self._unlink(key)

    def pop(self, key, *default):
        if key in self._links:
            value = super().__getitem__(key)
            del self[key]
            return value
        if default:
            return default[0]
        raise KeyError(key)

    def popitem(self, last=True):
        if not self._links:
            raise KeyError("dictionary is empty")
        key = self._tail if last else self._head
        value = super().__getitem__(key)
        del self[key]
        return key, value

    def setdefault(self, key, default=None):
        if key in self._links:
            return super().__getitem__(key)
        self[key] = default
        return default

    def update(self, *args, **kwargs):
        if len(args) > 1:
            raise TypeError("update expected at most 1 argument, got " + str(len(args)))
        if args:
            other = args[0]
            if isinstance(other, dict):
                for key in other:
                    self[key] = other[key]
            elif hasattr(other, "keys"):
                for key in other.keys():
                    self[key] = other[key]
            else:
                for key, value in other:
                    self[key] = value
        for key in kwargs:
            self[key] = kwargs[key]

    def clear(self):
        super().clear()
        self._links = {}
        self._head = _END
        self._tail = _END

    @classmethod
    def fromkeys(cls, iterable, value=None):
        d = cls()
        for key in iterable:
            d[key] = value
        return d

    # -- reading, in order --
    def __iter__(self):
        links = self._links
        key = self._head
        while key is not _END:
            nxt = links[key][1]
            yield key
            key = nxt

    def __reversed__(self):
        links = self._links
        key = self._tail
        while key is not _END:
            prev = links[key][0]
            yield key
            key = prev

    def keys(self):
        return list(self)

    def values(self):
        value = self._value
        return [value(k) for k in self]

    def items(self):
        value = self._value
        return [(k, value(k)) for k in self]

    def copy(self):
        return self.__class__(self)

    def __copy__(self):
        return self.copy()

    def _body(self):
        value = self._value
        return "{" + ", ".join(repr(k) + ": " + repr(value(k)) for k in self) + "}"

    def __repr__(self):
        return self._body()

    def __str__(self):
        return self.__repr__()


class OrderedDict(_Ordered):
    def move_to_end(self, key, last=True):
        if key not in self._links:
            raise KeyError(key)
        if (self._tail if last else self._head) == key:
            return  # already there
        self._unlink(key)
        if last:
            self._link_last(key)
        else:
            self._link_first(key)

    def __eq__(self, other):
        if isinstance(other, OrderedDict):
            return self.items() == other.items()
        if not isinstance(other, dict) or len(self) != len(other):
            return False
        for key in self:
            if key not in other or other[key] != self._value(key):
                return False
        return True

    def __ne__(self, other):
        return not self == other

    def __repr__(self):
        if not self:
            return "OrderedDict()"
        return "OrderedDict(" + self._body() + ")"


class defaultdict(_Ordered):
    def __init__(self, default_factory=None, *args, **kwargs):
        if default_factory is not None and not callable(default_factory):
            raise TypeError("first argument must be callable or None")
        self.default_factory = default_factory
        super().__init__(*args, **kwargs)

    def __getitem__(self, key):
        try:
            return super().__getitem__(key)
        except KeyError:
            return self.__missing__(key)

    def __missing__(self, key):
        if self.default_factory is None:
            raise KeyError(key)
        value = self.default_factory()
        self[key] = value
        return value

    def copy(self):
        return defaultdict(self.default_factory, self.items())

    def __repr__(self):
        return "defaultdict(" + repr(self.default_factory) + ", " + self._body() + ")"


def _count_of(item):
    return item[1]


class Counter(_Ordered):
    def __init__(self, iterable=None, **kwargs):
        super().__init__()
        self.update(iterable, **kwargs)

    def __getitem__(self, key):
        try:
            return super().__getitem__(key)
        except KeyError:
            return 0

    def __missing__(self, key):
        return 0

    def update(self, iterable=None, **kwargs):
        if iterable is not None:
            get = self.get
            if isinstance(iterable, dict):
                for elem in iterable:
                    self[elem] = get(elem, 0) + iterable[elem]
            else:
                for elem in iterable:
                    self[elem] = get(elem, 0) + 1
        if kwargs:
            self.update(kwargs)

    def subtract(self, iterable=None, **kwargs):
        if iterable is not None:
            get = self.get
            if isinstance(iterable, dict):
                for elem in iterable:
                    self[elem] = get(elem, 0) - iterable[elem]
            else:
                for elem in iterable:
                    self[elem] = get(elem, 0) - 1
        if kwargs:
            self.subtract(kwargs)

    def most_common(self, n=None):
        ordered = sorted(self.items(), key=_count_of, reverse=True)
        return ordered if n is None else ordered[: max(n, 0)]

    def elements(self):
        for elem, count in self.items():
            for _ in range(count):
                yield elem

    def total(self):
        return sum(self.values())

    def copy(self):
        return Counter(self)

    def _keep(self, pairs):
        result = Counter()
        for elem, count in pairs:
            if count > 0:
                result[elem] = count
        return result

    def __add__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        pairs = [(e, c + other[e]) for e, c in self.items()]
        pairs += [(e, c) for e, c in other.items() if e not in self]
        return self._keep(pairs)

    def __sub__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        pairs = [(e, c - other[e]) for e, c in self.items()]
        pairs += [(e, -c) for e, c in other.items() if e not in self]
        return self._keep(pairs)

    def __or__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        pairs = [(e, max(c, other[e])) for e, c in self.items()]
        pairs += [(e, c) for e, c in other.items() if e not in self]
        return self._keep(pairs)

    def __and__(self, other):
        if not isinstance(other, Counter):
            return NotImplemented
        return self._keep([(e, min(c, other[e])) for e, c in self.items()])

    def __pos__(self):
        return self._keep(self.items())

    def __neg__(self):
        return self._keep([(e, -c) for e, c in self.items()])

    def __eq__(self, other):
        if not isinstance(other, dict):
            return False
        for e in self:
            if self[e] != other.get(e, 0):
                return False
        for e in other:
            if other[e] != self.get(e, 0):
                return False
        return True

    def __ne__(self, other):
        return not self == other

    def __repr__(self):
        if not self:
            return "Counter()"
        body = ", ".join(repr(e) + ": " + repr(c) for e, c in self.most_common())
        return "Counter({" + body + "})"


class deque:
    # Items are kept in two lists: _front holds the left part in reverse
    # (its last item is the leftmost), _back the right part in order, so
    # adding or removing at either end takes one step.

    def __init__(self, iterable=(), maxlen=None):
        if maxlen is not None:
            _check_int(maxlen, "maxlen")
            if maxlen < 0:
                raise ValueError("maxlen must be non-negative")
        self._front = []
        self._back = []
        self._maxlen = maxlen
        self.extend(iterable)

    @property
    def maxlen(self):
        return self._maxlen

    def _set(self, items):
        self._front = []
        self._back = list(items)

    def _balance(self, to_front):
        # Move half of the other side across when one side runs out.
        if to_front:
            back = self._back
            half = (len(back) + 1) // 2
            moved = back[:half]
            moved.reverse()
            self._front = moved
            self._back = back[half:]
        else:
            front = self._front
            half = (len(front) + 1) // 2
            moved = front[:half]
            moved.reverse()
            self._back = moved
            self._front = front[half:]

    def __len__(self):
        return len(self._front) + len(self._back)

    def __bool__(self):
        return bool(self._front) or bool(self._back)

    def append(self, x):
        self._back.append(x)
        if self._maxlen is not None and len(self) > self._maxlen:
            self.popleft()

    def appendleft(self, x):
        self._front.append(x)
        if self._maxlen is not None and len(self) > self._maxlen:
            self.pop()

    def pop(self):
        if not self._back:
            if not self._front:
                raise IndexError("pop from an empty deque")
            self._balance(False)
        return self._back.pop()

    def popleft(self):
        if not self._front:
            if not self._back:
                raise IndexError("pop from an empty deque")
            self._balance(True)
        return self._front.pop()

    def extend(self, iterable):
        if iterable is self:
            iterable = list(iterable)
        for x in iterable:
            self.append(x)

    def extendleft(self, iterable):
        if iterable is self:
            iterable = list(iterable)
        for x in iterable:
            self.appendleft(x)

    def clear(self):
        self._front = []
        self._back = []

    def copy(self):
        return deque(self, self._maxlen)

    def __copy__(self):
        return self.copy()

    def count(self, x):
        return self._front.count(x) + self._back.count(x)

    def index(self, x, start=0, stop=None):
        items = list(self)
        if stop is None:
            stop = len(items)
        for i in range(max(start, 0), min(stop, len(items))):
            if items[i] == x:
                return i
        raise ValueError(repr(x) + " is not in deque")

    def insert(self, i, x):
        if self._maxlen is not None and len(self) >= self._maxlen:
            raise IndexError("deque already at its maximum size")
        items = list(self)
        items.insert(i, x)
        self._set(items)

    def remove(self, x):
        items = list(self)
        for i in range(len(items)):
            if items[i] == x:
                del items[i]
                self._set(items)
                return
        raise ValueError(repr(x) + " is not in deque")

    def reverse(self):
        self._front, self._back = self._back, self._front

    def rotate(self, n=1):
        size = len(self)
        if size <= 1:
            return
        n %= size
        if n:
            items = list(self)
            self._set(items[-n:] + items[:-n])

    def _index(self, i):
        size = len(self)
        if not isinstance(i, int):
            raise TypeError("sequence index must be integer, not '" + type(i).__name__ + "'")
        if i < 0:
            i += size
        if i < 0 or i >= size:
            raise IndexError("deque index out of range")
        return i

    def __getitem__(self, i):
        i = self._index(i)
        front = self._front
        if i < len(front):
            return front[len(front) - 1 - i]
        return self._back[i - len(front)]

    def __setitem__(self, i, x):
        i = self._index(i)
        front = self._front
        if i < len(front):
            front[len(front) - 1 - i] = x
        else:
            self._back[i - len(front)] = x

    def __delitem__(self, i):
        i = self._index(i)
        items = list(self)
        del items[i]
        self._set(items)

    def __iter__(self):
        front = self._front
        for i in range(len(front) - 1, -1, -1):
            yield front[i]
        for x in self._back:
            yield x

    def __reversed__(self):
        back = self._back
        for i in range(len(back) - 1, -1, -1):
            yield back[i]
        for x in self._front:
            yield x

    def __contains__(self, x):
        return x in self._back or x in self._front

    def __eq__(self, other):
        return isinstance(other, deque) and list(self) == list(other)

    def __ne__(self, other):
        return not self == other

    def __lt__(self, other):
        return list(self) < list(other)

    def __le__(self, other):
        return list(self) <= list(other)

    def __gt__(self, other):
        return list(self) > list(other)

    def __ge__(self, other):
        return list(self) >= list(other)

    def __add__(self, other):
        if not isinstance(other, deque):
            raise TypeError(
                'can only concatenate deque (not "' + type(other).__name__ + '") to deque'
            )
        result = self.copy()
        result.extend(other)
        return result

    def __iadd__(self, other):
        self.extend(other)
        return self

    def __mul__(self, n):
        result = deque((), self._maxlen)
        items = list(self)
        for _ in range(n):
            result.extend(items)
        return result

    def __repr__(self):
        body = "[" + ", ".join(repr(x) for x in self) + "]"
        if self._maxlen is None:
            return "deque(" + body + ")"
        return "deque(" + body + ", maxlen=" + str(self._maxlen) + ")"

    def __str__(self):
        return self.__repr__()
