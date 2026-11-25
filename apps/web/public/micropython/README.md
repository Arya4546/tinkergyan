# MicroPython firmware

Official MicroPython v1.29.0 (2026-08-24) builds, unmodified, from
https://micropython.org/download/ — installed onto a student's board by the
Python editor's "Install MicroPython" button (src/lib/python/board/firmware.ts).

| File                | Board build      | Flash address |
| ------------------- | ---------------- | ------------- |
| esp32-v1.29.0.bin   | ESP32_GENERIC    | 0x1000        |
| esp32s3-v1.29.0.bin | ESP32_GENERIC_S3 | 0x0           |
| esp32c3-v1.29.0.bin | ESP32_GENERIC_C3 | 0x0           |

SHA-256 checksums are in src/lib/python/board/firmware.ts and are checked
before anything is written to a board. To update: download the new builds,
replace these files, and update the names, sizes and checksums there.

MicroPython is MIT licensed (https://github.com/micropython/micropython/blob/master/LICENSE);
the builds include ESP-IDF, Apache-2.0 licensed.
