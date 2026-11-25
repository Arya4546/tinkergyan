from typing import List

class Solution:
    def solveSudoku(self, board: List[List[str]]) -> None:
        rows = [set() for _ in range(9)]
        cols = [set() for _ in range(9)]
        boxes = [set() for _ in range(9)]
        empty = []
        for r in range(9):
            for c in range(9):
                v = board[r][c]
                if v == ".":
                    empty.append((r, c))
                else:
                    rows[r].add(v); cols[c].add(v); boxes[r // 3 * 3 + c // 3].add(v)
        def solve(k=0):
            if k == len(empty):
                return True
            r, c = empty[k]
            b = r // 3 * 3 + c // 3
            for d in "123456789":
                if d not in rows[r] and d not in cols[c] and d not in boxes[b]:
                    board[r][c] = d
                    rows[r].add(d); cols[c].add(d); boxes[b].add(d)
                    if solve(k + 1):
                        return True
                    rows[r].remove(d); cols[c].remove(d); boxes[b].remove(d)
            board[r][c] = "."
            return False
        solve()

puzzle = ["53..7....","6..195...",".98....6.","8...6...3","4..8.3..1","7...2...6",".6....28.","...419..5","....8..79"]
board = [list(r) for r in puzzle]
Solution().solveSudoku(board)
for row in board:
    print("".join(row))
