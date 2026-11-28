import sys
sys.setrecursionlimit(10000)
def f(n):
    return 0 if n == 0 else 1 + f(n - 1)
print(f(100))
try:
    f(100000)
except RecursionError:
    print("RecursionError caught")
print(issubclass(RecursionError, RuntimeError))
