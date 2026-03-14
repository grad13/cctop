/**
 * UI Data Manager
 * Simplified data loading and filtering operations
 *
 * Uses UniqueFileCacheManager for efficient unique mode display
 */

import { EventRow } from '../types/event-row';
import { FileEventReader } from '../database/FileEventReader';
import { UIState } from './UIState';
import { UniqueFileCacheManager } from '../cache/UniqueFileCacheManager';

export class UIDataManager {
  private db: FileEventReader;
  private uiState: UIState;

  // Data loading state
  private isRefreshing: boolean = false;
  private loadMorePromise: Promise<void> | null = null;

  // Cache for unique mode
  private uniqueCache: UniqueFileCacheManager = new UniqueFileCacheManager();

  constructor(db: FileEventReader, uiState: UIState) {
    this.db = db;
    this.uiState = uiState;
  }

  /**
   * Clear unique cache (call when switching modes or filters)
   */
  clearUniqueCache(): void {
    this.uniqueCache.clear();
  }

  /**
   * Load more data with concurrency control
   */
  async loadMore(): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadMorePromise) {
      return this.loadMorePromise;
    }
    
    if (!this.uiState.hasMoreDataToLoad()) {
      return;
    }
    
    // Create a new load more promise
    this.loadMorePromise = this.doLoadMore();
    
    try {
      await this.loadMorePromise;
    } finally {
      this.loadMorePromise = null;
    }
  }
  
  /**
   * Internal load more implementation
   */
  private async doLoadMore(): Promise<void> {
    this.uiState.setLoadingMore(true);
    try {
      const previousCount = this.uiState.getEventsCount();
      
      // Just load once
      await this.refreshData(true); // Append mode
      
      const newCount = this.uiState.getEventsCount();
      
      // If no new events were added, mark as end
      if (newCount === previousCount) {
        this.uiState.setHasMoreData(false);
      }
    } finally {
      this.uiState.setLoadingMore(false);
    }
  }

  /**
   * Refreshes event data from database
   * Uses cache for unique mode, direct query for all mode
   */
  async refreshData(append: boolean = false): Promise<void> {
    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      return;
    }

    // Skip auto-refresh if we're loading more data
    if (!append && this.uiState.isLoadingMoreData()) {
      return;
    }

    this.isRefreshing = true;
    try {
      // Check if we have a search pattern
      const searchPattern = this.uiState.getSearchPattern();
      if (searchPattern) {
        // Use database search for keyword queries
        await this.db.searchEvents({
          keyword: searchPattern,
          mode: this.uiState.getDisplayMode(),
          filters: this.uiState.getActiveFilters()
        }).then(searchResults => {
          this.uiState.setHasMoreData(false);
          this.uiState.setEvents(searchResults);
        }).catch(error => {
          process.stderr.write(`UIDataManager: search error: ${error}\n`);
          this.uiState.setHasMoreData(false);
          this.uiState.setEvents([]);
        });
        return;
      }

      const mode = this.uiState.getDisplayMode();

      // Use cache-based refresh for unique mode
      if (mode === 'unique') {
        await this.refreshUniqueMode(append);
        return;
      }

      // All mode: direct database query
      await this.refreshAllMode(append);

    } catch (error) {
      process.stderr.write(`UIDataManager: refresh error: ${error}\n`);
      this.uiState.setEvents([]);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Refresh for unique mode using cache
   */
  private async refreshUniqueMode(append: boolean): Promise<void> {
    if (!this.uniqueCache.isInitialized()) {
      // First time: initialize cache with initial data
      // Fetch more events than needed to build a good unique set
      const initialEvents = await this.db.getLatestEvents(
        500,  // Fetch enough to build unique list
        'all', // Use 'all' mode to get raw events
        0,
        this.uiState.getActiveFilters()
      );

      this.uniqueCache.initialize(initialEvents);

      // Get display data from cache
      const events = this.uniqueCache.getDisplayData(0, 100);
      this.uiState.setEvents(events);
      this.uiState.setHasMoreData(this.uniqueCache.hasMoreData(events.length));
      return;
    }

    // Cache already initialized: check for new events
    const lastId = this.uniqueCache.getLastProcessedEventId();
    const newEvents = await this.db.getEventsAfterId(lastId, 100);

    if (newEvents.length > 0) {
      // Update cache with new events
      this.uniqueCache.updateWithNewEvents(newEvents);

      // Get display data from cache
      const currentOffset = append ? this.uiState.getEventsCount() : 0;
      const events = append
        ? this.uniqueCache.getDisplayData(0, currentOffset + 100)
        : this.uniqueCache.getDisplayData(0, 100);

      this.uiState.setEvents(events);
      this.uiState.setHasMoreData(this.uniqueCache.hasMoreData(events.length));
    } else if (append) {
      // No new events but loading more: get more from cache
      const currentOffset = this.uiState.getEventsCount();
      const moreEvents = this.uniqueCache.getDisplayData(currentOffset, 100);

      if (moreEvents.length > 0) {
        const events = [...this.uiState.getEvents(), ...moreEvents];
        this.uiState.setEvents(events);
        this.uiState.setHasMoreData(this.uniqueCache.hasMoreData(events.length));
      } else {
        this.uiState.setHasMoreData(false);
      }
    }
    // If no new events and not appending, just keep current display (no update needed)
  }

  /**
   * Refresh for all mode (original behavior)
   */
  private async refreshAllMode(append: boolean): Promise<void> {
    let events: EventRow[];

    // Fetch from database
    const limit = 100;

    // Get current offset from UIState
    let currentOffset = 0;
    if (append) {
      currentOffset = this.uiState.getEventsCount();
    }

    const offset = currentOffset;

    // Get events from database
    const rawEvents = await this.db.getLatestEvents(
      limit,
      'all',
      offset,
      this.uiState.getActiveFilters()
    );

    // Check if we have more data
    const hasMoreInDb = rawEvents.length === limit;

    const filteredNewEvents = rawEvents;

    if (append && this.uiState.getEvents().length > 0) {
      // Append to existing events
      events = [...this.uiState.getEvents(), ...filteredNewEvents];
    } else {
      events = filteredNewEvents;
    }

    // Set hasMoreData based on DB result
    if (filteredNewEvents.length === 0 || !hasMoreInDb) {
      this.uiState.setHasMoreData(false);
    } else {
      this.uiState.setHasMoreData(true);
    }

    // Update UI state
    this.uiState.setEvents(events);
  }

  /**
   * Perform database search for keywords
   * Uses regex pattern in database query
   */
  async performDatabaseSearch(): Promise<void> {
    const searchPattern = this.uiState.getSearchPattern();
    
    if (!searchPattern) {
      // No search pattern, just refresh normally
      this.uiState.setHasMoreData(true);
      this.uiState.setEvents([]);
      return;
    }
    
    try {
      // Execute DB search with current mode and filters
      const searchResults = await this.db.searchEvents({
        keyword: searchPattern,
        mode: this.uiState.getDisplayMode(),
        filters: this.uiState.getActiveFilters()
      });
      
      // DB search results are complete (no pagination for search)
      this.uiState.setHasMoreData(false);
      this.uiState.setEvents(searchResults);
      
    } catch (error) {
      process.stderr.write(`UIDataManager: performDatabaseSearch error: ${error}\n`);
      this.uiState.setHasMoreData(false);
      this.uiState.setEvents([]);
    }
  }

  /**
   * Reset data state
   */
  reset(): void {
    this.isRefreshing = false;
    this.loadMorePromise = null;
    this.uniqueCache.clear();
    // Reset is now delegated to UIState
  }

  /**
   * Get current data loading state
   */
  getState() {
    return {
      isRefreshing: this.isRefreshing,
      hasLoadMore: this.loadMorePromise !== null,
      eventsCount: this.uiState.getEventsCount(),
      totalLoaded: this.uiState.getTotalLoaded()
    };
  }
}