# Daemon Tests - FUNC-000 Complete Test Suite

このディレクトリにはcctop daemon（**FUNC-000 SQLite Foundation完全準拠**）のテストスイートが含まれています。

## 📊 テスト成功状況（Current Status）

- **ユニットテスト**: 52/52成功 ✅ (100%)
- **統合テスト**: 58/59成功 ✅ (98.3% - 1 intentional skip) 
- **E2Eテスト**: 4/4成功 ✅ (100%)
- **総合**: 114/115テスト成功 ✅ (99.1%)

## テスト構成

```
tests/
├── unit/          # 単体テスト（高速・52テスト）
│   ├── measurement-calculator.test.ts    # FUNC-000 measurement計算
│   ├── measurement-operations.test.ts    # measurement CRUD操作
│   ├── event-types.test.ts              # FUNC-000 event_types テーブル
│   └── ...                              # その他の単体テスト
├── integration/   # 統合テスト（中速・58テスト）
│   ├── func000-measurement-integration.test.ts  # FUNC-000統合テスト
│   ├── restore-detection.test.ts               # restore機能テスト
│   ├── startup-delete-detection.test.ts        # startup delete検知
│   ├── move-detection*.test.ts                  # move検知（複数）
│   └── ...                                     # その他の統合テスト
└── e2e/          # エンドツーエンドテスト（低速・4テスト）
    ├── npm-run-bug.test.ts              # 本番環境シミュレーション
    ├── performance-tests.test.ts        # パフォーマンステスト
    └── production-integration.test.ts   # プロダクション統合テスト
```

## 依存関係

**⚠️ 重要**: daemonテストを実行する前に、`@cctop/shared`モジュールのビルドが必要です：

```bash
# shared モジュールをビルド（必須）
cd ../shared && npm run build

# その後、daemonテストを実行
cd ../daemon
```

**理由**: daemonは以下のshared要素に依存しています：
- 型定義 (`DaemonConfig`, `FileEvent`, `DaemonState`)
- FUNC-000準拠Databaseクラスと関連操作
  - `SchemaManager` - 5テーブル構造の初期化
  - `EventOperations` - 正規化されたイベント操作
  - `MeasurementOperations` - 測定値管理
  - `AggregateOperations` - 統計データ操作
  - `TriggerManager` - 自動集計トリガー

## テスト実行方法

### 推奨される実行順序

```bash
# 1. 高速な単体テストのみ（~40秒・52テスト）
npm run test:unit

# 2. クイックテスト - 基本的な動作確認（~30秒）
npm run test:quick

# 統合テストを分割実行（各~30-40秒）
npm run test:integration:1  # basic-aggregates, daemon, edge-cases (16テスト)
npm run test:integration:2  # find-detection, move-detection関連 (16テスト)
npm run test:integration:3  # restore-detection, startup-delete, statistics (18テスト)
npm run test:integration:4  # FUNC-000 measurement integration (11テスト + 1 skip)

# 4. E2Eテストのみ（~23秒・4テスト）
npm run test:e2e

# 🎯 全テスト実行結果期待値:
# ✅ Unit: 52/52 (100%)
# ✅ Integration: 58/59 (98.3% - 1 intentional skip) 
# ✅ E2E: 4/4 (100%)
# ✅ Total: 114/115 (99.1%)
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

- **shared依存エラー**: `../../../shared/dist/index`が見つからない場合、shared モジュールをビルド
- **SQLite lock errors**: 通常は並列実行の問題。直列実行で解決
- **Daemon startup timeout**: システムリソース不足の可能性
- **File not found errors**: 前回のテスト実行の残骸。クリーンアップで解決
- **FUNC-000 schema errors**: 旧スキーマが残存している場合、データベースファイル削除で解決
- **Measurement calculation errors**: ファイル権限問題、/tmpディレクトリの権限確認

### FUNC-000特有の注意点

- **Foreign Key制約**: テストデータ投入順序に注意（event_types → files → events → measurements）
- **Trigger動作**: aggregatesテーブルは自動更新のため、手動での値設定は無効
- **JOIN クエリ**: 旧スキーマ形式のクエリは使用不可（正規化済みテーブル構造）

## 手動テスト用SQLクエリ

daemonの動作を手動で確認する場合のSQLクエリ例です。以下のコマンドでファイル操作を実行後、SQLiteで確認できます：

```bash
# テスト用ファイル操作
echo "test" > test-file.txt
sleep 3
echo "modified" >> test-file.txt  
sleep 3
mv test-file.txt test-file2.txt
sleep 3
rm test-file2.txt
sleep 3
```

### 段階別確認クエリ

#### 1. create イベント確認 (echo "test" > test-file.txt 後)
```sql
-- 最新のcreateイベント確認
SELECT 
  e.id, e.timestamp, et.code as event_type, e.file_name,
  m.file_size, m.line_count, m.inode
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE e.file_name = 'test-file.txt' AND et.code = 'create'
ORDER BY e.timestamp DESC LIMIT 1;
```

#### 2. modify イベント確認 (echo "modified" >> test-file.txt 後)
```sql
-- ファイルサイズの変化確認
SELECT 
  et.code as event_type,
  m.file_size as size_bytes,
  m.line_count as lines,
  datetime(e.timestamp, 'unixepoch', 'localtime') as time
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE e.file_name = 'test-file.txt'
ORDER BY e.timestamp ASC;
```

#### 3. move イベント確認 (mv test-file.txt test-file2.txt 後)
```sql
-- moveイベント確認（FUNC-000ではmeasurementなし）
SELECT 
  e.id, e.timestamp, et.code as event_type, e.file_name,
  f.inode, f.is_active
FROM events e
JOIN event_types et ON e.event_type_id = et.id
JOIN files f ON e.file_id = f.id
WHERE et.code = 'move' AND e.file_name = 'test-file2.txt'
ORDER BY e.timestamp DESC LIMIT 1;

-- 同じinodeのファイル履歴確認
SELECT 
  e.id, e.timestamp, et.code as event_type, e.file_name,
  f.inode, COALESCE(m.file_size, 'NULL') as file_size
FROM events e
JOIN event_types et ON e.event_type_id = et.id
JOIN files f ON e.file_id = f.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE f.inode = (
  SELECT f2.inode FROM events e2 
  JOIN files f2 ON e2.file_id = f2.id 
  WHERE e2.file_name = 'test-file2.txt' LIMIT 1
)
ORDER BY e.timestamp ASC;
```

#### 4. delete イベント確認 (rm test-file2.txt 後)
```sql
-- deleteイベント確認（FUNC-000ではmeasurementなし）
SELECT 
  e.id, e.timestamp, et.code as event_type, e.file_name,
  f.inode, f.is_active
FROM events e
JOIN event_types et ON e.event_type_id = et.id
JOIN files f ON e.file_id = f.id
WHERE et.code = 'delete' AND e.file_name = 'test-file2.txt'
ORDER BY e.timestamp DESC LIMIT 1;
```

### 包括的な確認クエリ

#### 全イベント履歴の時系列表示
```sql
SELECT 
  e.id,
  datetime(e.timestamp, 'unixepoch', 'localtime') as time,
  et.code as event_type,
  e.file_name,
  f.inode,
  CASE 
    WHEN m.file_size IS NOT NULL THEN m.file_size || ' bytes'
    ELSE 'no measurement'
  END as size,
  CASE 
    WHEN m.line_count IS NOT NULL THEN m.line_count || ' lines'
    ELSE 'no measurement'
  END as lines,
  f.is_active
FROM events e
JOIN event_types et ON e.event_type_id = et.id
JOIN files f ON e.file_id = f.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE e.file_name IN ('test-file.txt', 'test-file2.txt')
ORDER BY e.timestamp ASC;
```

#### aggregatesテーブルの確認
```sql
-- ファイルの統計データ確認
SELECT 
  a.*,
  f.inode,
  f.is_active,
  (SELECT file_path FROM events WHERE file_id = a.file_id ORDER BY timestamp DESC LIMIT 1) as latest_path
FROM aggregates a
JOIN files f ON a.file_id = f.id
WHERE a.file_id = (
  SELECT DISTINCT e.file_id FROM events e 
  WHERE e.file_name IN ('test-file.txt', 'test-file2.txt') 
  LIMIT 1
);
```

### 期待される結果

- **create**: file_size=5, line_count=1 (measurementあり)
- **modify**: file_size=14, line_count=2 (measurementあり)
- **move**: file_size=NULL (FUNC-000: measurementなし)
- **delete**: file_size=NULL, is_active=0 (FUNC-000: measurementなし)

### SQLiteコマンドライン使用例
```bash
# データベースに接続
sqlite3 .cctop/data/activity.db

# テーブル構造確認
.schema

# 上記クエリを実行
# 例：全イベント履歴表示
SELECT datetime(e.timestamp, 'unixepoch', 'localtime') as time, et.code, e.file_name FROM events e JOIN event_types et ON e.event_type_id = et.id ORDER BY e.timestamp;
```

## CI/CD設定

GitHubActionsなどのCI環境では：
```yaml
- name: Build shared dependencies
  run: |
    cd modules/shared
    npm ci
    npm run build

- name: Run daemon tests
  run: |
    cd modules/daemon
    npm ci
    npm run test:unit
  timeout-minutes: 2

- name: Run integration tests  
  run: |
    npm run test:integration:1 && \
    npm run test:integration:2 && \
    npm run test:integration:3 && \
    npm run test:integration:4
  working-directory: modules/daemon
  timeout-minutes: 5

- name: Run E2E tests
  run: npm run test:e2e
  working-directory: modules/daemon
  timeout-minutes: 2
  
# Expected results:
# ✅ Unit: 52/52 (100%)
# ✅ Integration: 58/59 (98.3% - 1 intentional skip)
# ✅ E2E: 4/4 (100%)
# ✅ Total: 114/115 (99.1%)
```