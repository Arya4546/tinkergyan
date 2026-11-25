from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.key_val = {}
        self.key_freq = {}
        self.freq_keys = defaultdict(OrderedDict)
        self.min_freq = 0

    def _touch(self, key):
        f = self.key_freq[key]
        del self.freq_keys[f][key]
        if not self.freq_keys[f]:
            del self.freq_keys[f]
            if self.min_freq == f:
                self.min_freq += 1
        self.key_freq[key] = f + 1
        self.freq_keys[f + 1][key] = None

    def get(self, key: int) -> int:
        if key not in self.key_val:
            return -1
        self._touch(key)
        return self.key_val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap <= 0:
            return
        if key in self.key_val:
            self.key_val[key] = value
            self._touch(key)
            return
        if len(self.key_val) >= self.cap:
            old, _ = self.freq_keys[self.min_freq].popitem(last=False)
            if not self.freq_keys[self.min_freq]:
                del self.freq_keys[self.min_freq]
            del self.key_val[old]
            del self.key_freq[old]
        self.key_val[key] = value
        self.key_freq[key] = 1
        self.freq_keys[1][key] = None
        self.min_freq = 1

ops = ["put","put","get","put","get","get","put","get","get","get"]
args = [[1,1],[2,2],[1],[3,3],[2],[3],[4,4],[1],[3],[4]]
c = LFUCache(2)
res = []
for op, a in zip(ops, args):
    r = getattr(c, op)(*a)
    res.append(r)
print(res)
