#!/bin/bash
# Script to build and run cctop debug container with Apple Container

echo "=== cctop Debug with Apple Container ==="
echo ""

# Move to parent directory to include documents/ in build context
cd ..

# Build the container image using cctop/Dockerfile
echo "Building container image from parent directory..."
echo "This will include documents/, CLAUDE.md, passage/, etc."
container build -t cctop-debug -f cctop/Dockerfile .

if [ $? -ne 0 ]; then
    echo "Error: Failed to build container image"
    exit 1
fi

echo ""
echo "Container image built successfully!"
echo ""
echo "Running debug container with claude binary mounted..."
echo ""

# Create a temporary directory for claude binary
TEMP_DIR=$(mktemp -d)
CLAUDE_BIN=$(which claude)

if [ -z "$CLAUDE_BIN" ]; then
    echo "Error: claude binary not found on host"
    exit 1
fi

echo "Copying claude binary to temporary directory..."
cp "$CLAUDE_BIN" "$TEMP_DIR/claude"
chmod +x "$TEMP_DIR/claude"

echo "Mounting directory: $TEMP_DIR"
echo ""

# Run the container with the directory mounted
container run -it --rm \
    --name cctop-debug-session \
    -v "$TEMP_DIR:/claude-bin:ro" \
    cctop-debug

# Cleanup
rm -rf "$TEMP_DIR"