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
   * Check if should load more data based on selection position (FUNC-403/404 spec)
   */
  shouldLoadMoreData(selectedIndex: number, totalEvents: number): boolean {
    // Specification compliance: preload when within 3 rows from bottom
    const threshold = 3;
    return selectedIndex >= totalEvents - threshold && 
           this.hasMoreData && 
           !this.isLoadingMore;
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