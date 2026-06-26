/**
 * arduino-shim.ts
 *
 * A C++ compatibility header that emulates core Arduino APIs on a standard
 * GCC compiler (Wandbox). When the user writes Arduino sketches with
 * setup()/loop(), this shim is auto-prepended so the code compiles and
 * produces meaningful simulated Serial output.
 *
 * Coverage:
 *   - Digital I/O:  pinMode, digitalWrite, digitalRead
 *   - Analog I/O:   analogRead, analogWrite
 *   - Timing:       delay, delayMicroseconds, millis, micros
 *   - Serial:       Serial.begin, print, println, available, read
 *   - Math helpers: map, constrain, random, randomSeed, abs, min, max
 *   - Constants:    HIGH, LOW, INPUT, OUTPUT, INPUT_PULLUP, LED_BUILTIN, A0–A5
 *   - Types:        byte, boolean, String (basic)
 *   - Entry point:  main() calls setup() then loop() N times
 */

export const ARDUINO_SHIM = `
// ═══════════════════════════════════════════════════════════════════════
// TinkerGyan Arduino Simulator Shim — DO NOT EDIT
// Emulates Arduino APIs on standard GCC for cloud compilation.
// ═══════════════════════════════════════════════════════════════════════
#include <iostream>
#include <string>
#include <sstream>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include <chrono>
#include <thread>
#include <algorithm>

// ── Constants ────────────────────────────────────────────────────────────
#define HIGH 1
#define LOW  0
#define INPUT  0
#define OUTPUT 1
#define INPUT_PULLUP 2
#define LED_BUILTIN 13
#define A0 14
#define A1 15
#define A2 16
#define A3 17
#define A4 18
#define A5 19

// ── ESP8266 NodeMCU pin aliases ─────────────────────────────────────────
#ifndef D0
#define D0 16
#define D1 5
#define D2 4
#define D3 0
#define D4 2
#define D5 14
#define D6 12
#define D7 13
#define D8 15
#define RX 3
#define TX 1
#endif

// ── Types ────────────────────────────────────────────────────────────────
typedef unsigned char byte;
typedef bool boolean;
typedef std::string String;

// ── Timing (simulated) ──────────────────────────────────────────────────
static auto __start_time = std::chrono::steady_clock::now();

unsigned long millis() {
  auto now = std::chrono::steady_clock::now();
  return (unsigned long)std::chrono::duration_cast<std::chrono::milliseconds>(now - __start_time).count();
}

unsigned long micros() {
  auto now = std::chrono::steady_clock::now();
  return (unsigned long)std::chrono::duration_cast<std::chrono::microseconds>(now - __start_time).count();
}

void delay(unsigned long ms) {
  // In simulation, cap delay to 10ms to prevent timeout
  unsigned long actual = ms > 10 ? 10 : ms;
  std::this_thread::sleep_for(std::chrono::milliseconds(actual));
}

void delayMicroseconds(unsigned int us) {
  // Simulated — no-op in cloud mode
  (void)us;
}

// ── Pin state tracking ──────────────────────────────────────────────────
static int __pin_modes[64] = {0};
static int __pin_values[64] = {0};

void pinMode(int pin, int mode) {
  if (pin >= 0 && pin < 64) __pin_modes[pin] = mode;
  std::cout << "[SIM] pinMode(" << pin << ", "
            << (mode == OUTPUT ? "OUTPUT" : mode == INPUT_PULLUP ? "INPUT_PULLUP" : "INPUT")
            << ")" << std::endl;
}

void digitalWrite(int pin, int value) {
  if (pin >= 0 && pin < 64) __pin_values[pin] = value;
  std::cout << "[SIM] digitalWrite(" << pin << ", " << (value ? "HIGH" : "LOW") << ")" << std::endl;
}

int digitalRead(int pin) {
  int val = (pin >= 0 && pin < 64) ? __pin_values[pin] : 0;
  std::cout << "[SIM] digitalRead(" << pin << ") -> " << val << std::endl;
  return val;
}

int analogRead(int pin) {
  // Return a simulated analog value
  int val = (pin % 6) * 170 + 42;
  std::cout << "[SIM] analogRead(" << pin << ") -> " << val << std::endl;
  return val;
}

void analogWrite(int pin, int value) {
  std::cout << "[SIM] analogWrite(" << pin << ", " << value << ")" << std::endl;
}

// ── Serial emulation ────────────────────────────────────────────────────
class SerialClass {
public:
  void begin(int baud) {
    std::cout << "[SIM] Serial.begin(" << baud << ")" << std::endl;
  }

  // Print overloads for all common types
  void print(const char* s)       { std::cout << s; }
  void print(const std::string& s){ std::cout << s; }
  void print(int v)               { std::cout << v; }
  void print(unsigned int v)      { std::cout << v; }
  void print(long v)              { std::cout << v; }
  void print(unsigned long v)     { std::cout << v; }
  void print(float v)             { std::cout << v; }
  void print(double v)            { std::cout << v; }
  void print(char c)              { std::cout << c; }

  void println()                    { std::cout << std::endl; }
  void println(const char* s)       { std::cout << s << std::endl; }
  void println(const std::string& s){ std::cout << s << std::endl; }
  void println(int v)               { std::cout << v << std::endl; }
  void println(unsigned int v)      { std::cout << v << std::endl; }
  void println(long v)              { std::cout << v << std::endl; }
  void println(unsigned long v)     { std::cout << v << std::endl; }
  void println(float v)             { std::cout << v << std::endl; }
  void println(double v)            { std::cout << v << std::endl; }
  void println(char c)              { std::cout << c << std::endl; }

  int available() { return 0; }
  int read()      { return -1; }
};

SerialClass Serial;

// ── Math helpers ────────────────────────────────────────────────────────
long map(long x, long in_min, long in_max, long out_min, long out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

long constrain(long x, long a, long b) {
  return x < a ? a : (x > b ? b : x);
}

long random(long max_val) {
  return std::rand() % max_val;
}

long random(long min_val, long max_val) {
  return min_val + (std::rand() % (max_val - min_val));
}

void randomSeed(unsigned long seed) {
  std::srand((unsigned int)seed);
}

// ── Forward declarations (user provides these) ──────────────────────────
void setup();
void loop();

// ── Entry point ─────────────────────────────────────────────────────────
int main() {
  std::cout << "╔══════════════════════════════════════╗" << std::endl;
  std::cout << "║  TinkerGyan Arduino Simulator v1.0   ║" << std::endl;
  std::cout << "╚══════════════════════════════════════╝" << std::endl;
  std::cout << std::endl;

  setup();

  std::cout << "\\n--- loop() running (5 iterations) ---\\n" << std::endl;
  for (int __i = 0; __i < 5; __i++) {
    std::cout << "[loop " << (__i + 1) << "/5]" << std::endl;
    loop();
    std::cout << std::endl;
  }

  std::cout << "--- Simulation complete ---" << std::endl;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// User sketch begins below:
// ═══════════════════════════════════════════════════════════════════════

`;

/**
 * Detect if the source code is an Arduino sketch (uses setup/loop pattern)
 * vs a standard C++ program (has its own main()).
 */
export function isArduinoSketch(code: string): boolean {
  const stripped = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const hasSetup = /void\s+setup\s*\(\s*\)/.test(stripped);
  const hasLoop = /void\s+loop\s*\(\s*\)/.test(stripped);
  const hasMain = /int\s+main\s*\(/.test(stripped);
  const hasArduinoH = /#include\s*<Arduino\.h>/.test(stripped);
  const hasEsp8266H = /#include\s*<ESP8266WiFi\.h>/.test(stripped);

  if (hasArduinoH || hasEsp8266H) return true;
  if (hasMain && !hasSetup) return false;
  if (hasSetup || hasLoop) return true;
  return false;
}

/**
 * Prepare code for Wandbox compilation.
 * - Arduino sketches get the shim prepended and #include <Arduino.h> stripped.
 * - Standard C++ code is passed through as-is.
 */
export function prepareForWandbox(code: string): { code: string; isArduino: boolean } {
  const isArduino = isArduinoSketch(code);

  if (!isArduino) {
    return { code, isArduino: false };
  }

  // Strip #include <Arduino.h> and #include <ESP8266WiFi.h> since the shim provides everything
  let cleaned = code.replace(/^\s*#include\s*<Arduino\.h>\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*#include\s*<ESP8266WiFi\.h>\s*$/gm, '');
  // Strip any duplicate main() that might conflict
  // (the shim already provides main)

  return { code: ARDUINO_SHIM + cleaned, isArduino: true };
}

/**
 * Adjust error line numbers to account for the shim offset.
 * The shim adds N lines before user code, so reported line numbers
 * need to be shifted back.
 */
export function adjustLineNumbers(
  errors: Array<{ line: number; column: number; message: string; severity: string }>,
  isArduino: boolean,
): Array<{ line: number; column: number; message: string; severity: 'error' | 'warning' }> {
  if (!isArduino) {
    return errors as Array<{
      line: number;
      column: number;
      message: string;
      severity: 'error' | 'warning';
    }>;
  }

  const shimLines = ARDUINO_SHIM.split('\n').length;

  return errors.map((e) => ({
    ...e,
    severity: e.severity as 'error' | 'warning',
    line: Math.max(1, e.line - shimLines),
  }));
}
