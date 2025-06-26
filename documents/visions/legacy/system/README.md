# System Architecture Specifications

システム全体のアーキテクチャ仕様書を管理します。

## ファイル一覧

- **a001-directory-structure.md**: プロジェクトディレクトリ構造設計
- **a002-configuration-system.md**: 設定システム仕様
- **a003-cache-strategy.md**: キャッシュ戦略仕様
- **a004-cache-system-design.md**: キャッシュシステム詳細設計
- **a005-configuration-system-specification-v2.md**: 設定システム仕様v2
- **a006-integration-architecture-specification.md**: 統合アーキテクチャ仕様
- **a007-configuration-api-reference.md**: 設定API仕様

## 命名規則

- **a001-a999**: システムアーキテクチャ関連仕様書
- 機能別プレフィックス + 3桁連番 + 簡潔な英語タイトル

## ⚠️ 重要：重複index作成禁止

**他Agentへの重要な指示**：
- **このREADME.mdが既に存在するため、追加のindex/overview/summary ファイルを作成してはいけません**
- **既存README.mdを読んだ後は、内容追加・更新はREADME.mdに直接編集すること**
- **「a000-overview.md」「index.md」「summary.md」等の作成は絶対禁止**
- **新仕様書は必ずa008-, a009-等の連番で作成すること**

### 正しい作業手順
1. README.md読了後、新規仕様書作成の場合は次の連番を使用
2. ディレクトリ概要更新の場合は、このREADME.mdを直接編集
3. 概要・索引的内容の重複作成は一切禁止