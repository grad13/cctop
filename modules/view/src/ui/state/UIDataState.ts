/**
 * UI Data State Management  
 * Manages data loading state (pagination, loading flags, data cache)
 * Part of Phase 3: State management separation
 */

import { EventRow } from '../../types/event-row';

export class UIDataState {
  // Data loading state
  private currentOffset: number = 0;
  private totalLoaded: number = 0;
  private hasMoreData: boolean = true;
  private isLoadingMore: boolean = false;
  
  // Event data cache
  private events: EventRow[] = [];

  constructor() {}

  /**
   * Get current events array
   */
  getEvents(): EventRow[] {
    return this.events;
  }

  /**
   * Set events array (replace all)
   */
  setEvents(events: EventRow[]): void {
    this.events = events;
    this.totalLoaded = events.length;
  }

  /**
   * Append events to existing array
   */
  appendEvents(newEvents: EventRow[]): void {
    this.events.push(...newEvents);
    this.totalLoaded = this.events.length;
  }

  /**
   * Get current data offset for pagination
   */
  getCurrentOffset(): number {
    return this.currentOffset;
  }

  /**
   * Set current data offset
   */
  setCurrentOffset(offset: number): void {
    this.currentOffset = Math.max(0, offset);
  }

  /**
   * Increment offset by amount
   */
  incrementOffset(amount: number): void {
    this.currentOffset += amount;
  }

  /**
   * Get total loaded events count
   */
  getTotalLoaded(): number {
    return this.totalLoaded;
  }

  /**
   * Check if more data is available
   */
  hasMoreDataToLoad(): boolean {
    return this.hasMoreData;
  }

  /**
   * Set whether more data is available
   */
  setHasMoreData(hasMore: boolean): void {
    this.hasMoreData = hasMore;
  }

  /**
   * Check if currently loading more data
   */
  isLoadingMoreData(): boolean {
    return this.isLoadingMore;
  }

  /**
   * Set loading more data flag
   */
  setLoadingMore(loading: boolean): void {
    this.isLoadingMore = loading;
  }

  /**
   * Reset all data state
   */
  reset(): void {
    this.events = [];
    this.currentOffset = 0;
    this.totalLoaded = 0;
    this.hasMoreData = true;
    this.isLoadingMore = false;
  }

  /**
   * Get events count
   */
  getEventsCount(): number {
    return this.events.length;
  }

  /**
   * Check if should load more data based on viewport needs
   */
  shouldLoadMoreData(viewportHeight: number, viewportStart: number): boolean {
    const availableEvents = this.events.length;
    const needEvents = viewportStart + viewportHeight;
    
    // Load more if we need more events than available and more data exists
    return needEvents > availableEvents && this.hasMoreData && !this.isLoadingMore;
  }

  /**
   * Get data state info for debugging
   */
  getDataInfo() {
    return {
      eventsCount: this.events.length,
      currentOffset: this.currentOffset,
      totalLoaded: this.totalLoaded,
      hasMoreData: this.hasMoreData,
      isLoadingMore: this.isLoadingMore
    };
  }
}