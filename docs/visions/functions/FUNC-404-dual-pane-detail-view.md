# FUNC-404: Dual Pane Detail View

**作成日**: 2025年7月4日 15:40  
**更新日**: 2025年7月4日 15:40  
**作成者**: Architect Agent  
**ステータス**: Active  
**対象バージョン**: v0.3.2.0  
**関連仕様**: FUNC-400, FUNC-300, FUNC-000, FUNC-402, FUNC-403

## 📊 機能概要

選択されたファイルの詳細情報を左右2ペイン構成で表示する新しい詳細表示モード。左ペインでイベント履歴の時系列表示とナビゲーション機能を提供し、右ペインで基本統計とAdvanced統計を表示する。

**ユーザー価値**: 
- 従来のFUNC-401縦分割レイアウトの改良版
- 左ペインでのイベント履歴集中表示
- 右ペインでの統計情報専用表示
- 情報密度の最適化とユーザビリティ向上

## 🎯 機能境界

### ✅ **実行する**
- 左右2ペイン構成の詳細表示画面管理
- 左ペイン: イベント履歴表示・ナビゲーション制御
- 右ペイン上段: 基本統計表示（aggregatesテーブル）
- 右ペイン下段: Advanced統計表示（将来拡張予定）
- キー入力処理（↑↓移動、ESC戻る、q終了）

### ❌ **実行しない**
- イベントデータの追加・変更・削除
- 統計データの計算・更新処理
- ファイル編集・外部エディタ起動
- リアルタイムデータ更新

## 📋 表示仕様

### 画面レイアウト構成
```
┌─ Event History ──────────────────────┬─ File Statistics ─────────────────┐
│ Event Timestamp     Event      Lines │ FileID: 123  inode: 456789        │
│ 2025-06-26 12:34:56 Modify      47   │                                   │
│ 2025-06-26 12:30:21 Modify      45   │ Created:     2025/06/15 10:30     │
│ 2025-06-26 12:25:15 Move        32   │ Last Update: 2025/06/27 14:22     │
│ 2025-06-26 12:20:45 Modify      30   │                                   │
│ 2025-06-26 12:15:30 Restore     28   │ Number of Events                  │
│ 2025-06-26 12:10:20 Delete       0   │ Create=1  Delete=3   Modify=102   │
│ 2025-06-26 12:05:15 Modify      25   │ Move=12   Restore=3  Total=121    │
│ 2025-06-26 12:00:10 Create      20   │                                   │
│ ↓ (scrollable)                       │ Metric Statistics                 │
│                                      │       Byte  Line Block            │
│                                      │ First  222   222   444            │
│                                      │ Last   333   333   555            │
│                                      │ Max    999   555   777            │
│                                      │ Avg    456   389   592            │
│                                      │                                   │
│                                      ├───────────────────────────────────┤
│                                      │                                   │
│                                      │ Daily Activity                    │
│                                      │ (未実装 - 将来拡張予定)             │
│                                      │                                   │
│                                      │ 3-Day Trends                      │
│                                      │ (未実装 - 将来拡張予定)             │
│                                      │                                   │
│                                      │ Peak Hours                        │
│ [↑↓] Move  [ESC] Back  [q] Quit     │ (未実装 - 将来拡張予定)             │
└──────────────────────────────────────┴───────────────────────────────────┘
```

### レイアウト仕様

#### 画面分割比率
- **左ペイン（Event History）**: 60%
- **右ペイン（File Statistics）**: 40%
  - 右ペイン上段（Basic Statistics）: 60%
  - 右ペイン下段（Advanced Statistics）: 40%

#### 左ペイン（Event History）
- **カラムヘッダー**: Event Timestamp / Event / Lines
- **履歴リスト**: 時系列イベント一覧（最新から表示）
- **フォーカス制御**: 選択中の行を背景色で強調
- **操作ガイド**: 左ペイン最下部に配置

#### 右ペイン上段（Basic Statistics）
- **識別情報**: FileID、inode（ファイルシステム識別子）
- **時系列情報**: Created（最初のイベント時刻）、Last Update（最新のイベント時刻）
- **イベント統計**: Create/Delete/Modify/Move/Restore/Total件数
- **メトリック統計**: First/Last/Max/Avgのサイズ・行数・ブロック数（FUNC-402準拠）

#### 右ペイン下段（Advanced Statistics）
- **将来拡張領域**: Daily Activity、3-Day Trends、Peak Hours等
- **現在**: プレースホルダー表示のみ

## 🔧 技術仕様

### 機能連携仕様

#### FUNC-400からの呼び出し仕様
```javascript
// FUNC-400での選択確定時
onSelectionConfirm(selectedFileId) {
  // FUNC-300の状態をdetailに変更
  KeyInputManager.setState('detail');
  
  // FUNC-404を初期化・起動
  const detailView = new DualPaneDetailView(selectedFileId);
  detailView.initialize();
  detailView.render();
}
```

#### FUNC-300への登録仕様
```javascript
// FUNC-404初期化時にFUNC-300にキーハンドラーを登録
class DualPaneDetailView {
  initialize() {
    // detail状態のキーマップに登録
    KeyInputManager.registerToState('detail', 'ArrowUp', this.moveUp.bind(this));
    KeyInputManager.registerToState('detail', 'ArrowDown', this.moveDown.bind(this));
    KeyInputManager.registerToState('detail', 'Escape', this.exit.bind(this));
    KeyInputManager.registerToState('detail', 'q', this.exit.bind(this));
  }
  
  exit() {
    // FUNC-300の状態をwaitingに戻す
    KeyInputManager.popState();
    // FUNC-400の選択モードに復帰
    InteractiveSelectionMode.resume();
  }
}
```

### データ取得仕様

#### 左ペイン用履歴データ
```sql
SELECT 
  e.timestamp,
  et.name as event_type,
  m.line_count,
  e.id
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE e.file_id = ?
ORDER BY e.timestamp DESC
LIMIT ? OFFSET ?
```

#### 右ペイン用統計データ
```sql
SELECT 
  -- 識別情報
  f.id as file_id,
  f.inode,
  
  -- イベント統計
  a.total_events,
  a.total_creates,
  a.total_modifies,
  a.total_deletes,
  a.total_moves,
  a.total_restores,
  
  -- 時系列統計
  a.first_event_timestamp,
  a.last_event_timestamp,
  
  -- メトリック統計
  a.first_size, a.max_size, a.last_size, a.total_size,
  a.first_lines, a.max_lines, a.last_lines, a.total_lines
FROM files f
JOIN aggregates a ON f.id = a.file_id
WHERE f.id = ?
```

### 操作仕様

#### キー入力処理
- **↑（ArrowUp）**: 履歴リスト内で前のエントリに移動
- **↓（ArrowDown）**: 履歴リスト内で次のエントリに移動
- **ESC（Escape）**: 詳細モード終了、選択モードに復帰
- **q**: 詳細モード終了（ESCと同じ）

#### ナビゲーション制御
- **初期フォーカス**: 最新の履歴エントリ（インデックス0）
- **境界処理**: 最上位・最下位での移動制限
- **スクロール制御**: フォーカスが画面外に出る場合の自動スクロール

### ページング仕様
- **表示件数**: 画面サイズに応じて動的調整
- **スクロール閾値**: 上下3行でスクロール発動
- **プリロード**: 前後10件ずつ事前読み込み

## 制限事項

### 技術的制限
- **画面サイズ依存**: 最小幅80文字、最小高20行必要
- **データ取得性能**: 大量履歴データ時の取得遅延
- **同時表示制限**: 単一ファイルのみの詳細表示

### 機能制限
- **静的表示**: 表示中のリアルタイム更新不可
- **編集機能なし**: 履歴・統計の編集・修正機能なし
- **検索機能なし**: 履歴内検索・フィルタ機能なし
- **Advanced統計**: 現在は未実装（将来拡張予定）

## 🔗 関連機能との連携

### 必須連携機能
- **FUNC-400**: インタラクティブ選択モード - 呼び出し元・戻り先
- **FUNC-300**: キー入力管理 - ナビゲーションキーの受信・処理
- **FUNC-000**: SQLiteデータベース基盤 - 履歴・統計データの取得

### 連携詳細

#### FUNC-400連携（選択モードとの統合）
- **呼び出し**: FUNC-400の選択確定時（Enterキー）にFUNC-404を起動
- **データ受け渡し**: 選択されたfile_idをFUNC-404に引き渡し
- **戻り処理**: ESC/qキー時にFUNC-400の選択モードに復帰
- **状態保持**: FUNC-400の選択位置・フィルタ状態を保持
- **画面遷移**: 全画面切り替えでシームレスな遷移

#### FUNC-300連携（キー入力統合管理）
- **状態登録**: FUNC-300のdetail状態にキーハンドラーを登録
```javascript
// FUNC-300への登録例
stateMaps.detail.set('ArrowUp', { id: 'history-up', callback: FUNC404.moveUp });
stateMaps.detail.set('ArrowDown', { id: 'history-down', callback: FUNC404.moveDown });
stateMaps.detail.set('Escape', { id: 'detail-exit', callback: FUNC404.exit });
stateMaps.detail.set('q', { id: 'detail-quit', callback: FUNC404.exit });
```
- **状態遷移**: FUNC-300が`waiting → detail`状態遷移を管理
- **キー分散**: FUNC-300が適切にFUNC-404の各ハンドラーに分散
- **競合回避**: detail状態では他機能のキーを無効化

### 任意連携機能
- **FUNC-201**: 二重バッファ描画 - 描画最適化の利用
- **FUNC-101**: 階層設定管理 - 表示設定の管理
- **FUNC-207**: Color Rendering System - 色テーマの適用

### 既存機能との差分
- **FUNC-401**: 縦分割→横分割への変更
- **FUNC-402/403**: 統合→分離設計への変更
- **新設計**: 左右ペイン構成による情報密度最適化

## 📊 期待効果

### ユーザビリティ改善
- **情報密度最適化**: 左ペインでのイベント履歴集中表示
- **視認性向上**: 左右分割による情報の明確な分離
- **操作性向上**: 履歴ナビゲーションの直感的操作

### システム改善
- **保守性向上**: 左右ペイン独立設計による保守の簡素化
- **拡張性確保**: 右ペイン下段でのAdvanced統計拡張準備
- **性能最適化**: 必要な情報のみの効率的表示

## 参考資料

### 類似機能の参考
- **git log**: コミット履歴表示・ナビゲーション
- **htop**: プロセス一覧・統計情報の左右分割表示
- **tmux**: ペイン分割・独立操作の参考
- **less**: ページング・スクロール制御

### 設計参考
- **FUNC-401**: 従来の詳細表示モード設計
- **FUNC-402/403**: 統計・履歴表示の要素設計
- **FUNC-300**: キー入力管理システムとの連携