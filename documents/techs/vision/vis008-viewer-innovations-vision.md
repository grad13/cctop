# v008: Viewer Innovations Vision

**Document ID**: v008-viewer-innovations-vision  
**Created**: 2025-06-23 02:45  
**Author**: Architect Agent  
**Status**: Active  
**Parent**: v004-cctop-core-features-vision
**Purpose**: Viewer工夫の詳細ビジョンとFilter/Sort機能設計

## 🎯 ビジョンステートメント

**「インテリジェントな情報探索」** - Claude Code開発者の作業パターンを理解し、最も関連性の高い情報を素早く見つけられる高度なViewer機能を提供する。

## 🏗️ Viewer機能アーキテクチャ

### 基本構成
```
┌──────────────────────────────────────────────────────┐
│                   Viewer Core                        │
├─────────────┬────────────┬───────────┬──────────────┤
│   Filter    │    Sort    │  Search   │   Display    │
│   Engine    │   Engine   │  Engine   │   Engine     │
├─────────────┴────────────┴───────────┴──────────────┤
│              Query Optimizer                         │
├──────────────────────────────────────────────────────┤
│              SQLite Database                         │
└──────────────────────────────────────────────────────┘
```

## 🔍 Filter Engine（高度なフィルタリング）

### フィルタタイプ仕様

#### 1. Exact Match（完全一致）
```typescript
class ExactMatchFilter implements Filter {
  constructor(private pattern: string) {}
  
  apply(filePath: string): boolean {
    return filePath === this.pattern;
  }
  
  toSQL(): string {
    return `file_path = ?`;
  }
}
```

#### 2. Wildcard Pattern（ワイルドカード）
```typescript
class WildcardFilter implements Filter {
  private regex: RegExp;
  
  constructor(pattern: string) {
    // *.js → .*\.js$
    // src/* → ^src/.*
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    this.regex = new RegExp(`^${regexPattern}$`);
  }
  
  apply(filePath: string): boolean {
    return this.regex.test(filePath);
  }
}
```

#### 3. Regular Expression（正規表現）
```typescript
class RegexFilter implements Filter {
  private regex: RegExp;
  
  constructor(pattern: string, flags: string = 'i') {
    this.regex = new RegExp(pattern, flags);
  }
  
  apply(filePath: string): boolean {
    return this.regex.test(filePath);
  }
  
  // SQLite REGEXP拡張機能を使用
  toSQL(): string {
    return `file_path REGEXP ?`;
  }
}
```

#### 4. Extension Filter（拡張子）
```typescript
class ExtensionFilter implements Filter {
  private extensions: Set<string>;
  
  constructor(extensions: string[]) {
    this.extensions = new Set(extensions.map(ext => 
      ext.startsWith('.') ? ext : `.${ext}`
    ));
  }
  
  apply(filePath: string): boolean {
    const ext = path.extname(filePath);
    return this.extensions.has(ext);
  }
}
```

#### 5. Directory Filter（ディレクトリ）
```typescript
class DirectoryFilter implements Filter {
  constructor(
    private directory: string,
    private recursive: boolean = true
  ) {}
  
  apply(filePath: string): boolean {
    if (this.recursive) {
      return filePath.startsWith(this.directory + '/');
    } else {
      const dir = path.dirname(filePath);
      return dir === this.directory;
    }
  }
}
```

#### 6. Event Type Filter（イベントタイプ）
```typescript
class EventTypeFilter implements Filter {
  constructor(private eventTypes: string[]) {}
  
  toSQL(): string {
    const placeholders = this.eventTypes.map(() => '?').join(',');
    return `event_type_id IN (SELECT id FROM event_types WHERE name IN (${placeholders}))`;
  }
}
```

### 複合フィルタ（Composite Filters）
```typescript
class CompositeFilter implements Filter {
  constructor(
    private filters: Filter[],
    private operator: 'AND' | 'OR' = 'AND'
  ) {}
  
  apply(filePath: string): boolean {
    if (this.operator === 'AND') {
      return this.filters.every(f => f.apply(filePath));
    } else {
      return this.filters.some(f => f.apply(filePath));
    }
  }
}
```

### フィルタUI/UX
```
┌─ Filter Builder ──────────────────────────────────────┐
│ Active Filters:                                       │
│ ✓ Extension: .js, .ts                               │
│ ✓ Directory: src/ (recursive)                       │
│ ✓ Event Type: Modify                                │
│                                                       │
│ Quick Filters:                                       │
│ [1] Changed Today  [2] Large Files  [3] Test Files  │
│                                                       │
│ Custom: ________________________________ [Regex]     │
│                                                       │
│ Results: 42 files matching                           │
└───────────────────────────────────────────────────────┘
```

## 📊 Sort Engine（インテリジェントソート）

### Claude Session検出アルゴリズム
```typescript
class ClaudeSessionDetector {
  private readonly SESSION_GAP = 30 * 60 * 1000; // 30分
  
  detectSessions(events: FileEvent[]): Session[] {
    const sessions: Session[] = [];
    let currentSession: Session | null = null;
    
    for (const event of events) {
      if (!currentSession || 
          event.timestamp - currentSession.endTime > this.SESSION_GAP) {
        // 新しいセッション開始
        currentSession = {
          id: generateId(),
          startTime: event.timestamp,
          endTime: event.timestamp,
          events: [event],
          fileCount: 1
        };
        sessions.push(currentSession);
      } else {
        // 既存セッションに追加
        currentSession.events.push(event);
        currentSession.endTime = event.timestamp;
      }
    }
    
    return sessions;
  }
}
```

### セッション分析メトリクス
```sql
-- Claude Session単位での統計計算
WITH session_boundaries AS (
  SELECT 
    file_path,
    timestamp,
    event_type_id,
    file_size,
    CASE 
      WHEN timestamp - LAG(timestamp, 1, 0) OVER (
        PARTITION BY file_path ORDER BY timestamp
      ) > 1800000 THEN 1 
      ELSE 0 
    END as is_session_start
  FROM events
),
sessions_numbered AS (
  SELECT 
    *,
    SUM(is_session_start) OVER (
      PARTITION BY file_path 
      ORDER BY timestamp
    ) as session_number
  FROM session_boundaries
),
session_stats AS (
  SELECT 
    file_path,
    session_number,
    COUNT(*) as events_in_session,
    MAX(timestamp) - MIN(timestamp) as session_duration,
    MAX(file_size) - MIN(file_size) as size_change,
    COUNT(DISTINCT event_type_id) as event_type_variety
  FROM sessions_numbered
  GROUP BY file_path, session_number
)
SELECT 
  file_path,
  COUNT(DISTINCT session_number) as total_sessions,
  AVG(events_in_session) as avg_events_per_session,
  AVG(session_duration) as avg_session_duration,
  SUM(ABS(size_change)) as total_size_changes,
  AVG(event_type_variety) as avg_event_variety
FROM session_stats
GROUP BY file_path
ORDER BY avg_events_per_session DESC;
```

### ソート基準実装

#### 1. Session Change Rate（セッション変化率）
```typescript
interface SessionChangeRate {
  filePath: string;
  totalSessions: number;
  avgChangesPerSession: number;
  score: number; // 重み付けスコア
}

class SessionChangeRateSorter implements Sorter {
  calculate(fileStats: FileStatistics[]): SessionChangeRate[] {
    return fileStats.map(stats => ({
      filePath: stats.filePath,
      totalSessions: stats.sessionCount,
      avgChangesPerSession: stats.totalEvents / stats.sessionCount,
      score: this.calculateScore(stats)
    })).sort((a, b) => b.score - a.score);
  }
  
  private calculateScore(stats: FileStatistics): number {
    // 最近のセッションを重視
    const recencyWeight = this.getRecencyWeight(stats.lastModified);
    const changeRate = stats.totalEvents / stats.sessionCount;
    
    return changeRate * recencyWeight;
  }
}
```

#### 2. Recent Activity（最近の活動）
```typescript
class RecentActivitySorter implements Sorter {
  constructor(private windowHours: number = 24) {}
  
  sort(files: FileInfo[]): FileInfo[] {
    const cutoff = Date.now() - (this.windowHours * 60 * 60 * 1000);
    
    return files
      .map(file => ({
        ...file,
        recentEvents: file.events.filter(e => e.timestamp > cutoff).length,
        lastEventAge: Date.now() - file.lastModified
      }))
      .sort((a, b) => {
        // 最近のイベント数優先
        if (a.recentEvents !== b.recentEvents) {
          return b.recentEvents - a.recentEvents;
        }
        // 同数なら最終更新時刻で比較
        return a.lastEventAge - b.lastEventAge;
      });
  }
}
```

#### 3. File Size Changes（サイズ変化量）
```typescript
class FileSizeChangeSorter implements Sorter {
  sort(files: FileInfo[]): FileInfo[] {
    return files
      .map(file => ({
        ...file,
        totalSizeChange: this.calculateTotalChange(file.events),
        growthRate: this.calculateGrowthRate(file.events)
      }))
      .sort((a, b) => b.totalSizeChange - a.totalSizeChange);
  }
  
  private calculateTotalChange(events: FileEvent[]): number {
    let total = 0;
    for (let i = 1; i < events.length; i++) {
      total += Math.abs(events[i].fileSize - events[i-1].fileSize);
    }
    return total;
  }
}
```

### ソートUI表示
```
┌─ Sort Options ────────────────────────────────────────┐
│ Current: Claude Session Activity (Descending)         │
├───────────────────────────────────────────────────────┤
│ [1] Claude Session Activity    ▼                     │
│ [2] Recent Activity (24h)      ○                     │
│ [3] File Size Changes          ○                     │
│ [4] Total Events               ○                     │
│ [5] Last Modified              ○                     │
│ [6] Alphabetical               ○                     │
│                                                       │
│ [Space] Toggle Order | [Enter] Apply | [Esc] Cancel  │
└───────────────────────────────────────────────────────┘
```

## 🔎 Search Engine（高速検索）

### インクリメンタルサーチ
```typescript
class IncrementalSearch {
  private searchBuffer = '';
  private searchResults: SearchResult[] = [];
  private currentIndex = 0;
  
  async onKeyPress(key: string) {
    if (key === 'Enter') {
      this.navigateToResult(this.currentIndex);
    } else if (key === 'Escape') {
      this.clearSearch();
    } else if (key === 'Backspace') {
      this.searchBuffer = this.searchBuffer.slice(0, -1);
    } else {
      this.searchBuffer += key;
    }
    
    // デバウンス検索
    this.debounceSearch();
  }
  
  private debounceSearch = debounce(async () => {
    this.searchResults = await this.performSearch(this.searchBuffer);
    this.updateDisplay();
  }, 150);
}
```

### 検索最適化
```typescript
class SearchOptimizer {
  private cache = new LRUCache<string, SearchResult[]>(100);
  private index: SearchIndex;
  
  async search(query: string): Promise<SearchResult[]> {
    // キャッシュチェック
    if (this.cache.has(query)) {
      return this.cache.get(query)!;
    }
    
    // インデックス検索
    const results = await this.index.search(query);
    
    // キャッシュ更新
    this.cache.set(query, results);
    
    return results;
  }
}
```

## 🎨 Display Engine（表示最適化）

### アダプティブレイアウト
```typescript
class AdaptiveLayout {
  calculateLayout(terminalSize: Size, contentSize: Size): Layout {
    // 画面サイズに応じて最適なレイアウトを計算
    const layout: Layout = {
      columns: [],
      showPreview: false,
      compactMode: false
    };
    
    // 幅が十分ある場合
    if (terminalSize.width > 120) {
      layout.columns = [
        { name: 'status', width: 3 },
        { name: 'filePath', width: 50 },
        { name: 'size', width: 10 },
        { name: 'modified', width: 20 },
        { name: 'events', width: 10 }
      ];
      layout.showPreview = true;
    } 
    // 中程度の幅
    else if (terminalSize.width > 80) {
      layout.columns = [
        { name: 'filePath', width: 40 },
        { name: 'modified', width: 20 }
      ];
    } 
    // 狭い画面
    else {
      layout.compactMode = true;
      layout.columns = [
        { name: 'filePath', width: terminalSize.width - 4 }
      ];
    }
    
    return layout;
  }
}
```

### カラーテーマシステム
```typescript
interface ColorTheme {
  name: string;
  colors: {
    // ファイルタイプ
    javascript: string;
    typescript: string;
    markdown: string;
    json: string;
    
    // イベントタイプ
    create: string;
    modify: string;
    delete: string;
    
    // UI要素
    border: string;
    header: string;
    selected: string;
    highlight: string;
  };
}

class ThemeManager {
  private themes: Map<string, ColorTheme> = new Map([
    ['default', defaultTheme],
    ['dark', darkTheme],
    ['solarized', solarizedTheme],
    ['monokai', monokaiTheme]
  ]);
  
  applyTheme(themeName: string) {
    const theme = this.themes.get(themeName) || this.themes.get('default')!;
    this.currentTheme = theme;
    this.emit('themeChanged', theme);
  }
}
```

## 🚀 パフォーマンス最適化

### クエリ最適化
```sql
-- 複合インデックスによる高速化
CREATE INDEX idx_events_filepath_timestamp ON events(file_path, timestamp DESC);
CREATE INDEX idx_events_session_analysis ON events(file_path, timestamp, event_type_id, file_size);

-- マテリアライズドビュー相当の最適化テーブル
CREATE TABLE file_session_stats AS
SELECT 
  file_path,
  COUNT(DISTINCT session_number) as session_count,
  AVG(events_per_session) as avg_events_per_session,
  MAX(last_modified) as last_modified
FROM (
  -- セッション計算サブクエリ
) GROUP BY file_path;

-- トリガーによる自動更新
CREATE TRIGGER update_session_stats 
AFTER INSERT ON events
BEGIN
  -- 統計テーブル更新ロジック
END;
```

### レンダリング最適化
```typescript
class RenderOptimizer {
  private renderBuffer: string[] = [];
  private isDirty = false;
  
  // バッチレンダリング
  scheduleRender() {
    if (!this.isDirty) {
      this.isDirty = true;
      process.nextTick(() => this.flush());
    }
  }
  
  private flush() {
    if (this.renderBuffer.length > 0) {
      // 一度に全て描画
      process.stdout.write(this.renderBuffer.join(''));
      this.renderBuffer = [];
    }
    this.isDirty = false;
  }
}
```

## 🎯 成功指標

### パフォーマンス指標
- **フィルタ適用時間**: < 100ms（10,000ファイル）
- **ソート実行時間**: < 200ms（10,000ファイル）
- **検索レスポンス**: < 50ms（インクリメンタル）
- **画面更新**: 60fps維持

### ユーザビリティ指標
- **フィルタ構築時間**: < 10秒（複雑な条件）
- **望む情報到達時間**: < 30秒
- **キーストローク数**: 最小化
- **学習曲線**: 10分以内

### 機能完成度
- **フィルタタイプ**: 6種類完全実装
- **ソート基準**: Claude Session対応
- **検索**: リアルタイムレスポンス
- **表示**: アダプティブレイアウト

---

**Core Message**: Viewer工夫により、cctopは単なる表示ツールから、インテリジェントな情報ナビゲーターへと進化する。