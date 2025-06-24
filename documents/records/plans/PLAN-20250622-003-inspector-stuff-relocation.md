# PLAN-20250622-003: inspector-stuff移動計画書

**作成日**: 2025年6月22日 23:58  
**作成者**: Architect Agent  
**目的**: documents/records/inspector-stuffの内容を適切なdocuments配下の場所に移動  
**背景**: cctop独立プロジェクト化に伴う文書体系の整理

## 📋 移動対象分析

### 現在の配置
```
documents/records/inspector-stuff/
├── blueprint/                    # 設計・分析・仕様書体系
├── docs/                        # cctop開発の内部文書
│   ├── plans/                   # 実装計画書（Phase別）
│   ├── reports/                 # 開発実施記録・評価レポート
│   └── specifications/          # 技術仕様書（DB・CLI・UI等）
└── unit-to-integration-migration-checklist.md
```

### 内容分類

#### 1. **cctop技術仕様書** (`docs/specifications/`)
- **配置先**: `documents/visions/specifications/`
- **内容**: 
  - database/ - SQLite3スキーマ・設計
  - cli-ui/ - CLI UI設計
  - cache/ - キャッシュ戦略
  - test-strategy.md - テスト戦略
- **理由**: documents/visions/specifications/は技術仕様の標準配置場所

#### 2. **cctop開発計画書** (`docs/plans/`)
- **配置先**: `documents/visions/blueprints/`  
- **内容**:
  - ip005-development-surveillance-v3-phased-plan.md
  - ip008-cctop-v3-development-roadmap.md
  - Phase別実装計画書
- **理由**: documents/visions/blueprints/は開発計画の標準配置場所

#### 3. **cctop開発記録** (`docs/reports/`)
- **配置先**: `documents/records/reports/`（新規作成済み）
- **内容**: 
  - Phase実装記録・評価レポート
  - 技術調査レポート
  - 品質評価記録
- **理由**: cctop専用のreports管理に統合

#### 4. **blueprint体系** (`blueprint/`)
- **配置先**: 検討中（特殊な文書体系）
- **内容**:
  - 分析レポート（a000-a003）
  - 仕様書（s000-s002）
  - 調査計画・提案書
  - vision/ - 将来構想
- **理由**: 独自の命名規則・体系のため慎重に配置

## 🎯 移動計画（内容精査ベース）

### 作業原則
1. **機械的判定禁止**: 各ファイルの内容を個別確認して適切な配置を決定
2. **内容重視**: ファイル名やディレクトリ構造ではなく実際の内容で判断
3. **分割・統合検討**: 必要に応じてファイルの分割や統合を実施
4. **重複確認**: 既存文書との重複・矛盾を確認し適切に処理

### Phase 1: 個別ファイル内容確認・分類
**手順**:
1. 各ファイルの内容を読み込み
2. 内容の性質・目的・対象範囲を分析
3. 既存documents体系での適切な配置先を決定
4. 重複・矛盾・統合の必要性を判定

### Phase 2: 内容に基づく配置・統合実行
**判定基準**:
- **技術仕様**: specifications/architecture/配下に配置
- **開発計画**: roadmaps/配下に配置  
- **実施記録**: records/reports/に配置
- **分析文書**: 内容により適切な場所に配置
- **重複文書**: 統合または最新版に集約
- **分割対象**: 複数トピックが混在している場合は分割

### Phase 3: 品質確保・整合性確認
1. **参照リンク更新**: 移動に伴うリンク切れを修正
2. **README.md更新**: 各配置先のREADME.mdを更新
3. **命名規則整合**: 配置先の命名規則に合わせて調整
4. **内容重複排除**: 統合によって不要になったファイルを整理

## 📊 実行方針

### 段階的実行
1. **小規模テスト**: 重要度の低いファイルから開始
2. **内容確認**: 各ファイルを実際に読んで内容を理解
3. **適切配置**: 内容に最も適した場所に配置
4. **品質確認**: 移動後の整合性・一貫性を確認

### 特別な配慮事項
- **blueprint体系**: 独自の命名規則・体系の価値を評価し適切に処理
- **cctop v3/v4ロードマップ**: 既存roadmapとの統合・棲み分けを検討
- **開発記録**: TimeBoxingと分離してcctop専用の記録として整理
- **技術仕様**: 既存specifications/との重複・補完関係を精査

## ⚠️ 注意事項

1. **README.md更新必須**: 各移動先でREADME.mdを更新
2. **参照リンク確認**: 他文書からの参照リンクを確認・更新
3. **命名規則整合**: blueprintの独自命名規則との整合性確認
4. **重複回避**: 既存ファイルとの重複・競合回避

## 🎯 期待効果

1. **体系的整理**: cctop技術文書の適切な分類・配置
2. **検索性向上**: 標準的な配置による文書発見の容易化  
3. **保守性向上**: 一貫した文書管理体系の確立
4. **独立性確保**: TimeBoxing依存からの完全分離

---

**次のアクション**: Phase 1の移動実行・Phase 2の配置方針決定