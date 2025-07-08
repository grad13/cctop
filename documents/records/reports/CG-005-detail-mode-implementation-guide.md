# CG-005: Detail Mode Implementation Guide

**作成日**: 2025年7月7日 24:00  
**作成者**: Architect Agent  
**Version**: 1.0.0  
**関連仕様**: BP-M3, FUNC-400-404  
**ステータス**: 📋 Implementation Ready

## 📊 概要

このガイドは、BP-M3 Detail Mode Architectureで策定された詳細モード機能の**具体的実装方法**を定義します。blessed.jsを活用した2ペイン表示、データアクセス層設計、既存FUNC統合、テスト戦略の詳細を提供し、開発者が即座に実装開始できる状態を目指します。

**対象開発者**: Builder Agent（実装担当）  
**実装順序**: Phase 1-4の段階的実装  
**技術スタック**: blessed.js + SQLite3 + TypeScript

## 🏗️ blessed.js技術実装詳細

### 1. 2ペイン分割レイアウト実装

#### FUNC-404左右分割の実装戦略

```typescript
// レイアウト管理クラス
class DualPaneLayout {
  private screen: blessed.Widgets.Screen;
  private leftPane: blessed.Widgets.Box;
  private rightPane: blessed.Widgets.Box;
  private leftPaneList: blessed.Widgets.List;
  private rightPaneContent: blessed.Widgets.Box;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
    this.initializeLayout();
  }

  private initializeLayout() {
    // 左ペイン（Event History - 60%）
    this.leftPane = blessed.box({
      parent: this.screen,
      left: 0,
      top: 0,
      width: '60%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: { fg: 'white' }
      },
      tags: true
    });

    // 右ペイン（File Statistics - 40%）
    this.rightPane = blessed.box({
      parent: this.screen,
      left: '60%',
      top: 0,
      width: '40%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: { fg: 'white' }
      },
      tags: true
    });

    // 左ペイン内のリスト（履歴表示）
    this.leftPaneList = blessed.list({
      parent: this.leftPane,
      left: 1,
      top: 1,
      width: '100%-2',
      height: '100%-3', // フッター用スペース
      keys: true,
      mouse: false,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        },
        item: {
          fg: 'white'
        }
      },
      tags: true
    });

    // 右ペイン内のコンテンツ（統計表示）
    this.rightPaneContent = blessed.box({
      parent: this.rightPane,
      left: 1,
      top: 1,
      width: '100%-2',
      height: '100%-2',
      tags: true,
      scrollable: true
    });
  }

  // データ設定メソッド
  public setHistoryData(events: EventRowData[]) {
    const items = events.map(event => 
      `${event.eventTimestamp} ${event.eventType.padEnd(8)} ${event.lines.toString().padStart(6)}`
    );
    this.leftPaneList.setItems(items);
    this.screen.render();
  }

  public setStatisticsData(stats: FileStatistics) {
    const content = this.formatStatistics(stats);
    this.rightPaneContent.setContent(content);
    this.screen.render();
  }

  private formatStatistics(stats: FileStatistics): string {
    return `FileID: ${stats.fileId}  inode: ${stats.inode}

Created:     ${stats.created}
Last Update: ${stats.lastUpdate}

Number of Events
Create=${stats.createCount}  Delete=${stats.deleteCount}   Modify=${stats.modifyCount}
Move=${stats.moveCount}   Restore=${stats.restoreCount}  Total=${stats.totalCount}

Metric Statistics
      Byte  Line Block
First  ${stats.metrics.first.bytes.toString().padStart(3)}   ${stats.metrics.first.lines.toString().padStart(3)}   ${stats.metrics.first.blocks.toString().padStart(3)}
Last   ${stats.metrics.last.bytes.toString().padStart(3)}   ${stats.metrics.last.lines.toString().padStart(3)}   ${stats.metrics.last.blocks.toString().padStart(3)}
Max    ${stats.metrics.max.bytes.toString().padStart(3)}   ${stats.metrics.max.lines.toString().padStart(3)}   ${stats.metrics.max.blocks.toString().padStart(3)}
Avg    ${stats.metrics.avg.bytes.toString().padStart(3)}   ${stats.metrics.avg.lines.toString().padStart(3)}   ${stats.metrics.avg.blocks.toString().padStart(3)}`;
  }
}
```

#### FUNC-401縦分割の実装戦略

```typescript
// 縦分割レイアウト管理クラス
class VerticalSplitLayout {
  private screen: blessed.Widgets.Screen;
  private topPane: blessed.Widgets.Box;
  private bottomPane: blessed.Widgets.Box;
  private historyList: blessed.Widgets.List;

  constructor(screen: blessed.Widgets.Screen) {
    this.screen = screen;
    this.initializeLayout();
  }

  private initializeLayout() {
    // 上段ペイン（Aggregate Display - FUNC-402）
    this.topPane = blessed.box({
      parent: this.screen,
      left: 0,
      top: 0,
      width: '100%',
      height: '60%',
      border: {
        type: 'line'
      },
      label: ' File Details ',
      style: {
        border: { fg: 'white' }
      },
      tags: true,
      content: '' // FUNC-402のコンテンツ
    });

    // 下段ペイン（History Display - FUNC-403）
    this.bottomPane = blessed.box({
      parent: this.screen,
      left: 0,
      top: '60%',
      width: '100%',
      height: '40%',
      border: {
        type: 'line'
      },
      label: ' Operation History (Latest 50) ',
      style: {
        border: { fg: 'white' }
      },
      tags: true
    });

    // 履歴リスト（FUNC-403）
    this.historyList = blessed.list({
      parent: this.bottomPane,
      left: 1,
      top: 1,
      width: '100%-2',
      height: '100%-3',
      keys: true,
      mouse: false,
      style: {
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      tags: true
    });
  }
}
```

### 2. キーボードナビゲーション実装

#### 選択状態管理（FUNC-400）

```typescript
class InteractiveSelection {
  private screen: blessed.Widgets.Screen;
  private eventList: blessed.Widgets.List;
  private currentSelection: number = -1;
  private isSelectionMode: boolean = false;

  constructor(screen: blessed.Widgets.Screen, eventList: blessed.Widgets.List) {
    this.screen = screen;
    this.eventList = eventList;
    this.initializeKeyHandlers();
  }

  private initializeKeyHandlers() {
    // 上下キーで選択開始
    this.screen.key(['up', 'down'], (ch, key) => {
      if (!this.isSelectionMode) {
        this.enterSelectionMode();
      }
      this.handleNavigation(key.name);
    });

    // Enterキーで詳細表示
    this.screen.key(['enter'], () => {
      if (this.isSelectionMode && this.currentSelection >= 0) {
        this.confirmSelection();
      }
    });

    // Escキーで選択終了
    this.screen.key(['escape'], () => {
      if (this.isSelectionMode) {
        this.exitSelectionMode();
      }
    });
  }

  private enterSelectionMode() {
    this.isSelectionMode = true;
    this.currentSelection = 0;
    this.updateSelectionDisplay();
  }

  private handleNavigation(direction: string) {
    const itemCount = this.eventList.items.length;
    if (itemCount === 0) return;

    if (direction === 'up') {
      this.currentSelection = Math.max(0, this.currentSelection - 1);
    } else if (direction === 'down') {
      this.currentSelection = Math.min(itemCount - 1, this.currentSelection + 1);
    }

    this.updateSelectionDisplay();
  }

  private updateSelectionDisplay() {
    this.eventList.select(this.currentSelection);
    this.screen.render();
  }

  private confirmSelection() {
    const selectedEvent = this.getSelectedEvent();
    if (selectedEvent) {
      // FUNC-401またはFUNC-404へ遷移
      this.transitionToDetailMode(selectedEvent);
    }
  }

  private exitSelectionMode() {
    this.isSelectionMode = false;
    this.currentSelection = -1;
    this.eventList.clearItems();
    this.screen.render();
  }
}
```

### 3. フォーカス・選択状態の視覚化

#### 色・スタイル管理

```typescript
interface SelectionStyles {
  normal: blessed.Widgets.IStyle;
  selected: blessed.Widgets.IStyle;
  focused: blessed.Widgets.IStyle;
}

class StyleManager {
  private styles: SelectionStyles;

  constructor() {
    this.styles = {
      normal: {
        fg: 'white',
        bg: 'black'
      },
      selected: {
        fg: 'white',
        bg: 'blue'
      },
      focused: {
        fg: 'yellow',
        bg: 'blue'
      }
    };
  }

  applySelectionStyle(element: blessed.Widgets.BlessedElement, state: 'normal' | 'selected' | 'focused') {
    element.style = { ...element.style, ...this.styles[state] };
  }

  // FUNC-207との連携：色設定の動的読み込み
  loadColorConfig(config: ColorConfig) {
    if (config.selection) {
      this.styles.selected = {
        fg: config.selection.foreground,
        bg: config.selection.background
      };
    }
  }
}
```

## 💾 データアクセス層設計

### 1. aggregatesテーブル統計取得

#### StatisticsDataAccess クラス

```typescript
class StatisticsDataAccess {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // FUNC-402用：基本統計取得
  async getFileStatistics(fileId: number): Promise<FileStatistics> {
    const query = `
      SELECT 
        f.file_id,
        f.inode,
        f.file_path,
        f.file_name,
        a.create_count,
        a.delete_count,
        a.modify_count,
        a.move_count,
        a.restore_count,
        a.total_events,
        a.first_event_timestamp,
        a.last_event_timestamp,
        a.first_size_bytes,
        a.last_size_bytes,
        a.max_size_bytes,
        a.avg_size_bytes,
        a.first_line_count,
        a.last_line_count,
        a.max_line_count,
        a.avg_line_count,
        a.first_block_count,
        a.last_block_count,
        a.max_block_count,
        a.avg_block_count
      FROM files f
      LEFT JOIN aggregates a ON f.file_id = a.file_id
      WHERE f.file_id = ?
    `;

    const result = await this.db.get(query, [fileId]);
    return this.mapToFileStatistics(result);
  }

  private mapToFileStatistics(row: any): FileStatistics {
    return {
      fileId: row.file_id,
      inode: row.inode,
      filePath: row.file_path,
      fileName: row.file_name,
      createCount: row.create_count || 0,
      deleteCount: row.delete_count || 0,
      modifyCount: row.modify_count || 0,
      moveCount: row.move_count || 0,
      restoreCount: row.restore_count || 0,
      totalCount: row.total_events || 0,
      created: row.first_event_timestamp,
      lastUpdate: row.last_event_timestamp,
      metrics: {
        first: {
          bytes: row.first_size_bytes || 0,
          lines: row.first_line_count || 0,
          blocks: row.first_block_count || 0
        },
        last: {
          bytes: row.last_size_bytes || 0,
          lines: row.last_line_count || 0,
          blocks: row.last_block_count || 0
        },
        max: {
          bytes: row.max_size_bytes || 0,
          lines: row.max_line_count || 0,
          blocks: row.max_block_count || 0
        },
        avg: {
          bytes: Math.round(row.avg_size_bytes || 0),
          lines: Math.round(row.avg_line_count || 0),
          blocks: Math.round(row.avg_block_count || 0)
        }
      }
    };
  }
}
```

### 2. eventsテーブル履歴取得

#### HistoryDataAccess クラス

```typescript
class HistoryDataAccess {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // FUNC-403用：イベント履歴取得
  async getFileHistory(fileId: number, limit: number = 50, offset: number = 0): Promise<EventRowData[]> {
    const query = `
      SELECT 
        e.event_id,
        e.event_timestamp,
        e.event_type,
        m.line_count,
        m.block_count,
        m.size_bytes
      FROM events e
      LEFT JOIN measurements m ON e.event_id = m.event_id
      WHERE e.file_id = ?
      ORDER BY e.event_timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const results = await this.db.all(query, [fileId, limit, offset]);
    return results.map(row => this.mapToEventRowData(row));
  }

  // ページング対応：総件数取得
  async getFileHistoryCount(fileId: number): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM events e
      WHERE e.file_id = ?
    `;

    const result = await this.db.get(query, [fileId]);
    return result.count;
  }

  private mapToEventRowData(row: any): EventRowData {
    return {
      eventId: row.event_id,
      eventTimestamp: this.formatTimestamp(row.event_timestamp),
      eventType: row.event_type,
      lines: row.line_count || 0,
      blocks: row.block_count || 0,
      sizeBytes: row.size_bytes || 0
    };
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }
}
```

### 3. 効率的データローディング戦略

#### LazyLoadManager クラス

```typescript
class LazyLoadManager {
  private historyDataAccess: HistoryDataAccess;
  private cache: Map<number, EventRowData[]> = new Map();
  private readonly CACHE_SIZE = 100; // イベント数
  private readonly PAGE_SIZE = 20;

  constructor(historyDataAccess: HistoryDataAccess) {
    this.historyDataAccess = historyDataAccess;
  }

  async loadHistoryPage(fileId: number, page: number): Promise<EventRowData[]> {
    const cacheKey = this.getCacheKey(fileId, page);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const offset = page * this.PAGE_SIZE;
    const events = await this.historyDataAccess.getFileHistory(fileId, this.PAGE_SIZE, offset);
    
    // キャッシュサイズ管理
    if (this.cache.size >= this.CACHE_SIZE) {
      this.evictOldestCache();
    }

    this.cache.set(cacheKey, events);
    return events;
  }

  private getCacheKey(fileId: number, page: number): number {
    return fileId * 1000 + page; // 簡易的なキー生成
  }

  private evictOldestCache() {
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }

  clearCache() {
    this.cache.clear();
  }
}
```

## 🔗 既存FUNC統合仕様

### 1. FUNC-202との連携

#### DisplayStateManager クラス

```typescript
class DisplayStateManager {
  private currentState: 'stream' | 'selection' | 'detail' = 'stream';
  private func202Display: FUNC202Display;
  
  constructor(func202Display: FUNC202Display) {
    this.func202Display = func202Display;
  }

  // FUNC-202 → FUNC-400遷移
  transitionToSelectionMode(events: EventRowData[]) {
    this.currentState = 'selection';
    
    // FUNC-202のstream表示を一時停止
    this.func202Display.pauseStream();
    
    // 選択UI表示開始
    this.initializeSelectionUI(events);
  }

  // FUNC-400 → FUNC-401/404遷移
  transitionToDetailMode(selectedEvent: EventRowData) {
    this.currentState = 'detail';
    
    // FUNC-202表示を完全に隠す
    this.func202Display.hide();
    
    // 詳細表示開始
    this.initializeDetailUI(selectedEvent);
  }

  // 詳細モード → FUNC-202復帰
  returnToStreamMode() {
    this.currentState = 'stream';
    
    // 詳細表示終了
    this.cleanupDetailUI();
    
    // FUNC-202表示復帰・再開
    this.func202Display.show();
    this.func202Display.resumeStream();
  }
}
```

### 2. FUNC-300キー統合

#### KeyIntegrationManager クラス

```typescript
class KeyIntegrationManager {
  private func300KeyManager: FUNC300KeyManager;
  private detailModeHandlers: Map<string, () => void> = new Map();

  constructor(func300KeyManager: FUNC300KeyManager) {
    this.func300KeyManager = func300KeyManager;
    this.registerDetailModeKeys();
  }

  private registerDetailModeKeys() {
    // FUNC-400選択モードキー
    this.detailModeHandlers.set('up', () => this.handleNavigationUp());
    this.detailModeHandlers.set('down', () => this.handleNavigationDown());
    this.detailModeHandlers.set('enter', () => this.handleConfirmSelection());
    this.detailModeHandlers.set('escape', () => this.handleExitSelection());

    // FUNC-401/404詳細モードキー
    this.detailModeHandlers.set('q', () => this.handleExitDetail());

    // FUNC-300に動的登録
    this.func300KeyManager.registerModeKeys('selection', this.detailModeHandlers);
    this.func300KeyManager.registerModeKeys('detail', this.detailModeHandlers);
  }

  // モード切り替え時のキー処理変更
  activateSelectionMode() {
    this.func300KeyManager.setActiveMode('selection');
  }

  activateDetailMode() {
    this.func300KeyManager.setActiveMode('detail');
  }

  deactivateDetailModes() {
    this.func300KeyManager.setActiveMode('stream'); // FUNC-202のデフォルトモード
  }
}
```

## 🧪 テスト戦略

### 1. Unit Testing（各FUNC独立）

#### FUNC-400 Interactive Selection Tests

```typescript
describe('FUNC-400 Interactive Selection Mode', () => {
  let mockScreen: blessed.Widgets.Screen;
  let mockEventList: blessed.Widgets.List;
  let interactiveSelection: InteractiveSelection;

  beforeEach(() => {
    mockScreen = createMockBlessedScreen();
    mockEventList = createMockBlessedList();
    interactiveSelection = new InteractiveSelection(mockScreen, mockEventList);
  });

  describe('Selection State Management', () => {
    test('should enter selection mode on arrow key press', () => {
      // 上下キー押下時の選択モード開始テスト
      interactiveSelection.handleKeyPress('up');
      expect(interactiveSelection.isSelectionMode).toBe(true);
      expect(interactiveSelection.currentSelection).toBe(0);
    });

    test('should navigate between items correctly', () => {
      // ナビゲーション正確性テスト
      const testEvents = generateTestEvents(5);
      interactiveSelection.setEvents(testEvents);
      
      interactiveSelection.handleKeyPress('up'); // 選択開始
      interactiveSelection.handleKeyPress('down'); // 1つ下に移動
      
      expect(interactiveSelection.currentSelection).toBe(1);
    });

    test('should handle boundary conditions', () => {
      // 境界条件テスト（最上位・最下位）
      const testEvents = generateTestEvents(3);
      interactiveSelection.setEvents(testEvents);
      
      interactiveSelection.handleKeyPress('up'); // 選択開始（index 0）
      interactiveSelection.handleKeyPress('up'); // 上端境界
      expect(interactiveSelection.currentSelection).toBe(0);
      
      interactiveSelection.handleKeyPress('down'); // 1
      interactiveSelection.handleKeyPress('down'); // 2
      interactiveSelection.handleKeyPress('down'); // 下端境界
      expect(interactiveSelection.currentSelection).toBe(2);
    });
  });

  describe('Visual Selection Updates', () => {
    test('should update display on selection change', () => {
      // 選択変更時の表示更新テスト
      const renderSpy = jest.spyOn(mockScreen, 'render');
      
      interactiveSelection.handleKeyPress('up');
      expect(renderSpy).toHaveBeenCalled();
    });

    test('should apply correct selection styles', () => {
      // 選択スタイル適用テスト
      const styleManager = new StyleManager();
      const mockElement = createMockBlessedElement();
      
      styleManager.applySelectionStyle(mockElement, 'selected');
      expect(mockElement.style.bg).toBe('blue');
      expect(mockElement.style.fg).toBe('white');
    });
  });
});
```

#### FUNC-402/403 Data Display Tests

```typescript
describe('FUNC-402 Aggregate Display Module', () => {
  let statisticsDataAccess: StatisticsDataAccess;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    statisticsDataAccess = new StatisticsDataAccess(mockDb);
  });

  describe('Statistics Data Retrieval', () => {
    test('should retrieve complete file statistics', async () => {
      // 統計データ取得テスト
      const mockStatistics = createMockFileStatistics();
      mockDb.get.mockResolvedValue(mockStatistics);

      const result = await statisticsDataAccess.getFileStatistics(123);
      
      expect(result.fileId).toBe(123);
      expect(result.totalCount).toBe(121);
      expect(result.metrics.max.bytes).toBe(999);
    });

    test('should handle missing aggregate data gracefully', async () => {
      // aggregateデータ欠損時の処理テスト
      mockDb.get.mockResolvedValue({ file_id: 123, inode: 456 }); // aggregateなし

      const result = await statisticsDataAccess.getFileStatistics(123);
      
      expect(result.createCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });
});

describe('FUNC-403 History Display Module', () => {
  let historyDataAccess: HistoryDataAccess;
  let lazyLoadManager: LazyLoadManager;
  let mockDb: Database;

  beforeEach(() => {
    mockDb = createMockDatabase();
    historyDataAccess = new HistoryDataAccess(mockDb);
    lazyLoadManager = new LazyLoadManager(historyDataAccess);
  });

  describe('History Data Retrieval', () => {
    test('should retrieve paginated history correctly', async () => {
      // ページング履歴取得テスト
      const mockEvents = generateMockEvents(20);
      mockDb.all.mockResolvedValue(mockEvents);

      const result = await historyDataAccess.getFileHistory(123, 20, 0);
      
      expect(result).toHaveLength(20);
      expect(result[0].eventTimestamp).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    });

    test('should cache frequently accessed history pages', async () => {
      // キャッシュ機能テスト
      const mockEvents = generateMockEvents(20);
      mockDb.all.mockResolvedValue(mockEvents);

      // 初回ロード
      await lazyLoadManager.loadHistoryPage(123, 0);
      expect(mockDb.all).toHaveBeenCalledTimes(1);

      // 2回目ロード（キャッシュから）
      await lazyLoadManager.loadHistoryPage(123, 0);
      expect(mockDb.all).toHaveBeenCalledTimes(1); // 呼び出し回数不変
    });
  });
});
```

### 2. Integration Testing（FUNC間連携）

#### FUNC-202 ↔ FUNC-400 連携テスト

```typescript
describe('FUNC-202 to FUNC-400 Integration', () => {
  let displayStateManager: DisplayStateManager;
  let mockFunc202Display: FUNC202Display;

  beforeEach(() => {
    mockFunc202Display = createMockFUNC202Display();
    displayStateManager = new DisplayStateManager(mockFunc202Display);
  });

  test('should transition from stream to selection mode', () => {
    // ストリーム → 選択モード遷移テスト
    const testEvents = generateTestEvents(10);
    
    displayStateManager.transitionToSelectionMode(testEvents);
    
    expect(mockFunc202Display.pauseStream).toHaveBeenCalled();
    expect(displayStateManager.currentState).toBe('selection');
  });

  test('should return to stream mode from detail mode', () => {
    // 詳細モード → ストリーム復帰テスト
    displayStateManager.transitionToDetailMode(generateTestEvents(1)[0]);
    displayStateManager.returnToStreamMode();
    
    expect(mockFunc202Display.show).toHaveBeenCalled();
    expect(mockFunc202Display.resumeStream).toHaveBeenCalled();
    expect(displayStateManager.currentState).toBe('stream');
  });
});
```

### 3. E2E Testing（実環境統合）

#### 詳細モード完全フローテスト

```typescript
describe('Detail Mode E2E Flow', () => {
  let cctopApp: CCTopApplication;
  let testDatabase: Database;

  beforeAll(async () => {
    // テスト用データベース・アプリケーション準備
    testDatabase = await createTestDatabase();
    await seedTestData(testDatabase);
    cctopApp = new CCTopApplication(testDatabase);
  });

  test('complete detail mode user journey', async () => {
    // 完全なユーザージャーニーテスト
    
    // 1. アプリケーション起動 → ストリーム表示
    await cctopApp.start();
    expect(cctopApp.getCurrentMode()).toBe('stream');

    // 2. 上下キー → 選択モード開始
    await cctopApp.sendKeyInput('up');
    expect(cctopApp.getCurrentMode()).toBe('selection');

    // 3. Enter → 詳細モード移行
    await cctopApp.sendKeyInput('enter');
    expect(cctopApp.getCurrentMode()).toBe('detail');

    // 4. 詳細表示データ検証
    const detailData = cctopApp.getDetailModeData();
    expect(detailData.statistics).toBeDefined();
    expect(detailData.history).toBeDefined();
    expect(detailData.history.length).toBeGreaterThan(0);

    // 5. ESC → ストリーム復帰
    await cctopApp.sendKeyInput('escape');
    expect(cctopApp.getCurrentMode()).toBe('stream');
  });

  test('navigation within detail mode', async () => {
    // 詳細モード内ナビゲーションテスト
    await cctopApp.start();
    await cctopApp.sendKeyInput('up'); // 選択開始
    await cctopApp.sendKeyInput('enter'); // 詳細表示

    // 履歴内ナビゲーション
    await cctopApp.sendKeyInput('down');
    const selectedHistoryIndex = cctopApp.getSelectedHistoryIndex();
    expect(selectedHistoryIndex).toBe(1);

    await cctopApp.sendKeyInput('up');
    expect(cctopApp.getSelectedHistoryIndex()).toBe(0);
  });
});
```

## 🚨 エラーハンドリング戦略

### 1. データ取得エラー対応

#### DatabaseErrorHandler クラス

```typescript
class DatabaseErrorHandler {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async handleStatisticsError(fileId: number, error: Error): Promise<FileStatistics | null> {
    this.logger.error(`Failed to retrieve statistics for fileId ${fileId}:`, error);

    // フォールバック：基本情報のみ返却
    try {
      const basicInfo = await this.getBasicFileInfo(fileId);
      return this.createEmptyStatistics(basicInfo);
    } catch (fallbackError) {
      this.logger.error(`Fallback also failed for fileId ${fileId}:`, fallbackError);
      return null;
    }
  }

  async handleHistoryError(fileId: number, error: Error): Promise<EventRowData[]> {
    this.logger.error(`Failed to retrieve history for fileId ${fileId}:`, error);

    // フォールバック：空の履歴配列
    return [];
  }

  private createEmptyStatistics(basicInfo: BasicFileInfo): FileStatistics {
    return {
      fileId: basicInfo.fileId,
      inode: basicInfo.inode,
      filePath: basicInfo.filePath,
      fileName: basicInfo.fileName,
      createCount: 0,
      deleteCount: 0,
      modifyCount: 0,
      moveCount: 0,
      restoreCount: 0,
      totalCount: 0,
      created: '',
      lastUpdate: '',
      metrics: {
        first: { bytes: 0, lines: 0, blocks: 0 },
        last: { bytes: 0, lines: 0, blocks: 0 },
        max: { bytes: 0, lines: 0, blocks: 0 },
        avg: { bytes: 0, lines: 0, blocks: 0 }
      }
    };
  }
}
```

### 2. UI表示エラー対応

#### UIErrorRecovery クラス

```typescript
class UIErrorRecovery {
  private screen: blessed.Widgets.Screen;
  private logger: Logger;

  constructor(screen: blessed.Widgets.Screen, logger: Logger) {
    this.screen = screen;
    this.logger = logger;
  }

  handleLayoutError(error: Error, componentName: string) {
    this.logger.error(`Layout error in ${componentName}:`, error);

    // エラーメッセージ表示
    const errorBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 5,
      border: { type: 'line' },
      style: {
        border: { fg: 'red' },
        fg: 'red'
      },
      content: `Error in ${componentName}: ${error.message}\nPress any key to return to stream mode.`,
      tags: true
    });

    this.screen.render();

    // 任意のキー押下で復帰
    this.screen.once('keypress', () => {
      errorBox.destroy();
      this.returnToSafeMode();
    });
  }

  handleRenderError(error: Error) {
    this.logger.error('Render error:', error);

    try {
      // 強制的に画面クリア・再描画
      this.screen.clearRegion(0, 0, this.screen.width, this.screen.height);
      this.screen.render();
    } catch (renderError) {
      // レンダリング自体が失敗した場合はプロセス終了
      this.logger.fatal('Fatal render error:', renderError);
      process.exit(1);
    }
  }

  private returnToSafeMode() {
    // FUNC-202ストリームモードに強制復帰
    // 詳細実装はFUNC統合時に追加
  }
}
```

## 📁 ファイル構造設計

### 推奨ディレクトリ構造

```
code/main/modules/cli/src/
├── detail-mode/                     # M3 Detail Mode専用
│   ├── components/                  # UI コンポーネント
│   │   ├── InteractiveSelection.ts  # FUNC-400
│   │   ├── DetailInspection.ts      # FUNC-401
│   │   ├── AggregateDisplay.ts      # FUNC-402
│   │   ├── HistoryDisplay.ts        # FUNC-403
│   │   └── DualPaneDetail.ts        # FUNC-404
│   ├── data/                        # データアクセス層
│   │   ├── StatisticsDataAccess.ts
│   │   ├── HistoryDataAccess.ts
│   │   └── LazyLoadManager.ts
│   ├── layout/                      # レイアウト管理
│   │   ├── DualPaneLayout.ts
│   │   ├── VerticalSplitLayout.ts
│   │   └── StyleManager.ts
│   ├── integration/                 # 既存FUNC統合
│   │   ├── DisplayStateManager.ts
│   │   ├── KeyIntegrationManager.ts
│   │   └── FUNC202Integration.ts
│   ├── errors/                      # エラーハンドリング
│   │   ├── DatabaseErrorHandler.ts
│   │   └── UIErrorRecovery.ts
│   └── types/                       # 型定義
│       ├── DetailModeTypes.ts
│       └── LayoutTypes.ts
├── shared/                          # 既存共通機能
└── types/                           # 既存型定義
```

### モジュール分割戦略

```typescript
// detail-mode/index.ts - エクスポート統合
export { InteractiveSelection } from './components/InteractiveSelection';
export { DetailInspection } from './components/DetailInspection';
export { AggregateDisplay } from './components/AggregateDisplay';
export { HistoryDisplay } from './components/HistoryDisplay';
export { DualPaneDetail } from './components/DualPaneDetail';

export { StatisticsDataAccess } from './data/StatisticsDataAccess';
export { HistoryDataAccess } from './data/HistoryDataAccess';
export { LazyLoadManager } from './data/LazyLoadManager';

export { DualPaneLayout } from './layout/DualPaneLayout';
export { VerticalSplitLayout } from './layout/VerticalSplitLayout';
export { StyleManager } from './layout/StyleManager';

export { DisplayStateManager } from './integration/DisplayStateManager';
export { KeyIntegrationManager } from './integration/KeyIntegrationManager';

export { DatabaseErrorHandler } from './errors/DatabaseErrorHandler';
export { UIErrorRecovery } from './errors/UIErrorRecovery';

export type * from './types/DetailModeTypes';
export type * from './types/LayoutTypes';
```

## 🎯 パフォーマンス要件

### レスポンス時間目標

| 操作 | 目標レスポンス時間 | 測定方法 |
|------|-------------------|----------|
| 選択操作（↑↓キー） | 50ms以内 | キー押下→表示更新完了 |
| 詳細表示切り替え | 200ms以内 | Enter押下→詳細画面表示完了 |
| 履歴ナビゲーション | 50ms以内 | ↑↓キー→フォーカス移動完了 |
| データローディング | 500ms以内 | データベースクエリ→表示反映 |
| モード切り替え | 100ms以内 | ESC押下→前モード復帰完了 |

### メモリ使用量制限

| コンポーネント | メモリ制限 | 制限理由 |
|----------------|------------|----------|
| 履歴キャッシュ | 1MB | 長時間実行時のメモリリーク防止 |
| 統計データ | 100KB | 単一ファイル統計の合理的上限 |
| UIコンポーネント | 500KB | blessed.js DOM要素の効率管理 |
| 全体DetailMode | 2MB | 他機能への影響最小化 |

### パフォーマンス監視実装

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): string {
    const timerId = `${operation}_${Date.now()}`;
    this.metrics.set(timerId, [performance.now()]);
    return timerId;
  }

  endTimer(timerId: string): number {
    const times = this.metrics.get(timerId);
    if (!times) return -1;

    const duration = performance.now() - times[0];
    this.metrics.delete(timerId);
    
    // 閾値超過時の警告
    this.checkPerformanceThreshold(timerId, duration);
    
    return duration;
  }

  private checkPerformanceThreshold(operation: string, duration: number) {
    const thresholds = {
      'selection': 50,
      'detail_transition': 200,
      'history_navigation': 50,
      'data_loading': 500,
      'mode_switch': 100
    };

    const operationType = operation.split('_')[0];
    const threshold = thresholds[operationType];

    if (threshold && duration > threshold) {
      console.warn(`Performance threshold exceeded: ${operation} took ${duration}ms (limit: ${threshold}ms)`);
    }
  }
}
```

## 🔄 実装計画

### Phase 1: Interactive Selection (FUNC-400)
**期間**: 3-4日  
**成果物**:
- InteractiveSelection.ts
- 選択状態管理・キー処理
- FUNC-202との基本連携

### Phase 2: Vertical Split Detail (FUNC-401, 402, 403)
**期間**: 5-6日  
**成果物**:
- VerticalSplitLayout.ts
- AggregateDisplay.ts, HistoryDisplay.ts
- データアクセス層（Statistics, History）

### Phase 3: Dual Pane Detail (FUNC-404)
**期間**: 4-5日  
**成果物**:
- DualPaneLayout.ts
- DualPaneDetail.ts
- 左右分割レイアウト完全実装

### Phase 4: Integration & Optimization
**期間**: 3-4日  
**成果物**:
- 全FUNC統合テスト
- パフォーマンス最適化
- エラーハンドリング完了

### 総実装期間: 15-19日

---

**実装開始準備完了**: このガイドに基づいてBuilder Agentが即座に実装開始可能です。各Phase完了時にArchitectへのレビュー依頼を推奨します。