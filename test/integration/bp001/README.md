# BP-001 Test Suite

BP-001（v0.2.0.0）のためのテストスイート。新機能と改修されたスキーマに対応。

## テストファイル一覧

1. **schema-migration.test.js**
   - 5テーブル構成への移行テスト
   - inode再利用シナリオのサポート
   - インデックスの適切な作成

2. **chokidar-integration.test.js**
   - 6イベントタイプ（find/create/modify/delete/move/restore）の記録
   - メタデータ完全性の確認
   - ファイルライフサイクル追跡

3. **event-filtering.test.js**
   - FUNC-023: イベントタイプフィルタリング機能
   - キーボードショートカット対応
   - フィルタ状態管理

4. **responsive-display.test.js**
   - FUNC-024: レスポンシブディレクトリ表示
   - ターミナルリサイズ対応
   - 末尾優先切り詰め表示

5. **postinstall.test.js**
   - FUNC-013: postinstall自動初期化
   - ~/.cctopディレクトリ作成
   - デフォルト設定ファイル生成

6. **performance.test.js**
   - 1000ファイル同時監視
   - メモリ使用量 < 200MB
   - 応答時間 < 100ms
   - CPU使用率 < 5%（アイドル時）

## 実行方法

### 個別テスト実行
```bash
npm test test/integration/bp001/schema-migration.test.js
```

### BP-001全テスト実行
```bash
npm test test/integration/bp001/
```

### パフォーマンステストのみ
```bash
npm test test/integration/bp001/performance.test.js
```

## 成功基準

- 全テスト合格
- カバレッジ80%以上
- パフォーマンステスト基準達成
  - メモリ < 200MB
  - 応答時間 < 100ms
  - エラー率 0%

## 注意事項

- パフォーマンステストは実行に時間がかかります（最大60秒）
- テスト実行には十分なディスク容量が必要です（一時ファイル作成のため）
- CI環境ではタイムアウト設定の調整が必要な場合があります