# Techs - 技術文書

**作成日**: 2025年6月19日  
**最終更新**: 2025年6月22日 19:50  
**管理者**: Architect Agent  
**目的**: cctopプロジェクトの技術仕様・開発計画の統合管理

## 📋 概要

このディレクトリは、cctop（Claude Code リアルタイムファイル監視システム）プロジェクトの技術的側面に関する全ての文書を管理します。Architect Agentが主管し、開発計画（roadmaps/）と技術仕様（specifications/）を体系的に整理しています。

## 📁 ディレクトリ構成

```
techs/
├── README.md              # このファイル
├── roadmaps/              # 戦略・方針・長期計画
├── implements/            # 実装計画・実装詳細
├── vision/                # 将来ビジョン・目標・品質基準
└── specifications/        # 現在のシステム仕様・定義
    ├── architecture/      # アーキテクチャ概要
    ├── system/            # システムアーキテクチャ詳細
    ├── database/          # データベース仕様
    ├── ui/                # CLI UI仕様
    ├── development/       # 開発・テスト仕様
    └── terminology/       # 用語・定義管理
```

## 🎯 ディレクトリ役割分担

### roadmaps/ - 戦略・方針・長期計画
- **目的**: プロジェクト全体の戦略的計画・方針決定
- **内容**: 開発戦略、技術方針、プロジェクト方向性
- **更新**: Architect Agentが主導、戦略レベルの意思決定

### implements/ - 実装計画・実装詳細  
- **目的**: 具体的な実装計画・実装詳細の管理
- **内容**: 実装手順、技術実装詳細、開発計画
- **更新**: Architect/Builderが協調、実装レベルの計画

### vision/ - 将来ビジョン・目標・品質基準
- **目的**: プロジェクトの長期的なビジョン・目標設定
- **内容**: パフォーマンス目標、品質基準、将来構想
- **更新**: Architect Agentが主導、ビジョナリーな目標設定

### specifications/ - 現在のシステム仕様・定義
- **目的**: 現在のシステム仕様・技術定義の管理
- **内容**: アーキテクチャ、データモデル、API仕様、業務仕様
- **更新**: Architect Agentが責任、実装反映はBuilderと連携

## 🏗️ Architect Agent主管体制

### 権限・責務
- **技術方針決定**: システム全体のアーキテクチャ決定権
- **仕様策定**: 技術仕様書の作成・維持・更新
- **ロードマップ管理**: 開発計画の立案・優先度判断
- **技術債務管理**: 技術的負債の識別・解決計画策定

### 他エージェントとの連携
- **Builder**: 実装可能性の検証・技術選択の協議
- **Validator**: 品質要件・テスト仕様の合意
- **Clerk**: 文書構造・プロトコル準拠の確認
- **Inspector**: 運用監視要件・メトリクス定義

## 🚀 cctopプロジェクト技術概要

### 開発フェーズ（RDD方式）
- **Phase 1**: 基本ファイル監視機能（chokidar使用）
- **Phase 2**: Scan機能（既存ファイルスキャン）
- **Phase 3**: Move/Rename検出
- **Phase 4**: Unique表示&詳細画面
- **Phase 5**: Filter機能
- **Phase 6**: Stats機能（統計・分析）

### 技術スタック
- **ファイル監視**: chokidar
- **データベース**: SQLite3（WALモード）
- **キャッシュ**: 4層アーキテクチャ（EventType + Background + Statistics + Persistent）
- **UI**: リアルタイムストリーム表示（60fps制限）

## 🔗 関連文書

- **プロジェクト概要**: [CLAUDE.md - プロジェクト概要](../../CLAUDE.md#プロジェクト概要)
- **Architect権限**: [Architect Agent役割定義](../agents/roles/architect.md)
- **文書配置**: [P017 - ディレクトリ配置ガイドライン](../rules/meta/protocols/p017-directory-placement-guidelines.md)
- **技術スタック**: [CLAUDE.md - 技術スタック情報](../../CLAUDE.md#技術スタック情報)

---

**メンテナンス**: Architect Agentが技術文書の整合性・最新性を継続管理