# v007: Tracer Analysis Vision

**Document ID**: v007-tracer-analysis-vision  
**Created**: 2025-06-23 02:40  
**Author**: Architect Agent  
**Status**: Active  
**Parent**: v004-cctop-core-features-vision
**Purpose**: Tracer機能の詳細ビジョンと3モード設計

## 🎯 ビジョンステートメント

**「直感的な3モード分析体験」** - ファイル活動の全体像から詳細まで、シームレスにナビゲートできる分析インターフェースを提供する。inode等のファイルシステム固有識別子を活用し、ファイル名変更やmoveにも追従する正確な履歴追跡を実現する。

## 🏗️ Tracerアーキテクチャ

### モード遷移フロー
```
┌─────────────┐    Select    ┌──────────────┐   Enter   ┌─────────────┐
│ Unique Mode │ ──────────→ │Selection Mode│ ────────→ │ Detail Mode │
│  (Overview) │ ←────────── │  (Navigate)  │ ←──────── │  (Inspect) │
└─────────────┘     Esc      └──────────────┘    Esc    └─────────────┘
```

### 状態管理設計
```typescript
class TracerStateManager {
  private currentMode: 'unique' | 'selection' | 'detail';
  private selectedFile: string | null;
  private selectedInode: number | null;  // inode追跡用
  private cursorPosition: number;
  private viewportOffset: number;
  private history: ModeTransition[];
  
  // モード遷移
  transition(to: TracerMode): void {
    this.history.push({
      from: this.currentMode,
      to: to,
      timestamp: Date.now()
    });
    this.currentMode = to;
  }
}
```

### ファイル追跡メカニズム
```typescript
class FileIdentityTracker {
  // inodeベースの追跡システム
  async trackFile(filePath: string): Promise<FileIdentity> {
    const stats = await fs.stat(filePath);
    
    return {
      currentPath: filePath,
      inode: stats.ino,
      deviceId: stats.dev,
      birthtime: stats.birthtime,
      // 過去のパスを含む履歴
      pathHistory: await this.getPathHistory(stats.ino)
    };
  }
  
  // inodeから履歴を取得
  async getFileHistory(inode: number): Promise<FileEvent[]> {
    return await this.db.query(`
      SELECT * FROM events 
      WHERE inode = ? 
      ORDER BY timestamp DESC
    `, [inode]);
  }
  
  // rename/move検出
  detectPathChanges(previousPath: string, currentInode: number): PathChange[] {
    // 同じinodeで異なるパス = rename/move
    const changes = this.db.query(`
      SELECT DISTINCT file_path, timestamp 
      FROM events 
      WHERE inode = ? 
      ORDER BY timestamp
    `, [currentInode]);
    
    return this.analyzePathChanges(changes);
  }
}
```

## 📊 Mode 1: Unique Mode（概要表示）

### コンセプト
**「一目で分かるファイル活動状況」** - 各ファイルの最新状態を重複なく表示

### 表示仕様
```
┌─ Unique Mode ─────────────────────────────────────────┐
│ [M] src/index.js          2025-06-23 14:30:15         │
│ [C] tests/new-test.js     2025-06-23 14:28:03         │
│ [D] old-config.json       2025-06-23 14:25:44         │
│ [M] README.md             2025-06-23 14:22:11         │
│ [M] src/utils/helper.js   2025-06-23 14:20:33         │
├───────────────────────────────────────────────────────┤
│ Files: 5 | Latest: 2 min ago | Filter: None          │
└───────────────────────────────────────────────────────┘

Legend: [C]reate [M]odify [D]elete [R]ename [V]moVe
```

### データ取得ロジック
```sql
-- 各ファイルの最新イベントのみ取得
WITH latest_events AS (
  SELECT 
    file_path,
    event_type_id,
    timestamp,
    ROW_NUMBER() OVER (PARTITION BY file_path ORDER BY timestamp DESC) as rn
  FROM events
  WHERE timestamp > :cutoff_time  -- 設定可能な期間フィルタ
)
SELECT 
  le.file_path,
  et.name as event_type,
  le.timestamp,
  os.total_events,
  os.last_size
FROM latest_events le
JOIN event_types et ON le.event_type_id = et.id
LEFT JOIN object_statistics os ON le.file_path = os.file_path
WHERE le.rn = 1
ORDER BY le.timestamp DESC
LIMIT :display_limit;
```

### インタラクション
- **スクロール**: ↑↓ or j/k でリスト内移動
- **ページング**: PgUp/PgDn で高速スクロール
- **選択開始**: Enter or Space でSelection Modeへ
- **フィルタ**: / でフィルタモード開始
- **更新**: r でリフレッシュ

### リアルタイム更新
```javascript
class UniqueMode {
  private updateInterval = 1000; // 1秒ごと
  private pendingUpdates: FileEvent[] = [];
  
  startRealtimeUpdate() {
    this.eventSubscription = eventBus.subscribe(event => {
      this.pendingUpdates.push(event);
    });
    
    this.updateTimer = setInterval(() => {
      if (this.pendingUpdates.length > 0) {
        this.batchUpdate(this.pendingUpdates);
        this.pendingUpdates = [];
      }
    }, this.updateInterval);
  }
}
```

## 🎯 Mode 2: Selection Mode（選択操作）

### コンセプト
**「スムーズなファイル選択体験」** - キーボードだけで直感的にファイルを選択

### 表示仕様
```
┌─ Selection Mode ──────────────────────────────────────┐
│   src/index.js            2025-06-23 14:30:15 [M]    │
│ ▶ tests/new-test.js       2025-06-23 14:28:03 [C]    │ ← Selected
│   old-config.json         2025-06-23 14:25:44 [D]    │
│   README.md               2025-06-23 14:22:11 [M]    │
│   src/utils/helper.js     2025-06-23 14:20:33 [M]    │
├───────────────────────────────────────────────────────┤
│ Selected: tests/new-test.js | Events: 3 | Size: 2.1KB│
│ [Enter] Detail View | [Esc] Back | [/] Filter        │
└───────────────────────────────────────────────────────┘
```

### 選択状態管理
```typescript
class SelectionMode {
  private selectedIndex: number = 0;
  private visibleItems: FileInfo[] = [];
  private viewport: { start: number; end: number };
  
  // カーソル移動
  moveCursor(direction: 'up' | 'down' | 'pageUp' | 'pageDown') {
    const oldIndex = this.selectedIndex;
    
    switch(direction) {
      case 'up':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        break;
      case 'down':
        this.selectedIndex = Math.min(this.visibleItems.length - 1, this.selectedIndex + 1);
        break;
      case 'pageUp':
        this.selectedIndex = Math.max(0, this.selectedIndex - this.pageSize);
        break;
      case 'pageDown':
        this.selectedIndex = Math.min(this.visibleItems.length - 1, this.selectedIndex + this.pageSize);
        break;
    }
    
    this.ensureVisible(this.selectedIndex);
    this.updatePreview();
  }
}
```

### キーバインディング
```javascript
const keyBindings = {
  // 基本移動
  'up': () => this.moveCursor('up'),
  'down': () => this.moveCursor('down'),
  'j': () => this.moveCursor('down'),
  'k': () => this.moveCursor('up'),
  
  // 高速移動
  'g': () => this.moveTo('first'),
  'G': () => this.moveTo('last'),
  'ctrl+d': () => this.moveCursor('pageDown'),
  'ctrl+u': () => this.moveCursor('pageUp'),
  
  // アクション
  'enter': () => this.transitionToDetail(),
  'space': () => this.togglePreview(),
  'escape': () => this.transitionToUnique(),
  
  // 追加機能
  'm': () => this.markFile(),
  'a': () => this.selectAll(),
  'i': () => this.invertSelection()
};
```

### プレビュー機能
```typescript
interface PreviewData {
  filePath: string;
  totalEvents: number;
  firstSeen: Date;
  lastModified: Date;
  currentSize: number;
  eventTypeSummary: { [key: string]: number };
  recentEvents: Array<{
    type: string;
    timestamp: Date;
    sizeDelta: number;
  }>;
}
```

## 🔍 Mode 3: Detail Mode（詳細表示）

### コンセプト
**「完全な変更履歴の探索」** - 選択したファイルのすべての活動を時系列で表示

### 表示仕様
```
┌─ Detail Mode: tests/new-test.js ──────────────────────┐
│ Event History (Total: 15 events)                      │
├───────────────────────────────────────────────────────┤
│ 2025-06-23 14:28:03 [CREATE] Initial creation        │
│   Size: 0 → 156 bytes | Lines: 0 → 8                 │
│                                                       │
│ 2025-06-23 14:28:15 [MODIFY] Added test case         │
│   Size: 156 → 423 bytes | Lines: 8 → 22 (+14)        │
│                                                       │
│ 2025-06-23 14:29:44 [MODIFY] Refactored imports      │
│   Size: 423 → 401 bytes | Lines: 22 → 20 (-2)        │
│                                                       │
│ 2025-06-23 14:30:55 [MODIFY] Added assertion         │
│   Size: 401 → 445 bytes | Lines: 20 → 23 (+3)        │
├───────────────────────────────────────────────────────┤
│ Summary: 15 events | 2.5 hours | Avg: 6 events/hour  │
│ [Esc] Back | [f] Filter | [e] Export | [s] Stats     │
└───────────────────────────────────────────────────────┘
```

### データ取得と処理
```sql
-- 選択ファイルの完全履歴取得
SELECT 
  e.timestamp,
  et.name as event_type,
  e.file_size,
  e.line_count,
  e.block_count,
  LAG(e.file_size) OVER (ORDER BY e.timestamp) as prev_size,
  LAG(e.line_count) OVER (ORDER BY e.timestamp) as prev_lines
FROM events e
JOIN event_types et ON e.event_type_id = et.id
WHERE e.file_path = :selected_file_path
ORDER BY e.timestamp DESC;
```

### 高度な分析機能

#### 1. 変更パターン分析
```typescript
class ChangePatternAnalyzer {
  analyze(events: FileEvent[]): ChangePattern {
    return {
      // 時間帯別アクティビティ
      hourlyActivity: this.calculateHourlyDistribution(events),
      
      // セッション検出（30分間隔）
      sessions: this.detectSessions(events, 30 * 60 * 1000),
      
      // 変更サイズ分布
      changeSizeDistribution: this.calculateSizeChanges(events),
      
      // イベントタイプ頻度
      eventTypeFrequency: this.countEventTypes(events),
      
      // バースト検出
      bursts: this.detectBursts(events)
    };
  }
}
```

#### 2. 統計ビュー
```
┌─ Statistics View ─────────────────────────────────────┐
│ File: tests/new-test.js                              │
├───────────────────────────────────────────────────────┤
│ Activity Timeline:                                    │
│ 09:00 ████████████ 12 events                        │
│ 10:00 ██████ 6 events                               │
│ 11:00 ████████████████ 16 events                    │
│ 14:00 ████████ 8 events                             │
│                                                       │
│ Change Size Distribution:                             │
│ Small  (<100B)  : ████████████ 45%                  │
│ Medium (<1KB)   : ████████ 35%                      │
│ Large  (>1KB)   : ████ 20%                          │
│                                                       │
│ Sessions: 5 | Avg Duration: 23 min | Total: 2h 15m  │
└───────────────────────────────────────────────────────┘
```

#### 3. エクスポート機能
```typescript
interface ExportOptions {
  format: 'json' | 'csv' | 'markdown';
  includeMetadata: boolean;
  dateRange?: { start: Date; end: Date };
  eventTypes?: string[];
}

class DetailExporter {
  export(events: FileEvent[], options: ExportOptions): string {
    switch(options.format) {
      case 'json':
        return this.toJSON(events, options);
      case 'csv':
        return this.toCSV(events, options);
      case 'markdown':
        return this.toMarkdown(events, options);
    }
  }
}
```

## 🎨 ビジュアルデザイン

### カラースキーム
```typescript
const colorScheme = {
  // イベントタイプ別
  create: chalk.green,
  modify: chalk.yellow,
  delete: chalk.red,
  rename: chalk.blue,
  move: chalk.magenta,
  
  // UI要素
  selected: chalk.bgBlue.white,
  header: chalk.bold.underline,
  footer: chalk.dim,
  
  // 統計表示
  positive: chalk.green,
  negative: chalk.red,
  neutral: chalk.gray
};
```

### レスポンシブレイアウト
```typescript
class ResponsiveLayout {
  calculateDimensions() {
    const { columns, rows } = process.stdout;
    
    return {
      // コンテンツエリア
      contentWidth: columns - 4,  // 左右マージン
      contentHeight: rows - 6,    // ヘッダー・フッター
      
      // 動的カラム幅
      filePathWidth: Math.max(20, Math.floor(columns * 0.4)),
      timestampWidth: 20,
      eventTypeWidth: 10,
      
      // スクロール可能行数
      visibleRows: rows - 8
    };
  }
}
```

## 🚀 パフォーマンス最適化

### データ仮想化
```typescript
class VirtualScroller {
  private cache: Map<number, FileEvent> = new Map();
  private windowSize = 100;
  
  async getVisibleItems(offset: number, limit: number): Promise<FileEvent[]> {
    // キャッシュチェック
    const cached = this.getCachedRange(offset, limit);
    if (cached.complete) return cached.items;
    
    // 不足分をフェッチ
    const missing = await this.fetchMissing(cached.missingRanges);
    
    // キャッシュ更新
    this.updateCache(missing);
    
    return this.getCachedRange(offset, limit).items;
  }
}
```

### 遅延レンダリング
```typescript
class LazyRenderer {
  private renderQueue: RenderTask[] = [];
  private rafId: number | null = null;
  
  scheduleRender(task: RenderTask) {
    this.renderQueue.push(task);
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.processBatch();
        this.rafId = null;
      });
    }
  }
}
```

## 🎯 成功指標

### ユーザビリティ
- **モード切替時間**: < 50ms
- **キー入力反応**: < 16ms（60fps）
- **スクロール性能**: 10,000行でも滑らか
- **学習曲線**: 5分以内で基本操作習得

### 機能完成度
- **Unique Mode**: 重複なし・リアルタイム更新
- **Selection Mode**: 全キーバインディング実装
- **Detail Mode**: 完全履歴・統計分析機能
- **エクスポート**: 3形式対応

---

**Core Message**: Tracerは、ファイル活動の「森」も「木」も見える、パワフルで直感的な分析ツールである。