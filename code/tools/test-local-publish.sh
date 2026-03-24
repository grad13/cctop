#!/bin/bash
# meta: updated=2026-03-17 11:48 checked=-

# Test npm package locally before publishing
# Usage: npm run test:publish
#
# This script simulates the full npm publish process locally:
# 1. Builds the project
# 2. Runs tests
# 3. Creates a tarball
# 4. Installs globally for testing
# 5. Verifies the installation works

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "🔍 Testing npm package locally..."

# Get package name and version
PACKAGE_NAME=$(node -p "require('./package.json').name")
PACKAGE_VERSION=$(node -p "require('./package.json').version")
TARBALL="${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz"

echo "📦 Package: ${PACKAGE_NAME}@${PACKAGE_VERSION}"

# Build the project
echo "🔨 Building project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Clean up any existing tarball
if [ -f "$TARBALL" ]; then
    echo "🧹 Removing existing tarball..."
    rm "$TARBALL"
fi

# Create tarball
echo "📦 Creating package tarball..."
npm pack

# Check tarball contents
echo "📋 Package contents:"
tar -tzf "$TARBALL" | grep -E "(bin/|dist/)" | head -20

# Uninstall global package if exists
echo "🗑️  Uninstalling existing global package..."
npm uninstall -g "$PACKAGE_NAME" 2>/dev/null || true

# Install from tarball
echo "📥 Installing package globally..."
npm install -g "./$TARBALL"

# Test commands
echo "✅ Testing installed commands..."
echo "Version check:"
$PACKAGE_NAME --version

echo ""
echo "Help check:"
$PACKAGE_NAME --help | head -10

echo ""
echo "🎉 Installation successful!"
echo ""
echo "You can now test the package with:"
echo "  $PACKAGE_NAME"
echo "  $PACKAGE_NAME init"
echo "  $PACKAGE_NAME view"
echo ""
echo "When done testing, run:"
echo "  npm uninstall -g $PACKAGE_NAME"
echo "  rm $TARBALL"
echo ""
echo "If everything works, publish with:"
echo "  npm publish"