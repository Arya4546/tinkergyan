from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        res, cols, d1, d2 = [], set(), set(), set()
        board = [["."] * n for _ in range(n)]
        def backtrack(r):
            if r == n:
                res.append(["".join(row) for row in board])
                return
            for c in range(n):
                if c in cols or r - c in d1 or r + c in d2:
                    continue
                cols.add(c); d1.add(r - c); d2.add(r + c); board[r][c] = "Q"
                backtrack(r + 1)
                cols.remove(c); d1.remove(r - c); d2.remove(r + c); board[r][c] = "."
        backtrack(0)
        return res

s = Solution()
print([len(s.solveNQueens(n)) for n in range(1, 9)])
print(s.solveNQueens(4))
