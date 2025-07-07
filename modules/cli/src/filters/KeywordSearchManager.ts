/**
 * KeywordSearchManager - HO-20250707-002仕様準拠
 * [Enter]時のDB検索とvanilla table統合を管理
 */

export interface EventData {
  id: number;
  file_id: number;
  file_name: string;
  event_type: string;
  timestamp: string;
  directory: string;
}

export interface SearchResult {
  events: EventData[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * KeywordSearchManager
 * 
 * 核心機能:
 * 1. [Enter]押下時のDB検索実行
 * 2. 検索結果のvanilla table統合（重複排除）
 * 3. 検索履歴管理
 * 4. 結果キャッシュ
 * 5. 容量管理（古いデータ自動削除）
 * 6. リアルタイムキーワードフィルタリング
 */
export class KeywordSearchManager {
  private vanillaTable: EventData[] = [];
  private dbSearchResults: Map<string, EventData[]> = new Map();
  private searchHistory: string[] = [];
  private readonly MAX_VANILLA_EVENTS = 1000; // 容量制限
  private readonly MAX_SEARCH_HISTORY = 50; // 検索履歴制限

  constructor(private dbSearchFunction?: (keyword: string) => Promise<SearchResult>) {
    // DB検索関数が提供されない場合は、テスト用のシミュレーション関数を使用
    if (!this.dbSearchFunction) {
      this.dbSearchFunction = this.simulateDBSearch.bind(this);
    }
  }

  /**
   * テスト用のDB検索シミュレーション
   * 実際の実装では、DatabaseAdapterやQueryEngineを使用
   */
  private async simulateDBSearch(keyword: string): Promise<SearchResult> {
    // テスト用のダミーDB
    const dummyDB: EventData[] = [
      { id: 100, file_id: 10, file_name: 'important-file.txt', event_type: 'Create', timestamp: '2025-01-01 12:00:00', directory: '/projects' },
      { id: 101, file_id: 11, file_name: 'config.json', event_type: 'Modify', timestamp: '2025-01-01 12:01:00', directory: '/important' },
      { id: 102, file_id: 12, file_name: 'readme.md', event_type: 'Create', timestamp: '2025-01-01 12:02:00', directory: '/docs/important' },
      { id: 103, file_id: 13, file_name: 'test-important.js', event_type: 'Delete', timestamp: '2025-01-01 12:03:00', directory: '/tests' },
      { id: 104, file_id: 14, file_name: 'normal.txt', event_type: 'Create', timestamp: '2025-01-01 12:04:00', directory: '/regular' },
      { id: 105, file_id: 15, file_name: 'debug.log', event_type: 'Modify', timestamp: '2025-01-01 12:05:00', directory: '/logs/important' },
    ];

    // キーワードでフィルタリング（ファイル名またはディレクトリパス）
    const results = dummyDB.filter(event => 
      event.file_name.includes(keyword) || event.directory.includes(keyword)
    );

    return {
      events: results,
      totalCount: results.length,
      hasMore: false
    };
  }

  /**
   * [Enter]押下時のDB検索実行 - HO-20250707-002核心仕様
   * 
   * 処理フロー:
   * 1. DB検索実行
   * 2. 検索結果をvanilla tableに統合
   * 3. 検索履歴に追加
   * 4. 検索結果をキャッシュ
   */
  async executeKeywordSearch(keyword: string): Promise<EventData[]> {
    if (!keyword.trim()) {
      return [];
    }

    try {
      // 1. DB検索実行
      const searchResults = await this.dbSearchFunction!(keyword);
      
      // 2. 検索結果をvanilla tableに統合
      this.addToVanillaTable(searchResults.events);
      
      // 3. 検索履歴に追加
      this.addToSearchHistory(keyword);
      
      // 4. 検索結果をキャッシュ
      this.dbSearchResults.set(keyword, searchResults.events);
      
      return searchResults.events;
    } catch (error) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }

  /**
   * vanilla tableに検索結果を統合
   * 重複チェック（idベース）と容量管理を実行
   */
  private addToVanillaTable(newEvents: EventData[]): void {
    // 重複チェック（idベース）
    const existingIds = new Set(this.vanillaTable.map(event => event.id));
    const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
    
    // vanilla tableに追加
    this.vanillaTable.push(...uniqueNewEvents);
    
    // 容量管理: 一定件数超過時は古い順に削除
    if (this.vanillaTable.length > this.MAX_VANILLA_EVENTS) {
      this.optimizeVanillaTable();
    }
  }

  /**
   * 古いデータの削除（容量管理）
   * timestampでソートし、古いものから削除
   */
  private optimizeVanillaTable(): void {
    // timestampでソートし、古いものから削除
    this.vanillaTable.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const excessCount = this.vanillaTable.length - this.MAX_VANILLA_EVENTS;
    if (excessCount > 0) {
      this.vanillaTable.splice(0, excessCount);
    }
  }

  /**
   * 検索履歴に追加
   * 重複を避け、履歴サイズを管理
   */
  private addToSearchHistory(keyword: string): void {
    // 重複チェック
    if (!this.searchHistory.includes(keyword)) {
      this.searchHistory.push(keyword);
    }

    // 履歴サイズ管理
    if (this.searchHistory.length > this.MAX_SEARCH_HISTORY) {
      this.searchHistory.shift(); // 最古の履歴を削除
    }
  }

  /**
   * キーワードフィルタリング（リアルタイム適用）
   * vanilla table内のイベントをキーワードでフィルタリング
   */
  applyKeywordFilter(keyword: string): EventData[] {
    if (!keyword.trim()) {
      return [...this.vanillaTable];
    }

    return this.vanillaTable.filter(event =>
      event.file_name.includes(keyword) || event.directory.includes(keyword)
    );
  }

  /**
   * vanilla table取得
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * vanilla tableサイズ取得
   */
  getVanillaTableSize(): number {
    return this.vanillaTable.length;
  }

  /**
   * 検索履歴取得
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * 検索結果キャッシュ取得
   */
  getSearchResultsCache(): Map<string, EventData[]> {
    return new Map(this.dbSearchResults);
  }

  /**
   * キャッシュされた検索結果取得
   */
  getCachedSearchResult(keyword: string): EventData[] | undefined {
    return this.dbSearchResults.get(keyword);
  }

  /**
   * vanilla table初期化（テスト用）
   */
  initializeVanillaTable(events: EventData[]): void {
    this.vanillaTable = [...events];
  }

  /**
   * 全データクリア
   */
  clearAll(): void {
    this.vanillaTable = [];
    this.dbSearchResults.clear();
    this.searchHistory = [];
  }

  /**
   * 検索履歴クリア
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.dbSearchResults.clear();
  }

  /**
   * 統計情報取得
   */
  getStats(): {
    vanillaTableSize: number;
    searchHistorySize: number;
    cacheSize: number;
  } {
    return {
      vanillaTableSize: this.vanillaTable.length,
      searchHistorySize: this.searchHistory.length,
      cacheSize: this.dbSearchResults.size
    };
  }

  /**
   * DB検索関数の設定（実運用時）
   */
  setDatabaseSearchFunction(searchFunction: (keyword: string) => Promise<SearchResult>): void {
    this.dbSearchFunction = searchFunction;
  }
}