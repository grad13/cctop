/**
 * UI Data Manager
 * Simplified data loading and filtering operations
 */

import { EventRow } from '../types/event-row';
import { FileEventReader } from '../database/FileEventReader';
import { UIState } from './UIState';

export class UIDataManager {
  private db: FileEventReader;
  private uiState: UIState;
  
  // Data loading state
  private isRefreshing: boolean = false;
  private loadMorePromise: Promise<void> | null = null;

  constructor(db: FileEventReader, uiState: UIState) {
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
   * Simple approach: fetch from DB and apply filters
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
          this.uiState.setHasMoreData(false);
          this.uiState.setEvents([]);
        });
        return;
      }
      
      let events: EventRow[];
      
      // Fetch from database
      const limit = 100;
      
      // Get current offset from UIState (now managed by UIDataState)
      let currentOffset = 0;
      // For now, simple offset calculation - could be enhanced later
      if (append) {
        currentOffset = this.uiState.getEventsCount();
      }
      
      const offset = currentOffset;
      
      // Get events from database
      const rawEvents = await this.db.getLatestEvents(
        limit, 
        this.uiState.getDisplayMode(), 
        offset, 
        this.uiState.getActiveFilters()
      );
      
      // Check if we have more data
      const hasMoreInDb = rawEvents.length === limit;
      
      // Don't apply client-side regex filter - DB should handle it
      const filteredNewEvents = rawEvents;
      
      if (append && this.uiState.getEvents().length > 0) {
        // Append to existing events
        events = [...this.uiState.getEvents(), ...filteredNewEvents];
      } else {
        events = filteredNewEvents;
      }
      
      // Offset management is now handled by UIState/UIDataState
      // This is managed automatically by setEvents/appendEvents
      
      // Set hasMoreData based on DB result
      if (filteredNewEvents.length === 0 || !hasMoreInDb) {
        this.uiState.setHasMoreData(false);
      } else {
        this.uiState.setHasMoreData(true);
      }
      
      // Update UI state
      this.uiState.setEvents(events);
      
    } catch (error) {
      // Fallback to empty array to prevent UI crash
      this.uiState.setEvents([]);
    } finally {
      this.isRefreshing = false;
    }
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
      // Return empty array on error
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