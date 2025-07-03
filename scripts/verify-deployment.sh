#!/bin/bash

echo "=== Verifying Firmware Deployment ==="

# Check if firmware file exists in source
if [ ! -f "public/firmware/sense360_v2.v2.0.0.factory.bin" ]; then
    echo "❌ ERROR: Firmware file not found in public/firmware/"
    exit 1
fi

echo "✅ Source firmware file exists"

# Copy firmware files to build output
mkdir -p dist/public/firmware
cp public/firmware/* dist/public/firmware/

# Verify firmware file in build output
if [ ! -f "dist/public/firmware/sense360_v2.v2.0.0.factory.bin" ]; then
    echo "❌ ERROR: Firmware file not found in build output"
    exit 1
fi

echo "✅ Firmware file copied to build output"

# Check file size
SOURCE_SIZE=$(stat -c%s "public/firmware/sense360_v2.v2.0.0.factory.bin" 2>/dev/null || echo "0")
BUILD_SIZE=$(stat -c%s "dist/public/firmware/sense360_v2.v2.0.0.factory.bin" 2>/dev/null || echo "0")

if [ "$SOURCE_SIZE" != "$BUILD_SIZE" ]; then
    echo "❌ ERROR: File size mismatch"
    echo "Source: $SOURCE_SIZE bytes"
    echo "Build: $BUILD_SIZE bytes"
    exit 1
fi

echo "✅ File sizes match: $SOURCE_SIZE bytes"
echo "✅ Deployment verification complete"

echo ""
echo "Files ready for GitHub Pages deployment:"
find dist/public -name "*.bin" -type f 2>/dev/null || echo "No .bin files found"