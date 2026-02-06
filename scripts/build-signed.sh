#!/bin/bash
set -e

# Local signed build script for macOS
#
# Prerequisites:
# 1. "Developer ID Application" certificate installed in your Keychain
# 2. Create .env.signing file with your credentials (see below)
#
# Usage:
#   ./scripts/build-signed.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load signing credentials from .env.signing if it exists
ENV_FILE="$PROJECT_DIR/.env.signing"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Error: .env.signing file not found"
    echo ""
    echo "Create $ENV_FILE with:"
    echo ""
    echo "  APPLE_SIGNING_IDENTITY=Developer ID Application: Your Name (TEAMID)"
    echo "  APPLE_ID=your@email.com"
    echo "  APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx"
    echo "  APPLE_TEAM_ID=XXXXXXXXXX"
    echo ""
    exit 1
fi

# Verify required variables
if [ -z "$APPLE_SIGNING_IDENTITY" ]; then
    echo "Error: APPLE_SIGNING_IDENTITY not set in .env.signing"
    exit 1
fi

echo "Building signed app..."
echo "Signing identity: $APPLE_SIGNING_IDENTITY"
echo ""

cd "$PROJECT_DIR"
npm run tauri build -- --target aarch64-apple-darwin

echo ""
echo "Build complete! Output:"
ls -la src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg
