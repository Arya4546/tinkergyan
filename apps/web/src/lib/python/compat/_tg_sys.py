# sys for programs that run in the browser. MicroPython's sys.stdin cannot be
# read here (OSError 29), so this one reads lines the student types (or
# pastes) into the answer box. An empty answer means "no more input" (end of
# file), which is how read() and `for line in sys.stdin` know when to stop.
from _tg_real_sys import *
import tg_host

_recursion_limit = 1000


def setrecursionlimit(limit):
    # Accepted so programs written for Python run; the real limit is set by
    # the browser (see the RecursionError message).
    global _recursion_limit
    if not isinstance(limit, int):
        raise TypeError("an integer is required")
    if limit < 1:
        raise ValueError("recursion limit must be greater or equal than 1")
    _recursion_limit = limit


def getrecursionlimit():
    return _recursion_limit


class _Stdin:
    def __init__(self):
        self._buf = ""  # typed by the student, not read by the program yet
        self._eof = False

    def _line(self):
        # The student's next line with its "\n", or "" once the input ended.
        if self._eof:
            return ""
        line = tg_host.read_line()
        if line is None:
            self._eof = True
            return ""
        return line + "\n"

    def _rest(self):
        # Everything the student has pasted and the program not read yet.
        if self._eof:
            return ""
        text = tg_host.read_rest()
        if text is None:
            self._eof = True
            return ""
        return text

    def readline(self, size=-1):
        if not self._buf and (size is None or size < 0):
            return self._line()  # the usual case, kept short: it runs once per line
        i = self._buf.find("\n")
        if i >= 0:
            line = self._buf[: i + 1]
            rest = self._buf[i + 1 :]
        else:
            line = self._buf + self._line()
            rest = ""
        if size is not None and 0 <= size < len(line):
            rest = line[size:] + rest
            line = line[:size]
        self._buf = rest
        return line

    def read(self, size=-1):
        # Lines are collected in a list and joined once: adding them to one
        # string would copy it again for every line (too slow and too much
        # memory for a large pasted input).
        parts = [self._buf]
        if size is None or size < 0:
            while True:
                text = self._rest()
                if not text:
                    break
                parts.append(text)
            self._buf = ""
            return "".join(parts)
        have = len(self._buf)
        while have < size:
            line = self._line()
            if not line:
                break
            parts.append(line)
            have += len(line)
        data = "".join(parts)
        self._buf = data[size:]
        return data[:size]

    def readlines(self, hint=-1):
        lines = []
        while True:
            line = self.readline()
            if not line:
                return lines
            lines.append(line)

    def __iter__(self):
        return self

    def __next__(self):
        line = self.readline()
        if not line:
            raise StopIteration
        return line

    def _input_line(self):
        # input() after a read that left part of a line waiting: use that first.
        line = self.readline()
        return line[:-1] if line.endswith("\n") else line

    def fileno(self):
        return 0

    def isatty(self):
        return False

    def readable(self):
        return True

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    @property
    def buffer(self):
        return _BytesStdin(self)


class _BytesStdin:
    def __init__(self, text):
        self._text = text

    def read(self, size=-1):
        return self._text.read(size).encode()

    def readline(self, size=-1):
        return self._text.readline(size).encode()

    def readlines(self, hint=-1):
        return [line.encode() for line in self._text.readlines()]

    def __iter__(self):
        return self

    def __next__(self):
        line = self._text.readline()
        if not line:
            raise StopIteration
        return line.encode()


stdin = _Stdin()
