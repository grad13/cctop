#!/bin/bash
# Run Claude Code in container with READ-ONLY project mount (safer for inspection)

echo "=== Running Claude Code Container (READ-ONLY Mode) ==="
echo ""
echo "⚠️  Project mounted as READ-ONLY - no files can be modified"
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

echo "Mounting project READ-ONLY from: $PROJECT_ROOT"
echo ""
echo "This mode is safer for:"
echo "  - Investigating crashes"
echo "  - Reading code without risk of changes"
echo "  - Running analysis tools"
echo ""

# Run container with READ-ONLY project mount
container run -it --rm \
    --name claude-code-readonly \
    -v "$PROJECT_ROOT:/workspace:ro" \
    -w /workspace \
    claude-code zsh