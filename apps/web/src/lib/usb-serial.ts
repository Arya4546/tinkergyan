/**
 * usb-serial.ts
 *
 * One way for the editor to get a "serial port" on every browser that can
 * talk to a board at all.
 *
 *   • Desktop Chrome / Edge       → the browser's own Web Serial API (unchanged).
 *   • Android Chrome / Edge       → Web Serial does NOT exist there, but WebUSB
 *                                   does. We drive the USB-serial chip ourselves
 *                                   and expose the same SerialPort shape
 *                                   (open / close / readable / writable /
 *                                   setSignals / getInfo), so the flasher, the
 *                                   Serial Monitor and esptool-js work as-is.
 *
 * Chips covered over WebUSB:
 *   • CDC-ACM  — Arduino Uno R3 (ATmega16U2), Leonardo, Mega 2560, Nano Every,
 *                ESP32-S2/S3/C3 native USB, Pico …   (web-serial-polyfill)
 *   • CH340/CH341 — most Nano clones, many ESP8266 / ESP32 dev boards
 *   • CP210x   — many ESP32 / NodeMCU boards
 *
 * NOT covered: FTDI (FT232) — we say so instead of failing mysteriously.
 *
 * The CH340 driver is adapted from Espressif's esptool-js (Apache-2.0,
 * `WebUSBSerialPort`); the CP210x driver follows the Linux `cp210x` driver's
 * control requests.
 */
import { SerialPort as CdcSerialPort } from 'web-serial-polyfill';

// ── Minimal WebUSB typings (lib.dom ships none) ────────────────────────────
interface UsbEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
  type: 'bulk' | 'interrupt' | 'isochronous';
}
interface UsbAlternate {
  interfaceClass: number;
  endpoints: UsbEndpoint[];
}
interface UsbInterface {
  interfaceNumber: number;
  alternates: UsbAlternate[];
}
interface UsbTransferResult {
  status: 'ok' | 'stall' | 'babble';
  data?: DataView;
}
export interface UsbDevice {
  vendorId: number;
  productId: number;
  opened: boolean;
  configuration: { configurationValue: number; interfaces: UsbInterface[] } | null;
  /** Every configuration the device advertises — populated without opening it. */
  configurations: Array<{ configurationValue: number; interfaces: UsbInterface[] }>;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  releaseInterface(n: number): Promise<void>;
  clearHalt(direction: 'in' | 'out', endpoint: number): Promise<void>;
  transferIn(endpoint: number, length: number): Promise<UsbTransferResult>;
  transferOut(endpoint: number, data: BufferSource): Promise<{ status: string }>;
  controlTransferOut(
    setup: {
      requestType: 'vendor' | 'class' | 'standard';
      recipient: 'device' | 'interface' | 'endpoint';
      request: number;
      value: number;
      index: number;
    },
    data?: BufferSource,
  ): Promise<{ status: string }>;
}
interface UsbApi {
  requestDevice(options: { filters: Array<{ vendorId?: number }> }): Promise<UsbDevice>;
  addEventListener(type: 'disconnect', cb: (e: { device: UsbDevice }) => void): void;
  removeEventListener(type: 'disconnect', cb: (e: { device: UsbDevice }) => void): void;
}

/** What the rest of the app relies on — same shape as a Web Serial port. */
export interface HardwarePort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  setSignals(signals: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;
  getInfo(): { usbVendorId?: number; usbProductId?: number };
}

const VID = {
  ARDUINO: 0x2341,
  ARDUINO_ORG: 0x2a03,
  WCH: 0x1a86,
  SILABS: 0x10c4,
  FTDI: 0x0403,
  ESPRESSIF: 0x303a,
  ADAFRUIT: 0x239a,
  SPARKFUN: 0x1b4f,
  PICO: 0x2e8a,
} as const;

const CLASS_CDC_COMM = 0x02;
const CLASS_VENDOR = 0xff;

function getUsb(): UsbApi | null {
  const usb = (navigator as unknown as { usb?: UsbApi }).usb;
  return usb ?? null;
}
function getNativeSerial(): (EventTarget & { requestPort(): Promise<HardwarePort> }) | null {
  const s = (
    navigator as unknown as { serial?: EventTarget & { requestPort(): Promise<HardwarePort> } }
  ).serial;
  return s ?? null;
}

/** True on any browser that can reach a board (Web Serial or WebUSB). */
export function isHardwareSupported(): boolean {
  return getNativeSerial() !== null || getUsb() !== null;
}

/** True when we are using the WebUSB fallback (e.g. Android Chrome). */
export function isUsingUsbFallback(): boolean {
  return getNativeSerial() === null && getUsb() !== null;
}

/** Student-friendly explanation of why hardware is not available here. */
export function hardwareUnsupportedMessage(boardLabel: string): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return `iPhones and iPads cannot talk to a ${boardLabel}. Use Chrome on a computer or an Android phone/tablet.`;
  }
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return `Connecting to your ${boardLabel} needs a secure (https) page. Open the https:// address of this site and try again.`;
  }
  return `Connecting to your ${boardLabel} needs Chrome or Edge (on a computer or an Android phone/tablet). You can still build and save your project here!`;
}

// ── Shared base for the two vendor-protocol chips ──────────────────────────

const MAX_TRANSFER = 64;

abstract class VendorBulkPort implements HardwarePort {
  protected iface = -1;
  protected epIn = -1;
  protected epOut = -1;
  protected dtr = false;
  protected rts = false;
  private queue: Promise<void> = Promise.resolve();
  private readable_: ReadableStream<Uint8Array> | null = null;
  private writable_: WritableStream<Uint8Array> | null = null;

  constructor(protected readonly device: UsbDevice) {}

  protected abstract chipName: string;
  protected abstract initChip(baudRate: number): Promise<void>;
  protected abstract shutdownChip(): Promise<void>;
  abstract setSignals(s: { dataTerminalReady?: boolean; requestToSend?: boolean }): Promise<void>;

  getInfo() {
    return { usbVendorId: this.device.vendorId, usbProductId: this.device.productId };
  }

  /** Control transfers must not overlap — the chips mis-handle interleaved requests. */
  protected control(
    recipient: 'device' | 'interface',
    request: number,
    value: number,
    index: number,
    data?: BufferSource,
  ): Promise<void> {
    const run = this.queue.then(async () => {
      if (!this.device.opened) throw new Error(`${this.chipName} device is not open`);
      const r = await this.device.controlTransferOut(
        { requestType: 'vendor', recipient, request, value, index },
        data,
      );
      if (r.status !== 'ok') {
        throw new Error(
          `${this.chipName} control request 0x${request.toString(16)} failed (${r.status})`,
        );
      }
    });
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private findVendorInterface() {
    const cfg = this.device.configuration;
    if (!cfg) throw new Error('USB device has no configuration');
    for (const itf of cfg.interfaces) {
      for (const alt of itf.alternates) {
        if (alt.interfaceClass !== CLASS_VENDOR) continue;
        const inEp = alt.endpoints.find((e) => e.type === 'bulk' && e.direction === 'in');
        const outEp = alt.endpoints.find((e) => e.type === 'bulk' && e.direction === 'out');
        if (inEp && outEp) {
          this.iface = itf.interfaceNumber;
          this.epIn = inEp.endpointNumber;
          this.epOut = outEp.endpointNumber;
          return;
        }
      }
    }
    throw new Error(`No ${this.chipName} data interface found on this USB device`);
  }

  async open(options: { baudRate: number }): Promise<void> {
    if (this.device.opened) await this.close();
    await this.device.open();
    try {
      if (!this.device.configuration || this.device.configuration.configurationValue !== 1) {
        await this.device.selectConfiguration(1);
      }
      this.findVendorInterface();
      await this.device.claimInterface(this.iface);
      await this.initChip(options.baudRate || 115200);
    } catch (err) {
      try {
        await this.device.close();
      } catch {
        /* already gone */
      }
      throw new Error(`Could not open the ${this.chipName} USB chip: ${String(err)}`);
    }
  }

  async close(): Promise<void> {
    this.readable_ = null;
    this.writable_ = null;
    this.rxQueue = [];
    if (!this.device.opened) return;
    try {
      await this.shutdownChip();
    } catch {
      /* unplugged */
    }
    try {
      await this.device.releaseInterface(this.iface);
    } catch {
      /* interface already released after a disconnect */
    }
    await this.device.close();
  }

  // Packets that have arrived but no stream has consumed yet. Every transfer
  // lands here first, so a transfer that was already in flight when a reader
  // was cancelled is never lost — the next stream simply picks it up.
  private rxQueue: Uint8Array[] = [];
  private inflight: Promise<void> | null = null;

  /** One USB read at a time, shared by every stream this port ever hands out. */
  private fill(): Promise<void> {
    if (!this.inflight) {
      this.inflight = (async () => {
        try {
          const r = await this.device.transferIn(this.epIn, MAX_TRANSFER);
          if (r.status === 'stall') {
            await this.device.clearHalt('in', this.epIn);
          } else if (r.status !== 'ok') {
            throw new Error(`${this.chipName} read failed (${r.status})`);
          } else if (r.data && r.data.byteLength > 0) {
            this.rxQueue.push(new Uint8Array(r.data.buffer, r.data.byteOffset, r.data.byteLength));
          }
        } finally {
          this.inflight = null;
        }
      })();
    }
    return this.inflight;
  }

  // Like the native API, `readable` hands out a fresh stream if the previous
  // one was cancelled while the port stayed open, and ends the stream when the
  // port is closed or the cable is pulled.
  get readable(): ReadableStream<Uint8Array> | null {
    if (!this.readable_ && this.device.opened) {
      let active = true;
      this.readable_ = new ReadableStream<Uint8Array>({
        pull: async (controller) => {
          try {
            while (active) {
              const next = this.rxQueue.shift();
              if (next) {
                controller.enqueue(next);
                return;
              }
              if (!this.device.opened) {
                active = false;
                controller.close();
                return;
              }
              await this.fill();
            }
          } catch (err) {
            if (!active) return;
            active = false;
            if (this.device.opened) controller.error(err);
            else controller.close();
          }
        },
        cancel: () => {
          active = false;
          this.readable_ = null;
        },
      });
    }
    return this.readable_;
  }

  get writable(): WritableStream<Uint8Array> | null {
    if (!this.writable_ && this.device.opened) {
      this.writable_ = new WritableStream<Uint8Array>({
        write: async (chunk) => {
          if (!this.device.opened) throw new Error(`${this.chipName} device is not open`);
          const r = await this.device.transferOut(this.epOut, chunk as BufferSource);
          if (r.status !== 'ok') throw new Error(`${this.chipName} write failed (${r.status})`);
        },
        close: () => {
          this.writable_ = null;
        },
        abort: () => {
          this.writable_ = null;
        },
      });
    }
    return this.writable_;
  }
}

// ── WCH CH340 / CH341 (adapted from esptool-js WebUSBSerialPort) ───────────

const CH341_BAUDBASE_FACTOR = 1532620800;
const CH341_BAUDBASE_DIVMAX = 3;

class Ch340Port extends VendorBulkPort {
  protected chipName = 'CH340';

  protected async initChip(baudRate: number) {
    await this.control('device', 0xa1, 0, 0); // CH340_INIT
    await this.setBaud(baudRate);
    await this.setSignals({ dataTerminalReady: false, requestToSend: false });
  }

  private async setBaud(baudRate: number) {
    let factor = Math.floor(CH341_BAUDBASE_FACTOR / baudRate);
    let divisor = CH341_BAUDBASE_DIVMAX;
    while (factor > 0xfff0 && divisor > 0) {
      factor >>= 3;
      divisor--;
    }
    if (factor > 0xfff0) throw new Error(`Baud rate ${baudRate} is not supported by the CH340`);
    factor = 0x10000 - factor;
    await this.control('device', 0x9a, 0x1312, (factor & 0xff00) | divisor);
    await this.control('device', 0x9a, 0x0f2c, factor & 0xff);
    await new Promise((r) => setTimeout(r, 50));
  }

  async setSignals(s: { dataTerminalReady?: boolean; requestToSend?: boolean }) {
    if (s.dataTerminalReady !== undefined) this.dtr = s.dataTerminalReady;
    if (s.requestToSend !== undefined) this.rts = s.requestToSend;
    // CH340 handshake lines are active-low.
    const value = ~((this.dtr ? 1 << 5 : 0) | (this.rts ? 1 << 6 : 0)) & 0xffff;
    await this.control('device', 0xa4, value, 0); // CH340_SET_HANDSHAKE
  }

  protected async shutdownChip() {
    /* nothing to do — releasing the interface is enough */
  }
}

// ── Silicon Labs CP210x ────────────────────────────────────────────────────

const CP210X_IFC_ENABLE = 0x00;
const CP210X_SET_LINE_CTL = 0x03;
const CP210X_SET_MHS = 0x07;
const CP210X_SET_BAUDRATE = 0x1e;

class Cp210xPort extends VendorBulkPort {
  protected chipName = 'CP210x';

  protected async initChip(baudRate: number) {
    await this.control('interface', CP210X_IFC_ENABLE, 1, this.iface);
    await this.control('interface', CP210X_SET_LINE_CTL, 0x0800, this.iface); // 8 data bits, no parity, 1 stop
    await this.setBaud(baudRate);
    await this.setSignals({ dataTerminalReady: false, requestToSend: false });
  }

  private async setBaud(baudRate: number) {
    const data = new Uint8Array(4);
    new DataView(data.buffer).setUint32(0, baudRate, true);
    await this.control('interface', CP210X_SET_BAUDRATE, 0, this.iface, data);
  }

  async setSignals(s: { dataTerminalReady?: boolean; requestToSend?: boolean }) {
    let mask = 0;
    let value = 0;
    if (s.dataTerminalReady !== undefined) {
      this.dtr = s.dataTerminalReady;
      mask |= 0x0100;
    }
    if (s.requestToSend !== undefined) {
      this.rts = s.requestToSend;
      mask |= 0x0200;
    }
    value = (this.dtr ? 0x0001 : 0) | (this.rts ? 0x0002 : 0) | mask;
    if (mask === 0) return;
    await this.control('interface', CP210X_SET_MHS, value, this.iface);
  }

  protected async shutdownChip() {
    await this.control('interface', CP210X_IFC_ENABLE, 0, this.iface);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

const deviceByPort = new WeakMap<object, UsbDevice>();

function hasClass(device: UsbDevice, cls: number): boolean {
  const cfg = device.configuration ?? device.configurations[0];
  return !!cfg?.interfaces.some((i) => i.alternates.some((a) => a.interfaceClass === cls));
}

function createUsbPort(device: UsbDevice): HardwarePort {
  if (hasClass(device, CLASS_CDC_COMM)) {
    return new CdcSerialPort(device as never) as unknown as HardwarePort;
  }
  if (device.vendorId === VID.WCH) return new Ch340Port(device);
  if (device.vendorId === VID.SILABS) return new Cp210xPort(device);
  if (device.vendorId === VID.FTDI) {
    throw new Error(
      "This board uses an FTDI USB chip, which phones and tablets can't talk to yet. Use a computer with Chrome or Edge instead.",
    );
  }
  throw new Error(
    "This USB device isn't a board we recognise. Pick your Arduino / ESP board from the list, or use a computer with Chrome or Edge.",
  );
}

/**
 * Ask the user to pick a board. Uses Web Serial where it exists and WebUSB
 * everywhere else. Throws a DOMException named NotFoundError if they cancel.
 */
export async function requestHardwarePort(): Promise<HardwarePort> {
  const serial = getNativeSerial();
  if (serial) return serial.requestPort();

  const usb = getUsb();
  if (!usb) throw new Error('This browser cannot connect to hardware.');
  const device = await usb.requestDevice({
    filters: Object.values(VID).map((vendorId) => ({ vendorId })),
  });
  const port = createUsbPort(device);
  deviceByPort.set(port, device);
  return port;
}

/** Call `cb` when the cable is pulled. Returns an unsubscribe function. */
export function onHardwareDisconnect(port: HardwarePort, cb: () => void): () => void {
  const serial = getNativeSerial();
  if (serial) {
    const handler = (e: Event) => {
      if ((e.target as unknown) === port) cb();
    };
    serial.addEventListener('disconnect', handler);
    return () => serial.removeEventListener('disconnect', handler);
  }
  const usb = getUsb();
  const device = deviceByPort.get(port);
  if (!usb || !device) return () => {};
  const handler = (e: { device: UsbDevice }) => {
    if (e.device === device) cb();
  };
  usb.addEventListener('disconnect', handler);
  return () => usb.removeEventListener('disconnect', handler);
}
