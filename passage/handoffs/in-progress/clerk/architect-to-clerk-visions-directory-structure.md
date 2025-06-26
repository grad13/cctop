# Architect → Clerk: visions/ディレクトリ構造整理の引き継ぎ

**作成日**: 2025-06-24  
**作成者**: Architect Agent  
**対象**: Clerk Agent  
**目的**: 新しいvisions/ディレクトリ構造の文書化と管理体制確立

## 📋 実施済み作業

### 1. ディレクトリ構造再編完了
```
documents/
├── visions/                    # 新設（旧visions/を統合）
│   ├── specifications/         # 部品カタログ（詳細仕様）
│   ├── blueprints/            # 設計図（部品の組み合わせ方）
│   └── progress/              # 実装進捗（設計図の実行状況）
├── records/                   # 記録系（既存）
└── rules/                     # ルール系（既存）
```

### 2. 移行実施内容
- **visions/specifications/** → **visions/specifications/**
- **visions/implements/** + **visions/roadmaps/** + **visions/vision/** → **visions/blueprints/**
- **新設**: **visions/progress/** （今後の進捗管理用）

### 3. 重要ファイルの配置
- **PLAN-20250624-001-v0100-implementation.md**: 
  - 原本: `records/plans/`
  - 設計図: `visions/blueprints/`
  - バックアップ: `VAULTs/`

## 🎯 新構造の設計思想

### visions/ の3層構造
1. **specifications/** = 部品カタログ
   - データベーススキーマ（db001-schema-design.md）
   - UI仕様（ui001-cli-baseline.md）
   - 設定システム（a002-configuration-system.md）
   - 個別の技術仕様・部品の詳細

2. **blueprints/** = 設計図・組立図
   - specificationsの部品を組み合わせて「全体」を設計
   - 「cctop v0.1.0.0はdb001+ui001+a002で構築する」
   - 部品同士の接続方法・統合方針
   - **クリーンに保つ**: 進捗情報は記載しない

3. **progress/** = 実装進捗
   - 設計図を見ながら作業した結果・状況
   - 「Phase 1完了✅」「Phase 2進行中」等の進捗情報
   - 設計図とは完全分離

### 設計原則
- **specifications**: 部品の詳細仕様（変更慎重）
- **blueprints**: 一意な設計図（実装中に改善される）
- **progress**: 実装記録（設計図を汚さない）

## 🚨 発見した問題（緊急対応必要）

### blueprints/内の重複・混乱
**詳細**: `REP-20250624-001-blueprints-organization-analysis.md` 参照

#### 主要問題
1. **Phase1実装計画の3重複**:
   - PLAN-20250624-001（最新・最重要）
   - imp010（重複）
   - imp006（重複）

2. **ロードマップの3重複**:
   - r001（v4開発ロードマップ）
   - imp009（同内容）
   - imp005（surveillance v3、過去）

3. **バージョン混乱**: v3/v4.0.0/v0.1.0.0が混在

## 📝 Clerkへの依頼事項

### 1. 文書管理体制確立（高優先度）

#### A. README.md作成・更新
- **visions/README.md**: 新構造の説明・使い方ガイド
- **visions/specifications/README.md**: 部品カタログの管理方針
- **visions/blueprints/README.md**: 設計図管理・重複防止原則
- **visions/progress/README.md**: 進捗管理の方針

#### B. 文書分類ガイドライン策定
**新プロトコル**: `P047-visions-documents-classification.md`
- specifications vs blueprints vs progress の判定基準
- 新しい文書の適切な配置ルール
- 重複防止・一意性確保の原則

### 2. blueprints/重複解消（中優先度）

#### 整理方針
- **PLAN-20250624-001**: 唯一の有効実装計画として確立
- **重複ファイル**: archives/blueprints-legacy/ へ移動
- **有効ファイル**: 7ファイルに整理（REP-20250624-001参照）

#### 具体的移動対象
```
archives/blueprints-legacy/
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

### 3. 命名規則統一（低優先度）

#### 新しい命名パターン検討
- blueprints/内のファイル命名規則統一
- PLAN-YYYY-MM-DD vs imp001 vs r001 vs vis004 の整理
- 一貫した命名体系の確立

## 🔗 参照資料

### 重要文書
1. **REP-20250624-001-blueprints-organization-analysis.md**: blueprints分析詳細
2. **PLAN-20250624-001-v0100-implementation.md**: 最重要実装計画
3. **documents/visions/README.md**: 旧構造の説明（参考）

### 関連プロトコル
- **P045**: Git管理分離プロトコル
- **CHK006**: Git操作前確認チェックリスト
- **DDD2**: 階層メモリメンテナンス原則

## ⚠️ 注意事項

### 作業時の制約
1. **P045準拠**: 親git管理領域での作業のため、適切なgit確認
2. **重複index禁止**: 各ディレクトリのREADME.md既存確認
3. **参照整合性**: ファイル移動時のリンク切れ防止

### 緊急性の考慮
1. **高**: README.md作成・文書分類ガイドライン
2. **中**: blueprints/重複解消
3. **低**: 命名規則統一

## 🎯 期待する成果

### 短期目標（1-2日）
- visions/構造の文書化完了
- P047プロトコル策定
- blueprints/重複の初期整理

### 中期目標（1週間）
- blueprints/を7ファイルに整理完了
- progress/での進捗管理開始
- 新構造での運用開始

---

**Architectより**: 新しいvisions/構造により、設計図（blueprints）をクリーンに保ちながら、部品（specifications）と進捗（progress）を適切に分離できます。Clerkの文書管理専門性により、この構造を確実に運用可能にしていただけると期待しています。

**次のステップ**: この内容確認後、作業優先度と具体的スケジュールの協議をお願いします。