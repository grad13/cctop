#!/bin/bash
# Run Claude Code with default mount configuration

echo "=== Running Claude Code Container ==="
echo ""
echo "📁 Mount configuration:"
echo "  - documents/: READ-ONLY (no updates allowed)"
echo "  - passage/: READ-WRITE (for communication)"
echo "  - cctop/: READ-WRITE (for bug fixes)"
echo "  - Others: READ-WRITE"
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

echo "Project root: $PROJECT_ROOT"
echo ""
echo "Communication via passage/:"
echo "  - Write updates to: passage/handoffs/"
echo "  - Exchange information through passage files"
echo ""

echo "Starting container..."
echo "Inside the container:"
echo "  1. cd /workspace"
echo "  2. ./containers/protect-documents.sh  # Protect documents"
echo "  3. npm install -g @anthropic-ai/claude-code"
echo "  4. claude --dangerously-skip-permissions"
echo ""
echo "If you encounter native module errors:"
echo "  cd /workspace/cctop && npm rebuild"
echo ""

container run -it --rm \
    --name claude-code-session \
    -v "$PROJECT_ROOT:/workspace" \
    -w /workspace \
    claude-code zsh