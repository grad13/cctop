# Specifications - システム定義・仕様

**最終更新**: 2025年6月22日  
**管理者**: Architect・Clerk（共同編集、5エージェント体制）  
**更新内容**: cctop v3プロジェクト移行対応

## 概要

このディレクトリは、cctop（Claude Code リアルタイムファイル監視システム）の**現在の仕様・定義**を保持します。
ここを見れば、コードの意図と現在のシステム構成が理解できます。

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

## 役割分担

### specifications/ （ここ）
- **What it is** - 現在のシステムがどうなっているか
- **最新の仕様** - 実装済みの定義
- **参照ドキュメント** - コードを理解するための資料

### roadmaps/
- **How to build** - cctopの開発計画・改善方針
- **計画・議論** - RDD方式でのPhase別実装計画
- **決定プロセス** - 技術選択の背景・実装方針決定

### meta/protocols/
- **How to work** - 開発時のルール
- **命名規則** - コーディング規約
- **プロセス** - 作業手順

## 使い方

1. **cctopコードを理解したい時**
   - まずこのディレクトリの関連文書を参照
   - chokidar統合・キャッシュ戦略・CLI設計を確認

2. **新機能を追加する時**
   - roadmaps/でPhase別計画・RDD方式の議論
   - 実装完了後、specificationsに最新仕様を追加

3. **既存機能を変更する時**
   - specificationsで現在の仕様を確認
   - roadmaps/で変更計画を作成（RDD準拠）
   - 変更完了後、specificationsを更新

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

### 🔐 認証・登録システム（将来実装）
- **[authentication/system-overview.md](authentication/system-overview.md)** - 本格認証システム概要
- **[authentication/registration-flow.md](authentication/registration-flow.md)** - ユーザー登録フロー
- **[authentication/implementation-details.md](authentication/implementation-details.md)** - 実装詳細仕様

**注**: cctop v3では基本機能に集中し、認証は将来的な機能として位置付け

### 🎨 アセット管理
- **[asset-management/favicon-policy.md](asset-management/favicon-policy.md)** - ファビコン管理方針（汎用）

## 管理方針

- **常に最新を保つ** - 実装と乖離しないよう注意
- **簡潔に記述** - 実用的な参照資料として
- **roadmapとの連携** - 議論はroadmap、結論はspecifications