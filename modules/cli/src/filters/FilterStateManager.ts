/**
 * FilterStateManager
 * Set-theoretic state management for UI filter functionality and vanilla table operation
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
 * Core features:
 * 1. Implementation of unique processing → filter check processing order
 * 2. Memory-based state management with vanilla table
 * 3. Operation history management and undo functionality
 * 4. Set-theoretic filter application
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
   * Get default state
   */
  private getDefaultState(): FilterState {
    return {
      mode: 'all',
      eventFilters: ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'],
      keywordFilter: ''
    };
  }

  /**
   * Get current filter state
   */
  getCurrentState(): FilterState {
    return { ...this.currentState };
  }

  /**
   * Get vanilla table
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * Add events to vanilla table
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
   * Add events to vanilla table - test compatibility alias
   */
  updateVanillaTable(events: EventData[]): void {
    this.addToVanillaTable(events);
  }

  /**
   * Delete old data (capacity management)
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
   * Add to operation history
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
   * Update filter state
   */
  updateFilterState(updates: Partial<FilterState>): void {
    this.addToHistory('filter');
    this.currentState = { ...this.currentState, ...updates };
  }

  /**
   * Switch mode
   */
  setMode(mode: 'all' | 'unique'): void {
    if (this.currentState.mode !== mode) {
      this.addToHistory('mode');
      this.currentState.mode = mode;
    }
  }

  /**
   * Set event filters
   */
  setEventFilters(eventTypes: string[]): void {
    this.addToHistory('filter');
    this.currentState.eventFilters = [...eventTypes];
  }

  /**
   * Set keyword filter
   */
  setKeywordFilter(keyword: string): void {
    this.addToHistory('keyword');
    this.currentState.keywordFilter = keyword;
  }

  /**
   * Execute filter processing
   * 
   * Processing order: unique processing → filter check
   * Important: If the latest event is excluded by filter in unique mode, hide the entire file
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
   * Unique processing implementation
   * Extract only the latest event for each file
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
   * Apply event filters
   * Apply filters to unique-processed results
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
   * Apply keyword filter
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
   * Undo last operation
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
   * Clear all filters
   */
  clearAllFilters(): void {
    this.addToHistory('filter');
    this.currentState = this.getDefaultState();
  }

  /**
   * Clear vanilla table
   */
  clearVanillaTable(): void {
    this.vanillaTable = [];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operationHistory = [];
  }

  /**
   * Get statistics
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
  // Test compatibility methods
  // ========================================

  /**
   * Update mode - test compatibility alias
   */
  updateMode(mode: 'all' | 'unique'): void {
    this.setMode(mode);
  }

  /**
   * Toggle event filter
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
   * Update keyword filter - test compatibility alias
   */
  updateKeywordFilter(keyword: string): void {
    this.setKeywordFilter(keyword);
  }

  /**
   * Reset filters - test compatibility alias
   */
  resetFilters(): void {
    this.clearAllFilters();
  }

  /**
   * Get state - test compatibility alias
   */
  getState(): FilterState {
    return this.getCurrentState();
  }

  /**
   * Get vanilla table size
   */
  getVanillaTableSize(): number {
    return this.vanillaTable.length;
  }
}