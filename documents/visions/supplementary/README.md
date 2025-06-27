# Supplementary - 補助資料集

**最終更新**: 2025年6月27日  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの実装支援・設計補助資料管理  

## 📋 概要

supplementaryディレクトリは、主要仕様書（functions/pilots/blueprints）を補完する実装支援資料を管理します。具体的な実装ガイドから技術図表まで、開発に必要な補助資料を統合管理します。

## 📝 配置基準

### ここに配置するもの
- 具体的な実装コード例・ガイドライン
- システム図表・フロー図・アーキテクチャ図
- 技術仕様の視覚化資料
- エラーハンドリング・テストコードの実装例
- 設計パターンの実装例

### ここに配置しないもの
- 高レベルな設計図（→ blueprints/）
- 機能仕様（→ functions/）
- 実験的機能仕様（→ pilots/）
- 実際のソースコード（→ cctop/src/）

## 📁 命名規則

### プレフィックス体系
```
CG-XXX-implementation-topic.md    # Code Guide (実装ガイド)
DG-XXX-diagram-topic.md           # Diagram (図表・視覚資料)

例:
CG-001-event-processor-implementation.md
CG-002-config-manager-implementation.md
DG-001-file-lifecycle-state.md
DG-002-system-architecture.md
```

### ヘッダー形式
```
作成日: YYYY年MM月DD日 HH:MM
更新日: YYYY年MM月DD日 HH:MM
作成者: Agent名
タイプ: Code Guide / Diagram
関連仕様: FUNC-XXX, BP-XXX
```

**重要**: 作成日・更新日には**必ず時間（HH:MM）**を含めてください。

## 📁 現在のファイル一覧

### Code Guides - 実装ガイド
| ファイル | 内容 | 関連仕様 |
|---------|------|----------|
| CG-001-event-processor-implementation.md | Event Processor実装ガイド | FUNC-002 |
| CG-002-config-manager-implementation.md | Config Manager実装ガイド | FUNC-101 |
| CG-003-database-schema-implementation.md | Database Schema実装ガイド | FUNC-000 |
| CG-004-color-customization-implementation.md | 色カスタマイズ実装ガイド | FUNC-207 |

### Diagrams - 図表・視覚資料
| ファイル | 内容 | 関連仕様 |
|---------|------|----------|
| DG-001-file-lifecycle-state.md | ファイルライフサイクル状態遷移図 | FUNC-001 |

## 📊 管理方針

### 実装ガイド（CG）
- **具体性重視**: 実装時に直接参照できるコード例
- **実用性確保**: 実際の開発で使用可能な実装例
- **保守性**: 仕様変更に応じた継続的更新

### 図表資料（DG）
- **視覚化**: 複雑な技術仕様の理解促進
- **Mermaid優先**: 可能な限りMermaid形式で作成
- **バージョン管理**: 仕様変更に応じた図表更新

### 品質基準
- **関連仕様明記**: 対応するFUNC/BP番号の明記
- **定期見直し**: 仕様変更時の即座更新
- **実装準拠**: 実際のコードとの一貫性確保

## 🔗 他ディレクトリとの関係

### functions/との関係
- **実装支援**: Active機能の具体的実装方法
- **技術詳細**: 機能仕様を補完する技術情報

### pilots/との関係
- **実験支援**: Draft機能の実装アプローチ検証
- **技術検証**: パイロット機能の実現可能性確認

### blueprints/との関係
- **設計補完**: 実装計画書の技術詳細補完
- **視覚化**: 全体設計の図解・フロー図

## ⚠️ 注意事項

### 重複防止
- **統合管理**: 類似する実装ガイドの統合
- **明確な境界**: code-guides と diagrams の責務分離
- **最新情報**: 古い実装例の削除・更新

### 品質保証
- **実装準拠**: 実際のコードとの一貫性維持
- **定期更新**: 仕様変更時の即座反映
- **第三者理解**: 新規開発者でも理解できる記述

## 📝 更新履歴

### 2025年6月27日
- **supplementary/新設**: code-guides + diagrams 統合
- **命名体系統一**: CG-XXX (Code Guide) + DG-XXX (Diagram) 
- **既存資料統合**: 4ファイルの統一管理開始
- **責務明確化**: 実装支援資料の一元管理

---

**理念**: 実装を支援する具体的で実用的な補助資料により、開発効率と品質を向上させる