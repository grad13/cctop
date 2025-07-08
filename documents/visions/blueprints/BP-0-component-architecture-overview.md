# BP-004: Component Architecture Overview

**作成日**: 2025年7月7日 21:50  
**更新日**: 2025年7月7日 21:50  
**作成者**: Architect Agent  
**Version**: 1.0.0  
**関連仕様**: All FUNC specifications

## 📊 概要

cctopプロジェクトの全24 Active機能を**3つのコンポーネント（Daemon/CLI/Shared）**に分類し、システム全体のアーキテクチャを明確化。各機能の実装場所と依存関係を体系的に整理します。

## 🏗️ 3層コンポーネント構成

```
cctop System Architecture
├── Daemon Process (Background Service)
│   ├── ファイル監視・イベント収集
│   ├── データベース管理・永続化
│   └── バックグラウンド処理
├── CLI Process (Interactive Frontend)
│   ├── ユーザーインターフェース
│   ├── 表示・レンダリング・フィルタリング
│   └── キー入力・インタラクション
└── Shared Library (Common Components)
    ├── 設定管理・初期化
    ├── 共通ユーティリティ
    └── データ構造・型定義
```

## 📋 FUNC別コンポーネント分類

### 🔧 Daemon Process - バックグラウンドサービス

**責務**: ファイル監視・データ収集・永続化・バックグラウンド処理

| FUNC-ID | 機能名 | 主要責務 |
|---------|--------|----------|
| **FUNC-000** | SQLite Database Foundation | データベース管理・テーブル設計 |
| **FUNC-001** | File Lifecycle Tracking | ファイルイベント追跡・分類 |
| **FUNC-002** | Chokidar Database Integration | ファイル監視・イベント収集 |
| **FUNC-003** | Background Activity Monitor | デーモンプロセス管理・ライフサイクル |
| **FUNC-106** | Daemon Configuration Management | daemon-config.json管理 |

**実装場所**: `cctop/modules/daemon/`  
**主要技術**: chokidar, SQLite3, Node.js background process

### 🖥️ CLI Process - インタラクティブフロントエンド

**責務**: ユーザーインターフェース・表示・操作・インタラクション

| FUNC-ID | 機能名 | 主要責務 |
|---------|--------|----------|
| **FUNC-200** | East Asian Width Display | 文字幅対応表示 |
| **FUNC-201** | Double Buffer Rendering | 二重バッファ描画 |
| **FUNC-202** | CLI Display Integration | メイン表示統合 |
| **FUNC-203** | Event Type Filtering | イベントタイプフィルタ |
| **FUNC-204** | Responsive Directory Display | レスポンシブディレクトリ表示 |
| **FUNC-206** | Instant View Progressive Loading | プログレッシブローディング |
| **FUNC-208** | UI Filter Integration | 統合フィルタ機能 |
| **FUNC-300** | Key Input Manager | キー入力管理 |
| **FUNC-301** | Filter State Management | フィルタ状態管理 |
| **FUNC-400** | Interactive Selection Mode | インタラクティブ選択 |
| **FUNC-401** | Detailed Inspection Mode | 詳細検査モード |
| **FUNC-402** | Aggregate Display Module | 集約表示モジュール |
| **FUNC-403** | History Display Module | 履歴表示モジュール |
| **FUNC-404** | Dual Pane Detail View | デュアルペイン詳細表示 |
| **FUNC-107** | CLI Configuration Management | cli-config.json管理 |

**実装場所**: `cctop/modules/cli/`  
**主要技術**: blessed.js, ANSIエスケープ, Terminal UI

### 📚 Shared Library - 共通コンポーネント

**責務**: 設定管理・共通ユーティリティ・データ構造・型定義

| FUNC-ID | 機能名 | 主要責務 |
|---------|--------|----------|
| **FUNC-101** | Hierarchical Config Management | 共通設定管理 |
| **FUNC-102** | File Watch Limit Management | ファイル監視上限管理 |
| **FUNC-104** | CLI Interface Specification | CLI引数・起動挙動 |
| **FUNC-105** | Local Setup Initialization | ローカル設定・初期化 |
| **FUNC-108** | Color Theme Configuration | 色テーマ設定管理 |

**実装場所**: `cctop/modules/shared/`  
**主要技術**: JSON設定管理, ファイルシステム操作, 型定義

## 🔗 コンポーネント間連携

### データフロー

```
[ファイル変更]
    ↓
[Daemon: FUNC-002 Chokidar監視]
    ↓
[Daemon: FUNC-001 イベント分類]
    ↓
[Daemon: FUNC-000 SQLite保存]
    ↓
[CLI: FUNC-202 データ取得]
    ↓
[CLI: FUNC-301 フィルタ処理]
    ↓
[CLI: FUNC-200/201 表示レンダリング]
```

### 設定連携

```
[Shared: FUNC-101 共通設定]
    ├── [Daemon: FUNC-106 Daemon設定]
    └── [CLI: FUNC-107 CLI設定]
```

### ユーザー操作

```
[CLI: FUNC-300 キー入力]
    ↓
[CLI: FUNC-301 状態管理]
    ↓
[CLI: FUNC-203/208 フィルタ実行]
    ↓
[CLI: FUNC-202 表示更新]
```

## 🎯 実装優先度とコンポーネント

### Phase 1: 基盤構築
- **Daemon**: FUNC-000, 001, 002 (データ収集基盤)
- **Shared**: FUNC-101, 105 (初期化・設定基盤)

### Phase 2: 基本機能
- **Daemon**: FUNC-003 (プロセス管理)
- **CLI**: FUNC-200, 201, 202 (基本表示)
- **CLI**: FUNC-300 (基本操作)

### Phase 3: 拡張機能
- **CLI**: FUNC-203, 204, 206 (フィルタ・表示拡張)
- **CLI**: FUNC-301 (状態管理)
- **CLI**: FUNC-400 (基本インタラクション)

### Phase 4: 高度機能
- **CLI**: FUNC-208 (統合フィルタ)
- **CLI**: FUNC-401-404 (高度インタラクション)
- **Shared**: FUNC-102, 108 (高度設定)

## 📊 コンポーネント別統計

| コンポーネント | 機能数 | 割合 | 主要責務 |
|---------------|--------|------|----------|
| **Daemon** | 5機能 | 21% | バックグラウンド処理・データ管理 |
| **CLI** | 14機能 | 58% | ユーザーインターフェース・操作 |
| **Shared** | 5機能 | 21% | 共通設定・ユーティリティ |
| **合計** | **24機能** | **100%** | - |

## 🔧 開発工程とコンポーネント

### Git Worktree構成
```
cctop/
├── worktrees/
│   ├── v030-daemon/     # Daemon Process開発
│   ├── v030-cli/        # CLI Process開発
│   └── v030-shared/     # Shared Library開発
```

### npm workspaces構成
```json
{
  "workspaces": [
    "modules/daemon",
    "modules/cli", 
    "modules/shared",
    "modules/integration"
  ]
}
```

### 並行開発戦略
- **Builder**: 主にShared Library開発担当
- **Validator**: 主にDaemon Process開発担当  
- **Architect**: CLI Process設計支援・統合調整

## ⚠️ 依存関係制約

### 循環依存防止
- **Daemon** → **Shared** (設定読み込み)
- **CLI** → **Shared** (設定読み込み)
- **CLI** ← **Daemon** (データ取得、直接通信なし)

### データベース アクセス
- **Daemon**: 読み書き権限（SQLite WAL mode）
- **CLI**: 読み取り専用アクセス
- **Shared**: データベースアクセスなし

## 🎯 成功指標

1. **明確な責務分離**: 各コンポーネントの役割が明確に定義されている
2. **効率的な並行開発**: 3つのワークトリーで独立した開発が可能
3. **適切な依存関係**: 循環依存なしでクリーンなアーキテクチャ
4. **拡張性**: 新機能の追加時に適切なコンポーネントに配置可能

---

**核心価値**: 24機能を3コンポーネントに体系的に分類し、効率的な並行開発と保守性の高いアーキテクチャを実現する