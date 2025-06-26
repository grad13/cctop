# CCTop ディレクトリ構造設計

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: 新surveillance/cctopシステムのディレクトリ構造を定義

## 📁 ディレクトリ構造

```
cctop/
├── bin/                         # npm install -g時のエントリポイント
│   ├── cctop                    # メインCLIスクリプト
│   └── cctop.js                 # Node.jsエントリポイント
├── src/                         # ソースコード
│   ├── analyzers/               # 統計分析エンジン
│   │   ├── activity-analyzer.js     # ファイル活動分析
│   │   ├── session-manager.js       # セッション管理・時間計算
│   │   ├── statistics-analyzer.js   # 統計計算エンジン
│   │   └── hotspot-detector.js      # ホットスポット検出
│   ├── monitors/                # ファイル監視
│   │   ├── file-watcher.js          # ファイル変更監視
│   │   ├── move-detector.js         # ファイル移動検出
│   │   ├── exclude-pattern.js       # 除外パターン処理
│   │   └── event-processor.js       # イベント処理・正規化
│   ├── database/                # DB操作・スキーマ
│   │   ├── database-manager.js      # SQLite操作メイン
│   │   ├── schema.js                # テーブル・インデックス定義
│   │   ├── migrations/              # マイグレーション
│   │   │   ├── 001-initial.sql         # 初期スキーマ
│   │   │   └── 002-statistics.sql      # 統計テーブル追加
│   │   └── queries/                 # 共通クエリ定義
│   │       ├── stream-queries.js        # ストリーム表示用
│   │       ├── statistics-queries.js    # 統計取得用
│   │       └── history-queries.js       # 履歴追跡用
│   ├── cache/                     # キャッシュシステム
│   │   ├── managers/              # キャッシュマネージャー
│   │   │   ├── event-type-cache-manager.js    # イベントタイプ別キャッシュ
│   │   │   ├── statistics-cache-manager.js    # 統計情報キャッシュ
│   │   │   ├── persistent-cache-manager.js    # 永続キャッシュ（SQLite）
│   │   │   └── database-cache-manager.js      # データベース層キャッシュ
│   │   ├── loaders/               # データローダー
│   │   │   └── background-event-loader.js     # 非同期バックグラウンドローダー
│   │   ├── strategies/            # キャッシュ戦略
│   │   │   ├── lru-strategy.js            # LRU戦略
│   │   │   ├── ttl-strategy.js            # TTL戦略
│   │   │   └── memory-limit-strategy.js    # メモリ制限戦略
│   │   └── metrics/               # キャッシュメトリクス
│   │       └── cache-metrics.js           # パフォーマンス測定
│   ├── renderers/                 # 描画エンジン
│   │   ├── buffered-renderer.js        # バッファリング描画
│   │   └── stream-renderer.js          # ストリーム表示描画
│   └── cli/                     # CLI表示
│       ├── display-manager.js       # 画面表示制御
│       ├── keyboard-handler.js      # キーボード入力処理
│       ├── formatters/              # 表示フォーマッター
│       │   ├── stream-formatter.js      # ストリーム表示
│       │   ├── stats-formatter.js       # 統計表示
│       │   └── table-formatter.js       # テーブル表示
│       └── themes/                  # 表示テーマ
│           ├── default-theme.js         # デフォルトカラー
│           └── compact-theme.js         # コンパクト表示
├── scripts/                     # 開発用スクリプト
│   ├── build.js                 # ビルドスクリプト
│   ├── test-runner.js           # テスト実行
│   ├── migration-runner.js      # マイグレーション実行
│   └── sample-data-generator.js # テスト用データ生成
├── test/                        # テストコード
│   ├── unit/                    # ユニットテスト
│   │   ├── analyzers/               # analyzers/*のテスト
│   │   ├── monitors/                # monitors/*のテスト
│   │   ├── database/                # database/*のテスト
│   │   └── cli/                     # cli/*のテスト
│   ├── integration/             # 統合テスト
│   │   ├── file-monitoring.test.js  # ファイル監視統合
│   │   ├── database-ops.test.js     # DB操作統合
│   │   └── cli-interface.test.js    # CLI表示統合
│   ├── fixtures/                # テスト用データ
│   │   ├── sample-files/            # テスト用ファイル
│   │   └── sample-db.sqlite         # テスト用DB
│   └── helpers/                 # テストヘルパー
│       ├── mock-fs.js               # ファイルシステムモック
│       └── test-db-manager.js       # テスト用DB管理
├── config/                      # 設定ファイル
│   ├── default-config.json      # デフォルト設定
│   └── schema.json              # 設定スキーマ定義
├── docs/                        # ドキュメント
│   ├── README.md                # プロジェクト概要
│   ├── CLI-GUIDE.md             # CLI使用方法
│   ├── API-REFERENCE.md         # 内部API仕様
│   └── DEVELOPMENT.md           # 開発者向けガイド
├── package.json                 # NPM設定
├── package-lock.json            # 依存関係ロック
├── .gitignore                   # Git除外設定
├── .npmignore                   # NPM除外設定
└── LICENSE                      # ライセンス
```

## 🎯 設計原則

### 1. 機能別分離
- **analyzers/**: 分析・統計処理に特化
- **monitors/**: ファイル監視に特化  
- **database/**: データ操作に特化
- **cli/**: ユーザーインターフェースに特化

### 2. スケーラビリティ
- モジュール単位での機能追加が容易
- 各ディレクトリ内での細分化が可能
- テスト構造が開発構造と対応

### 3. NPMパッケージ対応
- **bin/**: グローバルインストール時のエントリポイント
- **package.json**: CLIツールとしての設定
- **.npmignore**: 不要ファイルの除外

## 📋 主要コンポーネント

### analyzers/ - 分析エンジン
| ファイル | 責務 |
|---------|------|
| activity-analyzer.js | ファイル活動パターンの分析 |
| session-manager.js | 作業セッションの管理・時間計算 |
| statistics-analyzer.js | 更新頻度・統計の計算 |
| hotspot-detector.js | 頻繁に更新されるファイルの検出 |

### monitors/ - 監視システム
| ファイル | 責務 |
|---------|------|
| file-watcher.js | ファイルシステム変更の監視 |
| move-detector.js | ファイル移動・名前変更の検出 |
| exclude-pattern.js | 除外パターンの処理 |
| event-processor.js | 変更イベントの正規化・処理 |

### database/ - データ管理
| ファイル | 責務 |
|---------|------|
| database-manager.js | SQLite操作のメインAPI |
| schema.js | テーブル・インデックス定義 |
| migrations/ | スキーマ変更管理 |
| queries/ | 共通クエリの定義 |

### cache/ - キャッシュシステム
| ファイル | 責務 |
|---------|------|
| event-type-cache-manager.js | イベントタイプ別の高速キャッシュ管理 |
| statistics-cache-manager.js | 統計情報の事前計算・キャッシュ |
| database-cache-manager.js | データベース層のキャッシュ最適化 |
| lru-strategy.js | LRU（最近最少使用）アルゴリズム |
| ttl-strategy.js | TTL（生存時間）ベースの無効化 |
| memory-limit-strategy.js | メモリ使用量制限戦略 |
| cache-metrics.js | ヒット率・応答時間の測定 |

### cli/ - ユーザーインターフェース
| ファイル | 責務 |
|---------|------|
| display-manager.js | 画面描画・更新制御 |
| keyboard-handler.js | キーボード入力処理 |
| formatters/ | 各種表示形式のフォーマッター |
| themes/ | 表示テーマ・カラーリング |

## 🔄 データフロー

```
監視対象ファイル
    ↓
monitors/file-watcher.js (変更検出)
    ↓
monitors/event-processor.js (正規化)
    ↓
database/database-manager.js (永続化)
    ↓
cache/managers/ (高速アクセス層)
    ↓
analyzers/statistics-analyzer.js (分析)
    ↓
cli/display-manager.js (表示)
```

## 📦 NPMパッケージ構成

### package.json設定例
```json
{
  "name": "cctop",
  "version": "1.0.0",
  "description": "Claude Code monitoring tool",
  "bin": {
    "cctop": "./bin/cctop.js"
  },
  "main": "./src/index.js",
  "files": [
    "bin/",
    "src/",
    "config/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "start": "node bin/cctop.js",
    "test": "node scripts/test-runner.js",
    "build": "node scripts/build.js"
  }
}
```

### インストール後の動作
```bash
# グローバルインストール
npm install -g cctop

# CLI実行
cctop                    # 現在ディレクトリ監視
cctop /path/to/project   # 指定ディレクトリ監視
cctop --config           # 設定編集
```

## 🧪 テスト戦略

### ユニットテスト
- 各モジュールの単体機能テスト
- モックを使用した独立テスト
- カバレッジ90%以上を目標

### 統合テスト
- モジュール間の連携テスト
- 実際のファイル操作を使用
- エンドツーエンドの動作確認

### 開発用ツール
- **sample-data-generator.js**: テスト用データ生成
- **mock-fs.js**: ファイルシステムモック
- **test-db-manager.js**: テスト用DB管理

## 🔧 開発環境設定

### 推奨開発フロー
1. **機能実装**: src/配下でモジュール開発
2. **ユニットテスト**: test/unit/配下でテスト作成
3. **統合テスト**: test/integration/配下で連携確認
4. **CLI動作確認**: bin/cctop.jsで実際のCLI動作確認

### 品質管理
- ESLint設定でコード品質管理
- Jest設定でテスト実行
- GitHub ActionsでCI/CD構築

---

## 📂 プロジェクト全体のディレクトリ分離方針

### 重要な区別：内部資料 vs 公開プロダクト

**cctop/** - 公開用プロダクト
- NPMパッケージとして公開される実装コード
- エンドユーザー向けドキュメント（README.md等）
- 内部開発資料は一切含めない

**documents/** - 内部開発資料
- 開発仕様書・設計文書（visions/specifications/）
- 実装レポート・評価記録（records/reports/）
- 開発計画・フェーズ管理（visions/blueprints/）
- プロジェクト内部管理用ステータス（agents/status/）

### ファイル配置の基本原則
```
❌ 間違い: cctop/docs/specifications/ (内部資料を公開プロダクトに混入)
✅ 正しい: documents/visions/specifications/ (内部資料は分離管理)

❌ 間違い: documents/src/ (実装コードを内部に隠蔽)  
✅ 正しい: cctop/src/ (実装コードは公開プロダクト)
```

### 開発者への注意事項
- **cctop/**への内部資料混入は厳禁
- **documents/**での実装コード管理は不適切
- 仕様書・レポート・計画書は必ず**documents/visions/**配下で管理
- 公開予定のドキュメントのみ**cctop/docs/**で管理

---

*この構造は、previous-v01の成功パターンを基に、よりスケーラブルで保守性の高いアーキテクチャとして設計されています。*