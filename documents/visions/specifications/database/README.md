# Database Specifications

データベース関連の仕様書を管理します。

## ファイル一覧

- **db001-schema-design.md**: データベーススキーマ設計
- **db002-triggers-indexes.md**: トリガー・インデックス仕様
- **db003-queries-views.md**: クエリ・ビュー仕様
- **db004-implementation-guide.md**: 実装ガイド
- **db005-directory-placement.md**: ディレクトリ配置設計
- **db006-period-statistics.md**: 期間統計仕様

## 命名規則

- **db001-db999**: データベース関連仕様書
- 機能別プレフィックス + 3桁連番 + 簡潔な英語タイトル

## ⚠️ 重要：重複index作成禁止

**他Agentへの重要な指示**：
- **このREADME.mdが既に存在するため、追加のindex/overview/summary ファイルを作成してはいけません**
- **既存README.mdを読んだ後は、内容追加・更新はREADME.mdに直接編集すること**
- **「db000-overview.md」「index.md」「summary.md」等の作成は絶対禁止**
- **新仕様書は必ずdb007-, db008-等の連番で作成すること**

### 正しい作業手順
1. README.md読了後、新規仕様書作成の場合は次の連番を使用
2. ディレクトリ概要更新の場合は、このREADME.mdを直接編集
3. 概要・索引的内容の重複作成は一切禁止