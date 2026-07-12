#!/bin/sh
set -e

echo "Running migrations..."
npx --yes prisma@6.16.0 migrate deploy

if [ ! -d "/root/.arduino15/packages/esp8266" ]; then
  echo "Arduino cores not found in volume. Installing (this may take a few minutes)..."
  /app/bin/arduino-cli core update-index --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
  
  echo "Installing AVR core..."
  /app/bin/arduino-cli core install arduino:avr
  
  echo "Installing ESP8266 core..."
  /app/bin/arduino-cli core install esp8266:esp8266 --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
else
  echo "Arduino cores already installed in volume."
fi

echo "Starting server..."
exec node dist/server.cjs
