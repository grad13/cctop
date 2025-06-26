# Functions - Active機能仕様管理

**最終更新**: 2025年6月26日  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの**Active**機能仕様管理  

## 📋 概要

functionsディレクトリは、**Active**ステータスの確定機能仕様のみを管理します。ここに含まれる機能は実装対象として確定しており、Builder/Validatorの作業対象となります。

**Draft機能**: 実験段階の機能は `pilots/` ディレクトリで管理

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

## 📁 現在のファイル一覧

### 0-Core Functions
| ファイル | 機能 |
|---------|------|
| FUNC-000-sqlite-database-foundation.md | SQLiteデータベース基盤 |
| FUNC-001-file-lifecycle-tracking.md | ファイルライフサイクル追跡 |
| FUNC-002-chokidar-database-integration.md | chokidar-Database統合監視 |

### 1-Configuration & Settings
| ファイル | 機能 | ステータス |
|---------|------|----------|
| ~~FUNC-100-local-global-storage-management.md~~ | ~~ローカル・グローバル設定管理~~ | **Deprecated** |
| FUNC-101-hierarchical-config-management.md | 階層的設定管理 | Active |
| FUNC-102-file-watch-limit-management.md | ファイル監視上限管理 | Active |
| ~~FUNC-103-postinstall-auto-initialization.md~~ | ~~postinstall自動初期化~~ | **Deprecated** |
| FUNC-104-cli-interface-specification.md | CLIインターフェース統合仕様 | Active |
| **FUNC-105-local-setup-initialization.md** | **ローカル設定・初期化** | **Active** |

### 2-View & Display
| ファイル | 機能 |
|---------|------|
| FUNC-200-east-asian-width-display.md | East Asian Width対応表示 |
| FUNC-201-double-buffer-rendering.md | 二重バッファ描画 |
| FUNC-202-cli-display-integration.md | CLI表示統合 |
| FUNC-203-event-type-filtering.md | イベントタイプフィルタリング |
| FUNC-204-responsive-directory-display.md | レスポンシブディレクトリ表示 |
| FUNC-205-status-display-area.md | ステータス表示エリア |

### 3-Extension
| ファイル | 機能 |
|---------|------|
| FUNC-300-background-activity-monitor.md | バックグラウンド監視モード |

## 📊 管理方針

### バージョン管理
- **1機能1ファイル**: 機能毎に独立したファイル
- **継続更新**: 機能の進化・改善を同一ファイルで追跡
- **履歴保持**: 機能の発展履歴を記録

### カテゴリ体系
- **Core (000番台)**: 基盤機能
- **Configuration (100番台)**: 設定・初期化機能
- **View (200番台)**: 表示・UI機能
- **Extension (300番台)**: 拡張・プラグイン機能

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
- **実装詳細**: コードレベルの詳細（code-guides/に記載）
- **設計の全体図**: 機能をどう組み合わせるか（blueprints/に記載）
- **実験的機能**: Draft段階の機能（pilots/に記載）

## 🔗 他ディレクトリとの関係

### pilots/との関係
- **実験機能**: pilots/でDraft機能を実験・検証
- **昇格プロセス**: 成熟したDraft機能の受け入れ先
- **設計継承**: パイロット機能の設計を正式採用

### code-guides/との関係
- **実装詳細**: code-guides/で技術実装の詳細管理
- **機能概要**: functions/でユーザー視点の機能説明

### blueprints/との関係
- **実装計画**: blueprints/でActive機能の実装ロードマップ
- **実績記録**: functions/で完成済み機能の記録

## ⚠️ 注意事項

### 重複防止
- **1機能1ファイル**: 同じ機能について複数ファイル禁止
- **最新情報**: 古い情報は削除・更新し最新状態を保持
- **明確な境界**: 機能の境界を明確に定義

### 品質保証
- **文書品質**: 第三者が理解できる明確な記述

## 📝 更新履歴

### 2025年6月26日
- **構造改革**: functions/をActive機能専用に変更
- **pilots/新設**: Draft機能の専用管理ディレクトリ作成
- **Active機能確定**: 14機能をActive機能として管理
  - Core: FUNC-000,001,002
  - Configuration: FUNC-100,101,102,103,104
  - View: FUNC-200,201,202,203,204,205
  - Extension: FUNC-300 - バックグラウンド監視モード
- **Draft機能分離**: FUNC-900,901,903,904をpilots/に移行
- **管理方針変更**: Active/Draft混在問題の構造的解決

### 2025年6月25日
- Core Functions再編成（FUNC-000〜004）
- カテゴリ別整理（Core/Configuration/View/Extension）
- 番号体系変更（100番台でカテゴリ分類）

---

**理念**: 明確な機能仕様により、実装の指針と品質基準を提供する