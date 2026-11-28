# re for programs that run in the browser. MicroPython's own re has no
# findall, split, groups(), flags, {2,3}, \b or named groups, so matching is
# done by the browser's regex engine (js-regex.ts, through tg_host) and this
# module gives it Python's API: Pattern and Match objects, sub() templates,
# findall/finditer/split with Python's rules for empty matches.
import json
import tg_host

NOFLAG = 0
A = ASCII = 256
I = IGNORECASE = 2
L = LOCALE = 4
M = MULTILINE = 8
S = DOTALL = 16
U = UNICODE = 32
X = VERBOSE = 64


class error(Exception):
    def __init__(self, msg, pattern=None, pos=None):
        super().__init__(msg)
        self.msg = msg
        self.pattern = pattern
        self.pos = pos


class Match:
    def __init__(self, re, string, pos, endpos, spans):
        self.re = re
        self.string = string
        self.pos = pos
        self.endpos = endpos
        self._spans = spans

    def _index(self, g):
        if isinstance(g, str):
            if g not in self.re.groupindex:
                raise IndexError("no such group")
            return self.re.groupindex[g]
        if not isinstance(g, int) or g < 0 or g > self.re.groups:
            raise IndexError("no such group")
        return g

    def _get(self, g, default=None):
        sp = self._spans[self._index(g)]
        if sp is None:
            return default
        return self.string[sp[0]:sp[1]]

    def group(self, *groups):
        if not groups:
            return self._get(0)
        if len(groups) == 1:
            return self._get(groups[0])
        return tuple(self._get(g) for g in groups)

    def __getitem__(self, g):
        return self._get(g)

    def groups(self, default=None):
        return tuple(self._get(i, default) for i in range(1, self.re.groups + 1))

    def groupdict(self, default=None):
        return {name: self._get(i, default) for name, i in self.re.groupindex.items()}

    def start(self, group=0):
        sp = self._spans[self._index(group)]
        return -1 if sp is None else sp[0]

    def end(self, group=0):
        sp = self._spans[self._index(group)]
        return -1 if sp is None else sp[1]

    def span(self, group=0):
        sp = self._spans[self._index(group)]
        return (-1, -1) if sp is None else (sp[0], sp[1])

    @property
    def lastindex(self):
        last = None
        best = -1
        for i in range(1, self.re.groups + 1):
            sp = self._spans[i]
            # The group that closed last: the one ending last, outermost on ties.
            if sp is not None and sp[1] > best:
                best = sp[1]
                last = i
        return last

    @property
    def lastgroup(self):
        i = self.lastindex
        for name, n in self.re.groupindex.items():
            if n == i:
                return name
        return None

    def expand(self, template):
        return _expand(self, _template(self.re, template))

    def __repr__(self):
        return "<re.Match object; span=%r, match=%r>" % (self.span(), self.group(0))


class Pattern:
    def __init__(self, pattern, flags):
        if not isinstance(pattern, str):
            raise TypeError("only text patterns are supported in the browser")
        info = json.loads(tg_host.re_compile(pattern, flags))
        if "e" in info:
            raise error(info["e"], pattern)
        self.pattern = pattern
        self._flags = flags
        self.flags = flags | info["f"] | UNICODE
        self.groups = info["g"]
        self.groupindex = info["n"]

    def _run(self, string, pos, endpos, mode):
        if not isinstance(string, str):
            raise TypeError("expected string, got %r" % type(string).__name__)
        n = len(string)
        if pos < 0:
            pos = 0
        if endpos is None or endpos > n:
            endpos = n
        if pos > endpos:
            return None
        found = tg_host.re_exec(self.pattern, self._flags, string, pos, endpos, mode)
        if not found:
            return None
        return Match(self, string, pos, endpos, json.loads(found))

    def search(self, string, pos=0, endpos=None):
        return self._run(string, pos, endpos, 0)

    def match(self, string, pos=0, endpos=None):
        return self._run(string, pos, endpos, 1)

    def fullmatch(self, string, pos=0, endpos=None):
        return self._run(string, pos, endpos, 2)

    def finditer(self, string, pos=0, endpos=None):
        if endpos is None or endpos > len(string):
            endpos = len(string)
        after_empty = False
        while pos <= endpos:
            m = self._run(string, pos, endpos, 0)
            if m is None:
                return
            s, e = m.span()
            # No empty match right where the previous empty match was.
            if after_empty and s == e == pos:
                if pos >= endpos:
                    return
                m = self._run(string, pos + 1, endpos, 0)
                if m is None:
                    return
                s, e = m.span()
            yield m
            after_empty = s == e
            pos = e

    def findall(self, string, pos=0, endpos=None):
        out = []
        for m in self.finditer(string, pos, endpos):
            if self.groups == 0:
                out.append(m.group(0))
            elif self.groups == 1:
                out.append(m._get(1, ""))
            else:
                out.append(m.groups(""))
        return out

    def split(self, string, maxsplit=0):
        out = []
        last = 0
        n = 0
        for m in self.finditer(string):
            if maxsplit and n >= maxsplit:
                break
            s, e = m.span()
            out.append(string[last:s])
            out.extend(m.groups())
            last = e
            n += 1
        out.append(string[last:])
        return out

    def subn(self, repl, string, count=0):
        if callable(repl):
            make = repl
        else:
            parts = _template(self, repl)
            make = lambda m: _expand(m, parts)
        out = []
        last = 0
        n = 0
        for m in self.finditer(string):
            if count and n >= count:
                break
            s, e = m.span()
            out.append(string[last:s])
            out.append(make(m))
            last = e
            n += 1
        out.append(string[last:])
        return "".join(out), n

    def sub(self, repl, string, count=0):
        return self.subn(repl, string, count)[0]

    def __eq__(self, other):
        return isinstance(other, Pattern) and other.pattern == self.pattern and other._flags == self._flags

    def __hash__(self):
        return hash((self.pattern, self._flags))

    def __repr__(self):
        return "re.compile(%r)" % self.pattern


_ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "f": "\f", "v": "\v", "a": "\a", "b": "\b", "\\": "\\"}


def _template(pattern, repl):
    # sub() replacement text: \1, \g<1>, \g<name> and \n-style escapes.
    parts = []
    text = []
    i = 0
    n = len(repl)
    while i < n:
        c = repl[i]
        if c != "\\" or i + 1 >= n:
            text.append(c)
            i += 1
            continue
        d = repl[i + 1]
        if d == "g":
            end = repl.find(">", i)
            if i + 2 >= n or repl[i + 2] != "<" or end < 0:
                raise error("missing group name", repl, i)
            name = repl[i + 3:end]
            if name.isdigit():
                index = int(name)
            elif name in pattern.groupindex:
                index = pattern.groupindex[name]
            else:
                raise IndexError("unknown group name '%s'" % name)
            parts.append("".join(text))
            text = []
            parts.append(index)
            i = end + 1
        elif d.isdigit():
            j = i + 2
            if j < n and repl[j].isdigit():
                j += 1
            index = int(repl[i + 1:j])
            if index > pattern.groups:
                raise error("invalid group reference %d" % index, repl, i)
            parts.append("".join(text))
            text = []
            parts.append(index)
            i = j
        elif d in _ESCAPES:
            text.append(_ESCAPES[d])
            i += 2
        elif ("a" <= d <= "z") or ("A" <= d <= "Z"):
            raise error("bad escape \\%s" % d, repl, i)
        else:
            text.append("\\" + d)
            i += 2
    parts.append("".join(text))
    return parts


def _expand(m, parts):
    out = []
    for p in parts:
        if isinstance(p, int):
            out.append(m._get(p, ""))
        else:
            out.append(p)
    return "".join(out)


_cache = {}


def compile(pattern, flags=0):
    if isinstance(pattern, Pattern):
        return pattern
    key = (pattern, flags)
    p = _cache.get(key)
    if p is None:
        if len(_cache) > 100:
            _cache.clear()
        p = Pattern(pattern, flags)
        _cache[key] = p
    return p


def search(pattern, string, flags=0):
    return compile(pattern, flags).search(string)


def match(pattern, string, flags=0):
    return compile(pattern, flags).match(string)


def fullmatch(pattern, string, flags=0):
    return compile(pattern, flags).fullmatch(string)


def findall(pattern, string, flags=0):
    return compile(pattern, flags).findall(string)


def finditer(pattern, string, flags=0):
    return compile(pattern, flags).finditer(string)


def split(pattern, string, maxsplit=0, flags=0):
    return compile(pattern, flags).split(string, maxsplit)


def sub(pattern, repl, string, count=0, flags=0):
    return compile(pattern, flags).sub(repl, string, count)


def subn(pattern, repl, string, count=0, flags=0):
    return compile(pattern, flags).subn(repl, string, count)


_SPECIAL = "()[]{}?*+-|^$\\.&~# \t\n\r\v\f"


def escape(pattern):
    return "".join("\\" + c if c in _SPECIAL else c for c in pattern)


def purge():
    _cache.clear()
