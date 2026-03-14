# spec/

仕様ドキュメント（spec-v2.1形式）を格納するディレクトリ。

## 役割

コードの公開インターフェース・状態遷移・ロジック・副作用を仕様として記述する。

## 関連スキル

- `code-to-spec`: コードからspecを生成
- `spec-to-code`: specとcodeの乖離を検出
- `spec-to-tests`: specからテストを生成
- `tests-to-spec`: テストからspecの整合性を検証
- `refactor-spec`: specの内部品質を分析

## ファイル一覧

| ファイル | 内容 |
|---------|------|
| component-architecture-overview.md | コンポーネントアーキテクチャ概要（Daemon/View/Shared の3層構成） |
| module-dependency-diagram.md | モジュール依存関係図（24機能の依存関係と実装順序） |
| milestones-strategy.md | マイルストーン戦略（6段階の開発ロードマップ） |
| stream-mode-architecture.md | Stream Modeアーキテクチャ（Milestone 1の実装仕様） |
| sqlite-database-foundation.md | SQLite 5テーブルスキーマ・インデックス・WAL設定（FUNC-000） |
| file-lifecycle-tracking.md | 6イベントタイプ・chokidarマッピング・同一性管理（FUNC-001） |
| chokidar-database-integration.md | chokidar統合DB記録・イベント変換仕様（FUNC-002） |
| background-activity-monitor.md | Daemon/View 2プロセスアーキテクチャ・PID管理（FUNC-003） |
| hierarchical-config-management.md | shared-config.jsonスキーマ・3層マージ戦略（FUNC-101） |
| view-interface-specification.md | CLI引数・起動挙動・ヘルプメッセージ（FUNC-104） |
| local-setup-initialization.md | .cctop/ディレクトリ構造・初回セットアップ（FUNC-105） |
| daemon-configuration-management.md | daemon-config.jsonスキーマ・監視パラメータ（FUNC-106） |
| view-configuration-management.md | view-config.jsonスキーマ・表示/色/インタラクティブ設定（FUNC-107） |
