---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250624-008-v0100-specifications-consolidation.md
Keywords: specifications-consolidation, duplicate-removal, file-reorganization, technical-catalog, config-system-unification, cache-system-unification, roadmap-consolidation, quality-improvement, reference-integrity, single-source-of-truth, implementation-optimization, architect-agent, document-management
---

# PLAN-20250624-008: specifications/統廃合計画書

**Plan ID**: PLAN-20250624-008  
**Version**: v0100  
**Date**: 2025年6月24日  
**Author**: Architect Agent  
**Status**: Active  
**Purpose**: documents/visions/specifications/を真の「技術部品カタログ」に再構成

## 🎯 計画概要

**目標**: 重複・配置ミス・品質問題を解消し、specifications/を高品質な技術部品カタログとして機能させる

**現状**: 49ファイル（重複8件、配置ミス5件、項目外1件）  
**目標**: 約42ファイル（統合済み・配置正常化・品質向上）

## 🔍 問題分析結果

### 1. 配置ミス（カテゴリ違反: 5件）

**system/ディレクトリの配置違反**:
- `system/imp003-config-improvement.md` → implementation/計画
- `system/imp004-cache-improvement.md` → implementation/計画  
- `system/r003-block-count-specification.md` → roadmaps/仕様計画

**development/ディレクトリの配置違反**:
- `development/r002-chokidar-db-test-design.md` → roadmaps/テスト設計

**specifications/構造違反**:
- `specifications/visions/` → documents/visions/直下（blueprints/と同レベル）

### 2. 重複内容（統合対象: 8件→3件）

**設定システム関連（4件重複）**:
- `system/a002-configuration-system.md` (Inspector作成)
- `system/a005-configuration-system-specification-v2.md` (Architect作成・最新) 
- `system/a007-configuration-api-reference.md` (Architect作成)
- `config/config001-management.md`

**キャッシュシステム関連（2件重複）**:
- `system/a003-cache-strategy.md` (Inspector作成)
- `system/a004-cache-system-design.md` (Inspector作成・包括的)

**ロードマップ関連（2件重複）**:
- `implementation/imp009-project-roadmap.md` (Architect作成)
- `roadmaps/r001-cctop-v4-development-roadmap.md` (Inspector作成・詳細)

### 3. 項目外コンテンツ（1件）

**cctop無関係**:
- `roadmaps/imp005-v3-phased-development.md` → 「Surveillance v3」関連

## 📋 実行計画（4フェーズ）

### Phase 1: ファイル移動（カテゴリ整理） 🔥最高優先

**1.1 system/からの移動**:
```
system/imp003-config-improvement.md → implementation/imp003-config-improvement.md
system/imp004-cache-improvement.md → implementation/imp004-cache-improvement.md  
system/r003-block-count-specification.md → roadmaps/r003-block-count-specification.md
```

**1.2 development/からの移動**:
```
development/r002-chokidar-db-test-design.md → roadmaps/r002-chokidar-db-test-design.md
```

**1.3 specifications/構造変更**:
```
specifications/visions/ → documents/visions/（specifications/と同レベル）
```

### Phase 2: 重複ファイル統合 🔥最高優先

**2.1 設定システム統合**:
- **統合後**: `system/a002-configuration-system-unified.md`
- **ベース**: a005-configuration-system-specification-v2.md（最新・実装準拠）
- **統合内容**: 
  - a002の基本コンセプト・設計思想
  - a007のAPI仕様・実装詳細
  - config001の優先順位設定・管理仕様
- **削除対象**: a002, a005, a007, config001
- **副作用**: config/ディレクトリ空になるため削除

**2.2 キャッシュシステム統合**:
- **統合後**: `system/a003-cache-system-unified.md`
- **ベース**: a004-cache-system-design.md（包括的設計）
- **統合内容**: a003の戦略的コンセプト・方針
- **削除対象**: a003, a004

**2.3 ロードマップ統合**:
- **統合後**: `roadmaps/r001-cctop-v4-roadmap-unified.md`
- **ベース**: r001-cctop-v4-development-roadmap.md（詳細計画）
- **統合内容**: imp009のプロジェクト管理観点
- **削除対象**: imp009, r001

### Phase 3: 品質向上・アーカイブ 🟡中優先

**3.1 項目外コンテンツのアーカイブ**:
```
roadmaps/imp005-v3-phased-development.md → documents/archives/surveillance-legacy/
```

**3.2 README.md更新**:
- 各ディレクトリのREADME.mdを移動・統合に合わせて更新
- `system/README.md`: 未記載ファイル（a008等）の情報追加
- `implementation/README.md`: 移動ファイルの追加
- `roadmaps/README.md`: 移動・統合ファイルの更新

### Phase 4: 統合後の品質検証 🟡中優先

**4.1 統合ファイルの品質確認**:
- 内容の整合性・完全性チェック
- 重複排除・矛盾解消の確認
- 技術部品として必要十分な情報の確認

**4.2 参照整合性確認**:
- blueprints/からの参照リンク更新
- 他ドキュメントからの参照整合性確認

**4.3 命名規則・構造確認**:
- kebab-serial-case形式の遵守確認
- ディレクトリ構造の論理的整合性確認

## 📊 期待効果

### 量的改善:
- **ファイル数**: 49 → 約42（-7ファイル、14%削減）
- **重複**: 8ファイル → 3ファイル（統合済み）
- **配置ミス**: 5件 → 0件（完全解消）

### 質的改善:

**🔍 発見しやすさ向上**:
- カテゴリ境界の明確化により、適切な場所で技術部品を発見
- 重複排除により唯一の真実のソース（Single Source of Truth）を確立

**📝 理解しやすさ向上**:
- 重複・矛盾情報の排除により混乱を防止
- 統合により体系的で包括的な技術仕様を提供

**🔄 再利用しやすさ向上**:
- 高品質な統合仕様により実装時の参照が容易
- 一貫性のある技術部品により設計・実装の効率化

**🛠️ 実装しやすさ向上**:
- 実装準拠の最新仕様により実装ギャップを最小化
- API仕様等の詳細情報統合により実装時の迷いを排除

## ⚠️ 注意事項・リスク

### 実行時の注意:
1. **参照整合性**: 移動・統合時にblueprints/等からの参照リンク更新必須
2. **情報漏れ防止**: 統合時に重要情報の欠落がないよう慎重に実施
3. **段階的実行**: Phase1完了後にPhase2に進む（戻り不可な操作のため）

### 潜在リスク:
- **統合時の情報損失**: 複数Agent作成の異なる観点情報の統合時のリスク
- **参照切れ**: 外部からの参照リンクの見落としリスク

## 🎯 成功指標

1. **重複解消率**: 100%（8件→0件）
2. **配置正常化率**: 100%（5件→0件）
3. **技術部品品質**: 統合仕様が実装に直結する品質レベル
4. **検索効率**: 適切なカテゴリで技術部品を即座に発見可能

## 📅 実行スケジュール

**即座実行**: Phase 1（ファイル移動）
**同セッション**: Phase 2（重複統合）
**次セッション**: Phase 3-4（品質向上・検証）

---

**理念**: 重複・混乱を排除し、真に機能する技術部品カタログを実現する