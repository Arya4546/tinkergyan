import sys
count = 0
for line in sys.stdin:
    count += 1
    print(repr(line), "".join(reversed(line.strip())))
print('lines:', count)
