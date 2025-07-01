#!/bin/bash
# Script to run inside container to protect documents directory

echo "=== Protecting documents/ directory ==="

# Check if we're in the container
if [ ! -d "/workspace/documents" ]; then
    echo "Error: Not in container or /workspace/documents not found"
    exit 1
fi

# Make documents read-only
chmod -R a-w /workspace/documents
chmod -R a-w /workspace/CLAUDE.md

echo "✅ Protected files:"
echo "  - /workspace/documents/ (read-only)"
echo "  - /workspace/CLAUDE.md (read-only)"
echo ""
echo "📝 Use /workspace/passage/ for communication"
echo ""
echo "To start Claude Code:"
echo "  claude --dangerously-skip-permissions"