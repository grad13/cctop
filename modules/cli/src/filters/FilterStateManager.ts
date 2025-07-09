/**
 * FilterStateManager - HO-20250707-002仕様準拠
 * UI filter機能の集合論的状態管理とvanilla table運用
 */

export interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];
  keywordFilter: string;
}

export interface EventData {
  id: number;
  file_id: number;
  file_name: string;
  event_type: string;
  timestamp: string;
  directory: string;
}

interface OperationHistory {
  type: 'filter' | 'mode' | 'keyword';
  previousState: FilterState;
  timestamp: number;
}

/**
 * FilterStateManager
 * 
 * 核心機能:
 * 1. unique processing → filter check 処理順序の実装
 * 2. vanilla table によるメモリベース状態管理
 * 3. 操作履歴管理とundo機能
 * 4. 集合論的フィルタ適用
 */
export class FilterStateManager {
  private currentState: FilterState;
  private vanillaTable: EventData[] = [];
  private operationHistory: OperationHistory[] = [];
  private readonly MAX_HISTORY = 50;
  private readonly MAX_VANILLA_EVENTS = 1000;

  constructor() {
    this.currentState = this.getDefaultState();
  }

  /**
   * デフォルト状態取得
   */
  private getDefaultState(): FilterState {
    return {
      mode: 'all',
      eventFilters: ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'],
      keywordFilter: ''
    };
  }

  /**
   * 現在のフィルタ状態取得
   */
  getCurrentState(): FilterState {
    return { ...this.currentState };
  }

  /**
   * vanilla table取得
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * vanilla tableにイベント追加
   */
  addToVanillaTable(events: EventData[]): void {
    // Duplicate check (id-based)
    const existingIds = new Set(this.vanillaTable.map(event => event.id));
    const uniqueNewEvents = events.filter(event => !existingIds.has(event.id));

    // Add to vanilla table
    this.vanillaTable.push(...uniqueNewEvents);

    // Capacity management
    if (this.vanillaTable.length > this.MAX_VANILLA_EVENTS) {
      this.optimizeVanillaTable();
    }
  }

  /**
   * vanilla tableにイベント追加 - テスト互換エイリアス
   */
  updateVanillaTable(events: EventData[]): void {
    this.addToVanillaTable(events);
  }

  /**
   * 古いデータの削除（容量管理）
   */
  private optimizeVanillaTable(): void {
    // Sort by timestamp and delete oldest
    this.vanillaTable.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const excessCount = this.vanillaTable.length - this.MAX_VANILLA_EVENTS;
    if (excessCount > 0) {
      this.vanillaTable.splice(0, excessCount);
    }
  }

  /**
   * 操作履歴に追加
   */
  private addToHistory(type: OperationHistory['type']): void {
    const history: OperationHistory = {
      type,
      previousState: { ...this.currentState },
      timestamp: Date.now()
    };

    this.operationHistory.push(history);

    // History size management
    if (this.operationHistory.length > this.MAX_HISTORY) {
      this.operationHistory.shift();
    }
  }

  /**
   * フィルタ状態更新
   */
  updateFilterState(updates: Partial<FilterState>): void {
    this.addToHistory('filter');
    this.currentState = { ...this.currentState, ...updates };
  }

  /**
   * モード切替
   */
  setMode(mode: 'all' | 'unique'): void {
    if (this.currentState.mode !== mode) {
      this.addToHistory('mode');
      this.currentState.mode = mode;
    }
  }

  /**
   * イベントフィルタ設定
   */
  setEventFilters(eventTypes: string[]): void {
    this.addToHistory('filter');
    this.currentState.eventFilters = [...eventTypes];
  }

  /**
   * キーワードフィルタ設定
   */
  setKeywordFilter(keyword: string): void {
    this.addToHistory('keyword');
    this.currentState.keywordFilter = keyword;
  }

  /**
   * フィルタ処理実行 - HO-20250707-002核心仕様
   * 
   * 処理順序: unique processing → filter check
   * 重要: unique処理で最新イベントがfilter対象外の場合、ファイル全体を非表示
   */
  applyFilters(): EventData[] {
    let result = [...this.vanillaTable];

    // 1. Apply unique processing (when mode is 'unique')
    if (this.currentState.mode === 'unique') {
      result = this.applyUniqueProcessing(result);
    }

    // 2. Apply event filters
    result = this.applyEventFilters(result);

    // 3. Apply keyword filter
    result = this.applyKeywordFilter(result);

    // 4. Sort by timestamp in descending order
    result = result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return result;
  }

  /**
   * unique処理実装
   * 各ファイルについて最新イベントのみを抽出
   */
  private applyUniqueProcessing(events: EventData[]): EventData[] {
    const fileLatestEvents = new Map<number, EventData>();

    // Identify latest event for each file
    for (const event of events) {
      const existing = fileLatestEvents.get(event.file_id);
      if (!existing || new Date(event.timestamp) > new Date(existing.timestamp)) {
        fileLatestEvents.set(event.file_id, event);
      }
    }

    return Array.from(fileLatestEvents.values());
  }

  /**
   * イベントフィルタ適用
   * unique処理済みの結果に対してフィルタを適用
   */
  private applyEventFilters(events: EventData[]): EventData[] {
    if (this.currentState.eventFilters.length === 0) {
      return [];
    }

    return events.filter(event => 
      this.currentState.eventFilters.includes(event.event_type)
    );
  }

  /**
   * キーワードフィルタ適用
   */
  private applyKeywordFilter(events: EventData[]): EventData[] {
    const keyword = this.currentState.keywordFilter.trim();
    if (!keyword) {
      return events;
    }

    return events.filter(event =>
      event.file_name.includes(keyword) || event.directory.includes(keyword)
    );
  }

  /**
   * 直前の操作をundo
   */
  undo(): boolean {
    const lastOperation = this.operationHistory.pop();
    if (lastOperation) {
      this.currentState = lastOperation.previousState;
      return true;
    }
    return false;
  }

  /**
   * 全フィルタクリア
   */
  clearAllFilters(): void {
    this.addToHistory('filter');
    this.currentState = this.getDefaultState();
  }

  /**
   * vanilla tableクリア
   */
  clearVanillaTable(): void {
    this.vanillaTable = [];
  }

  /**
   * 操作履歴クリア
   */
  clearHistory(): void {
    this.operationHistory = [];
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    vanillaTableSize: number;
    filteredResultSize: number;
    historySize: number;
  } {
    const filteredResults = this.applyFilters();
    
    return {
      vanillaTableSize: this.vanillaTable.length,
      filteredResultSize: filteredResults.length,
      historySize: this.operationHistory.length
    };
  }

  // ========================================
  // Test compatibility methods - HO-20250707-002 compliant
  // ========================================

  /**
   * モード更新 - テスト互換エイリアス
   */
  updateMode(mode: 'all' | 'unique'): void {
    this.setMode(mode);
  }

  /**
   * イベントフィルタのトグル
   */
  toggleEventFilter(eventType: string): void {
    const currentFilters = [...this.currentState.eventFilters];
    const index = currentFilters.indexOf(eventType);
    
    if (index > -1) {
      currentFilters.splice(index, 1);
    } else {
      currentFilters.push(eventType);
    }
    
    this.setEventFilters(currentFilters);
  }

  /**
   * キーワードフィルタ更新 - テスト互換エイリアス
   */
  updateKeywordFilter(keyword: string): void {
    this.setKeywordFilter(keyword);
  }

  /**
   * フィルタリセット - テスト互換エイリアス
   */
  resetFilters(): void {
    this.clearAllFilters();
  }

  /**
   * 状態取得 - テスト互換エイリアス
   */
  getState(): FilterState {
    return this.getCurrentState();
  }

  /**
   * vanilla tableサイズ取得
   */
  getVanillaTableSize(): number {
    return this.vanillaTable.length;
  }
}