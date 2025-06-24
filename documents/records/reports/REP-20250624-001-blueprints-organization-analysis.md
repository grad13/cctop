# blueprints ディレクトリ組織分析レポート

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**目的**: visions/blueprints/内19ファイルの関係性整理と統合計画

## 📊 ファイル分析結果

### 全19ファイル一覧
1. **PLAN-20250624-001-v0100-implementation.md** - v0.1.0.0実装計画（Builder, 2025-06-24）
2. **imp001-cli-ui-plan.md** - CLI UI実装計画（Inspector, 2025-06-21）
3. **imp002-feature-priority.md** - 機能優先度計画（Inspector, 2025-06-22）
4. **imp003-config-improvement.md** - 設定改善計画（Architect, 2025-06-22）
5. **imp004-cache-improvement.md** - キャッシュ改善計画（Inspector, 2025-06-22）
6. **imp005-v3-phased-development.md** - v3段階開発計画（Inspector, 2025-06-22）
7. **imp006-phase1-detailed.md** - Phase1詳細計画（Inspector, 2025-06-22）
8. **imp007-phase2-data-separation.md** - Phase2データ分離計画
9. **imp008-integration-planning.md** - 統合計画
10. **imp009-project-roadmap.md** - プロジェクトロードマップ（Architect, 2025-06-22）
11. **imp010-phase1-basic-monitoring.md** - Phase1基本監視計画（Builder, 2025-06-22）
12. **r001-cctop-v4-development-roadmap.md** - v4開発ロードマップ（Inspector, 2025-06-22）
13. **r002-chokidar-db-test-design.md** - chokidar-DBテスト設計（Builder, 2025-06-22）
14. **r003-block-count-specification.md** - block_count仕様（Builder, 2025-06-22）
15. **vis004-cctop-core-features-vision.md** - 核心機能ビジョン（Architect, 2025-06-23）
16. **vis005-monitor-foundation-vision.md** - Monitor基盤ビジョン（Architect, 2025-06-23）
17. **vis006-metrics-plugin-system-vision.md** - メトリクスプラグインビジョン
18. **vis007-tracer-analysis-vision.md** - Tracerビジョン（Architect, 2025-06-23）
19. **vis008-viewer-innovations-vision.md** - Viewerビジョン

## 🔍 関係性分析

### 1. バージョン別分類

#### **cctop v4.0.0関連** (ビジョン・長期計画)
- **vis004-008**: v4.0.0核心機能ビジョン群（統合済み）
- **r001**: v4開発ロードマップ（RDD方式）
- **imp009**: プロジェクトロードマップ（重複）

#### **cctop v0.1.0.0関連** (即座実装)
- **PLAN-20250624-001**: v0.1.0.0実装計画（最新・最重要）
- **imp010**: Phase1基本監視計画（v0.1.0.0のPhase1）

#### **surveillance v3関連** (過去プロジェクト)
- **imp005-006**: v3段階開発計画（Inspector作成、完了済み？）

### 2. 機能別分類

#### **Phase1実装関連** (重複多数)
- **PLAN-20250624-001**: v0.1.0.0全体実装計画
- **imp006**: Phase1詳細計画
- **imp010**: Phase1基本監視計画
- **r002**: chokidar-DBテスト設計

#### **UI・表示関連**
- **imp001**: CLI UI実装計画
- **vis007**: Tracerビジョン（Selection/Detailモード）
- **vis008**: Viewerビジョン

#### **システム基盤関連**
- **imp003**: 設定改善計画
- **imp004**: キャッシュ改善計画
- **vis005**: Monitor基盤ビジョン
- **r003**: block_count仕様

## 🚨 重大な問題発見

### 1. **深刻な重複・混乱**

#### **Phase1実装計画の重複**
- **PLAN-20250624-001** (2025-06-24, Builder): v0.1.0.0実装計画
- **imp010** (2025-06-22, Builder): Phase1基本監視計画
- **imp006** (2025-06-22, Inspector): Phase1詳細計画

**問題**: 同じPhase1について3つの異なる計画が存在、どれが有効か不明

#### **ロードマップの重複**
- **r001**: cctop v4開発ロードマップ（Inspector, RDD方式）
- **imp009**: プロジェクトロードマップ（Architect, 同じRDD言及）
- **imp005**: surveillance v3開発ロードマップ（Inspector, ほぼ同内容）

**問題**: 同一内容のロードマップが3つ存在、バージョン管理が不明確

### 2. **バージョン混乱**
- v3, v4.0.0, v0.1.0.0が混在
- surveillance v3 vs cctop v4の関係が不明
- 実際に実装すべきバージョンが不明確

### 3. **時系列の混乱**
- 古い計画（imp005-006）と新しい計画（PLAN-20250624-001）の関係
- 完了済み・進行中・計画中の区別なし

## 📋 統合・整理提案

### Phase 1: 緊急統合（即座実行）

#### **A. 有効な計画の一元化**
**結論**: `PLAN-20250624-001-v0100-implementation.md`を唯一の有効計画として確立

**理由**:
- 最新作成（2025-06-24）
- 最も具体的・詳細
- specifications参照（db001, ui001, a002等）が明確
- 7日間実装計画が現実的

**廃止対象**:
- imp006-phase1-detailed.md → Phase1詳細はPLAN-20250624-001に統合済み
- imp010-phase1-basic-monitoring.md → 重複内容、PLAN-20250624-001が上位互換

#### **B. ロードマップの一元化**
**結論**: `r001-cctop-v4-development-roadmap.md`を戦略ロードマップとして維持

**廃止対象**:
- imp009-project-roadmap.md → r001と重複
- imp005-v3-phased-development.md → surveillance v3は完了済み

### Phase 2: ビジョン統合（中期）

#### **統合済みビジョンの確認**
- vis004-008: 既にv4.0.0核心機能として統合済み
- これらは将来実装のビジョンとして保持

#### **機能別ビジョンと実装計画の分離**
- ビジョン（vis004-008）: 将来の理想像
- 実装計画（PLAN-20250624-001）: 現在の具体作業
- 明確に分離維持

### Phase 3: アーカイブ整理（低優先）

#### **完了済み・不要ファイルの移動**
```
documents/archives/blueprints-legacy/
├── surveillance-v3/
│   ├── imp005-v3-phased-development.md
│   └── imp006-phase1-detailed.md
├── duplicate-roadmaps/
│   ├── imp009-project-roadmap.md
│   └── imp010-phase1-basic-monitoring.md
└── config-cache-legacy/
    ├── imp003-config-improvement.md
    └── imp004-cache-improvement.md
```

## 🎯 統合後の理想構造

### blueprints/ 構成（7ファイルに削減）
```
blueprints/
├── PLAN-20250624-001-v0100-implementation.md  # 📍現在の実装計画
├── r001-cctop-v4-development-roadmap.md       # 🗺️ 戦略ロードマップ
├── r002-chokidar-db-test-design.md            # 🧪 テスト設計
├── r003-block-count-specification.md          # 📊 仕様詳細
├── imp001-cli-ui-plan.md                      # 🖥️ UI実装計画
├── vis004-cctop-core-features-vision.md       # 🎯 統合ビジョン
└── vis007-tracer-analysis-vision.md           # 🔍 Tracerビジョン
```

### 分類原則
- **1つのトピックに1つのファイル**
- **最新が最優先** - 古い計画は即座にアーカイブ
- **具体性重視** - 抽象的ビジョンより実装可能計画

## ⚠️ 緊急対応必要事項

### 1. PLAN-20250624-001の確立
- 他の重複計画を無効化
- progress/に実装進捗管理を開始

### 2. 不要ファイルの即座移動
- imp006, imp010の重複解消
- imp005（surveillance v3）のアーカイブ化

### 3. Version 0.1.0.0実装開始
- PLAN-20250624-001に従った実装開始
- 他の計画への混乱を防止

## 📝 次のアクション

1. **緊急**: 重複計画の廃止・アーカイブ移動
2. **即座**: PLAN-20250624-001を唯一有効計画として確立
3. **開始**: progress/での実装進捗管理開始
4. **整理**: blueprints/を7ファイルに整理完了

---

**結論**: 現在のblueprints/は重複と混乱の状態。PLAN-20250624-001を中心とした緊急整理が必要。