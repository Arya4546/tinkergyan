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
INSTALL_DIR="$HOME/bin"

echo "══════════════════════════════════════════════════════════"
echo "  🔧 TinkerGyan: Setting up arduino-cli v${ARDUINO_CLI_VERSION}"
echo "══════════════════════════════════════════════════════════"

# Skip if already installed
if command -v arduino-cli &>/dev/null; then
  echo "✅ arduino-cli already installed: $(arduino-cli version)"
else
  mkdir -p "$INSTALL_DIR"
  
  echo "⬇️  Downloading arduino-cli..."
  curl -fsSL "https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh" | BINDIR="$INSTALL_DIR" sh -s "$ARDUINO_CLI_VERSION"
  
  # Make sure it's in PATH
  export PATH="$INSTALL_DIR:$PATH"
  echo "✅ Installed: $(arduino-cli version)"
fi

# Update core index
echo "📦 Updating board index..."
arduino-cli core update-index

# Install AVR core (Arduino Uno, Mega, Nano, etc.)
echo "📦 Installing arduino:avr core..."
arduino-cli core install arduino:avr

# Install ESP8266 core
echo "📦 Installing esp8266 core..."
arduino-cli config set board_manager.additional_urls "https://arduino.esp8266.com/stable/package_esp8266com_index.json"
arduino-cli core update-index
arduino-cli core install esp8266:esp8266 || echo "⚠️  ESP8266 core install failed (non-critical)"

# Install common libraries
echo "📦 Installing common libraries..."
arduino-cli lib install "Servo" || true
arduino-cli lib install "Adafruit NeoPixel" || true
arduino-cli lib install "DHT sensor library" || true
arduino-cli lib install "LiquidCrystal" || true
arduino-cli lib install "Wire" || true

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  ✅ arduino-cli setup complete!"
echo "  📍 Path: $(which arduino-cli)"
echo "  📦 Installed cores:"
arduino-cli core list
echo "══════════════════════════════════════════════════════════"
