/**
 * UI Data Loading Manager
 * Handles data loading, refreshing, and auto-fill functionality
 */

import { EventRow } from '../types/event-row';
import { DatabaseAdapterFunc000 } from '../database/database-adapter-func000';
import { UIState } from './UIState';

export class UIDataLoader {
  private db: DatabaseAdapterFunc000;
  private uiState: UIState;
  private loadMorePromise: Promise<void> | null = null;
  private isRefreshing: boolean = false;
  private currentOffset: number = 0;

  constructor(db: DatabaseAdapterFunc000, uiState: UIState) {
    this.db = db;
    this.uiState = uiState;
  }

  /**
   * Auto-fill screen with data when it's not fully filled
   */
  async autoFillScreen(): Promise<void> {
    // Auto-fill strategy: load more data until screen is filled
    while (this.uiState.shouldLoadMoreData() && this.uiState.hasMoreDataToLoad()) {
      // Prevent infinite loops
      const eventCountBefore = this.uiState.getEventsCount();
      
      await this.loadMore();
      
      const eventCountAfter = this.uiState.getEventsCount();
      
      // If no new events were loaded, break to prevent infinite loop
      if (eventCountAfter === eventCountBefore) {
        break;
      }
      
      // If screen is now filled, stop auto-filling
      if (this.uiState.isScreenFilled()) {
        break;
      }
    }
  }

  /**
   * Load more data when user reaches bottom
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
            // Use cached events and transform to unique mode
            events = this.uiState.applyFilters(this.uiState.getEvents());
          } else {
            // Regular database fetch
            const displayMode = this.uiState.getDisplayMode();
            const eventTypes = this.uiState.getActiveFilters();
            
            // Determine the offset for pagination
            let offset = append ? this.uiState.getEventsCount() : 0;
            
            // Use configured limit
            const limit = 100; // Default limit
            
            // Use the appropriate database method
            events = await this.db.getLatestEvents(limit, displayMode, offset, eventTypes);
            
            // Track total events loaded for hasMoreData logic
            this.uiState.setTotalLoaded(append ? this.uiState.getTotalLoaded() + events.length : events.length);
            
            // Check if we have more data (if we got a full page, likely more exists)
            const hasMore = events.length === limit;
            this.uiState.setHasMoreData(hasMore);
          }
        }
      }
      
      // Update events in UI state
      if (append) {
        // Append to existing events
        const currentEvents = this.uiState.getEvents();
        this.uiState.setEvents([...currentEvents, ...events]);
      } else {
        this.uiState.setEvents(events);
      }
      
      // FUNC-202 v0.3.4.0: Capture search base when entering search mode
      if (this.uiState.getDisplayState() === 'search' && this.uiState.getSearchBaseEvents().length === 0) {
        // Use existing method or handle it differently
        // this.uiState.setSearchBaseEvents([...events]);
      }
      
    } catch (error) {
      console.error('refreshData error:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  private async performDatabaseSearch(): Promise<EventRow[]> {
    const searchText = this.uiState.getSearchText();
    const displayMode = this.uiState.getDisplayMode();
    const eventTypes = this.uiState.getActiveFilters();
    
    // Use search cache for database searches
    const cacheKey = `${searchText}:${displayMode}:${eventTypes.sort().join(',')}`;
    
    // Check LRU cache first
    const cachedResult = this.uiState.getSearchCache().get(cacheKey);
    if (cachedResult) {
      this.uiState.setHasMoreData(false); // Search results are complete
      return cachedResult;
    }
    
    try {
      // Perform database search (no pagination for search - get all results)
      const searchResults = await this.db.searchEvents({
        keyword: searchText,
        filters: eventTypes,
        mode: displayMode
      });
      
      // Cache the search results
      this.uiState.getSearchCache().set(cacheKey, searchResults);
      
      // Search results are complete - no pagination
      this.uiState.setHasMoreData(false);
      
      return searchResults;
    } catch (error) {
      console.error('Database search error:', error);
      return [];
    }
  }
}