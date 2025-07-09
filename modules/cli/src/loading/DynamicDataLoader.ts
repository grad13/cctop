/**
 * DynamicDataLoader - HO-20250707-002仕様準拠
 * 3つのトリガー条件での動的データ読み込みを管理
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
 * 核心機能:
 * 1. 3つのトリガー条件での自動読み込み
 *    - 画面内row不足時（screen-fill）
 *    - 選択row最下部到達時（bottom-selection）
 *    - 100msポーリング（polling）
 * 2. 段階的読み込み戦略（初回100件→最大1000件）
 * 3. 競合制御（isLoading状態管理）
 * 4. vanilla table統合・容量管理
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
   * テスト用のDB読み込みシミュレーション
   * 実際の実装では、DatabaseAdapterやQueryEngineを使用
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
   * 1. 画面Fill不足トリガー - HO-20250707-002仕様
   * 画面内にrowがfillされていない & end of dataが表示されていない場合
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
   * 2. 下端選択トリガー - HO-20250707-002仕様
   * 選択rowがtable最下部 & end of dataが表示されていない場合
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
   * 3. 100msポーリングトリガー - HO-20250707-002仕様
   * ポーリングによる新データチェック
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
   * データ読み込み実行 - 段階的読み込み戦略
   * 
   * ロード戦略:
   * - 初回: 100件
   * - 追加: 100件ずつ  
   * - 最大: 1000件まで
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
   * 手動読み込み実行
   */
  async manualLoad(): Promise<void> {
    if (!this.loadingState.isLoading && this.loadingState.hasMore) {
      await this.executeLoad('manual');
    }
  }

  /**
   * 画面状態の更新
   */
  updateScreenState(visibleRows: number, selectedRowIndex: number): void {
    this.loadingState.visibleRows = visibleRows;
    this.loadingState.selectedRowIndex = selectedRowIndex;
  }

  /**
   * ユーザー操作シミュレーション: 選択を下に移動
   */
  moveSelectionDown(): void {
    if (this.loadingState.selectedRowIndex < this.loadingState.totalAvailableRows - 1) {
      this.loadingState.selectedRowIndex++;
    }
  }

  /**
   * ユーザー操作シミュレーション: 選択を上に移動
   */
  moveSelectionUp(): void {
    if (this.loadingState.selectedRowIndex > 0) {
      this.loadingState.selectedRowIndex--;
    }
  }

  /**
   * 現在の読み込み状態取得
   */
  getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  /**
   * 状態更新（テスト用）
   */
  setLoadingState(updates: Partial<LoadingState>): void {
    this.loadingState = { ...this.loadingState, ...updates };
  }

  /**
   * vanilla table取得
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * 読み込み呼び出し回数取得（テスト用）
   */
  getLoadCallCount(): number {
    return this.loadCallCount;
  }

  /**
   * 統計情報取得
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
   * 全データリセット（テスト用）
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
   * DB読み込み関数の設定（実運用時）
   */
  setDatabaseLoadFunction(loadFunction: (offset: number, limit: number) => Promise<EventData[]>): void {
    this.dbLoadFunction = loadFunction;
  }
}