---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250626-001-legacy-directory-cleanup.md
Keywords: legacy-cleanup, directory-reorganization, document-management, value-preservation, duplicate-removal, func-consolidation, 50percent-compression, archives-backup, reference-documents, vision-v4, rdd-methodology, maintenance, documentation-strategy, file-cleanup
---

# PLAN-20250626-001: Legacy Directory Cleanup Plan

**作成日**: 2025年6月26日  
**作成者**: Architect Agent  
**計画タイプ**: 文書管理・整理  
**ステータス**: 計画書作成完了・実行承認待ち  
**重要性**: 中（文書体系の最適化）  
**推定作業時間**: 2-3時間  

## 📋 計画概要

documents/visions/legacy/ディレクトリの整理・圧縮計画。現在のFUNCTIONS体系との重複を排除し、歴史的・参考的価値のある文書のみを保持する。

## 🎯 目的

1. **重複排除**: FUNCTIONSと完全重複する文書の削除
2. **価値保存**: 歴史的価値・参考価値のある文書の保持
3. **構造簡素化**: 約50%の圧縮による管理効率化
4. **将来参照性**: v4.0.0ビジョンやRDD開発手法の保存

## 📊 現状分析

### 現在の構造（10ディレクトリ、約80ファイル）
```
legacy/
├── config/        # 1ファイル - FUNC-011と完全重複
├── database/      # 8ファイル - FUNC-000と部分重複
├── development/   # 4ファイル - テスト戦略・品質基準
├── implementation/# 8ファイル - v3開発計画
├── installation/  # 1ファイル - FUNC-013と完全重複
├── roadmaps/      # 2ファイル - RDD開発手法
├── system/        # 8ファイル - FUNC-010〜013と部分重複
├── terminology/   # 2ファイル - 用語定義
├── ui/           # 10ファイル - FUNC-020〜024と部分重複
└── visions/       # 5ファイル - v4.0.0ビジョン
```

### 価値評価サマリ
- **低価値（削除可能）**: 約20%（完全重複）
- **中価値（選択的保持）**: 約40%（部分重複・参考価値）
- **高価値（保持推奨）**: 約40%（独自価値・歴史的記録）

## 🔄 実行計画

### Phase 1: 即座の削除（30分）

#### 1.1 完全重複ディレクトリの削除
```bash
# 削除前にarchives/へバックアップ
documents/visions/legacy/config/
documents/visions/legacy/installation/
```

**理由**: 
- config/config001-management.md → FUNC-011で完全カバー
- installation/inst001-post-install-setup.md → FUNC-013で完全カバー

### Phase 2: 選択的整理（1.5時間）

#### 2.1 database/ディレクトリの整理
- **削除候補**: 
  - db001-schema-design.md（FUNC-000で更新済み）
  - db002-triggers-indexes.md（v0.2.0では未使用）
- **保持**: 
  - r002-chokidar-db-test-design.md（テスト設計の参考）
  - r003-block-count-specification.md（実装詳細）

#### 2.2 system/ディレクトリの整理
- **削除候補**: 
  - a001〜a004（古い設計、現FUNCで更新済み）
- **保持**: 
  - a005〜a008（v2仕様、統合的視点）

#### 2.3 ui/ディレクトリの整理
- **削除候補**: 
  - ui001-cli-baseline.md（FUNC-022で更新）
  - ui002-stream-display.md（FUNC-021で実装）
- **保持**: 
  - ui008-cli-ui-design.md（統合的設計視点）
  - ui009-configurable-columns.md（将来実装の参考）

### Phase 3: 高価値文書の再編成（1時間）

#### 3.1 保持ディレクトリの最終構成
```
legacy/
├── visions/      # v4.0.0ビジョン（5ファイル）
├── roadmaps/     # RDD開発手法（2ファイル）
├── terminology/  # 用語統一（2ファイル）
├── development/  # 品質基準（4ファイル）
└── reference/    # 選択的保持文書（新設）
    ├── database/ # 参考になるDB設計（3-4ファイル）
    ├── system/   # 統合的設計視点（3-4ファイル）
    └── ui/       # 将来実装の参考（3-4ファイル）
```

#### 3.2 README.md更新
各ディレクトリのREADME.mdを更新し、保持理由と参照方法を明記

## ⚠️ リスクと対策

### リスク1: 将来必要な文書の誤削除
**対策**: 削除前にarchives/にバックアップを作成

### リスク2: 参照関係の破壊
**対策**: 削除前に被参照状況を確認

### リスク3: 歴史的文脈の喪失
**対策**: 高価値文書は完全保持、中価値文書は選択的保持

## 📈 期待効果

1. **50%のファイル削減**: 約80ファイル → 約40ファイル
2. **管理効率向上**: 重複排除による混乱防止
3. **価値の明確化**: 保持文書の意義が明確に
4. **将来参照性**: v4.0.0ビジョンとRDD手法の保存

## ✅ 完了条件

1. config/とinstallation/ディレクトリの削除完了
2. 選択的整理による重複文書の削除完了
3. 高価値文書の再編成完了
4. 各ディレクトリのREADME.md更新完了
5. Git commitによる変更記録

## 🚀 実行承認

この計画を実行する場合、以下の順序で作業を進めます：

1. archives/へのバックアップ作成
2. Phase 1〜3の順次実行
3. 各フェーズ完了時の確認
4. 最終的なGit commit

**注**: この計画はArchitect Agentが立案しましたが、実際のファイル削除・移動作業は適切な権限を持つエージェントが実施します。