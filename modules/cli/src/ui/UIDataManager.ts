/**
 * UI Data Manager
 * Handles all data loading, searching, and caching operations
 * Separated from BlessedFramelessUI for better maintainability
 */

import { EventRow } from '../types/event-row';
import { DatabaseAdapterFunc000 } from '../database/database-adapter-func000';
import { UIState } from './UIState';

export class UIDataManager {
  private db: DatabaseAdapterFunc000;
  private uiState: UIState;
  
  // Data loading state
  private currentOffset: number = 0;
  private originalEvents: EventRow[] = []; // Store unfiltered events for filter mode
  private isRefreshing: boolean = false;
  private loadMorePromise: Promise<void> | null = null;

  constructor(db: DatabaseAdapterFunc000, uiState: UIState) {
    this.db = db;
    this.uiState = uiState;
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
   * FUNC-202 v0.3.4.0: Implements 2-phase search with staged fetching
   */
  async refreshData(append: boolean = false): Promise<void> {
    // Prevent concurrent refreshes - more aggressive check
    if (this.isRefreshing) {
      return;
    }
    
    // Skip auto-refresh if we're loading more data
    if (!append && this.uiState.isLoadingMoreData()) {
      return;
    }
    
    // Skip auto-refresh if we're at the end of data with filters
    if (!append && !this.uiState.hasMoreDataToLoad()) {
      const activeFilters = this.uiState.getEventFilters().size < 6;
      const isNearBottom = this.uiState.isNearBottom();
      if (activeFilters && isNearBottom) {
        return;
      }
    }
    
    // Special handling for filter mode: re-apply filters to existing data
    if (this.uiState.getDisplayState() === 'filter' && !append && this.originalEvents.length > 0) {
      const filteredEvents = this.uiState.applyFilters(this.originalEvents);
      this.uiState.setEvents(filteredEvents);
      return;
    }
    
    this.isRefreshing = true;
    try {
      let events: EventRow[];
      
      // FUNC-202 v0.3.4.0: Check if DB search is triggered
      if (this.uiState.isDbSearchApplied() && this.uiState.getSearchText()) {
        events = await this.performDatabaseSearch();
        // Clear search base after DB search
        this.uiState.clearSearchBaseEvents();
        // hasMoreData is set inside performDatabaseSearch
      } else {
        
        // If in search mode and searching locally, use search base events
        if (this.uiState.getDisplayState() === 'search' && this.uiState.getSearchText() && !this.uiState.isDbSearchApplied()) {
          const searchBase = this.uiState.getSearchBaseEvents();
          // Apply search filters to the base events
          events = this.uiState.applyFilters(searchBase);
          // No more data to load in local search mode
          this.uiState.setHasMoreData(false);
        } else {
          // Check if we can use in-memory cache for unique mode optimization
          // Only when: all→unique switch, no append, has data, all filters active
          const canUseMemoryCache = this.uiState.getDisplayMode() === 'unique' && 
                                  this.uiState.getPreviousDisplayMode() === 'all' &&
                                  !append && 
                                  this.uiState.getEvents().length > 0 &&
                                  this.uiState.getEventFilters().size >= 6; // All 6 event types
          if (canUseMemoryCache) {
            // Memory cache: Extract unique events from existing data
            const existingEvents = this.uiState.getEvents();
            const uniqueMap = new Map<string, EventRow>();
            
            // Extract unique by file_path (keep latest)
            for (const event of existingEvents) {
              const key = `${event.directory}/${event.filename}`;
              const eventTime = typeof event.timestamp === 'number' ? event.timestamp : new Date(event.timestamp).getTime();
              const existingTime: number = uniqueMap.has(key) ? 
                (typeof uniqueMap.get(key)!.timestamp === 'number' ? 
                  uniqueMap.get(key)!.timestamp as number : 
                  new Date(uniqueMap.get(key)!.timestamp).getTime()) : 0;
              if (!uniqueMap.has(key) || eventTime > existingTime) {
                uniqueMap.set(key, event);
              }
            }
            
            events = Array.from(uniqueMap.values()).sort((a, b) => {
              const aTime = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
              const bTime = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
              return bTime - aTime;
            });
            // Memory cache used - no offset change needed
          } else {
            // Normal fetch from database
            const limit = 100;
            
            // Reset offset for non-append operations
            if (!append) {
              this.currentOffset = 0;
            }
            
            const offset = this.currentOffset;
            
            const rawEvents = await this.db.getLatestEvents(limit, this.uiState.getDisplayMode(), offset, this.uiState.getActiveFilters());
            // Check if we have more data from database
            // If we got less than requested, there's no more data
            const hasMoreInDb = rawEvents.length === limit;
            
            // Apply event type filters only (no search in normal mode)
            const filteredNewEvents = this.uiState.applyFilters(rawEvents);
            
            if (append && this.uiState.getEvents().length > 0) {
              // Append to existing events
              events = [...this.uiState.getEvents(), ...filteredNewEvents];
            } else {
              events = filteredNewEvents;
            }
            
            // Update offset based on raw data fetched from DB
            if (append) {
              this.currentOffset += rawEvents.length;
            } else {
              this.currentOffset = rawEvents.length;
            }
            
            // Set hasMoreData based on DB result and filtered result
            if (filteredNewEvents.length === 0 || !hasMoreInDb) {
              this.uiState.setHasMoreData(false);
            } else {
              // We still have more data to load
              this.uiState.setHasMoreData(true);
            }
          }
        }
      }
      
      // Store previous event count for comparison
      const previousEventCount = this.uiState.getEventsCount();
      const previousEvents = this.uiState.getEvents();
      
      this.uiState.setEvents(events);
      this.uiState.setTotalLoaded(events.length);
      
      // Store original events for filter mode (only when not in filter mode)
      if (this.uiState.getDisplayState() !== 'filter') {
        this.originalEvents = [...events];
      }
      
    } catch (error) {
      // Debug: Log errors to help troubleshooting
      console.error('refreshData error:', error);
      // Fallback to empty array to prevent UI crash
      this.uiState.setEvents([]);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Perform database search for keywords
   */
  private async performDatabaseSearch(): Promise<EventRow[]> {
    const searchText = this.uiState.getSearchText();
    const searchCache = this.uiState.getSearchCache();
    
    // Check LRU cache first
    if (searchCache.has(searchText)) {
      const cachedResult = searchCache.get(searchText)!;
      this.uiState.setHasMoreData(false); // Cache results are complete
      return cachedResult;
    }
    
    try {
      // Execute DB search with current mode and filters
      const searchResults = await this.db.searchEvents({
        keyword: searchText,
        mode: this.uiState.getDisplayMode(),
        filters: this.uiState.getActiveFilters()
      });
      
      // Store in LRU cache
      searchCache.set(searchText, searchResults);
      
      // DB search results are complete (no pagination for search)
      this.uiState.setHasMoreData(false);
      
      return searchResults;
    } catch (error) {
      console.error('Database search error:', error);
      // Return empty array on error
      this.uiState.setHasMoreData(false);
      return [];
    }
  }

  /**
   * Reset data state
   */
  reset(): void {
    this.currentOffset = 0;
    this.originalEvents = [];
    this.isRefreshing = false;
    this.loadMorePromise = null;
  }

  /**
   * Get current data loading state
   */
  getState() {
    return {
      currentOffset: this.currentOffset,
      isRefreshing: this.isRefreshing,
      hasLoadMore: this.loadMorePromise !== null,
      originalEventsCount: this.originalEvents.length
    };
  }
}