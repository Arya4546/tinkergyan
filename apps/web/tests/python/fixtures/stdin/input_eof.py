total = 0
try:
    while True:
        line = input()
        total += sum(map(int, line.split()))
except EOFError:
    print('total', total)
