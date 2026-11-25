/**
 * firmware.ts — the MicroPython builds a student's board can be given.
 *
 * Official, unmodified MicroPython v1.29.0 builds, served from this site
 * (public/micropython/, see the README there). micropython.org itself can't be
 * used from a page — it doesn't allow cross-origin downloads.
 *
 * Every file is checked against the size and SHA-256 below before a single
 * byte is written to a board, so a truncated or stale download can never
 * leave a board half-installed.
 */
import { targetForChip, type PythonBoardTarget } from '../targets';

export const MICROPYTHON_VERSION = '1.29.0';

interface FirmwareFile {
  url: string;
  /** Where the image goes in flash. ESP32 builds start at 0x1000, newer chips at 0. */
  address: number;
  size: number;
  sha256: string;
}

export const FIRMWARE: Record<PythonBoardTarget, FirmwareFile> = {
  'python-esp32': {
    url: '/micropython/esp32-v1.29.0.bin',
    address: 0x1000,
    size: 1790544,
    sha256: 'e67ad6015a0a504c1fec9aa9bbf589d0432ed28e62546f4f8dd8a147f8bd95f6',
  },
  'python-esp32s3': {
    url: '/micropython/esp32s3-v1.29.0.bin',
    address: 0x0,
    size: 1783296,
    sha256: '1dd9dcd27ba2d6a1cb7f7b49a063f46d3d807d68b0151161233920228285e300',
  },
  'python-esp32c3': {
    url: '/micropython/esp32c3-v1.29.0.bin',
    address: 0x0,
    size: 1754736,
    sha256: 'bf72ed9eb88ad3a8f49d02c3d371f9ea34c90a8a303aeb9e324d8efd4a2a655a',
  },
};

const cache = new Map<PythonBoardTarget, Promise<Uint8Array>>();

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

class BadDownloadError extends Error {}

async function download(target: PythonBoardTarget, fresh = false): Promise<Uint8Array> {
  try {
    return await downloadOnce(target, fresh);
  } catch (err) {
    // A damaged copy in the browser's cache would otherwise come back every
    // time: fetch it once more from the server, past the cache.
    if (err instanceof BadDownloadError && !fresh) return download(target, true);
    throw err;
  }
}

async function downloadOnce(target: PythonBoardTarget, fresh: boolean): Promise<Uint8Array> {
  const file = FIRMWARE[target];
  let res: Response;
  try {
    res = await fetch(file.url, { cache: fresh ? 'reload' : 'force-cache' });
  } catch {
    throw new Error("Couldn't download MicroPython. Check your internet connection and try again.");
  }
  if (!res.ok) {
    throw new Error(`Couldn't download MicroPython (error ${res.status}). Try again in a moment.`);
  }
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.length !== file.size) {
    throw new BadDownloadError('The MicroPython download was incomplete. Try again.');
  }
  // Web Serial only exists on secure pages, so crypto.subtle is always there
  // when this runs; the check is for completeness.
  if (globalThis.crypto?.subtle) {
    const digest = hex(await crypto.subtle.digest('SHA-256', data));
    if (digest !== file.sha256) {
      throw new BadDownloadError('The MicroPython download was damaged. Try again in a moment.');
    }
  }
  // 0xE9 is the ESP image magic byte — a last guard against an HTML error page.
  if (data[0] !== 0xe9) {
    throw new BadDownloadError(
      'The MicroPython download was not a firmware file. Try again in a moment.',
    );
  }
  return data;
}

/** Download (once) and verify the build for a target. */
export function loadFirmware(target: PythonBoardTarget): Promise<Uint8Array> {
  let p = cache.get(target);
  if (!p) {
    p = download(target);
    cache.set(target, p);
    // A failed download must be retried next time, not remembered.
    p.catch(() => cache.delete(target));
  }
  return p;
}

/** The firmware for a chip esptool-js identified, or a message a student can act on. */
export async function firmwareForChip(
  chipName: string,
): Promise<{ data: Uint8Array; address: number; target: PythonBoardTarget }> {
  const target = targetForChip(chipName);
  if (!target) {
    throw new Error(
      chipName === 'ESP8266'
        ? 'This board is an ESP8266. Python projects work with ESP32, ESP32-S3 and ESP32-C3 boards. You can still use it in a blocks or C++ project.'
        : `This board is a ${chipName}. Python projects work with ESP32, ESP32-S3 and ESP32-C3 boards.`,
    );
  }
  const data = await loadFirmware(target);
  return { data, address: FIRMWARE[target].address, target };
}
