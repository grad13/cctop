#!/bin/bash
# meta: updated=2026-03-17 11:48 checked=-

# Setup script for Claude Code GitHub Action
# This script helps you configure the necessary secrets

echo "🤖 Claude Code GitHub Action Setup"
echo "================================="
echo ""
echo "This script will help you set up Claude Code GitHub Action for your repository."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📦 Repository: $REPO"
echo ""

# Check for existing secrets
echo "🔍 Checking existing secrets..."
EXISTING_SECRETS=$(gh secret list)

if echo "$EXISTING_SECRETS" | grep -q "ANTHROPIC_API_KEY"; then
    echo "✅ ANTHROPIC_API_KEY already exists"
else
    echo "❌ ANTHROPIC_API_KEY not found"
    echo ""
    echo "To set up the Anthropic API key:"
    echo "1. Get your API key from: https://console.anthropic.com/account/keys"
    echo "2. Run: gh secret set ANTHROPIC_API_KEY"
    echo "3. Paste your API key and press Enter"
    echo ""
    read -p "Press Enter to continue..."
fi

echo ""
echo "📋 Next steps:"
echo ""
echo "1. Push the workflow files to your repository:"
echo "   git add .github/workflows/claude-*.yml"
echo "   git commit -m 'feat: add Claude Code GitHub Actions'"
echo "   git push"
echo ""
echo "2. How to use Claude Code:"
echo "   - In any issue or PR, mention @claude to get help"
echo "   - Example: '@claude can you help fix this bug?'"
echo "   - Example: '@claude please review this PR'"
echo ""
echo "3. Auto-processing issues:"
echo "   - Add priority labels to issues: priority:high, priority:medium, priority:low"
echo "   - Claude will automatically process them based on the schedule"
echo ""
echo "4. Create label for tracking:"
echo "   gh label create claude-processed --description 'Issue has been processed by Claude' --color 6F42C1"
echo ""
echo "🎉 Setup complete!"