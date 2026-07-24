#!/usr/bin/env bash
# ─── scripts/setup-arduino-cli.sh ─────────────────────────────────────────────
#
# Installs arduino-cli and required board cores on the Render build server.
# Called from the Render Build Command before `pnpm build`.
#
# Usage:
#   chmod +x scripts/setup-arduino-cli.sh && ./scripts/setup-arduino-cli.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

ARDUINO_CLI_VERSION="1.1.1"

# Resolve project-level bin directory so it gets preserved on Render's runner image
if [ -n "${ARDUINO_CLI_PATH:-}" ]; then
  INSTALL_DIR="$(dirname "$ARDUINO_CLI_PATH")"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/bin"
fi

# Ensure arduino-cli directories are inside the workspace so they are persisted
export ARDUINO_DIRECTORIES_DATA="${ARDUINO_DIRECTORIES_DATA:-$INSTALL_DIR/arduino-cli-data}"
export ARDUINO_DIRECTORIES_USER="${ARDUINO_DIRECTORIES_USER:-$INSTALL_DIR/arduino-cli-user}"
export ARDUINO_DIRECTORIES_DOWNLOADS="${ARDUINO_DIRECTORIES_DOWNLOADS:-$INSTALL_DIR/arduino-cli-downloads}"

echo "══════════════════════════════════════════════════════════"
echo "  🔧 TinkerGyan: Setting up arduino-cli v${ARDUINO_CLI_VERSION}"
echo "══════════════════════════════════════════════════════════"

# Skip if already installed
if command -v arduino-cli &>/dev/null; then
  echo "✅ arduino-cli already installed: $(arduino-cli version)"
else
  mkdir -p "$INSTALL_DIR"
  mkdir -p "$ARDUINO_DIRECTORIES_DATA"
  mkdir -p "$ARDUINO_DIRECTORIES_USER"
  mkdir -p "$ARDUINO_DIRECTORIES_DOWNLOADS"
  
  echo "⬇️  Downloading arduino-cli..."
  curl -fsSL "https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh" | BINDIR="$INSTALL_DIR" sh -s "$ARDUINO_CLI_VERSION"
  
  # Make sure it's in PATH
  export PATH="$INSTALL_DIR:$PATH"
  echo "✅ Installed: $(arduino-cli version)"
fi

# Register third-party board indexes (single `config set` call — it overwrites,
# so both URLs must be passed together) and refresh the index once.
echo "📦 Updating board index..."
arduino-cli config set board_manager.additional_urls \
  "https://arduino.esp8266.com/stable/package_esp8266com_index.json" \
  "https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json"
arduino-cli core update-index

# Install AVR core (Arduino Uno, Nano, Mega)
echo "📦 Installing arduino:avr core..."
arduino-cli core install arduino:avr

# Install ESP8266 core (NodeMCU)
echo "📦 Installing esp8266 core..."
arduino-cli core install esp8266:esp8266 || echo "⚠️  ESP8266 core install failed (non-critical)"

# Install ESP32 core (ESP32 Dev Module)
echo "📦 Installing esp32 core..."
arduino-cli core install esp32:esp32 || echo "⚠️  ESP32 core install failed (non-critical)"

# Install common libraries
echo "📦 Installing common libraries..."
arduino-cli lib install "Servo" || true
arduino-cli lib install "Adafruit NeoPixel" || true
arduino-cli lib install "DHT sensor library" || true
arduino-cli lib install "LiquidCrystal" || true

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ arduino-cli setup complete!"
echo "  📍 Path: $(which arduino-cli)"
echo "  📦 Installed cores:"
arduino-cli core list
echo "══════════════════════════════════════════════════════════"
