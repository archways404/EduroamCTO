#!/bin/bash

set -e

OS="$(uname -s)"
ARCH="$(uname -m)"

# Default to macOS/Intel if unsure
BINARY=""
BASE_URL="https://github.com/archways404/EduroamCTO/releases/download/0.0.1"

if [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    BINARY="eduroam-cto-macos-arm64"
  else
    BINARY="eduroam-cto-macos-x64"
  fi
elif [[ "$OS" == "Linux" ]]; then
  BINARY="eduroam-cto-linux"
else
  echo "❌ Unsupported OS: $OS"
  exit 1
fi

echo "📦 Downloading $BINARY..."

curl -fsSL "$BASE_URL/$BINARY" -o "$BINARY"
chmod +x "$BINARY"
echo "🚀 Running $BINARY..."
./"$BINARY"