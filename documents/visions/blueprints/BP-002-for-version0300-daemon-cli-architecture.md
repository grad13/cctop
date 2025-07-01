# BP-002: Daemon-CLI分離アーキテクチャ設計図

**作成日**: 2025年6月30日  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.3.0.0  
**関連仕様**: PLAN-20250630-001  

## 🎯 目標

v0.3.0.0では、致命的なバグ（terminal/ブラウザクラッシュ）の根本解決と、将来的な拡張性確保のため、MonolithicアーキテクチャからDaemon-CLI分離アーキテクチャへ移行する。

## 📊 実装スコープ

### 含まれるもの

1. **共通基盤（shared/）**
   - SQLite WALモード対応DBアクセス層
   - 共通型定義（TypeScript）
   - DBスキーマ定義

2. **Daemonプロセス（daemon/）**
   - chokidarベースのファイル監視
   - イベント処理・DB記録
   - プロセス管理・自動復旧
   - 長時間稼働対応

3. **CLIインターフェース（cli/）**
   - DB読み取り専用アクセス
   - 100msポーリングによる準リアルタイム更新
   - 既存の全表示機能（FUNC-200〜206）
   - インタラクティブ機能（FUNC-400〜403）

4. **テスト基盤**
   - ビジュアルリグレッションテスト
   - インタラクションテスト（node-pty）
   - 各モジュール独立テスト

### 含まれないもの

- WebSocket/IPCによる高度なリアルタイム通信
- Web UI
- REST API
- 設定のホットリロード（次バージョン以降）

## 🏗️ システムアーキテクチャ

### プロセス構成とデータフロー

```
┌─────────────────────────────────────────────────┐
│                  ユーザー空間                    │
├─────────────────┬───────────────────────────────┤
│   CLI Process   │      Daemon Process           │
│                 │                               │
│  ┌──────────┐  │  ┌──────────────────────┐   │
│  │ Display  │  │  │  File Monitor        │   │
│  │  Engine  │  │  │  (chokidar)          │   │
│  └────▲─────┘  │  └──────────┬───────────┘   │
│       │         │             │               │
│       │         │             ▼               │
│  ┌────┴─────┐  │  ┌──────────────────────┐   │
│  │ Database │  │  │  Event Processor      │   │
│  │  Reader  │  │  └──────────┬───────────┘   │
│  └────▲─────┘  │             │               │
│       │         │             ▼               │
│       │ READ    │  ┌──────────────────────┐   │
│       │ (100ms) │  │  Database Writer     │   │
│       │         │  └──────────┬───────────┘   │
└───────┼─────────┴─────────────┼───────────────┘
        │                       │ WRITE
        │                       ▼
        └────────────── SQLite DB
                         (WAL mode)
                         
データフロー:
1. File System → chokidar → Event Processor → DB Writer → SQLite
2. SQLite → DB Reader → Display Engine → Terminal Output
```

### ディレクトリ構造

#### **コードベース構造**
```
main/
├── modules/              # 全モジュールの統一配置（正式実装場所）
│   ├── shared/           # 共通モジュール
│   │   ├── src/
│   │   │   ├── schema/   # DBスキーマ定義  
│   │   │   ├── types/    # 共通型定義
│   │   │   └── database/ # DB接続・基本操作
│   │   ├── tests/
│   │   └── package.json
│   ├── daemon/           # バックグラウンドプロセス
│   │   ├── src/
│   │   │   ├── index.ts      
│   │   │   ├── file-monitor/ 
│   │   │   └── event-processor/
│   │   ├── tests/
│   │   └── package.json
│   ├── cli/              # CLIインターフェース
│   │   ├── src/
│   │   │   ├── index.ts      
│   │   │   ├── display/      
│   │   │   ├── interactive/  
│   │   │   └── ui/           
│   │   ├── tests/
│   │   │   ├── unit/         
│   │   │   ├── visual/   # スナップショットテスト
│   │   │   └── interaction/ # キー入力テスト
│   │   └── package.json
│   └── integration/      # 統合テスト
│       ├── src/
│       ├── tests/
│       └── package.json
├── bin/                  # 実行スクリプト
│   ├── cctop-daemon      # daemonプロセス起動
│   └── cctop-cli         # CLIプロセス起動
├── worktrees/            # Git worktree実験環境（開発用）
└── package.json          # ワークスペース定義
```

**モジュール配置方針**:
- `modules/` が全モジュールの正式な実装配置場所
- 各モジュールは独立したnpmパッケージとして管理
- worktreesは実験・並列開発用の一時環境
- npm workspacesによるモノレポ構造で依存関係を一元管理

#### **ユーザーデータ構造（.cctop/）**
```
.cctop/
├── config/                   # 設定ファイル用
│   ├── shared-config.json    # 共通設定（FUNC-101）
│   ├── daemon-config.json    # Daemon設定（FUNC-106）
│   └── cli-config.json       # CLI設定（FUNC-107）
├── themes/                   # カラーテーマ集（FUNC-108）
│   ├── current-theme.json    # 現在適用中の色設定
│   ├── default.json          # デフォルトテーマ
│   ├── high-contrast.json    # 高コントラストテーマ
│   └── custom/               # ユーザーカスタムテーマ
├── data/                     # データファイル用
│   ├── activity.db           # メインデータベース
│   ├── activity.db-wal       # SQLite WALファイル
│   └── activity.db-shm       # SQLite共有メモリ
├── logs/                     # ログファイル用
│   ├── daemon.log            # Daemonログ
│   └── cli.log               # CLIログ
├── runtime/                  # 実行時ファイル用
│   ├── daemon.pid            # DaemonプロセスID
│   └── daemon.sock           # Unixソケット
├── temp/                     # 一時ファイル用
└── .gitignore                # Git除外設定
```

## 📋 技術仕様参照

### 3層設定アーキテクチャ
v0.3.0.0では、Daemon-CLI分離に伴い設定管理を3層構造に分離：

1. **共通設定層（shared-config.json）** - FUNC-101
   - データベースパス、ディレクトリ構造
   - プロジェクト情報、ログ設定
   - DaemonとCLIで共有される基本設定

2. **Daemon設定層（daemon-config.json）** - FUNC-106
   - ファイル監視パラメータ
   - イベント処理設定
   - プロセス管理設定

3. **CLI設定層（cli-config.json）** - FUNC-107
   - 表示設定、レンダリング設定
   - インタラクティブ機能設定
   - ポーリング間隔設定

### データベース層
- **SQLite WALモード**: 
  ```sql
  PRAGMA journal_mode=WAL;
  ```
  - 同時読み書きを可能にする
  - daemon（書き込み）とcli（読み込み）の競合を回避
  - パフォーマンス向上の副次効果
- **スキーマ**: 既存のFUNC-000準拠（変更なし）

### Daemon仕様
- **最優先事項**: データ収集の継続性を保証
- **起動方法**: `npm run daemon` または systemd service
- **監視対象**: 既存のchokidar設定を継承
- **エラー処理**: 自動再起動、エラーログ記録
- **リソース管理**: メモリリーク防止、定期的GC
- **設計思想**: CLIがクラッシュしてもdaemonは影響を受けない

### CLI仕様
- **更新頻度**: 100msポーリング
  - リアルタイム性と負荷のバランス点
  - ファイル監視において100ms遅延は実用上問題なし
  - 設定で調整可能（10ms〜1000ms）
- **表示機能**: FUNC-200〜206の全機能を維持
- **インタラクション**: FUNC-400〜403の機能を維持
- **起動時間**: 0.1秒以内（FUNC-206準拠）
- **設計思想**: 表示のバグはdaemonのデータ収集に影響しない

## 🎯 成功基準

### 定量的指標
1. **安定性**: Daemon 24時間連続稼働でクラッシュゼロ
2. **性能**: CLI起動時間 0.1秒以内維持
3. **リソース**: メモリ使用量 現行比50%削減
4. **テストカバレッジ**: 各モジュール80%以上

### 定性的指標
1. **バグ解消**: terminal/ブラウザクラッシュの完全解消
2. **保守性**: モジュール独立によるメンテナンス性向上
3. **拡張性**: 新UIやAPI追加が容易な構造

## 📝 開発方針

### TDD実践と役割の柔軟性（v0.3.0限定）
**t-wadaのTDD手法**を完全採用するため、本バージョンに限り：
- BuilderとValidatorの**兼任を許可**
- Red → Green → Refactorサイクルを1人で完結
- テスト作成と実装の即座の反復により品質向上

**注記**: この兼任はv0.3.0でのTDD実験的導入のため。メタルールには記載せず、本設計図でのみ有効。

### Git Worktree並列開発戦略
効率最大化のため、**機能ごとにworktreeで並列化**：

```bash
# 3つの並列worktree
git worktree add ../06-cctop-shared shared-module-dev
git worktree add ../06-cctop-daemon daemon-dev  
git worktree add ../06-cctop-cli cli-dev
```

この並列化により、コンテキストスイッチを最小化し、各機能に集中した開発が可能。

### npm workspaces設定
モノレポ構造での統一的な依存関係管理：

```json
// cctop/package.json
{
  "name": "cctop",
  "version": "0.3.0",
  "workspaces": [
    "modules/*"
  ],
  "scripts": {
    "install:all": "npm install",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "daemon": "node bin/cctop-daemon",
    "cli": "node bin/cctop-cli",
    "dev": "npm run daemon & npm run cli"
  }
}
```

**workspaces利点**:
- 単一の`npm install`で全モジュールの依存関係を解決
- 共通の依存関係は自動的にルートレベルでホイスト
- モジュール間の相互参照が`@cctop/shared`のような形で可能
- 統一されたビルド・テストコマンドでの一括管理

## 🔗 関連ドキュメント

### 実装計画・設計
- [PLAN-20250630-001](../../records/plans/PLAN-20250630-001-monitor-viewer-separation.md): 詳細実装計画
- [PLAN-20250701-032](../../records/plans/PLAN-20250701-032-v030-module-integration.md): モジュール統合計画

### 機能仕様
- [FUNC-000](../../functions/FUNC-000-sqlite-database-foundation.md): DB基盤仕様
- [FUNC-200-206](../../functions/): 表示機能仕様
- [FUNC-400-403](../../functions/): インタラクティブ機能仕様

### 設定管理機能（v0.3.0.0 新規）
- [FUNC-101](../../functions/FUNC-101-hierarchical-config-management.md): 共通設定管理
- [FUNC-105](../../functions/FUNC-105-local-setup-initialization.md): ローカル設定・初期化
- [FUNC-106](../../functions/FUNC-106-daemon-configuration-management.md): Daemon設定管理
- [FUNC-107](../../functions/FUNC-107-cli-configuration-management.md): CLI設定管理
- [FUNC-108](../../functions/FUNC-108-color-theme-configuration.md): カラーテーマ設定

---

**注記**: 本設計は緊急バグ対応を含むため、v0.2.x系の安定版リリース後、即座にv0.3.0.0として実装を開始する。