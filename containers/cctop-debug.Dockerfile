# Dockerfile for debugging cctop with Claude Code in container
FROM ubuntu:22.04

# Install required packages (without nodejs/npm)
RUN apt-get update && apt-get install -y \
    bash \
    git \
    curl \
    ca-certificates \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x (required for cctop)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Note: Claude Code needs to be installed manually in the container
# The installation method varies by platform and version

# Set working directory
WORKDIR /workspace

# Copy essential files first
COPY CLAUDE.md ./06-cctop/
COPY documents ./06-cctop/documents/
COPY passage ./06-cctop/passage/
COPY cctop/package*.json ./06-cctop/cctop/
COPY cctop/scripts ./06-cctop/cctop/scripts/

# Install dependencies first (for layer caching)
WORKDIR /workspace/06-cctop/cctop
RUN npm ci

# Copy source code and build
COPY cctop/src ./src/
COPY cctop/tsconfig.json ./
RUN npm run build

# Ensure Claude Code can access CLAUDE.md
WORKDIR /workspace/06-cctop

# Create a test script
RUN echo '#!/bin/bash' > /test-cctop.sh && \
    echo 'echo "=== Testing cctop crash scenario ==="' >> /test-cctop.sh && \
    echo 'cd /workspace/06-cctop/cctop' >> /test-cctop.sh && \
    echo 'echo "1. Testing WITH .cctop directory:"' >> /test-cctop.sh && \
    echo 'mkdir -p .cctop' >> /test-cctop.sh && \
    echo 'timeout 5 node dist/src/main.js || echo "Exit code: $?"' >> /test-cctop.sh && \
    echo 'echo ""' >> /test-cctop.sh && \
    echo 'echo "2. Testing WITHOUT .cctop directory:"' >> /test-cctop.sh && \
    echo 'rm -rf .cctop' >> /test-cctop.sh && \
    echo 'timeout 5 node dist/src/main.js || echo "Exit code: $?"' >> /test-cctop.sh && \
    chmod +x /test-cctop.sh

# Create startup script
RUN echo '#!/bin/bash' > /startup.sh && \
    echo '# Setup claude binary if mounted' >> /startup.sh && \
    echo 'if [ -f /claude-bin/claude ]; then' >> /startup.sh && \
    echo '    ln -sf /claude-bin/claude /usr/local/bin/claude' >> /startup.sh && \
    echo '    chmod +x /usr/local/bin/claude' >> /startup.sh && \
    echo 'fi' >> /startup.sh && \
    echo '' >> /startup.sh && \
    echo 'echo "=== Claude Code Debug Container ==="' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'echo "This container has:"' >> /startup.sh && \
    echo 'echo "  - Full project in /workspace/06-cctop (including documents/)"' >> /startup.sh && \
    echo 'echo "  - cctop code in /workspace/06-cctop/cctop"' >> /startup.sh && \
    echo 'echo "  - CLAUDE.md at /workspace/06-cctop/CLAUDE.md"' >> /startup.sh && \
    echo 'if [ -f /usr/local/bin/claude ]; then' >> /startup.sh && \
    echo '    echo "  - Claude binary available"' >> /startup.sh && \
    echo 'else' >> /startup.sh && \
    echo '    echo "  - Claude binary NOT available"' >> /startup.sh && \
    echo 'fi' >> /startup.sh && \
    echo 'echo "  - Test script: /test-cctop.sh"' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'if [ -f /usr/local/bin/claude ]; then' >> /startup.sh && \
    echo '    echo "To start debugging:"' >> /startup.sh && \
    echo '    echo "  claude --dangerously-skip-permissions"' >> /startup.sh && \
    echo 'else' >> /startup.sh && \
    echo '    echo "Claude not available. Use test script instead."' >> /startup.sh && \
    echo 'fi' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'echo "Or run the test script to see the crash:"' >> /startup.sh && \
    echo 'echo "  /test-cctop.sh"' >> /startup.sh && \
    echo 'echo ""' >> /startup.sh && \
    echo 'exec bash' >> /startup.sh && \
    chmod +x /startup.sh

CMD ["/startup.sh"]