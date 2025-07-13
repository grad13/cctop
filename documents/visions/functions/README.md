# Functions - Active機能仕様管理

**最終更新**: 2025年7月7日  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの**Active**機能仕様管理  

## 📋 概要

functionsディレクトリは、**Active**ステータスの確定機能仕様のみを管理します。ここに含まれる機能は実装対象として確定しており、Builder/Validatorの作業対象となります。

**Draft機能**: 実験段階の機能は `pilots/` ディレクトリで管理

## 🏗️ システム全体アーキテクチャ

cctopは**5階層のアーキテクチャ**で構成されています：

```
cctop システム全体
├── 000番台: 基盤層（Foundation Layer）
│   └── SQLite・監視・データ収集の中核機能
├── 100番台: 設定管理層（Configuration Layer）
│   └── システム全体の設定・初期化・管理
├── 200番台: UI表示層（Display Layer）
│   └── 画面表示・レンダリング・フィルタリング
├── 300番台: 入力管理層（Input Layer）
│   └── キー入力・操作処理
└── 400番台: インタラクティブ層（Interactive Layer）
    └── 高度な対話機能・詳細表示
```

### データフロー
1. **監視**: 003→002→001→000（ファイル監視からDB保存）
2. **表示**: 000→202→203-208→画面表示
3. **操作**: 300→400番台→200番台（キー入力から表示更新）

### 実装優先度
- **Phase 1**: 基盤層（000番台）+ 必須設定（101,106,107）
- **Phase 2**: 基本表示（200,201,202）+ 入力管理（300,301）
- **Phase 3**: 表示拡張（203,204,206,207）+ 基本インタラクション（400）
- **Phase 4**: 統合フィルタ（208）+ 高度インタラクション（401-404）

## 📝 命名規則

```
FUNC-XXX-functional-description.md

例:
FUNC-001-file-monitoring-core.md
FUNC-002-cli-display-system.md
FUNC-003-configuration-management.md
```

### ヘッダー形式

**Active機能のヘッダー**:
```
作成日: YYYY年MM月DD日 HH:MM
更新日: YYYY年MM月DD日 HH:MM
作成者: Agent名
ステータス: Active
対象バージョン: X.X.X.X
```

## 📁 現在のファイル一覧（24 Active）

### 000番台 - 基盤層（Foundation Layer）
**責務**: データ収集・保存・監視の中核機能  
**コンポーネント**: Daemon Process + Shared Library

| ファイル | 機能 | 優先度 |
|---------|------|---------|
| FUNC-000-sqlite-database-foundation.md | SQLiteデータベース基盤 | 🟥 必須 |
| FUNC-001-file-lifecycle-tracking.md | ファイルライフサイクル追跡 | 🟥 必須 |
| FUNC-002-chokidar-database-integration.md | chokidar-Database統合監視 | 🟥 必須 |
| FUNC-003-background-activity-monitor.md | バックグラウンドデーモン | 🟨 基本 |

### 100番台 - 設定管理層（Configuration Layer）
**責務**: システム全体の設定・初期化・管理  
**コンポーネント**: Shared Library（一部Daemon/CLI特化）

| ファイル | 機能 | 優先度 |
|---------|------|---------|
| FUNC-101-hierarchical-config-management.md | 共通設定管理機能 | 🟥 必須 |
| FUNC-102-file-watch-limit-management.md | ファイル監視上限管理 | 🟦 拡張 |
| FUNC-104-view-interface-specification.md | View引数・起動挙動仕様 | 🟨 基本 |
| FUNC-105-local-setup-initialization.md | ローカル設定・初期化 | 🟨 基本 |
| FUNC-106-daemon-configuration-management.md | Daemon設定管理 | 🟥 必須 |
| FUNC-107-view-configuration-management.md | View設定管理 | 🟥 必須 |
| FUNC-108-color-theme-configuration.md | Color Theme Configuration | 🟦 拡張 |

### 200番台 - UI表示層（Display Layer）
**責務**: 画面表示・レンダリング・フィルタリング  
**コンポーネント**: CLI Process

| ファイル | 機能 | 優先度 |
|---------|------|---------|
| FUNC-200-east-asian-width-display.md | East Asian Width対応表示 | 🟥 必須 |
| FUNC-201-double-buffer-rendering.md | 二重バッファ描画 | 🟥 必須 |
| FUNC-202-view-display-integration.md | View表示統合 | 🟥 必須 |
| FUNC-203-event-type-filtering.md | イベントタイプフィルタリング | 🟨 基本 |
| FUNC-204-responsive-directory-display.md | レスポンシブディレクトリ表示 | 🟨 基本 |
| FUNC-206-instant-view-progressive-loading.md | 即時表示・プログレッシブローディング | 🟦 拡張 |
| FUNC-208-ui-filter-integration.md | UI統合フィルタ | 🟦 拡張 |

### 300番台 - 入力管理層（Input Layer）
**責務**: キー入力・操作処理・状態管理  
**コンポーネント**: CLI Process

| ファイル | 機能 | 優先度 |
|---------|------|---------|
| FUNC-300-key-input-manager.md | キー入力管理システム | 🟥 必須 |
| FUNC-301-filter-state-management.md | フィルター状態管理機能 | 🟨 基本 |

### 400番台 - インタラクティブ層（Interactive Layer）
**責務**: 高度な対話機能・詳細表示  
**コンポーネント**: CLI Process

| ファイル | 機能 | 優先度 |
|---------|------|---------|
| FUNC-400-interactive-selection-mode.md | インタラクティブ選択モード | 🟨 基本 |
| FUNC-401-detailed-inspection-mode.md | 詳細検査モード | 🟦 拡張 |
| FUNC-402-aggregate-display-module.md | 集約表示モジュール | 🟦 拡張 |
| FUNC-403-history-display-module.md | 履歴表示モジュール | 🟦 拡張 |
| FUNC-404-dual-pane-detail-view.md | デュアルペイン詳細表示 | 🟦 拡張 |

### 🏷️ 優先度凡例
- 🟥 **必須（Core）**: システムの基本動作に必要
- 🟨 **基本（Basic）**: 基本的な使用に必要
- 🟦 **拡張（Advanced）**: 高度な機能・最適化

## 📊 管理方針

### バージョン管理
- **1機能1ファイル**: 機能毎に独立したファイル
- **継続更新**: 機能の進化・改善を同一ファイルで追跡
- **履歴保持**: 機能の発展履歴を記録

### アーキテクチャ階層
- **基盤層 (000番台)**: データ収集・保存・監視の中核機能
- **設定管理層 (100番台)**: システム全体の設定・初期化・管理
- **UI表示層 (200番台)**: 画面表示・レンダリング・フィルタリング
- **入力管理層 (300番台)**: キー入力・操作処理
- **インタラクティブ層 (400番台)**: 高度な対話機能・詳細表示

### Active機能管理ルール
- **機能確定**: 実装対象として確定済みの機能のみ
- **実装保証**: Builder/Validatorの作業対象
- **番号固定**: カテゴリ番号による体系的管理
- **Draft機能**: `pilots/` ディレクトリで実験・検証後に昇格

## 🎯 品質基準

### 記録すべき内容
- **機能概要**: 何ができるかの明確な説明
- **技術仕様**: 実装技術・依存関係
- **使用方法**: ユーザー・開発者向けの使用手順
- **制限事項**: 既知の問題・制限・注意点
- **改善予定**: 将来的な改善・拡張計画

### 記録しない内容
- **実装詳細**: コードレベルの詳細（supplementary/に記載）
- **設計の全体図**: 機能をどう組み合わせるか（blueprints/に記載）
- **実験的機能**: Draft段階の機能（pilots/に記載）

## 🔗 他ディレクトリとの関係

### pilots/との関係
- **実験機能**: pilots/でDraft機能を実験・検証
- **昇格プロセス**: 成熟したDraft機能の受け入れ先
- **設計継承**: パイロット機能の設計を正式採用

### supplementary/との関係
- **実装詳細**: supplementary/で技術実装の詳細管理
- **機能概要**: functions/でユーザー視点の機能説明

### blueprints/との関係
- **システム設計**: blueprints/でシステム全体の設計・アーキテクチャ
- **機能仕様**: functions/で個別機能の詳細仕様

## ⚠️ 注意事項

### 重複防止
- **1機能1ファイル**: 同じ機能について複数ファイル禁止
- **最新情報**: 古い情報は削除・更新し最新状態を保持
- **明確な境界**: 機能の境界を明確に定義

### 品質保証
- **文書品質**: 第三者が理解できる明確な記述

---

**理念**: 明確な機能仕様により、実装の指針と品質基準を提供する