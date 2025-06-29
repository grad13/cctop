# HO-20250628-007: Test Mode Early Exit Fix & watchPath Not Used

**From**: Validator  
**To**: Builder  
**Priority**: CRITICAL  
**Created**: 2025-06-28 01:30 JST  
**Estimated**: 30 minutes  

## Issue Summary

テストモードで100ms後に即座に終了するため、すべてのE2E/Integrationテストが失敗しています。

## Root Cause

bin/cctop の行179-187:
```javascript
// Test environment handling
if (process.env.NODE_ENV === 'test') {
  // In test mode, run basic monitoring for short duration then exit
  console.log('Test mode: monitoring started');
  setTimeout(() => {
    console.log('Test mode: monitoring completed');
    process.exit(0);
  }, 100);
  return;  // ここで処理終了！
}
```

**問題**: `NODE_ENV=test`の時、100ms後に強制終了し、その後のInstantViewer起動などが実行されない。

## Test Output Evidence

```
"🚀 cctop v0.1.0.0 starting...
📁 Current directory: /Users/takuo-h/Workspace/Code/06-cctop/cctop
Test mode: monitoring started
Test mode: monitoring completed"
```

その後、何も表示されずに終了。

## Required Fix

### Option 1: テストモード早期終了を削除（推奨）
```javascript
// Test environment handling
if (process.env.NODE_ENV === 'test') {
  // テストモードでも通常通り動作させる
  // 早期終了を削除
}
```

### Option 2: テスト用フラグを追加
```javascript
if (process.env.NODE_ENV === 'test' && process.env.CCTOP_TEST_QUICK_EXIT === 'true') {
  // 特定のテストのみ早期終了
  setTimeout(() => {
    process.exit(0);
  }, 100);
  return;
}
```

### Option 3: InstantViewer起動後に終了
```javascript
// InstantViewerを起動してから終了タイマーを設定
const viewer = new InstantViewer(config);
await viewer.start();

if (process.env.NODE_ENV === 'test') {
  setTimeout(() => {
    process.exit(0);
  }, 3000); // 3秒後に終了
}
```

## Additional Issue: watchPath Not Passed to InstantViewer

位置引数（`cliArgs.watchPath`）がInstantViewerやConfigManagerに渡されていません：
```javascript
// Line 155-156: 位置引数をwatchPathに設定
else if (!arg.startsWith('-')) {
  cliArgs.watchPath = arg;
}

// Line 191: ConfigManagerにcliArgsを渡している
const config = await configManager.initialize(cliArgs);

// Line 237: しかしInstantViewerにはconfigのみ渡される
const viewer = new InstantViewer(config);
// watchPathが反映されていない可能性
```

## Impact

これらの問題により、以下のテストがすべて失敗：
- FUNC-206: InstantView tests (5/5 failing)
- FUNC-205: Status Display tests (6/6 failing)
- FUNC-203: Event Filtering tests (6/6 failing)
- FUNC-204: Responsive Display tests (6/6 failing)
- FUNC-200: East Asian Display tests (5/5 failing)

合計28個のテストが、この早期終了のために動作確認できていません。

## Recommendation

Option 1を推奨します。テストモードでも通常動作させ、各テストが自分でタイムアウトを管理すべきです。