import sys
print(repr(sys.stdin.read()), repr(sys.stdin.readline()), sys.stdin.readlines(), list(sys.stdin))
try:
    input()
except EOFError as e:
    print('EOFError')
