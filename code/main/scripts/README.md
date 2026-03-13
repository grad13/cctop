# Development Scripts

This directory contains utility scripts for development and release management.

## Scripts

### test-local-publish.sh
Tests the npm package locally before publishing by:
- Building the project
- Running tests  
- Creating a tarball
- Installing globally for manual testing

```bash
npm run test:publish
```

### check-release.sh
Performs pre-release checks:
- Ensures working directory is clean
- Verifies all tests pass
- Checks build works
- Runs `npm publish --dry-run`

```bash
npm run check
```

## CI/CD Integration

These scripts complement the GitHub Actions workflows in `.github/workflows/`:
- Use scripts for quick local validation
- CI runs comprehensive checks on multiple Node.js versions
- Scripts help debug CI failures locally