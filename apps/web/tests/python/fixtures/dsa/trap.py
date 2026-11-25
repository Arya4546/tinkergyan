def trap(height):
    l, r = 0, len(height) - 1
    lmax = rmax = water = 0
    while l < r:
        if height[l] < height[r]:
            lmax = max(lmax, height[l]); water += lmax - height[l]; l += 1
        else:
            rmax = max(rmax, height[r]); water += rmax - height[r]; r -= 1
    return water

def main():
    print(trap([0,1,0,2,1,0,1,3,2,1,2,1]))
    print(trap([4,2,0,3,2,5]))
    print(trap([]))

if __name__ == "__main__":
    main()
