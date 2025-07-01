#!/bin/bash
# Run Claude Code in official container with full project mounted

echo "=== Running Claude Code Official Container ==="
echo ""

# Check if image exists
if ! container images list | grep -q "claude-code"; then
    echo "Error: claude-code image not found."
    echo "Please build it first with:"
    echo "  cd containers/claude-container-official"
    echo "  container build -t claude-code ."
    exit 1
fi

PROJECT_ROOT="/Users/takuo-h/Workspace/Code/06-cctop"

echo "Mounting project from: $PROJECT_ROOT"
echo ""
echo "Starting container..."
echo "Inside the container:"
echo "  1. cd /workspace"
echo "  2. npm install -g @anthropic-ai/claude-code"
echo "  3. claude --dangerously-skip-permissions"
echo ""
echo "If you encounter native module errors in cctop:"
echo "  cd /workspace/cctop && npm rebuild"
echo ""

# Run container with project mounted
# Note: Currently mounted as read-write for Claude Code functionality
# Add :ro to make read-only: -v "$PROJECT_ROOT:/workspace:ro"
container run -it --rm \
    --name claude-code-session \
    -v "$PROJECT_ROOT:/workspace" \
    -w /workspace \
    claude-code zsh