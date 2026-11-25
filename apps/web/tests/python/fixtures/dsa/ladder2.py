from collections import defaultdict, deque
from typing import List

class Solution:
    def findLadders(self, beginWord: str, endWord: str, wordList: List[str]) -> List[List[str]]:
        words = set(wordList)
        if endWord not in words:
            return []
        parents = defaultdict(set)
        level = {beginWord}
        words.discard(beginWord)
        found = False
        while level and not found:
            nxt = defaultdict(set)
            for w in level:
                for i in range(len(w)):
                    for ch in "abcdefghijklmnopqrstuvwxyz":
                        cand = w[:i] + ch + w[i + 1:]
                        if cand in words:
                            nxt[cand].add(w)
                            if cand == endWord:
                                found = True
            words -= set(nxt)
            for k, v in nxt.items():
                parents[k] |= v
            level = set(nxt)
        res = []
        def build(word, path):
            if word == beginWord:
                res.append(path[::-1])
                return
            for p in parents[word]:
                build(p, path + [p])
        if found:
            build(endWord, [endWord])
        return sorted(res)

s = Solution()
print(s.findLadders("hit", "cog", ["hot","dot","dog","lot","log","cog"]))
print(s.findLadders("hit", "cog", ["hot","dot","dog","lot","log"]))
