# Contributing to cctop

Thank you for your interest in contributing to cctop!

## Current Status

⚠️ **Note**: We are currently preparing for community contributions. At this moment, we are:
- ✅ Accepting bug reports and feature requests via Issues
- ⏳ Setting up the contribution process for Pull Requests

## How to Report Issues

1. Check if the issue already exists
2. Use the appropriate issue template (Bug Report or Feature Request)
3. Provide as much detail as possible

## Development Setup

```bash
# Clone the repository
git clone https://github.com/grad13/cctop.git
cd cctop/code/main

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development
npm run dev
```

## Code Style

- Use TypeScript for new code
- Follow existing code patterns
- Add tests for new features
- Keep commits atomic and well-described

## Testing

Before submitting:
```bash
npm run build
npm test
npm publish --dry-run
```

## Questions?

Feel free to open an issue for any questions about contributing!