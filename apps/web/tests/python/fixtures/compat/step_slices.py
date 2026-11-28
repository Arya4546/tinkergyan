s = "hello"
print(s[::-1], s[::2], s[1::2], s[4:0:-1], s[-1:-4:-1], s[::-2])
t = (1, 2, 3, 4, 5)
print(t[::-1], t[::2], t[1:4:2])
b = b"abc"
print(b[::-1])
a = [1, 2, 3, 4, 5, 6]
print(a[::-1], a[::2])
a[::2] = [0, 0, 0]
print(a)
del a[::2]
print(a)
word = "racecar"
print(word == word[::-1], "level"[::-1] == "level")
n = 12321
print(str(n) == str(n)[::-1])
print("".join(x[::-1] for x in "ab cd".split()))
print(f"{s[::-1]}!", s[::-1][::-1], s[::-1].upper())
step = -1
print(s[::step], s[len(s)::-1])
nums = [[1, 2], [3, 4]]
print(nums[::-1][0][::-1])
print("abcdefgh"[1:7:3], "abc"[5:0:-1])
rows = ["ab", "cd"]
print([r[::-1] for r in rows])
