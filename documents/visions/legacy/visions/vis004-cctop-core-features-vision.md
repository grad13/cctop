# v004: cctop Core Features Vision

**Document ID**: v004-cctop-core-features-vision  
**Created**: 2025-06-23 01:45  
**Author**: Architect Agent  
**Status**: Active  
**Purpose**: cctop v4.0.0で実現する核心機能のビジョン定義

## 🎯 ビジョン概要

cctop v4.0.0は**実用的で信頼性のあるファイル監視ツール**を目指し、Claude Code開発者の日常使用に最適化された4つの核心機能を提供する。

## 🏗️ 核心機能ビジョン

### 1. Monitor基盤: [chokidar] → [DB]

#### ビジョン
**100%信頼性のあるファイル監視基盤**の確立

#### 具体的実現内容
- **chokidarイベントの完全捕捉**: 取りこぼしゼロの監視
- **SQLiteへの確実な記録**: データ整合性100%保証
- **リアルタイム性**: ±50ms精度のタイムスタンプ
- **メタデータ完全性**: file_size, line_count, block_count, timestamp, file_path, inodeの6項目完全記録
- **パフォーマンス**: 1000+ファイル監視での安定動作

#### 成功指標
- chokidarイベント数 === DB記録数（完全一致）
- 24時間連続運用での安定性
- メモリ使用量200MB以下維持
- CPU使用率5%以下（アイドル時）

### 2. Plugin構想（メトリクス抽出システム）

#### ビジョン
**カスタマイズ可能なファイルメトリクス抽出**プラグインシステムの確立

#### 標準メトリクスプラグイン
- **All Files**: 容量・行数・文字数等の基本メトリクス
- **Markdown**: section数・リンク数・画像数等
- **Python**: def数・class数・import数・複雑度等
- **JavaScript/TypeScript**: 関数数・モジュール数・依存関係等
- **その他**: ユーザー定義のカスタムメトリクス

#### プラグイン仕様
```javascript
// メトリクスプラグインの例
module.exports = {
  name: 'python-metrics',
  version: '1.0.0',
  filePatterns: ['*.py'],
  
  async extractMetrics(filePath, fileContent, stats) {
    return {
      function_count: this.countFunctions(fileContent),
      class_count: this.countClasses(fileContent),
      // ... その他のメトリクス
    };
  }
}
```

#### 実現方法
- JavaScriptによる簡単なメトリクス定義
- ファイルパターンによる自動適用
- 抽出メトリクスの自動DB保存
- リアルタイムビュー更新

### 3. Tracer (Analysis) 機能

#### ビジョン
**3つのモードによる直感的なファイル活動分析** - inode等を用いたファイル識別により正確な履歴追跡を実現

#### 3.1 Unique Mode
**最新状態重視の簡潔表示**

```sql
-- 実装概念
SELECT DISTINCT file_path, 
       FIRST_VALUE(event_type) OVER (PARTITION BY file_path ORDER BY timestamp DESC) as latest_event,
       FIRST_VALUE(timestamp) OVER (PARTITION BY file_path ORDER BY timestamp DESC) as latest_time
FROM events 
ORDER BY latest_time DESC
```

**特徴**:
- ファイルごとに最新のevent_typeのみ表示
- 重複排除により見やすさ重視
- リアルタイム更新対応

#### 3.2 Selection Mode
**キーボード操作による詳細探索**

**操作仕様**:
- `↑↓`: 行選択移動
- `Enter`: Detail Mode移行
- `Esc`: 前の画面に戻る
- `j/k`: vim風上下移動
- `gg/G`: 先頭/末尾ジャンプ

**UI要素**:
- ハイライト表示（selected row）
- ステータスバー（選択位置表示）
- プレビューペイン（optional）

#### 3.3 Detail Mode
**同一ファイルの完全履歴表示**

```sql
-- 実装概念
SELECT * FROM events 
WHERE file_path = :selected_file_path 
ORDER BY timestamp DESC
```

**表示内容**:
- 時系列でのすべての変更履歴
- イベントタイプ別の色分け
- ファイルサイズ変化のグラフ表示
- 変更頻度の統計情報

### 4. Viewer工夫

#### ビジョン
**効率的なデータ探索のための高度なViewer機能**

#### 4.1 Filter機能
**柔軟なファイル名マッチングフィルタ**

**フィルタ種類**:
- **Exact Match**: 完全一致
- **Wildcard**: `*.js`, `test/*` パターン
- **Regex**: 正規表現サポート
- **Extension**: `.js`, `.md` 等の拡張子フィルタ
- **Directory**: 特定ディレクトリ配下
- **Event Type**: Create/Modify/Delete等

**操作仕様**:
- `/`: フィルタモード開始
- `Ctrl+F`: インクリメンタルサーチ
- `F3/Shift+F3`: 次/前の一致
- `Esc`: フィルタクリア

#### 4.2 Sort機能
**Claude Sessionベースのインテリジェントソート**

**ソート基準**:
- **Session Change Rate**: Claude session単位での平均変化率
- **Recent Activity**: 最近の活動頻度
- **File Size Changes**: ファイルサイズ変化量
- **Total Events**: 総イベント数
- **Last Modified**: 最終更新時刻

**Claude Session検出ロジック**:
```sql
-- セッション区切り検出（30分以上の間隔）
WITH session_boundaries AS (
  SELECT file_path, timestamp,
         LAG(timestamp) OVER (PARTITION BY file_path ORDER BY timestamp) as prev_timestamp,
         CASE WHEN timestamp - LAG(timestamp) OVER (PARTITION BY file_path ORDER BY timestamp) > 1800000 
              THEN 1 ELSE 0 END as session_start
  FROM events
),
session_stats AS (
  SELECT file_path,
         SUM(session_start) as session_count,
         COUNT(*) as total_events,
         CAST(COUNT(*) AS FLOAT) / NULLIF(SUM(session_start), 0) as avg_changes_per_session
  FROM session_boundaries
  GROUP BY file_path
)
SELECT * FROM session_stats ORDER BY avg_changes_per_session DESC
```

## 🚀 実装優先度

### Phase 1: 基盤確立（最優先）
1. **[chokidar] → [DB]基盤**: 完全な信頼性確保
2. **基本Tracer機能**: Unique/Selection Mode実装

### Phase 2: 機能拡充（重要）
3. **Detail Mode**: 履歴表示機能
4. **基本Filter**: ファイル名マッチング

### Phase 3: 高度化（将来）
5. **高度なSort**: Claude Session分析
6. **Plugin基盤**: 拡張アーキテクチャ

## 📊 技術仕様・最新資料統合

### 基盤設計資料
- **r001-cctop-v4-development-roadmap**: 全体計画書（RDD方式・6Phase構成）
- **a008-cctop-v4-directory-structure**: 最終形態ディレクトリ構成（3層分離アーキテクチャ）
- **r002-chokidar-db-test-design**: [chokidar] → [DB]統合テスト設計（Phase 1-3成功基準）
- **r003-block-count-specification**: block_count メタデータ仕様（Claude Code論理ブロック検出）
- **db001-schema-design**: 完全5テーブルスキーマ設計（SQLite最適化）

### データベース設計（db001準拠）
- **events**: メインイベントテーブル（6項目メタデータ完全記録）
- **event_types**: イベントタイプマスター（Find/Create/Modify/Delete/Move/Rename）
- **object_fingerprint**: オブジェクト指紋（hash + inode）
- **object_statistics**: オブジェクト統計（リアルタイム更新）  
- **file_objects_cache**: 高速アクセスキャッシュ

### UI/UX設計
- **レスポンシブレイアウト**: ターミナルサイズ対応
- **キーボードファースト**: マウス不要操作
- **リアルタイム更新**: 60fps制限での滑らかな更新

### パフォーマンス要件
- **初期表示**: 1秒以内
- **フィルタ適用**: 200ms以内
- **モード切替**: 100ms以内
- **大容量対応**: 10,000+イベントでの快適動作

## 🎯 成功の定義

### ユーザー体験
- **直感的操作**: 学習コストゼロでの使用開始
- **高速レスポンス**: ストレスフリーな操作感
- **信頼性**: データロスゼロでの安心感
- **有用性**: 日常開発での実用価値

### 技術品質
- **安定性**: 24時間連続動作
- **パフォーマンス**: 軽量・高速動作
- **拡張性**: プラグインによる機能拡張
- **保守性**: 明確なコード構造

---

**Core Vision**: cctopを「信頼できる、使いやすい、拡張可能な」ファイル監視ツールとして確立し、Claude Code開発者の必須ツールにする。