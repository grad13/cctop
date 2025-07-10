/**
 * DynamicDataLoader
 * Manages dynamic data loading with 3 trigger conditions
 */

export interface EventData {
  id: number;
  file_id: number;
  file_name: string;
  event_type: string;
  timestamp: string;
  directory: string;
}

export interface LoadingState {
  isLoading: boolean;
  hasMore: boolean;
  endOfDataReached: boolean;
  currentOffset: number;
  visibleRows: number;
  totalAvailableRows: number;
  selectedRowIndex: number;
}

export type LoadTrigger = 'screen-fill' | 'bottom-selection' | 'polling' | 'manual';

/**
 * DynamicDataLoader
 * 
 * Core features:
 * 1. Auto-loading with 3 trigger conditions
 *    - When screen rows are insufficient (screen-fill)
 *    - When selection reaches bottom (bottom-selection)
 *    - 100ms polling (polling)
 * 2. Progressive loading strategy (initial 100 items → max 1000 items)
 * 3. Concurrency control (isLoading state management)
 * 4. Vanilla table integration and capacity management
 */
export class DynamicDataLoader {
  private loadingState: LoadingState;
  private vanillaTable: EventData[] = [];
  private readonly INITIAL_LOAD_SIZE = 100;
  private readonly MAX_LOAD_SIZE = 1000;
  private readonly SCREEN_ROWS = 20; // Number of rows displayable on screen
  private loadCallCount = 0;
  private dbLoadFunction?: (offset: number, limit: number) => Promise<EventData[]>;

  constructor(dbLoadFunction?: (offset: number, limit: number) => Promise<EventData[]>) {
    this.loadingState = {
      isLoading: false,
      hasMore: true,
      endOfDataReached: false,
      currentOffset: 0,
      visibleRows: 0,
      totalAvailableRows: 0,
      selectedRowIndex: 0
    };
    
    this.dbLoadFunction = dbLoadFunction || this.simulateDBLoad.bind(this);
  }

  /**
   * Test DB loading simulation
   * In production, use DatabaseAdapter or QueryEngine
   */
  private async simulateDBLoad(offset: number, limit: number): Promise<EventData[]> {
    this.loadCallCount++;
    
    // Simulation delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Generate dummy data (offset-based)
    const events: EventData[] = [];
    for (let i = 0; i < limit; i++) {
      const id = offset + i + 1;
      if (id > 500) break; // End at 500 items (for testing)
      
      events.push({
        id,
        file_id: id,
        file_name: `file-${id}.txt`,
        event_type: ['Create', 'Modify', 'Delete'][id % 3],
        timestamp: new Date(Date.now() - id * 60000).toISOString(), // Older as id increases
        directory: `/dir${Math.floor(id / 10)}`
      });
    }
    
    return events;
  }

  /**
   * 1. Screen fill insufficient trigger
   * When screen is not filled with rows & end of data is not displayed
   */
  async checkScreenFillTrigger(): Promise<boolean> {
    // Screen not filled with rows & end of data not displayed
    const needsFill = this.loadingState.visibleRows < this.SCREEN_ROWS && 
                     !this.loadingState.endOfDataReached;
    
    if (needsFill && this.loadingState.hasMore && !this.loadingState.isLoading) {
      await this.executeLoad('screen-fill');
      return true;
    }
    
    return false;
  }

  /**
   * 2. Bottom selection trigger
   * When selected row is at table bottom & end of data is not displayed
   */
  async checkBottomSelectionTrigger(): Promise<boolean> {
    // Selected row at table bottom & end of data not displayed
    const isAtBottom = this.loadingState.selectedRowIndex >= this.loadingState.visibleRows - 1;
    const needsMore = isAtBottom && !this.loadingState.endOfDataReached;
    
    if (needsMore && this.loadingState.hasMore && !this.loadingState.isLoading) {
      await this.executeLoad('bottom-selection');
      return true;
    }
    
    return false;
  }

  /**
   * 3. 100ms polling trigger
   * Check for new data via polling
   */
  async check100msPollingTrigger(): Promise<boolean> {
    // Check for new data via polling (simulate actual DB polling)
    if (!this.loadingState.isLoading && this.loadingState.hasMore) {
      await this.executeLoad('polling');
      return true;
    }
    
    return false;
  }

  /**
   * Execute data loading - progressive loading strategy
   * 
   * Load strategy:
   * - Initial: 100 items
   * - Additional: 100 items each time  
   * - Maximum: up to 1000 items
   */
  private async executeLoad(trigger: LoadTrigger): Promise<void> {
    this.loadingState.isLoading = true;
    
    try {
      // Load strategy: Initial 100 items, max 1000 items progressively
      const loadSize = this.vanillaTable.length === 0 ? 
        this.INITIAL_LOAD_SIZE : 
        Math.min(100, this.MAX_LOAD_SIZE - this.vanillaTable.length);
      
      const newEvents = await this.dbLoadFunction!(
        this.loadingState.currentOffset, 
        loadSize
      );
      
      // Integrate into vanilla table
      this.vanillaTable.push(...newEvents);
      
      // Update state
      this.loadingState.currentOffset += newEvents.length;
      this.loadingState.totalAvailableRows = this.vanillaTable.length;
      this.loadingState.visibleRows = Math.min(this.SCREEN_ROWS, this.vanillaTable.length);
      
      // Check for end of data
      if (newEvents.length === 0 || this.vanillaTable.length >= this.MAX_LOAD_SIZE) {
        this.loadingState.hasMore = false;
        this.loadingState.endOfDataReached = true;
      }
      
    } catch (error) {
      // Silently handle error
    } finally {
      this.loadingState.isLoading = false;
    }
  }

  /**
   * Execute manual loading
   */
  async manualLoad(): Promise<void> {
    if (!this.loadingState.isLoading && this.loadingState.hasMore) {
      await this.executeLoad('manual');
    }
  }

  /**
   * Update screen state
   */
  updateScreenState(visibleRows: number, selectedRowIndex: number): void {
    this.loadingState.visibleRows = visibleRows;
    this.loadingState.selectedRowIndex = selectedRowIndex;
  }

  /**
   * User operation simulation: move selection down
   */
  moveSelectionDown(): void {
    if (this.loadingState.selectedRowIndex < this.loadingState.totalAvailableRows - 1) {
      this.loadingState.selectedRowIndex++;
    }
  }

  /**
   * User operation simulation: move selection up
   */
  moveSelectionUp(): void {
    if (this.loadingState.selectedRowIndex > 0) {
      this.loadingState.selectedRowIndex--;
    }
  }

  /**
   * Get current loading state
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * Update state (for testing)
   */
  setLoadingState(updates: Partial<LoadingState>): void {
    this.loadingState = { ...this.loadingState, ...updates };
  }

  /**
   * Get vanilla table
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * Get load call count (for testing)
   */
  getLoadCallCount(): number {
    return this.loadCallCount;
  }

  /**
   * Get statistics
   */
  getStats(): {
    vanillaTableSize: number;
    loadCallCount: number;
    currentOffset: number;
    hasMore: boolean;
    isLoading: boolean;
  } {
    return {
      vanillaTableSize: this.vanillaTable.length,
      loadCallCount: this.loadCallCount,
      currentOffset: this.loadingState.currentOffset,
      hasMore: this.loadingState.hasMore,
      isLoading: this.loadingState.isLoading
    };
  }

  /**
   * Reset all data (for testing)
   */
  reset(): void {
    this.loadingState = {
      isLoading: false,
      hasMore: true,
      endOfDataReached: false,
      currentOffset: 0,
      visibleRows: 0,
      totalAvailableRows: 0,
      selectedRowIndex: 0
    };
    this.vanillaTable = [];
    this.loadCallCount = 0;
  }

  /**
   * Set database load function (for production use)
   */
  setDatabaseLoadFunction(loadFunction: (offset: number, limit: number) => Promise<EventData[]>): void {
    this.dbLoadFunction = loadFunction;
  }
}