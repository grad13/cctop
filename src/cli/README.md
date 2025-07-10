# CCTOP CLI Module

CCTOP (Code Change Top) のCLIモジュール - リアルタイムファイル変更監視とコード構造分析を提供する高機能ターミナルUIです。

## 🚀 概要

**CCTOP CLI** は、chokidarとSQLite3を使用したファイル監視システムのフロントエンドとして、直感的で高性能なターミナルUIを提供します。

### 主要機能
- **リアルタイム監視**: ファイル変更イベントのリアルタイム表示
- **Event Filter**: [f]キーによる柔軟なイベントタイプフィルタリング
- **Display Mode**: All/Uniqueモード切り替え ([a]/[u]キー)
- **検索機能**: [/]キーによるクイック検索
- **日本語対応**: East Asian Width完全対応
- **設定管理**: FUNC-105準拠の3層設定アーキテクチャ

### 技術スタック
- **UI Framework**: blessed@0.1.81
- **Database**: sqlite3@5.1.6
- **文字幅計算**: string-width@5.1.2
- **テストフレームワーク**: vitest@2.0.0
- **言語**: TypeScript@5.5.3

## 📦 インストール・セットアップ

### 前提条件
```bash
# Node.js v18以上
node --version

# Python 3 (ダミーデータ生成用、オプション)
python3 --version

# SQLite3 (データベース確認用、オプション)
sqlite3 --version
```

### インストール
```bash
# 依存関係インストール
npm install

# TypeScriptビルド
npm run build
```

## 🎮 使用方法

### 基本的な起動方法

#### 1. リアルタイムUI起動
```bash
# カレントディレクトリの.cctop/data/activity.dbを使用
npm run demo:ui

# 別ディレクトリから実行（FUNC-105準拠）
npm run demo:ui -C /path/to/cli/module
```

#### 2. キーボード操作
```
[q]           - 終了
[space]       - 一時停止/再開
[a] / [u]     - All/Uniqueモード切り替え
[f]           - Event Filterモード
├─ [c]        - Create events
├─ [m]        - Modify events  
├─ [d]        - Delete events
├─ [f]        - Find events
├─ [v]        - Move events
├─ [r]        - Restore events
└─ [Esc]      - フィルタモード終了
[/]           - 検索モード
[↑] [↓]       - イベント選択
[Enter]       - 詳細表示 (将来実装)
```

### テスト用データベース作成

#### Python ダミーデータ生成 (推奨)
```bash
# 基本生成
python3 scripts/dummy_data_generator.py --files 50 --days 7

# 大規模データ生成
python3 scripts/dummy_data_generator.py \
  --files 200 \
  --days 30 \
  --events-per-file 15 \
  --db-path ./data/large_test.db

# 統計情報のみ表示
python3 scripts/dummy_data_generator.py \
  --db-path ./existing.db \
  --stats-only
```

#### Node.js テストDBスクリプト
```bash
# FUNC-000準拠のテストDB作成
npm run demo:create-db
```

## 🧪 テスト・開発

### ユニットテスト
```bash
# 全テスト実行 (68テスト)
npm test

# 監視モード
npm run test:watch

# 特定カテゴリのテスト
npm test -- test/config/
npm test -- test/utils/
npm test -- test/data/
```

### 統合テスト
```bash
# Python-Node.js 統合テスト
./test/scripts/full_integration_test.sh

# 大規模データテストをスキップ
SKIP_LARGE_TEST=1 ./test/scripts/full_integration_test.sh

# クイック統合テスト
python3 scripts/dummy_data_generator.py --files 20 --days 5 --db-path /tmp/test.db
CCTOP_DB_PATH=/tmp/test.db npm run demo:ui
```

### 開発サポート
```bash
# TypeScript監視モード
npm run dev

# 設定デモ (FUNC-105)
npm run demo:config

# Python統合デモ
npm run demo:python-data
```

## 📁 プロジェクト構造

```
modules/cli/
├── src/                    # 本番ソースコード
│   ├── config/            # 設定管理 (FUNC-105準拠)
│   │   ├── cli-config.ts           # CLI設定型定義
│   │   ├── config-loader.ts        # 設定ローダー
│   │   └── local-setup-initializer.ts # 初期化機能
│   ├── database/          # データベース接続
│   │   └── database-adapter.ts     # SQLite3アダプター
│   ├── demo/              # 本番デモ・ユーティリティ
│   │   ├── demo-config-init.ts     # 設定初期化デモ
│   │   └── demo-ui.ts              # メインUIデモ
│   ├── types/             # TypeScript型定義
│   │   └── event-row.ts            # EventRow型
│   ├── ui/                # UIコンポーネント
│   │   └── blessed-frameless-ui-simple.ts # メインUIロジック
│   ├── utils/             # 共通ユーティリティ
│   │   ├── demo-data-generator.ts  # テスト用データ生成
│   │   └── random-data-generator.ts # ランダムデータ生成
│   └── index.ts           # エントリーポイント
├── test/                   # テストスイート
│   ├── config/            # 設定管理テスト (23テスト)
│   ├── data/              # データ生成テスト (9テスト)
│   ├── fixtures/          # テスト用固定ファイル
│   │   ├── create-test-db.ts       # テストDB作成
│   │   ├── demo-python-dummy-data.ts # Python統合デモ
│   │   └── README.md               # fixtures説明
│   ├── scripts/           # テスト実行スクリプト
│   │   └── full_integration_test.sh # 完全統合テスト
│   ├── types/             # 型定義テスト (5テスト)
│   ├── utils/             # ユーティリティテスト (14テスト)
│   ├── python-integration-test.md  # Python統合手順書
│   └── README.md          # テストスイート説明
├── scripts/               # Python関連スクリプト
│   ├── dummy_data_generator.py     # ダミーデータ生成
│   ├── requirements.txt            # Python依存関係
│   └── README.md                   # Python機能説明
├── package.json           # Node.js設定
├── tsconfig.json          # TypeScript設定
├── vitest.config.ts       # テスト設定
└── README.md              # このファイル
```

## 🔧 設定・カスタマイズ

### 環境変数
```bash
# ターミナル互換性
export TERM="xterm-256color"

# デバッグモード
export DEBUG="cctop:*"
```

**注意**: FUNC-105仕様に従い、データベースパスは実行ディレクトリの`.cctop/data/activity.db`が使用されます。

### 設定ファイル (FUNC-105)
```bash
# ローカル設定初期化
npm run demo:config

# 生成される設定構造
.cctop/
├── config/
│   ├── shared-config.json    # 共通設定
│   ├── daemon-config.json    # デーモン設定
│   └── cli-config.json       # CLI設定
└── themes/
    ├── current-theme.json    # 現在のテーマ
    ├── default.json          # デフォルトテーマ
    └── high-contrast.json    # 高コントラストテーマ
```

## 📊 仕様準拠

### FUNC-202: 4エリア構成UI
```
┌─────────────────────────────────┐
│ Header Area: システム状態表示    │
├─────────────────────────────────┤
│ Event Rows Area: イベント一覧   │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Command Keys Area: 操作ガイド   │
├─────────────────────────────────┤
│ Dynamic Control Area: 動的機能  │
└─────────────────────────────────┘
```

### FUNC-000: データベーススキーマ
- **events**: ファイル変更イベント
- **files**: ファイル情報
- **measurements**: メトリクス (サイズ、行数等)
- **event_types**: イベント種別定義
- **aggregates**: 集計データ (将来拡張)

### FUNC-105: 3層設定アーキテクチャ
1. **Shared Config**: 共通設定
2. **Daemon Config**: バックグラウンド処理設定
3. **CLI Config**: ユーザーインターフェース設定

## 🐛 トラブルシューティング

### よくある問題

#### 1. データベース接続エラー
```bash
# 権限確認
ls -la cctop.db
chmod 644 cctop.db

# パス確認
echo $CCTOP_DB_PATH
CCTOP_DB_PATH="./cctop.db" npm run demo:ui
```

#### 2. ターミナル表示崩れ
```bash
# ターミナル設定
export TERM=xterm-256color
npm run demo:ui

# 別ターミナルで試行
# iTerm2, Terminal.app, VS Code Terminalなど
```

#### 3. Python統合エラー
```bash
# Python依存関係
pip3 install -r scripts/requirements.txt

# ファイル権限
python3 scripts/dummy_data_generator.py --files 5 --days 1

# Node.js統合確認
node -e "console.log(require('sqlite3'))"
```

#### 4. テスト失敗
```bash
# キャッシュクリア
rm -rf node_modules dist
npm install
npm run build

# 個別テスト実行
npm test -- test/config/cli-config.test.ts --reporter=verbose
```

### デバッグ情報収集
```bash
# 環境情報
node --version
python3 --version
sqlite3 --version

# ディスク容量
df -h /tmp

# プロセス情報
ps aux | grep node
```

## 🚀 本番運用

### ビルド・デプロイ
```bash
# 本番ビルド
npm run build

# 成果物確認
ls -la dist/

# 本番起動
node dist/index.js
```

### パフォーマンス最適化
```bash
# 大規模データでのテスト
python3 scripts/dummy_data_generator.py --files 1000 --days 90
CCTOP_DB_PATH=large_test.db npm run demo:ui

# メモリ使用量監視
node --inspect dist/demo/demo-ui.js
```

## 🧪 Python統合テスト

Python dummy_data_generator.pyスクリプトとNode.js CLIの統合テストを行うための詳細手順です。

### 🎯 テスト目的

1. **Pythonデータ生成**: dummy_data_generator.pyが正常にFUNC-000準拠のデータを生成する
2. **Node.js読み込み**: 生成されたデータをNode.js CLIが正常に読み込める
3. **UI表示**: blessed UIが生成データを適切に表示する
4. **統合動作**: Python→SQLite→Node.jsの完全な統合フローの検証

### 📋 前提条件

#### 必要なソフトウェア
```bash
# Node.js (v18以上)
node --version

# Python 3 (3.8以上)
python3 --version

# SQLite3
sqlite3 --version
```

#### 依存関係インストール
```bash
# Node.js依存関係
npm install

# Python依存関係 (必要であれば)
pip3 install -r scripts/requirements.txt
```

### 🚀 統合テスト手順

#### Phase 1: 基本動作確認

##### 1.1 Pythonスクリプト単体テスト
```bash
# 小規模データで基本動作確認
python3 scripts/dummy_data_generator.py \
  --files 10 \
  --days 3 \
  --events-per-file 5 \
  --db-path /tmp/test_basic.db

# 結果確認
sqlite3 /tmp/test_basic.db "SELECT COUNT(*) as total_events FROM events;"
sqlite3 /tmp/test_basic.db "SELECT COUNT(*) as total_files FROM files;"
```

**期待結果**:
- events: 約50件 (10ファイル × 5イベント)
- files: 10件
- エラーなく完了

##### 1.2 スキーマ検証
```bash
# テーブル構造確認
sqlite3 /tmp/test_basic.db ".schema"

# 外部キー制約確認
sqlite3 /tmp/test_basic.db "PRAGMA foreign_key_check;"
```

**期待結果**:
- FUNC-000準拠のテーブル構造
- 外部キー制約エラーなし

#### Phase 2: Node.js統合テスト

##### 2.1 Node.jsでのデータ読み込みテスト
```bash
# テストスクリプト作成
cat > /tmp/test_node_integration.js << 'EOF'
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// 生成されたデータベースをテスト
function testDatabaseIntegration(dbPath) {
  console.log('🔍 Testing Node.js integration with:', dbPath);
  
  const db = new sqlite3.Database(dbPath);
  
  // 基本統計
  db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
    if (err) {
      console.error('❌ Error reading events:', err);
      return;
    }
    console.log('✅ Events count:', row.count);
  });
  
  // 最新10件のイベント取得 (CLI実装と同じクエリ)
  db.all(`
    SELECT 
      e.id,
      datetime(e.timestamp, 'unixepoch') as timestamp,
      et.code as event_type,
      f.file_path,
      m.file_size,
      m.line_count
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    JOIN files f ON e.file_id = f.id
    JOIN measurements m ON e.id = m.event_id
    ORDER BY e.timestamp DESC
    LIMIT 10
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error reading event details:', err);
      return;
    }
    console.log('✅ Latest events:', rows.length);
    console.log('📄 Sample event:', rows[0]);
  });
  
  // イベントタイプ分布
  db.all(`
    SELECT et.code, COUNT(*) as count
    FROM events e
    JOIN event_types et ON e.event_type_id = et.id
    GROUP BY et.code
    ORDER BY count DESC
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error reading event distribution:', err);
      return;
    }
    console.log('✅ Event distribution:');
    rows.forEach(row => {
      console.log(`  ${row.code}: ${row.count}`);
    });
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database test completed successfully');
      }
    });
  });
}

testDatabaseIntegration('/tmp/test_basic.db');
EOF

# Node.js統合テスト実行
node /tmp/test_node_integration.js
```

##### 2.2 CLI demo実行テスト
```bash
# 既存のデモスクリプトで実際のUIテスト
npm run demo:python-data

# または手動でPythonデータを指定してUIテスト
python3 scripts/dummy_data_generator.py \
  --files 50 \
  --days 7 \
  --db-path /tmp/test_ui.db

# UIで表示確認（別ターミナル）
CCTOP_DB_PATH=/tmp/test_ui.db npm run demo:ui
```

**期待結果**:
- blessed UIが正常に起動
- Pythonで生成したイベントが表示される
- キーボード操作（[a]/[u], [f], [space]）が正常動作

#### Phase 3: 大規模データテスト

##### 3.1 パフォーマンステスト
```bash
# 大規模データ生成
python3 scripts/dummy_data_generator.py \
  --files 500 \
  --days 30 \
  --events-per-file 20 \
  --db-path /tmp/test_large.db

# 生成時間と統計を記録
echo "Large dataset generation completed"
ls -lh /tmp/test_large.db
sqlite3 /tmp/test_large.db "SELECT COUNT(*) FROM events;"
```

##### 3.2 UI応答性テスト
```bash
# 大規模データでのUI動作確認
CCTOP_DB_PATH=/tmp/test_large.db npm run demo:ui
```

**期待結果**:
- 10,000+ eventsでもUIが滑らかに動作
- スクロール、フィルタリングが正常動作
- メモリ使用量が適切

#### Phase 4: エラーハンドリングテスト

##### 4.1 不正データテスト
```bash
# 壊れたデータベースでのテスト
echo "invalid data" > /tmp/test_corrupted.db
CCTOP_DB_PATH=/tmp/test_corrupted.db npm run demo:ui

# 空のデータベースでのテスト  
touch /tmp/test_empty.db
CCTOP_DB_PATH=/tmp/test_empty.db npm run demo:ui
```

**期待結果**:
- エラーメッセージが適切に表示
- アプリケーションがクラッシュしない
- フォールバック処理が動作

##### 4.2 権限エラーテスト
```bash
# 読み取り専用ファイルでのテスト
python3 scripts/dummy_data_generator.py --db-path /tmp/test_readonly.db
chmod 444 /tmp/test_readonly.db
CCTOP_DB_PATH=/tmp/test_readonly.db npm run demo:ui
```

### 🧪 自動化テストスクリプト

完全な統合テストを自動実行するスクリプト:

```bash
# 統合テストスクリプト実行
./test/scripts/full_integration_test.sh

# 大規模データテストをスキップ
SKIP_LARGE_TEST=1 ./test/scripts/full_integration_test.sh
```

### 📊 テスト結果の評価基準

#### ✅ 成功基準
1. **データ生成**: Pythonスクリプトがエラーなく完了
2. **データ整合性**: 生成されたevents数 = files数 × events-per-file (±10%)
3. **スキーマ準拠**: FUNC-000準拠のテーブル構造
4. **Node.js読み込み**: sqlite3モジュールでデータ読み込み成功
5. **UI表示**: blessed UIでイベント一覧表示
6. **機能動作**: フィルタリング、ソート、モード切替が正常動作

#### ❌ 失敗パターンと対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| Python実行エラー | 依存関係不足 | `pip3 install -r requirements.txt` |
| データベースアクセスエラー | ファイル権限 | `chmod 644 /tmp/test_*.db` |
| Node.js SQLiteエラー | sqlite3モジュール不足 | `npm install sqlite3` |
| UI表示エラー | ターミナル互換性 | `TERM=xterm-256color npm run demo:ui` |
| データ不整合 | スキーマバージョン | FUNC-000最新版確認 |

### 🔍 Python統合トラブルシューティング

#### デバッグ用コマンド
```bash
# 詳細ログ付きPython実行
python3 -v scripts/dummy_data_generator.py --files 5

# SQLite詳細確認
sqlite3 /tmp/test.db << EOF
.headers on
.mode column
SELECT * FROM events LIMIT 5;
.quit
EOF

# Node.js詳細デバッグ
DEBUG=* CCTOP_DB_PATH=/tmp/test.db npm run demo:ui

# システムリソース確認
echo "Disk space:" && df -h /tmp
echo "Memory usage:" && free -h
```

#### よくある問題
1. **Permission denied**: `/tmp`ディレクトリの権限を確認
2. **SQLite busy**: 他のプロセスがDBファイルを使用中
3. **Module not found**: `npm install`または`pip3 install`を再実行
4. **Terminal garbled**: `TERM=xterm-256color`を設定

### 📈 継続的インテグレーション

CI/CDパイプラインでの自動テスト例:

```yaml
# .github/workflows/python-integration.yml
name: Python Integration Test
on: [push, pull_request]
jobs:
  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          npm install
          pip3 install -r scripts/requirements.txt
      - name: Run integration test
        run: ./test/scripts/full_integration_test.sh
      - name: Upload test database
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-database
          path: /tmp/integration_test.db
```

## 📚 関連ドキュメント

### テスト関連
- [`test/README.md`](test/README.md) - テストスイート詳細
- [`test/fixtures/README.md`](test/fixtures/README.md) - テスト用固定ファイル

### Python統合
- [`scripts/README.md`](scripts/README.md) - Pythonダミーデータ生成ツール

### 設定・仕様
- FUNC-105: ローカル設定・初期化機能仕様
- FUNC-202: 4エリア構成UI仕様
- FUNC-000: データベーススキーマ仕様
- BP-002: Daemon-CLI分離アーキテクチャ

## 📈 開発ロードマップ

### Phase 1 (完了)
- ✅ blessed基本UI実装
- ✅ SQLite3統合  
- ✅ Event Filterシステム
- ✅ Python統合テスト
- ✅ FUNC-105設定システム

### Phase 2 (計画中)
- 🔄 詳細表示機能 ([Enter]キー)
- 🔄 エクスポート機能
- 🔄 プラグインシステム
- 🔄 WebUI統合

### Phase 3 (検討中)
- ⭐ リアルタイムコラボレーション
- ⭐ 機械学習ベース異常検知
- ⭐ パフォーマンス分析ダッシュボード

## 🤝 コントリビューション

### 開発環境セットアップ
```bash
# リポジトリクローン
git clone <repository>
cd modules/cli

# 開発用インストール
npm install
pip3 install -r scripts/requirements.txt

# 開発モード開始
npm run dev
```

### テスト実行
```bash
# 全テスト
npm test

# 統合テスト
./test/scripts/full_integration_test.sh

# カバレッジ (将来実装)
npm run test:coverage
```

### コードスタイル
- TypeScript strict mode
- ESLint + Prettier (将来実装)
- Conventional Commits
- Test-driven development

---

**CCTOP CLI Module** - High-performance file monitoring with intuitive terminal UI  
Version: 0.3.0 | License: MIT | Node.js: v18+ | TypeScript: 5.5+