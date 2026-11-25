import sys
input = sys.stdin.buffer.readline
n = int(input())
arr = list(map(int, input().split()))
rest = sys.stdin.buffer.read().split()
print(n, arr, [int(x) for x in rest])
