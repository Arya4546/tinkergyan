data = open(0).read().split()
print(data, sum(int(x) for x in data[1:]))
