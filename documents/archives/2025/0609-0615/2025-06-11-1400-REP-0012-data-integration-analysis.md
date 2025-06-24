---
**アーカイブ情報**
- アーカイブ日: 2025-06-18（実行日）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: データ統合, TimeBox, TaskGrid, 連携分析, アーキテクチャ設計, 技術調査, 統合設計, システム連携

---

# TimeBox and TaskGrid Data Integration Analysis

**作成日時**: 2025年06月11日 14:00  
**目的**: TimeBoxとTaskGridのデータ連携実装のための現状分析と統合アーキテクチャ設計  
**ステータス**: 分析完了・統合設計案提示  

## 1. TimeBox データ構造分析

### 現在のデータ構造

#### Timer Data Structure (from timebox-core.js)
```javascript
// Active Timer
const timerData = {
  id: "timer_${timestamp}_${incrementalId}",     // タイマーの一意ID
  todoId: string,                               // 対象todoのID (現在はダミー)
  todoTitle: string,                            // タスクのタイトル
  duration: number,                             // 設定時間（ミリ秒）
  startTime: timestamp,                         // 開始時刻
  endTime: timestamp,                           // 終了予定時刻
  remainingTime: number,                        // 残り時間（ミリ秒）
  intervalId: intervalId                        // JavaScript interval ID
};

// Completed Session
const completedSession = {
  ...timerData,                                 // 上記の全フィールド
  completedAt: timestamp,                       // 完了時刻
  status: 'completed' | 'deferred'              // 完了ステータス
};
```

#### 現在のデータ保存方法
- **ストレージ**: LocalStorage使用
- **キー**: 
  - `timebox_active_timers`: アクティブタイマー配列
  - `timebox_completed_sessions`: 完了セッション配列
- **永続化**: なし（ブラウザ限定）
- **API**: 存在しない（TODO実装が必要）

## 2. TaskGrid データ構造分析

### 現在のデータ構造

#### TaskGrid Data Structure (from taskgrid-data.js)
```javascript
// TaskGrid Export Format
const taskGridData = [
  // 各列（column）ごとの配列
  [                                             // Column 0 (最左列 - 具体的タスク)
    "レポート作成",                            // Row 0
    "会議資料準備",                            // Row 1
    "コードレビュー",                          // Row 2
    ...                                       // 最大30行
  ],
  [                                             // Column 1 (中間階層)
    "業務改善",
    "プロジェクト管理",
    ...
  ],
  ...                                           // 最大5列
  [                                             // Column 4 (最右列 - ルート目標)
    "よく生きる",
    "",
    ...
  ]
];
```

#### データ保存・読み込みAPI
- **保存**: `POST /api/taskgrid-data.php`
- **読み込み**: `GET /api/taskgrid-data.php`
- **データベース**: `taskgrid` テーブル
- **フォーマット**: JSONとして `payload` カラムに保存

#### データベーススキーマ
```sql
CREATE TABLE taskgrid (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT,                        -- ユーザーID
    payload    TEXT    NOT NULL,            -- JSON配列データ
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 3. 現在のAPI構成

### 既存APIエンドポイント

#### TaskGrid関連
- `GET /api/taskgrid-data.php` - データ読み込み
- `POST /api/taskgrid-data.php` - データ保存（新規作成）
- `PUT /api/taskgrid-data.php` - データ更新（最新レコード上書き）

#### TimeBox関連
- **現在存在しない** - 実装が必要

#### その他
- `POST/GET /api/vision/daily.php` - 日次ビジョンデータ
- `GET /api/vision/list.php` - ビジョン一覧

## 4. データ統合の課題と機会

### 4.1 現在の問題点

#### TimeBoxの課題
1. **ダミーデータ使用**: 現在固定のtodoリストを使用
2. **データ永続化なし**: LocalStorageのみで一時的
3. **TaskGridとの分離**: 実際のtaskgridデータを参照できない
4. **履歴管理不足**: 作業履歴がユーザー間で同期されない

#### TaskGridの課題
1. **タイマー情報なし**: 時間見積もりや作業ログがない
2. **完了状態不明**: どのタスクが完了済みかわからない
3. **優先度不明**: どのタスクが現在進行中かわからない

### 4.2 統合の機会

#### 双方向データフロー
1. **TaskGrid → TimeBox**: 実際のタスクでタイマー実行
2. **TimeBox → TaskGrid**: 完了状態や作業時間をTaskGridに反映

#### 強化されるユーザー体験
1. **一元管理**: タスク作成からタイマー実行まで統合
2. **進捗可視化**: TaskGrid上で作業時間と完了状態を表示
3. **効率分析**: 見積もり時間 vs 実際時間の分析

## 5. 統合アーキテクチャ設計案

### 5.1 データベース設計

#### Option A: 最小変更アプローチ
```sql
-- TimeBox専用テーブル追加
CREATE TABLE timebox_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    taskgrid_cell_ref TEXT,                 -- "col:row" format
    task_content TEXT NOT NULL,             -- タスク内容のスナップショット
    estimated_minutes INTEGER NOT NULL,     -- 見積もり時間
    actual_minutes INTEGER,                 -- 実際時間
    status TEXT NOT NULL,                   -- 'running', 'completed', 'deferred'
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TaskGridデータ拡張（メタデータ追加）
CREATE TABLE taskgrid_metadata (
    user_id TEXT NOT NULL,
    cell_ref TEXT NOT NULL,                 -- "col:row"
    is_completed BOOLEAN DEFAULT FALSE,
    last_worked_at INTEGER,
    total_work_minutes INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, cell_ref)
);
```

#### Option B: 統合テーブルアプローチ
```sql
-- TaskGridを拡張してタイマー情報も含める
ALTER TABLE taskgrid ADD COLUMN metadata TEXT; -- JSON with timer info

-- 上記のmetadataフィールドの想定構造
{
  "cells": {
    "0:0": {                                -- cell reference (col:row)
      "isCompleted": false,
      "lastWorkedAt": 1686123456789,
      "totalWorkMinutes": 45,
      "estimatedMinutes": 30,
      "workSessions": [
        {
          "id": "session_123",
          "startedAt": 1686120000000,
          "completedAt": 1686121500000,
          "actualMinutes": 25,
          "status": "completed"
        }
      ]
    }
  }
}
```

### 5.2 API設計

#### 新しいTimeBox APIエンドポイント
```
POST   /api/timebox/start      - タイマー開始
PUT    /api/timebox/update     - タイマー状態更新  
POST   /api/timebox/complete   - タイマー完了
GET    /api/timebox/sessions   - セッション履歴取得
DELETE /api/timebox/cancel     - タイマーキャンセル
```

#### 統合データAPI
```
GET    /api/taskgrid-enhanced  - TaskGridデータ + タイマーメタデータ
POST   /api/taskgrid-enhanced  - 統合データ保存
```

### 5.3 フロントエンド統合

#### データフロー設計
```javascript
// TaskGrid → TimeBox データフロー
class TaskGridTimeboxIntegration {
  // TaskGridからアクティブなタスク取得
  getActiveTasks() {
    const taskGridData = exportTaskGridData();
    return this.parseTasksFromGrid(taskGridData);
  }
  
  // TimeBoxでのタイマー開始時にTaskGrid情報を参照
  startTimerForTask(cellRef, taskContent) {
    const timerData = {
      id: generateTimerId(),
      cellRef: cellRef,                     // "col:row"
      taskContent: taskContent,
      // ... other timer properties
    };
    return this.startTimer(timerData);
  }
  
  // タイマー完了時にTaskGridメタデータを更新
  onTimerComplete(timerData) {
    this.updateTaskGridMetadata(timerData.cellRef, {
      isCompleted: true,
      lastWorkedAt: Date.now(),
      totalWorkMinutes: this.calculateTotalMinutes(timerData)
    });
  }
}
```

#### UI統合パターン
1. **TaskGrid拡張**: セル右側にタイマーボタン追加
2. **TimeBox選択UI**: TaskGridデータから動的に生成
3. **状態同期**: タイマー完了時にTaskGrid上の視覚的表示更新

### 5.4 実装フェーズ

#### Phase 1: 基本統合 (1-2日)
1. ✅ TimeBox APIエンドポイント作成 (`/api/timebox/*`)
2. ✅ TaskGridからの実データ取得をTimeBoxに実装
3. ✅ 基本的な完了状態同期

#### Phase 2: 高度な統合 (2-3日)
4. ⏳ TaskGridメタデータテーブル実装
5. ⏳ 作業時間分析機能
6. ⏳ UI改善（進捗表示、完了状態可視化）

#### Phase 3: 最適化 (1-2日)
7. ⏳ リアルタイム同期
8. ⏳ パフォーマンス最適化
9. ⏳ データ整合性チェック

## 6. 推奨実装アプローチ

### 優先順位付き推奨事項

#### 🔴 高優先度 (即座に実装)
1. **TimeBox API作成**: セッション管理のための基本エンドポイント
2. **TaskGrid実データ連携**: ダミーデータから実データへの切り替え
3. **基本完了状態同期**: タイマー完了時のTaskGrid状態更新

#### 🟡 中優先度 (次週実装)
4. **メタデータテーブル**: 作業履歴・統計のための専用テーブル
5. **UI統合改善**: TaskGrid上でのタイマー状態表示
6. **セッション履歴**: 過去の作業履歴表示機能

#### 🟢 低優先度 (今後検討)
7. **高度な分析**: 生産性分析、時間予測
8. **リアルタイム同期**: 複数タブ間でのデータ同期
9. **通知機能**: タイマー完了時の高度な通知

### 技術選択の根拠

#### データベース設計: Option A (専用テーブル) を推奨
- **理由**: 
  - 既存TaskGridデータ構造を破壊しない
  - タイマー特有の要件に特化可能
  - 将来の拡張が容易
  - データ整合性を保ちやすい

#### API設計: RESTful + 統合エンドポイント
- **理由**:
  - 既存APIパターンとの一貫性
  - 段階的な実装が可能
  - フロントエンド側の変更を最小化

## 7. 次のアクション

### 即座に必要な決定事項
1. **データベース設計方式の確定**: Option A vs Option B
2. **実装フェーズの優先度確認**
3. **UI統合パターンの選択**

### 技術実装開始のための準備
1. **TimeBox API設計の詳細化**
2. **データマイグレーション計画**
3. **テストデータ準備**

---

## 参考情報

### 関連ファイル
- TimeBox: `/src/frontend/islands/timebox/js/timebox-core.js`
- TaskGrid: `/src/frontend/islands/taskgrid/js/taskgrid-data.js`
- API Client: `/src/frontend/lib/api.js`
- Database Schema: `/src/backend/definitions/schema.sql`

### 既存機能への影響
- 既存のTaskGrid機能は一切影響を受けない
- TimeBoxの現在のLocalStorage機能は段階的に移行
- APIクライアントに新しいメソッドを追加するのみ