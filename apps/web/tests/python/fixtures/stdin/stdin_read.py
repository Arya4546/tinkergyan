import sys
data = sys.stdin.read().split()
n = int(data[0])
nums = list(map(int, data[1:1 + n]))
print(n, sum(nums), max(nums))
print(repr(sys.stdin.read()))
