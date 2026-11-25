# CPython-parity checks for TinkerGyan's compat modules. Output must match CPython exactly.
from collections import deque, Counter, OrderedDict, defaultdict, namedtuple
import collections, heapq, bisect, math, functools, itertools, operator, sys, queue
from typing import List, Dict, Optional, Tuple, Set, Deque, Generic, TypeVar
from functools import lru_cache, cache, cmp_to_key, reduce, total_ordering
from itertools import permutations, combinations, combinations_with_replacement, product, zip_longest, groupby, accumulate, chain, pairwise, islice, count, compress, dropwhile, takewhile, filterfalse
from heapq import heappush, heappop, heapify, heappushpop, heapreplace, nlargest, nsmallest, merge

def err(f):
    try:
        f()
        return 'no error'
    except Exception as e:
        return type(e).__name__

# deque
d = deque()
print(d, len(d), bool(d))
d = deque([1, 2, 3])
d.append(4); d.appendleft(0)
print(d, d[0], d[-1], d[2], len(d))
print(d.popleft(), d.pop(), d)
d.extend([5, 6]); d.extendleft([-1, -2])
print(d, list(reversed(d)), 3 in d, 99 in d)
d.rotate(2); print(d); d.rotate(-3); print(d)
d[1] = 'x'; print(d, d.index(5), d.count(5))
del d[1]; print(d)
d.remove(5); d.insert(1, 'y'); d.reverse(); print(d)
print(err(lambda: deque().popleft()), err(lambda: deque().pop()), err(lambda: deque([1])[5]))
m = deque(range(5), maxlen=3); print(m, m.maxlen); m.append(9); print(m); m.appendleft(7); print(m)
print(deque([1, 2]) == deque([1, 2]), deque([1]) + deque([2]), deque([1, 2]) * 2)
q = deque(); 
for i in range(1000): q.append(i)
s = 0
while q:
    s += q.popleft()
    if s % 7 == 0 and len(q) > 2: q.append(q.pop())
print(s)
x = deque(); x.appendleft(1); x.appendleft(2); print(x.pop(), x.pop(), err(lambda: x.pop()))
y = deque([1, 2, 3, 4, 5, 6])
print([y.pop() if i % 2 else y.popleft() for i in range(6)])
# Counter
c = Counter('abracadabra')
print(c, c['a'], c['zz'], 'zz' in c, len(c))
print(c.most_common(2), c.most_common())
c.update('aaz'); c.subtract({'b': 2}); print(c)
print(sorted(c.elements())[:6], c.total() if hasattr(c, 'total') else 'x')
c2 = Counter(a=1, b=5); print(c + c2, c - c2, c | c2, c & c2)
print(Counter([3, 1, 3, 2, 1, 3]).most_common(1)[0], list(Counter('hello')), Counter() == Counter())
cc = Counter(); cc['k'] += 2; cc['j'] -= 1; print(cc, +cc)
# defaultdict
g = defaultdict(list)
for a, b in [(3, 'c'), (1, 'a'), (3, 'd'), (2, 'b')]:
    g[a].append(b)
print(g, sorted(dict(g.items()).items()), list(g), len(g), 1 in g, 9 in g)
print([k for k in g], list(g.keys()), list(g.values()), list(g.items()))
dd = defaultdict(int); dd['x'] += 1; dd['y'] += 0; print(dd, dd.get('nope'), 'nope' in dd)
n = defaultdict(lambda: defaultdict(int)); n['a']['b'] += 3; print(n['a']['b'], len(n))
print(err(lambda: defaultdict(None)['q']), isinstance(g, dict))
words = defaultdict(set); words['k'].add(1); print(set(words), sorted(words))
# OrderedDict
o = OrderedDict()
o['b'] = 1; o['a'] = 2; o['c'] = 3
o.move_to_end('b'); print(list(o), o)
o.move_to_end('c', last=False); print(list(o.items()))
print(o.popitem(), o.popitem(last=False), o)
o2 = OrderedDict([('x', 1), ('y', 2)]); o3 = OrderedDict([('y', 2), ('x', 1)])
print(o2 == o3, o2 == {'y': 2, 'x': 1}, err(lambda: o2.move_to_end('nope')), err(lambda: OrderedDict().popitem()))
print(OrderedDict.fromkeys('abc', 0), o2.setdefault('z', 9), list(o2), o2.pop('x'), list(o2))
lru = OrderedDict()
for k in [1, 2, 3, 1, 4, 2, 5]:
    if k in lru: lru.move_to_end(k)
    lru[k] = True
    if len(lru) > 3: lru.popitem(last=False)
print(list(lru))
# namedtuple (MicroPython's own)
P = namedtuple('P', ['x', 'y']); p = P(1, 2); print(p.x + p.y, p[0])
# heapq
h = [5, 1, 8, 3, 2]; heapify(h); heappush(h, 0)
print([heappop(h) for _ in range(3)], heappushpop(h, 1), heapreplace(h, 10), sorted(h))
print(nlargest(3, [4, 1, 7, 3, 9]), nsmallest(2, [4, 1, 7, 3, 9]), nlargest(2, ['aa', 'b', 'cccc'], key=len), list(merge([1, 4], [2, 3], [0])))
pq = []
for item in [(2, 'b'), (1, 'z'), (1, 'a')]: heappush(pq, item)
print([heappop(pq) for _ in range(3)], err(lambda: heappop([])))
# bisect
a = [1, 2, 2, 2, 5]
print(bisect.bisect_left(a, 2), bisect.bisect_right(a, 2), bisect.bisect(a, 3), bisect.bisect_left(a, 0), bisect.bisect_right(a, 9))
bisect.insort(a, 3); bisect.insort_left(a, 2); print(a, bisect.bisect_left([(1, 'a'), (3, 'b')], 2, key=lambda t: t[0]))
# math
print(math.gcd(12, 18), math.gcd(0, 5), math.gcd(-4, 6), math.gcd(), math.lcm(4, 6), math.lcm(3, 0))
print(math.comb(5, 2), math.comb(52, 5), math.comb(3, 5), math.perm(5, 2), math.perm(4))
print(math.isqrt(0), math.isqrt(15), math.isqrt(16), math.isqrt(10**40 + 1), math.prod([1, 2, 3, 4]), math.prod([]))
print(math.hypot(3, 4), math.dist((0, 0), (3, 4)), math.inf > 10**100, err(lambda: math.isqrt(-1)), err(lambda: math.comb(2.5, 1)))
# functools
calls = []
@lru_cache(maxsize=None)
def fib(n):
    calls.append(n)
    return n if n < 2 else fib(n - 1) + fib(n - 2)
print(fib(40), len(calls), fib.cache_info())
fib.cache_clear(); print(fib.cache_info())
@lru_cache
def sq(n): return n * n
print(sq(4), sq(4), sq.cache_info().hits)
@cache
def grid(r, c): return 1 if r == 0 or c == 0 else grid(r - 1, c) + grid(r, c - 1)
print(grid(8, 8))
@lru_cache(maxsize=2)
def ident(x):
    calls.append(x)
    return x
calls.clear(); [ident(v) for v in (1, 2, 1, 3, 1, 2)]; print(calls)
class Sol:
    @lru_cache(None)
    def ways(self, n): return 1 if n <= 1 else self.ways(n - 1) + self.ways(n - 2)
print(Sol().ways(30))
print(sorted([3, 1, 2], key=cmp_to_key(lambda a, b: b - a)), sorted(['b', 'a', 'c'], key=cmp_to_key(lambda a, b: (a > b) - (a < b))))
print(reduce(lambda a, b: a * b, [1, 2, 3, 4]), functools.partial(pow, 2)(10))
@total_ordering
class V:
    def __init__(self, v): self.v = v
    def __eq__(self, o): return self.v == o.v
    def __lt__(self, o): return self.v < o.v
print(V(1) <= V(2), V(3) >= V(2), V(3) > V(2), V(1) > V(2))
# itertools
print(list(permutations([1, 2, 3])), list(permutations('abc', 2))[:4], len(list(permutations(range(5)))))
print(list(combinations('abcd', 2)), list(combinations(range(4), 3)), list(combinations([1], 2)))
print(list(combinations_with_replacement('ab', 2)), list(product('ab', [0, 1])), list(product([1, 2], repeat=2)), list(product()))
print(list(zip_longest('ab', [1, 2, 3], fillvalue='-')), [(k, list(g)) for k, g in groupby('aaabccaa')], [(k, len(list(g))) for k, g in groupby([1, 3, 2, 4, 5], key=lambda x: x % 2)])
print(list(accumulate([1, 2, 3, 4])), list(accumulate([1, 2, 3], initial=10)), list(accumulate([3, 1, 4], max)), list(chain([1], (2, 3))), list(chain.from_iterable([[1], [2, 3]])))
print(list(pairwise('abcd')), list(islice(count(5), 3)), list(compress('abcd', [1, 0, 1, 0])), list(dropwhile(lambda x: x < 3, [1, 4, 1])), list(takewhile(lambda x: x < 3, [1, 4, 1])), list(filterfalse(None, [0, 1, 2])))
# operator
print(sorted([(1, 'b'), (0, 'z'), (1, 'a')], key=operator.itemgetter(1)), operator.itemgetter(0, 2)('abc'), operator.methodcaller('upper')('hi'))
# queue
qq = queue.Queue(); qq.put(1); qq.put(2); print(qq.get(), qq.qsize(), qq.empty())
pq2 = queue.PriorityQueue(); [pq2.put(v) for v in (3, 1, 2)]; print([pq2.get() for _ in range(3)])
lq = queue.LifoQueue(); lq.put(1); lq.put(2); print(lq.get(), err(lambda: queue.Queue().get_nowait()))
# typing
T = TypeVar('T')
class Stack(Generic[T]):
    def __init__(self) -> None:
        self.items: List[T] = []
def f(a: List[int], b: Optional[Dict[str, Tuple[int, ...]]] = None) -> Set[int]:
    return set(a)
print(sorted(f([1, 1, 2])), Stack().items)
# sys
sys.setrecursionlimit(10**6); print(sys.getrecursionlimit(), sys.maxsize > 2**30)
