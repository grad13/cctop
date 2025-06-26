# Legacy - 歴史的技術文書アーカイブ

**作成日**: 2025年6月19日  
**最終更新**: 2025年6月26日（PLAN-20250626-001実行）  
**管理者**: Architect Agent  
**目的**: 歴史的価値・参考価値のある技術文書の保存管理  

## 📋 概要

legacyディレクトリは、過去のspecifications文書から価値ある内容を選別保存したアーカイブです。現在のFUNCTIONS体系では置換された文書でも、歴史的経緯・参考情報・将来ビジョンとして価値のある内容を保持しています。

**2025年6月26日の整理**: 元80ファイル → 現40ファイル（50%圧縮）

## 📁 保存文書カテゴリ

### 💎 **高価値保存文書**（将来参照推奨）

#### **visions/** - v4.0.0長期ビジョン
- **vis004-cctop-core-features-vision.md**: 4つの核心機能（Monitor/Metrics/Tracer/Viewer）
- **vis005〜008**: 各機能領域の詳細ビジョン
- **参照価値**: v3.0.0以降の長期開発方針

#### **roadmaps/** - RDD開発手法
- **r001-cctop-v4-development-roadmap.md**: 実動作駆動開発（RDD）の理念
- **imp005-v3-phased-development.md**: 6フェーズ開発手法
- **参照価値**: 開発手法の確立された原則

#### **terminology/** - 用語統一
- **term001-glossary.md**: プロジェクト用語集
- **term002-terms-and-rules.md**: 命名規則・用語ルール
- **参照価値**: 現在も有効、継続使用推奨

#### **development/** - 品質基準
- **d003-test-strategy.md**: テスト戦略の基本方針
- **d001-test-checklist.md**: 品質チェックリスト
- **参照価値**: 品質管理の参考資料

### 📚 **中価値保存文書**（選択的参照）

#### **database/** - DB設計の参考
- **r002-chokidar-db-test-design.md**: chokidar-DB統合テスト設計
- **r003-block-count-specification.md**: ブロック数仕様
- **db003-006**: 詳細DB仕様（FUNC-000の補完情報）
- **参照価値**: 現FUNC-000の背景理解

#### **system/** - 統合設計視点
- **a005-configuration-system-specification-v2.md**: 設定システムv2仕様
- **a006-integration-architecture-specification.md**: 統合アーキテクチャ
- **参照価値**: FUNC-010〜013の統合的理解

#### **ui/** - UI設計思想
- **ui008-cli-ui-design.md**: CLI UI設計の統合的視点
- **ui009-configurable-columns.md**: 設定可能カラム（将来実装）
- **ui003-005**: Detail View・検索・設定UI
- **参照価値**: FUNC-020〜024の背景・拡張アイデア

#### **implementation/** - v3開発経験
- **imp009-project-roadmap.md**: v3プロジェクトロードマップ
- **imp006-010**: Phase別実装の詳細計画
- **参照価値**: 大規模開発の教訓

## 🚫 削除済み文書

### **完全重複により削除**
- **config/**: config001-management.md → FUNC-011で完全カバー
- **installation/**: inst001-post-install-setup.md → FUNC-013で完全カバー

### **古い設計により削除**
- **database/**: db001-002（古い5テーブル設計）
- **system/**: a001-004（v1設計）
- **ui/**: ui001-002, ui006-007（実装済み機能）

## 📖 参照ガイドライン

### **現行開発での参照方法**
1. **用語確認**: terminology/ で用語統一を確認
2. **将来計画**: visions/ でv4.0.0構想を確認
3. **品質基準**: development/ で品質要件を確認
4. **開発手法**: roadmaps/ でRDD原則を確認

### **参照時の注意事項**
- 現在のFUNCTIONS体系が最新・正確
- legacy文書は「参考・背景理解」目的でのみ使用
- 実装時は必ずFUNC文書を主たる仕様として使用

## 🔄 管理方針

- **保存原則**: 歴史的価値・参考価値のある文書のみ保持
- **更新禁止**: legacy文書は原則として更新しない（現状保存）
- **参照推奨**: 現行開発での適切な参照を推奨
- **定期見直し**: 年1回程度での価値再評価

---

**理念**: 歴史を学び、未来を築く。過去の知見を活かしつつ、現在の技術で前進する。