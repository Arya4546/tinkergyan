#!/bin/sh
set -e

echo "Running migrations..."
npx --yes prisma@6.16.0 migrate deploy

CLI=/app/bin/arduino-cli
PKGS=/root/.arduino15/packages
ESP8266_URL=https://arduino.esp8266.com/stable/package_esp8266com_index.json
ESP32_URL=https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json

# Install each core independently, keyed off its own package directory.
#
# This used to be one `if [ ! -d .../packages/esp8266 ]` around all of them,
# which had two consequences: the esp32 core was never installed at all (so
# every ESP32 compile failed with "platform not installed" — the board is in
# the UI dropdown and in SUPPORTED_BOARDS, but the toolchain for it was never
# there), and adding a core later would be a no-op on any existing deployment,
# because the esp8266 directory already exists and short-circuits the whole
# block. Per-core checks mean a new core lands on the next restart.
install_core() {
  name="$1"      # package dir under ~/.arduino15/packages (unused, kept for clarity)
  spec="$2"      # arduino-cli core id
  url="$3"       # additional package index, empty for built-ins

  # Ask arduino-cli whether the core is actually usable, rather than checking
  # that a directory exists. The ESP32 core is a 1.6GB download; if it dies
  # part-way (disk full, dropped connection) the package directory is still
  # there, so a directory check would report "already installed" on every
  # future restart and the board would stay silently broken forever.
  if "$CLI" core list 2>/dev/null | grep -q "^$spec "; then
    echo "Core $spec already installed."
    return 0
  fi

  echo "Installing $spec core (this may take a few minutes)..."
  if [ -n "$url" ]; then
    "$CLI" core install "$spec" --additional-urls "$url"
  else
    "$CLI" core install "$spec"
  fi
}

# Cores install in the BACKGROUND, so the API comes up immediately.
#
# The ESP32 core alone is a 1.6GB download (~3.5GB unpacked) and can take 20+
# minutes on a slow link. Installing before `exec node` meant the entire
# service — login, projects, uploads for boards whose cores were already
# present — stayed down for that whole window. Nothing here is needed to serve
# a request; a compile for a not-yet-installed board fails with a clear
# arduino-cli error, which beats the site being unreachable.
#
# `|| true` throughout for the same reason: a core that cannot install must
# never take the API down with it.
install_cores() {
  echo "Updating core index..."
  "$CLI" core update-index --additional-urls "$ESP8266_URL,$ESP32_URL" || true

  install_core arduino  arduino:avr      ""             || echo "AVR core install failed — Uno/Nano/Mega compiles will not work"
  install_core esp8266  esp8266:esp8266  "$ESP8266_URL" || echo "ESP8266 core install failed — ESP8266 compiles will not work"
  install_core esp32    esp32:esp32      "$ESP32_URL"   || echo "ESP32 core install failed — ESP32 compiles will not work"

  echo "Core setup finished. Installed cores:"
  "$CLI" core list || true
}

install_cores &

echo "Starting server..."
exec node dist/server.cjs
