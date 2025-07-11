/**
 * KeywordSearchManager
 * Manages DB search on [Enter] key and vanilla table integration
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
 * Core features:
 * 1. Execute DB search on [Enter] key press
 * 2. Integrate search results into vanilla table (with deduplication)
 * 3. Search history management
 * 4. Result caching
 * 5. Capacity management (auto-delete old data)
 * 6. Real-time keyword filtering
 */
export class KeywordSearchManager {
  private vanillaTable: EventData[] = [];
  private dbSearchResults: Map<string, EventData[]> = new Map();
  private searchHistory: string[] = [];
  private readonly MAX_VANILLA_EVENTS = 1000; // Capacity limit
  private readonly MAX_SEARCH_HISTORY = 50; // Search history limit

  constructor(private dbSearchFunction?: (keyword: string) => Promise<SearchResult>) {
    // Use test simulation function if DB search function is not provided
    if (!this.dbSearchFunction) {
      this.dbSearchFunction = this.simulateDBSearch.bind(this);
    }
  }

  /**
   * Test DB search simulation
   * In production, use DatabaseAdapter or QueryEngine
   */
  private async simulateDBSearch(keyword: string): Promise<SearchResult> {
    // Dummy DB for testing
    const dummyDB: EventData[] = [
      { id: 100, file_id: 10, file_name: 'important-file.txt', event_type: 'Create', timestamp: '2025-01-01 12:00:00', directory: '/projects' },
      { id: 101, file_id: 11, file_name: 'config.json', event_type: 'Modify', timestamp: '2025-01-01 12:01:00', directory: '/important' },
      { id: 102, file_id: 12, file_name: 'readme.md', event_type: 'Create', timestamp: '2025-01-01 12:02:00', directory: '/docs/important' },
      { id: 103, file_id: 13, file_name: 'test-important.js', event_type: 'Delete', timestamp: '2025-01-01 12:03:00', directory: '/tests' },
      { id: 104, file_id: 14, file_name: 'normal.txt', event_type: 'Create', timestamp: '2025-01-01 12:04:00', directory: '/regular' },
      { id: 105, file_id: 15, file_name: 'debug.log', event_type: 'Modify', timestamp: '2025-01-01 12:05:00', directory: '/logs/important' },
    ];

    // Filter by keyword (filename or directory path)
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
   * Execute DB search on [Enter] key press
   * 
   * Processing flow:
   * 1. Execute DB search
   * 2. Integrate search results into vanilla table
   * 3. Add to search history
   * 4. Cache search results
   */
  async executeKeywordSearch(keyword: string): Promise<EventData[]> {
    if (!keyword.trim()) {
      return [];
    }

    try {
      // 1. Execute DB search
      const searchResults = await this.dbSearchFunction!(keyword);
      
      // 2. Integrate search results into vanilla table
      this.addToVanillaTable(searchResults.events);
      
      // 3. Add to search history
      this.addToSearchHistory(keyword);
      
      // 4. Cache search results
      this.dbSearchResults.set(keyword, searchResults.events);
      
      return searchResults.events;
    } catch (error) {
      return [];
    }
  }

  /**
   * Integrate search results into vanilla table
   * Perform duplicate check (id-based) and capacity management
   */
  private addToVanillaTable(newEvents: EventData[]): void {
    // Duplicate check (id-based)
    const existingIds = new Set(this.vanillaTable.map(event => event.id));
    const uniqueNewEvents = newEvents.filter(event => !existingIds.has(event.id));
    
    // Add to vanilla table
    this.vanillaTable.push(...uniqueNewEvents);
    
    // Capacity management: Delete oldest when exceeding limit
    if (this.vanillaTable.length > this.MAX_VANILLA_EVENTS) {
      this.optimizeVanillaTable();
    }
  }

  /**
   * Delete old data (capacity management)
   * Sort by timestamp and delete oldest
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
   * Add to search history
   * Avoid duplicates and manage history size
   */
  private addToSearchHistory(keyword: string): void {
    // Duplicate check
    if (!this.searchHistory.includes(keyword)) {
      this.searchHistory.push(keyword);
    }

    // History size management
    if (this.searchHistory.length > this.MAX_SEARCH_HISTORY) {
      this.searchHistory.shift(); // Delete oldest history
    }
  }

  /**
   * Keyword filtering (real-time application)
   * Filter events in vanilla table by keyword
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
   * Get vanilla table
   */
  getVanillaTable(): EventData[] {
    return [...this.vanillaTable];
  }

  /**
   * Get vanilla table size
   */
  getVanillaTableSize(): number {
    return this.vanillaTable.length;
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Get search results cache
   */
  getSearchResultsCache(): Map<string, EventData[]> {
    return new Map(this.dbSearchResults);
  }

  /**
   * Get cached search result
   */
  getCachedSearchResult(keyword: string): EventData[] | undefined {
    return this.dbSearchResults.get(keyword);
  }

  /**
   * Initialize vanilla table (for testing)
   */
  initializeVanillaTable(events: EventData[]): void {
    this.vanillaTable = [...events];
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.vanillaTable = [];
    this.dbSearchResults.clear();
    this.searchHistory = [];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.dbSearchResults.clear();
  }

  /**
   * Get statistics
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
   * Set database search function (for production use)
   */
  setDatabaseSearchFunction(searchFunction: (keyword: string) => Promise<SearchResult>): void {
    this.dbSearchFunction = searchFunction;
  }
}