# queue (Queue, LifoQueue, PriorityQueue) for single-threaded programs.
# Nothing else can add or take items while a program waits, so get() on an
# empty queue (and put() on a full one) raises an error instead of waiting
# forever.
from collections import deque
from heapq import heappush, heappop


class Empty(Exception):
    pass


class Full(Exception):
    pass


class Queue:
    def __init__(self, maxsize=0):
        self.maxsize = maxsize
        self._init()

    def _init(self):
        self.queue = deque()

    def _put(self, item):
        self.queue.append(item)

    def _get(self):
        return self.queue.popleft()

    def qsize(self):
        return len(self.queue)

    def empty(self):
        return not self.queue

    def full(self):
        return 0 < self.maxsize <= len(self.queue)

    def put(self, item, block=True, timeout=None):
        if self.full():
            raise Full("the queue is full, so put() would wait forever")
        self._put(item)

    def get(self, block=True, timeout=None):
        if not self.queue:
            raise Empty("the queue is empty, so get() would wait forever")
        return self._get()

    def put_nowait(self, item):
        self.put(item, False)

    def get_nowait(self):
        return self.get(False)

    def task_done(self):
        pass

    def join(self):
        pass


class LifoQueue(Queue):
    def _init(self):
        self.queue = []

    def _get(self):
        return self.queue.pop()


class PriorityQueue(Queue):
    def _init(self):
        self.queue = []

    def _put(self, item):
        heappush(self.queue, item)

    def _get(self):
        return heappop(self.queue)


SimpleQueue = Queue
