# HO-20250628-005: CLI Missing Features Implementation

**From**: Validator  
**To**: Builder  
**Priority**: CRITICAL  
**Created**: 2025-06-28 01:12 JST  
**Estimated**: 2-3 hours  

## Issue Summary

テスト実行により、FUNC-104で定義されているCLI機能の未実装部分を検出しました。
実装は存在するが動作していない機能があるため、修正が必要です。

## Failed Tests

### 1. --help option (行112-114は実装済みだが動作せず)
```javascript
// test/integration/func-104-cli-options-complete.test.js
Error: Help option did not exit
```

**問題**: showHelp = true設定後、行166-169でshowHelpMessage()を呼び出しているが、
テストが「プロセスが終了しない」と報告している。

### 2. --check-limits option (行125-127実装済みだが重複定義)
```javascript
Error: Check limits option did not respond
```

**問題**: 
- 行125-127と行150-152で同じ`--check-limits`を2回定義している（重複）
- 実装は存在するが、テストでは応答がない

### 3. Positional directory argument (行154-156実装済みだが動作せず)
```javascript
Error: Positional argument test timeout
expected '' to match /alt-file\.txt|positional-test\.txt/
```

**問題**: cliArgs.watchPathに設定されるが、InstantViewerに正しく渡されていない可能性

## Root Cause Analysis

### 1. --help の問題
```javascript
// Line 166-169
if (showHelp) {
  showHelpMessage();
  process.exit(0);  // これが実行されていない可能性
}
```

### 2. --check-limits の問題
```javascript
// 重複定義（バグ）
else if (arg === '--check-limits') {        // Line 125
  checkLimitsOnly = true;
} else if (arg === '--check-inotify') {     // Line 127
  checkLimitsOnly = true; 
}
// ... 他の処理 ...
else if (arg === '--check-limits') {        // Line 150（重複！）
  checkLimitsOnly = true;
}
```

### 3. Positional argument の問題
```javascript
// Line 154-156
else if (!arg.startsWith('-')) {
  cliArgs.watchPath = arg;
}
// しかし、InstantViewerにはconfigのみ渡される（Line 237）
const viewer = new InstantViewer(config);
// cliArgs.watchPathがconfigに反映されていない
```

## Required Implementations

### 1. --help option修正
```javascript
// デバッグログを追加して確認
if (showHelp) {
  showHelpMessage();
  console.log('Help displayed, exiting...');  // デバッグ用
  process.exit(0);
}
```

### 2. --check-limits 重複削除
```javascript
// 行150-152の重複定義を削除
// 行125-127のみ残す
```

### 3. Positional argument 修正
```javascript
// ConfigManager.initialize()の前に追加
if (!cliArgs.watchPath && args.length > 0 && !args[args.length - 1].startsWith('-')) {
  cliArgs.watchPath = args[args.length - 1];
}

// または、configに正しく渡す
const config = await configManager.initialize({
  ...cliArgs,
  watchPath: cliArgs.watchPath || process.cwd()
});
```

### 4. InstantViewerがwatchPathを使用するよう確認
InstantViewerクラスがconfig.watchPathを正しく使用しているか確認が必要。

## Test Validation

修正後、以下のテストが成功することを確認：
```bash
npx vitest run test/integration/func-104-cli-options-complete.test.js
```

## Impact

- **--help**: ユーザーがヘルプを表示できない（Critical）
- **--check-limits**: システム制限確認ができない（High）
- **Positional args**: ディレクトリ指定ができない（Critical）

これらはFUNC-104の基本要件であり、即座の修正が必要です。