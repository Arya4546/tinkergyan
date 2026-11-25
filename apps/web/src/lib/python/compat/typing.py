# typing, so programs with type hints (List[int], Optional[Node], ...) run.
# MicroPython ignores the hints themselves; these names only need to exist.

TYPE_CHECKING = False


class _Hint:
    def __init__(self, name):
        self._name = name

    def __getitem__(self, params):
        return self

    def __call__(self, *args, **kwargs):
        raise TypeError("Type " + self._name + " cannot be instantiated")

    def __or__(self, other):
        return self

    def __ror__(self, other):
        return self

    def __repr__(self):
        return "typing." + self._name


class _Base:
    # Generic[T] and Protocol used as a base class: give back plain object.
    def __init__(self, name):
        self._name = name

    def __getitem__(self, params):
        return object

    def __repr__(self):
        return "typing." + self._name


Any = _Hint("Any")
Callable = _Hint("Callable")
ClassVar = _Hint("ClassVar")
Counter = _Hint("Counter")
DefaultDict = _Hint("DefaultDict")
Deque = _Hint("Deque")
Dict = _Hint("Dict")
Final = _Hint("Final")
FrozenSet = _Hint("FrozenSet")
Generator = _Hint("Generator")
Hashable = _Hint("Hashable")
Iterable = _Hint("Iterable")
Iterator = _Hint("Iterator")
List = _Hint("List")
Literal = _Hint("Literal")
Mapping = _Hint("Mapping")
MutableMapping = _Hint("MutableMapping")
NoReturn = _Hint("NoReturn")
Optional = _Hint("Optional")
OrderedDict = _Hint("OrderedDict")
Self = _Hint("Self")
Sequence = _Hint("Sequence")
Set = _Hint("Set")
Tuple = _Hint("Tuple")
Type = _Hint("Type")
Union = _Hint("Union")
Generic = _Base("Generic")
Protocol = _Base("Protocol")


def TypeVar(name, *constraints, **kwargs):
    return _Hint(name)


def NewType(name, tp):
    return lambda x: x


def cast(typ, val):
    return val


def overload(func):
    return func


def final(f):
    return f


def no_type_check(f):
    return f
