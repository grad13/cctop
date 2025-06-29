---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250624-002-documents-reorganization.md
Keywords: documents-reorganization, architect-agent, plan-placement, visions-blueprints, records-plans, classification-guidelines, technical-documents, implementation-plans, strategic-plans, file-migration, p047-protocol, document-structure
---

# cctop Documents資料整理計画書

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**目的**: documents/構造の最適化とPLAN-20250624-001の適切な配置

## 🎯 問題分析

### 現在の問題点
1. **実装計画書の配置ミス**: `PLAN-20250624-001-v0100-implementation.md`が`records/plans/`に配置
2. **文書分類の曖昧性**: 実装計画と戦略計画の境界が不明確
3. **重複する役割**: `records/plans/`と`visions/blueprints/`の使い分けが曖昧

### 配置原則の確立必要性
- 技術文書の一貫した分類体系
- Architect Agent権限範囲の明確化
- 将来の文書配置基準の確立

## 📊 現在の文書配置分析

### visions/specifications/ (技術仕様)
- **目的**: 現在のシステム仕様・定義
- **内容**: アーキテクチャ、データモデル、API仕様
- **更新**: Architect主導、実装反映はBuilderと連携

### visions/blueprints/ (戦略計画)
- **目的**: プロジェクト全体の戦略的計画・方針決定
- **内容**: 開発戦略、技術方針、プロジェクト方向性
- **更新**: Architect主導、戦略レベル意思決定

### visions/blueprints/ (実装計画)
- **目的**: 具体的な実装計画・実装詳細
- **内容**: 実装手順、技術実装詳細、開発計画
- **更新**: Architect/Builder協調、実装レベル計画

### records/plans/ (プロジェクト計画)
- **目的**: 大規模プロジェクト計画・移行計画・改善計画
- **内容**: 実行前の計画書管理（承認制）
- **主管**: Architect Agent（計画立案）

## 🏗️ 最適化計画

### Phase 1: PLAN-20250624-001の適切な配置

**配置判定**:
- **現在**: `records/plans/PLAN-20250624-001-v0100-implementation.md`
- **適切**: `visions/blueprints/imp011-v0100-implementation-plan.md`
- **理由**: 具体的な実装計画であり、visions/blueprints/の命名規則に従うべき

**移行手順**:
1. `visions/blueprints/`ディレクトリ確認
2. 命名規則に従いファイル名変更
3. 既存ファイルの移動
4. README.md更新（両方の場所）

### Phase 2: implements/ディレクトリの整備

**現状確認**: `visions/blueprints/`の構造と命名規則
**統一基準策定**: imp001-imp999の連番システム確立
**重複回避**: roadmaps/との明確な境界設定

### Phase 3: 文書分類ガイドライン策定

**判定基準**:
- **roadmaps/**: 戦略方針・長期計画（What to build, Why）
- **implements/**: 具体的実装計画（How to build, When）
- **specifications/**: 現在の仕様・定義（What it is）
- **records/plans/**: 組織的・プロセス改善計画

## 📋 実装詳細

### Step 1: visions/blueprints/構造確認
```bash
ls -la /Users/takuo-h/Workspace/Code/06-cctop/documents/visions/blueprints/
```

### Step 2: 命名規則準拠のファイル名決定
- **原題**: `PLAN-20250624-001-v0100-implementation.md`
- **新名**: `imp011-v0100-implementation-plan.md`
- **理由**: 
  - imp011: implements/の連番
  - v0100: バージョン明記
  - implementation-plan: 内容の明確化

### Step 3: ファイル移動と更新
1. ファイル内容の最終確認
2. 新ディレクトリへの移動
3. 参照リンクの更新確認
4. README.md更新（records/plans/, visions/blueprints/）

### Step 4: 文書分類ガイドライン作成
- 新プロトコル策定: `P047-technical-documents-classification.md`
- 判定フローチャート作成
- 全Agentへの周知（passage/handoffs/経由）

## 🎯 期待効果

### 短期効果
1. **PLAN-20250624-001の適切配置**: 技術実装計画として正しい位置
2. **検索性向上**: 実装計画が`visions/blueprints/`で統一
3. **Architect権限明確化**: 技術文書の責任範囲が明確

### 長期効果
1. **文書配置の一貫性**: 将来の文書作成時の迷い解消
2. **Agent協調の効率化**: 文書の役割分担が明確
3. **メンテナンス性向上**: 構造的な文書管理の実現

## ⚠️ リスクと対策

### リスク1: 参照リンク切れ
**対策**: 移動前に参照箇所の確認・更新

### リスク2: 他Agentの混乱
**対策**: 文書分類ガイドライン策定・passage/handoffs/での周知

### リスク3: 過度な分類細分化
**対策**: シンプルで実用的な分類基準の維持

## 📝 次のステップ

1. **implements/ディレクトリ確認**: 現状と命名規則の確認
2. **ファイル移動実行**: PLAN-20250624-001の適切配置
3. **README.md更新**: 両方のディレクトリの更新
4. **分類ガイドライン策定**: P047プロトコル作成
5. **他Agent周知**: 新しい分類基準の共有

---

**承認**: この計画の実行には以下の確認が必要
- [ ] ユーザーによる方針承認
- [ ] implements/ディレクトリ構造確認
- [ ] 移動対象ファイルの最終確認