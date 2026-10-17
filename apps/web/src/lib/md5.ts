/**
 * md5.ts
 *
 * Minimal, dependency-free MD5 — used only to verify a flashed ESP8266/ESP32
 * image against the device's own post-write MD5 (esptool-js's
 * `writeFlash({ calculateMD5Hash })` option, see web-serial-flasher.ts).
 *
 * Why this exists: esptool-js's writeFlash() only confirms the serial
 * protocol ACKed each packet — it does NOT confirm the SPI flash chip
 * actually stored the bytes. A board whose flash chip is intermittently
 * failing to respond (visible in the esptool log as "Flash ID: 0" /
 * "WARNING: Failed to communicate with the flash chip") can still have every
 * packet ACKed over the wire while the flash itself never committed the
 * data — "upload successful" with nothing actually written. Passing this as
 * `calculateMD5Hash` makes esptool-js read the flash back after writing and
 * compare its MD5 against ours, turning that silent failure into a real,
 * user-visible error.
 *
 * Browser Web Crypto has no MD5 (only SHA-*), hence this standalone
 * implementation. Verified against Node's `crypto.createHash('md5')` and the
 * RFC 1321 / Wikipedia test vectors for every input length class (empty,
 * sub-block, exactly-at-the-56-byte boundary, multi-block, large binary).
 */

function rotl(x: number, c: number): number {
  return ((x << c) | (x >>> (32 - c))) >>> 0;
}

// T[i] = floor(abs(sin(i + 1)) * 2^32), per RFC 1321 — computed rather than
// hand-transcribed to remove any chance of a copy-paste error in 64 magic
// numbers.
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
  10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

function md5(input: Uint8Array): Uint8Array {
  const origLenBits = input.length * 8;
  let paddedLen = input.length + 1; // +1 for the mandatory 0x80 byte
  while (paddedLen % 64 !== 56) paddedLen++;
  paddedLen += 8; // 64-bit little-endian bit length

  const buf = new Uint8Array(paddedLen);
  buf.set(input);
  buf[input.length] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(paddedLen - 8, origLenBits >>> 0, true);
  view.setUint32(paddedLen - 4, Math.floor(origLenBits / 2 ** 32), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < paddedLen; chunkStart += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(chunkStart + j * 4, true);

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i]! + M[g]!) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[i]!)) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, a0, true);
  outView.setUint32(4, b0, true);
  outView.setUint32(8, c0, true);
  outView.setUint32(12, d0, true);
  return out;
}

/** Lowercase hex MD5 digest of `input`, matching esptool's own flash md5sum format. */
export function md5Hex(input: Uint8Array): string {
  const digest = md5(input);
  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
