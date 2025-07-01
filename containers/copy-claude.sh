#!/bin/bash
# Script to copy claude binary into running container

CONTAINER_NAME="cctop-debug-session"
CLAUDE_PATH="/opt/homebrew/bin/claude"

echo "Copying claude binary to container..."

# Try different methods
echo "Method 1: Direct copy attempt"
docker cp $CLAUDE_PATH $CONTAINER_NAME:/usr/local/bin/claude 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Method 2: Using volume mount"
    echo "Please restart the container with volume mount:"
    echo "container run -it --rm -v $CLAUDE_PATH:/usr/local/bin/claude:ro --name $CONTAINER_NAME cctop-debug"
fi

echo ""
echo "If successful, run in container:"
echo "  chmod +x /usr/local/bin/claude"
echo "  claude --dangerously-skip-permissions"