# CCTOP Dummy Data Generator

Pythonスクリプトを使用してCCTOPのテスト用ダミーデータを生成します。

## 概要

このスクリプトは、FUNC-000に準拠したSQLiteデータベースに現実的なダミーデータを生成します：

- **events**: ファイル変更イベント (find/create/modify/delete/move/restore)
- **files**: ファイルレコード
- **measurements**: イベント時点での測定値 (サイズ、行数、ブロック数)
- **event_types**: イベントタイプ定義
- **aggregates**: 集計データ (将来の拡張用)

## 特徴

### 現実的なデータパターン
- **ファイルタイプ別の重み付け**: ソースコード40%、ドキュメント20%、設定15%等
- **時間ベースの活動パターン**: 朝のラッシュ、午後の作業時間、夜間コーディング
- **ファイルサイズ・行数の相関**: 拡張子に基づく現実的なメトリクス

### 豊富な設定オプション
- ファイル数、日数、ファイル当たりのイベント数を調整可能
- 統計情報の自動生成
- サンプルデータのJSON出力

### FUNC-000完全準拠
- 正確なスキーマ定義
- 外部キー制約の適切な処理
- インデックスの自動作成

## 使用方法

### 基本的な使用法

```bash
# デフォルト設定でダミーデータ生成
python3 scripts/dummy_data_generator.py

# カスタム設定
python3 scripts/dummy_data_generator.py \\
  --files 200 \\
  --days 60 \\
  --events-per-file 15 \\
  --db-path ./data/test_activity.db
```

### オプション

| オプション | デフォルト | 説明 |
|-----------|------------|------|
| `--db-path` | `./temp/dummy_activity.db` | SQLiteデータベースファイルのパス |
| `--files` | `100` | シミュレートするファイル数 |
| `--days` | `30` | 生成する履歴の日数 |
| `--events-per-file` | `10` | ファイル当たりの平均イベント数 |
| `--export-sample` | - | サンプルデータをJSONで出力するファイルパス |
| `--stats-only` | - | 統計情報のみ表示（データ生成なし） |

### 使用例

```bash
# 大量データ生成
python3 scripts/dummy_data_generator.py \\
  --files 500 \\
  --days 90 \\
  --events-per-file 20

# サンプルデータ付きで生成
python3 scripts/dummy_data_generator.py \\
  --files 50 \\
  --export-sample ./output/sample_data.json

# 既存データの統計情報のみ表示
python3 scripts/dummy_data_generator.py \\
  --db-path ./existing_data.db \\
  --stats-only
```

## 出力例

### コンソール出力
```
CCTOP Dummy Data Generator
Database: ./temp/dummy_activity.db
Files: 100, Days: 30, Events/file: 10

Connected to database: ./temp/dummy_activity.db
Initializing database schema...
  1. Created table
  2. Created table
  3. Created table
  4. Created table
  5. Created table
  Created indexes
  Inserted event types
Schema initialization completed
Generating events for 100 files over 30 days...
  Generated data for 10/100 files
  Generated data for 20/100 files
  ...
Generated 987 events for 100 files

Database Statistics:
  events_count: 987
  files_count: 100
  measurements_count: 987
  event_types_count: 6
  event_distribution:
    modify: 421
    create: 156
    find: 234
    move: 89
    delete: 67
    restore: 20
  time_range:
    start: 2024-12-05T09:15:32
    end: 2025-01-04T18:42:18
  file_metrics:
    unique_files: 100
    avg_size: 1847.23
    max_size: 4892
    avg_lines: 78.34
    max_lines: 203

Dummy data generation completed!
```

### 生成されるファイルパターン

**ソースコード** (40%):
- `src/components/auth_service.ts`
- `lib/utils/helper_backup.py`
- `models/user_controller.java`

**ドキュメント** (20%):
- `docs/readme.md`
- `wiki/api_spec.rst`
- `notes/changelog_12.txt`

**設定ファイル** (15%):
- `config/database.json`
- `.vscode/settings.yaml`
- `.github/workflow.yml`

## データベース構造

生成されるデータベースは以下の構造を持ちます：

```sql
-- 基本構造
events: 987 records (ファイル変更イベント)
files: 100 records (ファイル情報)
measurements: 987 records (測定値)
event_types: 6 records (イベントタイプ定義)

-- イベント分布例
modify: 42.7% (最も多い)
find: 23.7% (ファイル発見)
create: 15.8% (新規作成)
move: 9.0% (移動・リネーム)
delete: 6.8% (削除)
restore: 2.0% (復元)
```

## テスト・デバッグ

### データベース確認

```bash
# SQLiteコマンドラインで確認
sqlite3 ./temp/dummy_activity.db

# テーブル一覧
.tables

# 最新イベント確認
SELECT datetime(timestamp, 'unixepoch') as time, 
       et.code, file_path 
FROM events e 
JOIN event_types et ON e.event_type_id = et.id 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Node.jsでの接続テスト

```javascript
// 生成したダミーデータをNode.jsから使用
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./temp/dummy_activity.db');

db.all(`
  SELECT COUNT(*) as count 
  FROM events e 
  JOIN event_types et ON e.event_type_id = et.id 
  WHERE et.code = 'modify'
`, (err, rows) => {
  console.log('Modify events:', rows[0].count);
});
```

## 注意事項

- デフォルトでは `./temp/` ディレクトリにファイルを作成します
- 既存のデータベースファイルがある場合、新しいデータが追加されます
- 大量データ生成時はディスク容量に注意してください
- FUNC-000スキーマに完全準拠していますが、aggregatesテーブルは現在未使用です

## 拡張・カスタマイズ

スクリプトは以下の点で拡張可能です：

1. **新しいファイルパターンの追加**: `file_patterns` 辞書を修正
2. **活動パターンの調整**: `activity_patterns` で時間帯別の重み調整
3. **メトリクス計算の改善**: `calculate_file_metrics` メソッドをカスタマイズ
4. **イベントタイプの追加**: FUNC-000に新しいイベントタイプが追加された場合