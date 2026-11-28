from dataclasses import dataclass, field, asdict, astuple, replace, fields
from typing import List, ClassVar

@dataclass
class Point:
    x: int
    y: int = 0

p = Point(1)
print(p, Point(2, 3), Point(x=4, y=5), p == Point(1, 0), p == Point(2))
print(sorted(asdict(Point(1, 2)).items()), astuple(Point(1, 2)), replace(p, y=9), [f.name for f in fields(p)])

@dataclass(order=True)
class Student:
    grade: int
    name: str = "x"
    tags: List[str] = field(default_factory=list)
    count: ClassVar[int] = 0

a = Student(90, "Asha")
b = Student(85, "Bo")
a.tags.append("top")
print(a, b, a > b, sorted([a, b])[0].name, Student(1).tags is not Student(1).tags)

@dataclass(frozen=True)
class Card:
    rank: str
    suit: str

c = Card("A", "spades")
try:
    c.rank = "K"
except Exception as e:
    print("frozen:", type(e).__name__)
print(c, hash(c) == hash(Card("A", "spades")), len({c, Card("A", "spades")}))

@dataclass
class Item:
    name: str
    price: float
    qty: int = 1

    def __post_init__(self):
        self.total = self.price * self.qty

    def label(self):
        return f"{self.name} x{self.qty}"

i = Item("pen", 2.5, 4)
print(i.total, i.label(), i)
try:
    Item()
except TypeError as e:
    print("TypeError")

@dataclass
class Point3(Point):
    z: int = 0

print(Point3(1, 2, 3))
print(Point.__eq__(p, 5) is NotImplemented)
