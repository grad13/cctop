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

## ディレクトリ構成

`code/` のモジュール構造（shared/daemon/view）に対応。

### architecture/ — アーキテクチャ・全体設計

| ファイル | 内容 |
|---------|------|
| component-architecture-overview.md | コンポーネントアーキテクチャ概要（Daemon/View/Shared の3層構成） |
| module-dependency-diagram.md | モジュール依存関係図（24機能の依存関係と実装順序） |
| milestones-strategy.md | マイルストーン戦略（6段階の開発ロードマップ） |
| stream-mode-architecture.md | Stream Modeアーキテクチャ（Milestone 1の実装仕様） |

### daemon/ — ファイル監視・イベント記録

| ファイル | 内容 |
|---------|------|
| sqlite-database-foundation.md | SQLite 5テーブルスキーマ・インデックス・WAL設定（FUNC-000） |
| database-schema-implementation.md | SQLite 5テーブルスキーマ実装（イベント・測定・集計テーブル） |
| file-lifecycle-tracking.md | 6イベントタイプ・chokidarマッピング・同一性管理（FUNC-001） |
| file-lifecycle-state.md | ファイル状態遷移モデル（発見→削除→復元） |
| chokidar-database-integration.md | chokidar統合DB記録・イベント変換仕様（FUNC-002） |
| event-processor-implementation.md | chokidarイベント→DBイベント変換・初期スキャン検出 |
| background-activity-monitor.md | Daemon/View 2プロセスアーキテクチャ・PID管理（FUNC-003） |
| daemon-configuration-management.md | daemon-config.jsonスキーマ・監視パラメータ（FUNC-106） |

### view/ — TUI表示・検索・フィルタ

| ファイル | 内容 |
|---------|------|
| view-interface-specification.md | CLI引数・起動挙動・ヘルプメッセージ（FUNC-104） |
| view-configuration-management.md | view-config.jsonスキーマ・表示/色/インタラクティブ設定（FUNC-107） |
| view-display-integration.md | DBイベントのリアルタイム表示（All/Uniqueモード対応） |
| east-asian-width-display.md | 東アジア文字の正確な幅表示機能 |
| event-type-filtering.md | イベント種別別フィルタリング |
| filter-state-management.md | 3フィルター（unique/all・event・keyword）の状態管理 |
| keyword-search-management.md | キーワード検索機能（正規化・複数キーワード・キャッシュ） |
| ui-filter-integration.md | 3フィルター機能の統合仕様 |
| runtime-control-management.md | Pause/Resume・Manual Refresh 実行時制御 |
| unique-file-cache-manager.md | Uniqueモード最適化キャッシュ（I/O 99%削減） |

### shared/ — 共通型・設定

| ファイル | 内容 |
|---------|------|
| hierarchical-config-management.md | shared-config.jsonスキーマ・3層マージ戦略（FUNC-101） |
| config-manager-implementation.md | 設定ファイル解決・読み込み・検証・監視パス管理 |
| local-setup-initialization.md | .cctop/ディレクトリ構造・初回セットアップ（FUNC-105） |
