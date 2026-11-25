# time for programs that run in the browser. sleep() waits without freezing
# the page (see python.worker.ts); perf_counter() and friends are added for
# timing code. Everything else is MicroPython's own time module.
from _tg_real_time import *
import tg_host


def sleep(seconds):
    tg_host.sleep(float(seconds))


def sleep_ms(ms):
    tg_host.sleep(float(ms) / 1000)


def sleep_us(us):
    tg_host.sleep(float(us) / 1000000)


def perf_counter():
    return time_ns() / 1e9


def perf_counter_ns():
    return time_ns()


monotonic = perf_counter
monotonic_ns = perf_counter_ns
process_time = perf_counter
