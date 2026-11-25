from collections import defaultdict, deque
from typing import List

class Solution:
    def alienOrder(self, words: List[str]) -> str:
        graph = defaultdict(set)
        indegree = {c: 0 for w in words for c in w}
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    if y not in graph[x]:
                        graph[x].add(y)
                        indegree[y] += 1
                    break
            else:
                if len(a) > len(b):
                    return ""
        q = deque([c for c in indegree if indegree[c] == 0])
        out = []
        while q:
            c = q.popleft()
            out.append(c)
            for n in graph[c]:
                indegree[n] -= 1
                if indegree[n] == 0:
                    q.append(n)
        return "".join(out) if len(out) == len(indegree) else ""

def valid(order, words):
    rank = {c: i for i, c in enumerate(order)}
    return all([rank[c] for c in a] <= [rank[c] for c in b] for a, b in zip(words, words[1:]))

s = Solution()
for words in (["wrt","wrf","er","ett","rftt"], ["z","x"], ["z","x","z"], ["abc","ab"]):
    o = s.alienOrder(words)
    print(len(o), o != "" and valid(o, words))
