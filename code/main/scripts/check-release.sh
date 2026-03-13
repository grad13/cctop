#!/bin/bash

# Pre-release checklist
# Usage: npm run check
#
# This script performs final checks before releasing:
# 1. Ensures working directory is clean
# 2. Checks all tests pass
# 3. Verifies build works
# 4. Runs npm publish --dry-run

set -e

echo "🚀 Running pre-release checks..."

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Uncommitted changes found!"
    echo "Please commit or stash your changes before releasing."
    git status --short
    exit 1
fi
echo "✅ Working directory is clean"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✅ On branch: $CURRENT_BRANCH"

# Run build
echo "🔨 Building..."
npm run build
echo "✅ Build successful"

# Run tests
echo "🧪 Running tests..."
npm test
echo "✅ All tests passed"

# Check npm publish
echo "📦 Checking npm publish (dry-run)..."
npm publish --dry-run
echo "✅ Package is ready to publish"

# Get version
VERSION=$(node -p "require('./package.json').version")

echo ""
echo "🎉 All checks passed!"
echo ""
echo "📋 Next steps:"
echo "1. Tag the release: git tag -a v${VERSION} -m 'Release v${VERSION}'"
echo "2. Push tags: git push origin v${VERSION}"
echo "3. Publish to npm: npm publish"
echo ""
echo "Or use GitHub Actions by pushing the tag!"