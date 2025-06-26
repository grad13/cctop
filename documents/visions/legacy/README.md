# Specifications - 技術部品カタログ

**最終更新**: 2025年6月24日  
**管理者**: Architect Agent  
**目的**: 再利用可能な技術部品の詳細仕様管理

## 📋 概要

specificationsディレクトリは、cctopプロジェクトの技術部品カタログとして機能します。個別の技術コンポーネント・システム仕様を詳細に定義し、blueprints/での全体設計時に参照される部品仕様を提供します。

## ディレクトリ構成

```
specifications/
├── README.md                          # このファイル（ディレクトリ概要）
├── terminology/                       # 用語定義・統一規則
│   ├── glossary.md                   # cctopプロジェクト用語集
│   └── terms-and-rules.md            # プロジェクト全体の用語統一
├── architecture/                      # システムアーキテクチャ定義
│   ├── overview.md                   # cctopアーキテクチャ概要
│   ├── url-structure-consideration.md # URL構造検討記録（汎用）
│   ├── wrappers-security.md          # APIセキュリティ設計（汎用）
│   └── database/                     # データベース構造（SQLite3）
│       └── database-initialization.md
```

**2025年6月22日移行完了**：
- **timebox/** → `documents/archives/timebox-legacy/specifications/` に移動
- **taskgrid/** → `documents/archives/timebox-legacy/specifications/` に移動
- **authentication/** → `documents/archives/web-ui-legacy/authentication/` に移動
- **asset-management/** → `documents/archives/web-ui-legacy/asset-management/` に移動
- **移動理由**: cctop CLI特性により不要（timeboxingアプリ・Web UI関連機能）

## 🎯 部品カタログの役割

### 再利用可能な技術部品
- **データベース仕様**: SQLite3スキーマ・最適化設定
- **UI仕様**: CLI表示・キーボード操作・レンダリング
- **システム仕様**: 設定管理・アーキテクチャ・統合方式
- **開発仕様**: テスト戦略・品質基準・開発手法

### blueprints/との関係
- **参照される側**: blueprints/から一方向で参照
- **独立性**: blueprints/の設計を意識せず仕様として独立
- **再利用性**: 複数のバージョンで再利用可能な部品設計

## 📊 使い方

### blueprints/作成時
1. **部品確認**: 必要な技術部品をspecifications/で確認
2. **部品選択**: 適切な仕様を選択・組み合わせ
3. **部品参照**: blueprints/から具体的に参照
4. **不足時**: 新しい部品仕様をspecifications/に追加

### 実装時
1. **仕様確認**: 実装対象の部品仕様を詳細確認
2. **準拠実装**: 仕様に忠実な実装
3. **フィードバック**: 実装中の問題を仕様にフィードバック
4. **仕様更新**: 必要に応じて仕様の改善・明確化

## 📋 ファイル詳細

### 📝 用語定義
- **[terminology/](terminology/)** - 用語定義・統一規則
  - **[glossary.md](terminology/glossary.md)** - cctopプロジェクト用語集
    - cctop、RDD、file-monitor-binary等の定義
    - 技術用語（Stream Mode、Hot Files、Cache Layers等）
  - **[terms-and-rules.md](terminology/terms-and-rules.md)** - 用語定義・統一規則
    - インシデント・バグの定義
    - 問題分類の判断基準
    - 開発管理用語（ルール、ガイドライン、プロトコル）
    - エージェント関連用語

### 🗄️ データベース
- **[architecture/database/](architecture/database/)** - データベース仕様
  - **[database-initialization.md](architecture/database/database-initialization.md)** - SQLite3初期化・マイグレーション
  - ファイル監視イベント・統計データのスキーマ定義
  - WALモード設定・パフォーマンス最適化

### 🏗️ システムアーキテクチャ
- **[architecture/overview.md](architecture/overview.md)** - cctopアーキテクチャ概要
  - chokidar/SQLite3/4層キャッシュの統合設計
  - CLI表示・フィルタリング・統計機能
  - RDD（実動作駆動開発）方式のシステム設計
- **[architecture/url-structure-consideration.md](architecture/url-structure-consideration.md)** - URL構造設計検討（汎用）
- **[architecture/wrappers-security.md](architecture/wrappers-security.md)** - APIラッパーセキュリティ設計（汎用）

## 🔧 主要な技術部品一覧

### データベース部品（database/）
- **db001-schema-design.md**: 5テーブル構成（events, event_types等）
- **db002-triggers-indexes.md**: パフォーマンス最適化
- **db003-queries-views.md**: 最適化クエリパターン
- **db004-implementation-guide.md**: DatabaseManager実装ガイド

### UI部品（ui/）
- **ui001-cli-baseline.md**: 基本CLI表示・All/Uniqueモード
- **ui002-stream-display.md**: リアルタイムストリーム表示
- **ui003-detail-view.md**: 詳細表示モード
- **ui004-search-feature.md**: 検索・フィルタ機能

### システム部品（system/）
- **a002-configuration-system.md**: 設定管理システム
- **a003-cache-strategy.md**: キャッシュ戦略
- **a004-cache-system-design.md**: キャッシュシステム設計

### 開発・テスト部品（development/）
- **d001-test-checklist.md**: テストチェックリスト
- **d002-integration-quality.md**: 統合品質基準
- **d003-test-strategy.md**: テスト戦略

## ⚠️ アーカイブ済み仕様

**移動完了（2025年6月22日）**:
- **timebox/**, **taskgrid/** → `archives/timebox-legacy/`
- **authentication/**, **asset-management/** → `archives/web-ui-legacy/`
- **理由**: cctop CLI特性により不要

## 📋 管理原則

### 仕様の品質
- **具体性**: 実装に必要な詳細度を確保
- **正確性**: 実装と仕様の一致を保つ
- **完全性**: 部品として必要な情報を網羅

### 更新管理
- **慎重な更新**: 仕様変更は影響範囲を考慮
- **バージョン管理**: 重要な変更は履歴を記録
- **実装反映**: 実装完了後に仕様を最新化

### 参照関係
- **独立性**: blueprints/の設計を意識しない
- **再利用性**: 複数バージョンで活用可能
- **明確性**: 曖昧さを排除した明確な定義

---

**理念**: 高品質な技術部品により、確実で効率的なシステム構築を支援する