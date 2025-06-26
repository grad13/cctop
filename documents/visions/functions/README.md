# Functions - 機能仕様カタログ

**最終更新**: 2025年6月26日  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの機能仕様管理  

## 📋 概要

functionsディレクトリは、cctopプロジェクトの機能仕様を管理します。各機能の詳細な仕様・実装ガイドライン・テスト要件を記載し、実装の指針となります。

## 📝 命名規則

```
FUNC-XXX-functional-description.md

例:
FUNC-001-file-monitoring-core.md
FUNC-002-cli-display-system.md
FUNC-003-configuration-management.md
```

### ヘッダー形式

以下をヘッダーに追加する：
```
作成日: YYYY年MM月DD日 HH:MM
更新日: YYYY年MM月DD日 HH:MM
作成者: Agent名
ステータス: Active/Draft/Deprecated
対象バージョン: X.X.X.X
```

## 📁 現在のファイル一覧

### 0-Core Functions
| ファイル | 機能 | ステータス |
|---------|------|-----------|
| FUNC-000-sqlite-database-foundation.md | SQLiteデータベース基盤 | Active |
| FUNC-001-file-lifecycle-tracking.md | ファイルライフサイクル追跡 | Active |
| FUNC-002-chokidar-database-integration.md | chokidar-Database統合監視 | Active |

### 1-Configuration & Settings
| ファイル | 機能 | ステータス |
|---------|------|-----------|
| FUNC-010-local-global-storage-management.md | ローカル・グローバル設定管理 | Active |
| FUNC-011-hierarchical-config-management.md | 階層的設定管理 | Active |
| FUNC-012-file-watch-limit-management.md | ファイル監視上限管理 | Active |
| FUNC-013-postinstall-auto-initialization.md | postinstall自動初期化 | Active |

### 2-View & Display
| ファイル | 機能 | ステータス |
|---------|------|-----------|
| FUNC-020-east-asian-width-display.md | East Asian Width対応表示 | Active |
| FUNC-021-double-buffer-rendering.md | 二重バッファ描画 | Active |
| FUNC-022-cli-display-integration.md | CLI表示統合 | Active |
| FUNC-023-event-type-filtering.md | イベントタイプフィルタリング | Active |
| FUNC-024-responsive-directory-display.md | レスポンシブディレクトリ表示 | Active |
| FUNC-900-display-color-customization.md | 表示色カスタマイズ | Draft |

### 3-Extension
| ファイル | 機能 | ステータス |
|---------|------|-----------|
| FUNC-901-plugin-architecture.md | プラグインアーキテクチャ | Draft |

## 📊 管理方針

### バージョン管理
- **1機能1ファイル**: 機能毎に独立したファイル
- **継続更新**: 機能の進化・改善を同一ファイルで追跡
- **履歴保持**: 機能の発展履歴を記録

### カテゴリ体系
- **Core (000番台)**: 基盤機能
- **Configuration (010番台)**: 設定・初期化機能
- **View (020番台)**: 表示・UI機能
- **Extension (030番台)**: 拡張・プラグイン機能

### 新規FUNC作成ルール
- **番号割当**: 900番台から作成（現在の最新: 901）
- **初期ステータス**: 必ず「Draft」で開始
- **番号進行**: 902, 903, 904... と順次割当
- **カテゴリ昇格**: 機能が確定したら適切な番号帯に移動

## 🎯 品質基準

### 記録すべき内容
- **機能概要**: 何ができるかの明確な説明
- **技術仕様**: 実装技術・依存関係
- **使用方法**: ユーザー・開発者向けの使用手順
- **制限事項**: 既知の問題・制限・注意点
- **改善予定**: 将来的な改善・拡張計画

### 記録しない内容
- **実装詳細**: コードレベルの詳細（specifications/に記載）
- **設計の全体図**: 機能をどう組み合わせるか（blueprints/に記載）
- **進捗情報**: 実装進捗（progress/に記載）

## 🔗 他ディレクトリとの関係

### specifications/との関係
- **技術詳細**: specifications/で技術仕様を詳細管理
- **機能概要**: functions/でユーザー視点の機能説明

### progress/との関係
- **進捗記録**: progress/で実装過程を記録
- **成果記録**: functions/で完成した機能を記録

### blueprints/との関係
- **設計図**: blueprints/で将来の機能設計
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
- FUNC番号体系を整理（000/010/020/900番台）
- 新規FUNC作成ルール追加（900番台から開始、Draft必須）
- FUNC-024追加：レスポンシブディレクトリ表示機能
- FUNC文書内の相互参照を修正

### 2025年6月25日
- Core Functions再編成（FUNC-000〜004）
- カテゴリ別整理（Core/Configuration/View/Extension）
- 番号体系変更（100番台でカテゴリ分類）

---

**理念**: 明確な機能仕様により、実装の指針と品質基準を提供する