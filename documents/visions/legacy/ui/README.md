# UI Specifications

CLI UI関連の仕様書を管理します。

## ファイル一覧

- **ui001-cli-baseline.md**: CLI UIベースライン仕様
- **ui002-stream-display.md**: ストリーム表示仕様
- **ui003-detail-view.md**: 詳細表示仕様  
- **ui004-search-feature.md**: 検索機能仕様
- **ui005-configuration.md**: UI設定仕様
- **ui006-rendering-update.md**: レンダリング更新仕様
- **ui007-relative-path-display.md**: 相対パス表示仕様
- **ui008-cli-ui-design.md**: CLI UI新設計仕様

## 命名規則

- **ui001-ui999**: CLI UI関連仕様書
- 機能別プレフィックス + 3桁連番 + 簡潔な英語タイトル

## ⚠️ 重要：重複index作成禁止

**他Agentへの重要な指示**：
- **このREADME.mdが既に存在するため、追加のindex/overview/summary ファイルを作成してはいけません**
- **既存README.mdを読んだ後は、内容追加・更新はREADME.mdに直接編集すること**
- **「ui001-overview.md」「index.md」「summary.md」等の作成は絶対禁止**
- **新仕様書は必ずui009-, ui010-等の連番で作成すること**

### 正しい作業手順
1. README.md読了後、新規仕様書作成の場合は次の連番を使用
2. ディレクトリ概要更新の場合は、このREADME.mdを直接編集
3. 概要・索引的内容の重複作成は一切禁止