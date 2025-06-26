# Code Guides - 実装ガイド集

**作成日**: 2025年6月26日  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの実装コード例・ガイドライン管理

## 📋 概要

code-guidesディレクトリは、cctopプロジェクトの実装時に参考となるコード例やガイドラインを管理します。BlueprintやFUNCTIONS仕様書では抽象的すぎる具体的な実装例を提供します。

## 📝 配置基準

### ここに配置するもの
- 具体的な実装コード例
- アーキテクチャパターンの実装例
- エラーハンドリングの実装例
- 設定管理の実装例
- テストコードの実装例

### ここに配置しないもの
- 高レベルな設計図（→ blueprints/）
- 機能仕様（→ functions/）
- 技術仕様（→ specifications/）
- 実際のソースコード（→ cctop/src/）

## 📁 現在のファイル一覧

| ファイル | 内容 | 関連仕様 |
|---------|------|----------|
| CG-001-event-processor-implementation.md | Event Processor実装ガイド | FUNC-002 |
| CG-002-config-manager-implementation.md | 設定管理実装ガイド | FUNC-010/011 |
| CG-003-database-schema-implementation.md | データベーススキーマ実装 | FUNC-000 |

## 🔗 他ディレクトリとの関係

### blueprints/との関係
- **Blueprints**: 全体の実装計画（何を作るか）
- **Code Guides**: 具体的な実装方法（どう作るか）

### functions/との関係
- **Functions**: 機能仕様（ユーザー視点）
- **Code Guides**: 実装詳細（開発者視点）

### specifications/との関係
- **Specifications**: 技術仕様・設計
- **Code Guides**: 実装例・コードサンプル

## ⚠️ 注意事項

- コード例は動作確認済みのものを掲載
- バージョン情報を明記（Node.js、ライブラリ等）
- 関連するFUNC番号を必ず記載

---

**理念**: 仕様と実装のギャップを埋める具体的なガイドを提供する