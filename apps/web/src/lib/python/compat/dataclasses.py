# dataclasses for programs that run in the browser (MicroPython has none).
#
# MicroPython drops class annotations: in `x: int` the name x disappears
# entirely. So before the program runs, rewrite.ts adds the field names (in
# order) to the decorator: @dataclass becomes @dataclass(_tg_fields=("x",…)).
# Defaults are ordinary class attributes, as in Python.

class _Missing:
    def __repr__(self):
        return "MISSING"


MISSING = _Missing()


class FrozenInstanceError(AttributeError):
    pass


class Field:
    def __init__(self, default, default_factory, init, repr, compare):
        self.name = None
        self.default = default
        self.default_factory = default_factory
        self.init = init
        self.repr = repr
        self.compare = compare

    def __repr__(self):
        return "Field(name=%r,default=%r,default_factory=%r)" % (
            self.name, self.default, self.default_factory)


def field(*, default=MISSING, default_factory=MISSING, init=True, repr=True, compare=True,
          hash=None, metadata=None, kw_only=False):
    if default is not MISSING and default_factory is not MISSING:
        raise ValueError("cannot specify both default and default_factory")
    return Field(default, default_factory, init, repr, compare)


def _fields_of(cls, names):
    if names is None:
        # Not rewritten (for example, run outside TinkerGyan's editor): use the
        # class attributes. Fields without a default can't be found this way.
        names = [k for k, v in cls.__dict__.items()
                 if not k.startswith("_") and not callable(v) and not isinstance(v, (classmethod, staticmethod, property))]
    out = []
    # Fields of a dataclass this one inherits from come first.
    for base in getattr(cls, "__bases__", ()):
        for f in getattr(base, "__dataclass_fields__", ()):
            if all(f.name != g.name for g in out):
                out.append(f)
    for name in names:
        value = cls.__dict__.get(name, MISSING)
        if isinstance(value, Field):
            f = value
            if f.default is MISSING:
                try:
                    delattr(cls, name)
                except AttributeError:
                    pass
            else:
                setattr(cls, name, f.default)
        else:
            f = Field(value, MISSING, True, True, True)
        f.name = name
        out = [g for g in out if g.name != name]
        out.append(f)
    return tuple(out)


def _has_default(f):
    return f.default is not MISSING or f.default_factory is not MISSING


def _process(cls, init, repr, eq, order, frozen, names):
    flds = _fields_of(cls, names)
    cls.__dataclass_fields__ = flds
    init_fields = [f for f in flds if f.init]
    seen_default = None
    for f in init_fields:
        if _has_default(f):
            seen_default = f.name
        elif seen_default is not None:
            raise TypeError("non-default argument '%s' follows default argument" % f.name)

    if init and "__init__" not in cls.__dict__:
        def __init__(self, *args, **kwargs):
            if len(args) > len(init_fields):
                raise TypeError("__init__() takes %d positional arguments but %d were given"
                                % (len(init_fields) + 1, len(args) + 1))
            for k in kwargs:
                if all(f.name != k for f in init_fields):
                    raise TypeError("__init__() got an unexpected keyword argument '%s'" % k)
            missing = []
            for i, f in enumerate(init_fields):
                if i < len(args):
                    if f.name in kwargs:
                        raise TypeError("__init__() got multiple values for argument '%s'" % f.name)
                    value = args[i]
                elif f.name in kwargs:
                    value = kwargs[f.name]
                elif f.default_factory is not MISSING:
                    value = f.default_factory()
                elif f.default is not MISSING:
                    value = f.default
                else:
                    missing.append(f.name)
                    continue
                object.__setattr__(self, f.name, value)
            if missing:
                names = " and ".join("'%s'" % m for m in missing)
                raise TypeError("__init__() missing %d required positional argument%s: %s"
                                % (len(missing), "" if len(missing) == 1 else "s", names))
            for f in flds:
                if not f.init:
                    if f.default_factory is not MISSING:
                        object.__setattr__(self, f.name, f.default_factory())
                    elif f.default is not MISSING:
                        object.__setattr__(self, f.name, f.default)
            post = getattr(self, "__post_init__", None)
            if post is not None:
                post()
        cls.__init__ = __init__

    if repr and "__repr__" not in cls.__dict__:
        def __repr__(self):
            shown = ", ".join("%s=%r" % (f.name, getattr(self, f.name)) for f in flds if f.repr)
            return "%s(%s)" % (type(self).__name__, shown)
        cls.__repr__ = __repr__

    def _key(self):
        return tuple(getattr(self, f.name) for f in flds if f.compare)

    if eq and "__eq__" not in cls.__dict__:
        def __eq__(self, other):
            if type(other) is not type(self):
                return NotImplemented
            return _key(self) == _key(other)
        cls.__eq__ = __eq__
        if not frozen:
            cls.__hash__ = None

    if frozen:
        def __setattr__(self, name, value):
            raise FrozenInstanceError("cannot assign to field '%s'" % name)

        def __delattr__(self, name):
            raise FrozenInstanceError("cannot delete field '%s'" % name)
        cls.__setattr__ = __setattr__
        cls.__delattr__ = __delattr__
        if eq:
            cls.__hash__ = lambda self: hash(_key(self))

    if order:
        def _check(self, other):
            return type(other) is type(self)

        cls.__lt__ = lambda self, other: _key(self) < _key(other) if _check(self, other) else NotImplemented
        cls.__le__ = lambda self, other: _key(self) <= _key(other) if _check(self, other) else NotImplemented
        cls.__gt__ = lambda self, other: _key(self) > _key(other) if _check(self, other) else NotImplemented
        cls.__ge__ = lambda self, other: _key(self) >= _key(other) if _check(self, other) else NotImplemented
    return cls


def dataclass(cls=None, *, init=True, repr=True, eq=True, order=False, unsafe_hash=False,
              frozen=False, match_args=True, kw_only=False, slots=False, _tg_fields=None):
    if order and not eq:
        raise ValueError("eq must be true if order is true")

    def wrap(c):
        return _process(c, init, repr, eq, order, frozen, _tg_fields)

    if cls is None:
        return wrap
    return wrap(cls)


def fields(class_or_instance):
    flds = getattr(class_or_instance, "__dataclass_fields__", None)
    if flds is None:
        raise TypeError("must be called with a dataclass type or instance")
    return flds


def is_dataclass(obj):
    return hasattr(obj, "__dataclass_fields__")


def _convert(value, make):
    if is_dataclass(value) and not isinstance(value, type):
        return make(value)
    if isinstance(value, list):
        return [_convert(v, make) for v in value]
    if isinstance(value, tuple):
        return tuple(_convert(v, make) for v in value)
    if isinstance(value, dict):
        return {_convert(k, make): _convert(v, make) for k, v in value.items()}
    return value


def asdict(obj):
    if not is_dataclass(obj) or isinstance(obj, type):
        raise TypeError("asdict() should be called on dataclass instances")
    return {f.name: _convert(getattr(obj, f.name), asdict) for f in fields(obj)}


def astuple(obj):
    if not is_dataclass(obj) or isinstance(obj, type):
        raise TypeError("astuple() should be called on dataclass instances")
    return tuple(_convert(getattr(obj, f.name), astuple) for f in fields(obj))


def replace(obj, **changes):
    kwargs = {f.name: getattr(obj, f.name) for f in fields(obj) if f.init}
    kwargs.update(changes)
    return type(obj)(**kwargs)
