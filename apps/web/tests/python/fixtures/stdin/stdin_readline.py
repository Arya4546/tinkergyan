import sys
input = sys.stdin.readline
t = int(input())
for _ in range(t):
    n, m = map(int, input().split())
    print(n + m)
rest = sys.stdin.readline()
print(repr(rest), repr(sys.stdin.readline()))
