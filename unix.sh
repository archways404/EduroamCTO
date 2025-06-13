#!/bin/bash
set -e

OS="$(uname -s)"
ARCH="$(uname -m)"
BINARY=""
BASE_URL="https://github.com/archways404/EduroamCTO/releases/download/0.0.1"

if [[ "$OS" == "Darwin" ]]; then
  if [[ "$ARCH" == "arm64" ]]; then
    ZIP="eduroam-cto-macos-arm64.zip"
    EXE="eduroam-cto-macos-arm64"
  else
    ZIP="eduroam-cto-macos-x64.zip"
    EXE="eduroam-cto-macos-x64"
  fi
elif [[ "$OS" == "Linux" ]]; then
  ZIP="eduroam-cto-linux.zip"
  EXE="eduroam-cto-linux"
else
  echo "❌ Unsupported OS: $OS"
  exit 1
fi

echo "📦 Downloading $ZIP..."
curl -fsSL "$BASE_URL/$ZIP" -o "$ZIP"

echo "📦 Extracting..."
unzip -o "$ZIP" -d .

chmod +x "$EXE"
echo "🚀 Running $EXE..."
./"$EXE"