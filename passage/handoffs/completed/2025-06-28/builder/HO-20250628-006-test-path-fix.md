# HO-20250628-006: Test Path Fix for Integration/E2E Tests

**From**: Validator  
**To**: Builder  
**Priority**: CRITICAL  
**Created**: 2025-06-28 01:18 JST  
**Estimated**: 1 hour  

## Issue Summary

Integration/E2Eテストが間違ったパスでcctopを起動しようとしているため、すべて失敗しています。

## Root Cause

テストファイルが存在しないパスを使用：
```javascript
// 間違い: src/main.js は存在しない
cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {
```

正しいパスは：
- `bin/cctop` (実行可能ファイル)
- または相対パスを修正: `../../bin/cctop`

## Affected Files (33箇所)

### Integration Tests
1. `test/integration/func-203-event-filtering.test.js` - 6箇所
2. `test/integration/visual-display-verification.test.js` - 3箇所
3. `test/integration/func-205-status-display.test.js` - 6箇所
4. `test/integration/func-204-responsive-display.test.js` - 6箇所

### E2E Tests
5. `test/e2e/startup-experience.test.js` - 5箇所
6. `test/e2e/east-asian-display.test.js` - 6箇所

### Other
7. `test/rdd-daily-verification.js` - 1箇所

## Required Changes

### Option 1: Use bin/cctop (推奨)
```javascript
// Before
cctopProcess = spawn('node', ['../../src/main.js', '--dir', testDir], {

// After
cctopProcess = spawn('node', ['../../bin/cctop', '--dir', testDir], {
```

### Option 2: Direct execution
```javascript
// Alternative (if bin/cctop has proper shebang)
cctopProcess = spawn('../../bin/cctop', ['--dir', testDir], {
```

## Implementation Strategy

1. 一括置換で全33箇所を修正
2. テスト実行して動作確認
3. 必要に応じてパス調整

## Validation

修正後、以下のコマンドで確認：
```bash
# Integration tests
npm run test:integration

# E2E tests  
npm run test:e2e

# RDD verification
npm run rdd-verify
```

## Impact

この修正により、以下の失敗が解消される見込み：
- FUNC-205: 6/6 failures
- FUNC-203: 6/6 failures  
- FUNC-204: 6/6 failures
- FUNC-206: 5/5 failures
- FUNC-200: 5/5 failures
- Visual display: 3/3 failures

合計31個のテスト失敗が、パス修正だけで解消される可能性があります。