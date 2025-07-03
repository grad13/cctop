# Daemon Tests

このディレクトリにはcctop daemonのテストスイートが含まれています。

## テスト構成

```
tests/
├── unit/          # 単体テスト（高速）
├── integration/   # 統合テスト（中速）
└── e2e/          # エンドツーエンドテスト（低速）
```

## テスト実行方法

### 推奨される実行順序

```bash
# 1. 高速な単体テストのみ（~10秒）
npm run test:unit

# 2. クイックテスト - 基本的な動作確認（~30秒）
npm run test:quick

# 統合テストを分割実行（各~40秒）
npm run test:integration:1  # basic-aggregates, daemon, edge-cases
npm run test:integration:2  # find-detection, move-detection関連
npm run test:integration:3  # restore-detection, startup-delete, statistics

# 4. E2Eテストのみ（~1分）
npm run test:e2e
```

### 個別テスト実行

特定のテストファイルのみを実行：
```bash
npm test tests/integration/move-detection-improved.test.ts
```

### 開発時のテスト

ファイル変更を監視して自動実行：
```bash
npm run test:watch
```

## 注意事項

### 直列実行について
- **重要**: すべてのテストはデフォルトで直列実行されます
- 理由: daemonプロセスの競合を避けるため
- 設定: `vitest.config.ts`で`fileParallelism: false`

### タイムアウトについて
- 各テストのタイムアウトは30秒に設定
- 全体の実行時間は約3-4分
- CI環境では適切なタイムアウト設定が必要

### テストディレクトリ
- 各テストは一意のディレクトリを使用（`/tmp/cctop-test-{timestamp}-{random}`）
- テスト終了時に自動クリーンアップ

## トラブルシューティング

### テストが失敗する場合

1. **個別実行で確認**
   ```bash
   npm test tests/integration/failing-test.test.ts
   ```

2. **プロセスの確認**
   ```bash
   # 残存daemonプロセスを確認
   pgrep -f "node.*daemon/dist/index.js"
   ```

3. **一時ディレクトリのクリーンアップ**
   ```bash
   rm -rf /tmp/cctop-*
   ```

### よくある問題

- **SQLite lock errors**: 通常は並列実行の問題。直列実行で解決
- **Daemon startup timeout**: システムリソース不足の可能性
- **File not found errors**: 前回のテスト実行の残骸。クリーンアップで解決

## CI/CD設定

GitHubActionsなどのCI環境では：
```yaml
- name: Run unit tests
  run: npm run test:unit
  timeout-minutes: 2

- name: Run integration tests  
  run: npm run test:integration
  timeout-minutes: 5

- name: Run E2E tests
  run: npm run test:e2e
  timeout-minutes: 3
```