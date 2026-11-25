import sys
n = int(input())
rows = [list(map(int, sys.stdin.readline().split())) for _ in range(n)]
q = int(input())
queries = [tuple(map(int, line.split())) for line in sys.stdin]
print(rows, q, queries)
