---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250624-007-specifications-internal-reorganization.md
Keywords: specifications-structure, directory-reorganization, implementation-directory, roadmaps-directory, visions-directory, file-categorization, readme-creation, duplicate-elimination, reference-updating, metadata-cleanup, technical-components, management-efficiency
---

# specifications/ 内部整理計画書

**ファイル**: PLAN-20250624-007-specifications-internal-reorganization.md  
**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**目的**: documents/visions/specifications/ の構造整理・カテゴリ最適化  
**ステータス**: 計画書作成完了・実行承認待ち

## 📊 現状分析

### 問題点
- **specifications/直下に18個の未配置ファイル**が散在
- **カテゴリ不明瞭**: 実装計画・roadmap・visionが混在
- **重複可能性**: vis004とv004等の類似ファイル存在
- **管理困難**: 関連ファイルが分散し、発見・保守が困難

### 未配置ファイル分類
```
specifications/直下（18ファイル）:
├── 実装計画系（10ファイル）: imp001-imp010
├── roadmap系（3ファイル）: r001-r003  
├── vision系（5ファイル）: vis004-vis008
└── 既存サブディレクトリ（良好）: 6ディレクトリ
```

## 🎯 整理方針

### 基本原則
1. **機能別カテゴリ化**: 技術部品として明確に分類
2. **重複排除**: 類似・重複ファイルの統合
3. **参照関係保持**: 移動時のリンク破損防止
4. **段階的実施**: リスク最小化のため段階的移動

### 配置戦略
- **roadmap系** → 新規`roadmaps/`サブディレクトリ（specifications内）
- **vision系** → 新規`visions/`サブディレクトリ（specifications内）
- **実装計画系** → 新規`implementation/`サブディレクトリ
- **技術仕様系** → 適切な既存サブディレクトリ

## 📋 具体的整理計画

### Phase 1: 明確な移動対象（優先度：最高）

#### 1.1 roadmaps/サブディレクトリ作成・配置
```bash
# 新規作成：specifications/roadmaps/
r001-cctop-v4-development-roadmap.md → roadmaps/
imp005-v3-phased-development.md → roadmaps/
```
**理由**: roadmap系仕様書として specifications内で管理

#### 1.2 visions/サブディレクトリ作成・配置
```bash
# 新規作成：specifications/visions/
vis004-cctop-core-features-vision.md → visions/
vis005-monitor-foundation-vision.md → visions/
vis006-metrics-plugin-system-vision.md → visions/
vis007-tracer-analysis-vision.md → visions/
vis008-viewer-innovations-vision.md → visions/
```
**理由**: vision系技術仕様として specifications内で管理

### Phase 2: 既存サブディレクトリへの配置（優先度：高）

#### 2.1 system/への配置
```bash
imp003-config-improvement.md → system/
imp004-cache-improvement.md → system/
```
**理由**: 設定・キャッシュシステムは system/ カテゴリ

#### 2.2 ui/への配置
```bash
imp001-cli-ui-plan.md → ui/
```
**理由**: CLI UI実装計画は ui/ カテゴリ

#### 2.3 database/またはdevelopment/への配置
```bash
r002-chokidar-db-test-design.md → development/ (テスト設計)
r003-block-count-specification.md → system/ (システム仕様)
```
**理由**: 内容に応じた適切なカテゴリ配置

### Phase 3: 新サブディレクトリ検討（優先度：中）

#### 3.1 implementation/ディレクトリ作成
残りの実装戦略系ファイル用の新ディレクトリ：
```bash
# 新規作成：specifications/implementation/
imp002-feature-priority.md
imp006-phase1-detailed.md
imp007-phase2-data-separation.md
imp008-integration-planning.md
imp009-project-roadmap.md
imp010-phase1-basic-monitoring.md
→ implementation/
```
**理由**: 実装戦略は技術部品と異なるが、specifications内で管理価値あり

#### 3.2 README.md補完
```bash
# 不足しているREADME.md作成
config/README.md (作成)
installation/README.md (作成)
implementation/README.md (作成・新規)
roadmaps/README.md (作成・新規)
visions/README.md (作成・新規)
```

### Phase 4: メタデータ整理（優先度：低）

#### 4.1 重複排除
- **vis004 vs v004**: 内容比較し統合または分離
- **類似実装計画**: imp系ファイルの重複確認・統合

#### 4.2 参照リンク更新
- 移動により影響を受けるリンクの修正
- specifications/README.md の構成更新

## 🚀 実施手順

### Step 1: 事前調査（1-2時間）
1. **重複確認**: vis004とv004の内容詳細比較
2. **依存関係調査**: 移動対象ファイルの参照・被参照関係確認
3. **内容確認**: imp006-imp010の詳細内容把握

### Step 2: Phase 1実行（1時間）
1. **roadmaps/作成・移動**: specifications/roadmaps/作成、r001, imp005を配置
2. **visions/作成・移動**: specifications/visions/作成、vis004-vis008を配置
3. **README.md作成**: 新規ディレクトリのREADME.md作成

### Step 3: Phase 2実行（1時間）
1. **既存ディレクトリ配置**: system/, ui/, database/ への適切な配置
2. **ファイル内容確認**: 移動先での適切性確認
3. **README.md更新**: 各ディレクトリのファイル一覧更新

### Step 4: Phase 3実行（1-2時間）
1. **implementation/作成**: 新ディレクトリ作成とREADME.md作成
2. **残りファイル配置**: imp002, imp006-imp010 の配置
3. **補完README.md作成**: config/, installation/ のREADME.md

### Step 5: 最終確認（30分）
1. **specifications/README.md更新**: 新しい構成の反映
2. **リンク修正**: 移動による影響箇所の修正
3. **構成確認**: 整理後の構造検証

## 📈 期待効果

### 整理完了後の理想構造
```
specifications/
├── README.md (更新済み・メイン索引)
├── config/ (1ファイル + README.md)
├── database/ (6ファイル + README.md)
├── development/ (4+1ファイル + README.md)  
├── implementation/ (6ファイル + README.md) ← 新規
├── installation/ (1ファイル + README.md)
├── roadmaps/ (2ファイル + README.md) ← 新規
├── system/ (8+2ファイル + README.md)
├── terminology/ (2ファイル + README.md)
├── ui/ (9+1ファイル + README.md)
└── visions/ (5ファイル + README.md) ← 新規
```

### 管理効率向上
- **直下ファイル数**: 18個 → 1個（README.mdのみ）
- **カテゴリ明確化**: 機能別の明確な分類により発見性向上
- **重複排除**: 類似ファイルの統合により保守性向上
- **技術部品カタログ化**: specifications/の本来の役割明確化

## ⚠️ 実施時注意事項

### Git管理
- **P045プロトコル遵守**: 親git管理領域での作業確認
- **段階的コミット**: Phase毎のコミットでリスク軽減
- **バックアップ確保**: 大規模移動前の現状保存

### 参照関係
- **リンク破損防止**: 移動前の参照関係詳細調査
- **文書間依存**: blueprints/ からの参照確認
- **外部参照**: CLAUDE.md等からの参照確認

### 品質保証
- **内容整合性**: 移動先カテゴリとの内容適合性確認
- **命名規則**: 各ディレクトリの命名規則準拠
- **重複index禁止**: 各ディレクトリのREADME.md重複防止原則

## 🎯 成功基準

### 必須達成項目
- [ ] specifications/直下ファイル18個の適切な分類・移動完了
- [ ] 新規implementation/ディレクトリ作成・README.md作成
- [ ] 全移動対象ファイルの参照リンク修正完了
- [ ] specifications/README.md の構成更新完了

### 品質基準
- [ ] 移動先カテゴリとファイル内容の適合性確認
- [ ] 重複ファイルの統合または明確な分離完了
- [ ] 各ディレクトリのREADME.md更新完了
- [ ] CHK001（directory操作時のREADME.md更新）準拠

### リスク回避基準
- [ ] 移動前の参照関係調査完了
- [ ] 段階的移動による影響最小化実現
- [ ] Git管理分離プロトコル（P045）遵守

---

**実行担当**: Architect Agent（権限範囲内）  
**実行時期**: 承認後即座実行可能  
**所要時間**: 合計5-7時間（事前調査含む）  
**影響範囲**: visions/specifications/ の構造最適化

この整理により、specifications/は真の「技術部品カタログ」として機能し、cctopプロジェクトの設計・実装効率が大幅に向上します。