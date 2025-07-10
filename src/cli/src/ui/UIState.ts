/**
 * UI State Management
 * Simplified state management for display, filters, and search
 */

import { EventRow } from '../types/event-row';
import { EventTypeFilterFlags } from './EventTypeFilterFlags';

// Display States
export type DisplayState = 'stream_live' | 'event_type_filter' | 'keyword_filter' | 'stream_paused' | 'detail';

// Display modes
export type DisplayMode = 'all' | 'unique';

export class UIState {
  // Current state
  displayMode: DisplayMode = 'all';
  eventTypeFilters = new EventTypeFilterFlags();
  searchPattern: string = '';  // Regular expression pattern
  displayState: DisplayState = 'stream_live';
  
  // Temporary saved state for ESC functionality
  private savedState?: {
    displayMode: DisplayMode;
    eventTypeFilters: EventTypeFilterFlags;
    searchPattern: string;
  };
  
  // Current event data (after filtering)
  events: EventRow[] = [];
  
  // UI state
  private selectedIndex: number = 0;
  private daemonStatus: string = '{yellow-fg}Daemon: ●CHECKING{/yellow-fg}';
  
  // Dynamic width config
  private directoryWidth: number = 20;
  
  // Viewport management for scrolling
  private viewportStartIndex: number = 0;
  private viewportHeight: number = 20;  // Will be updated based on terminal size
  
  // Dynamic loading state
  private hasMoreData: boolean = true;
  private isLoadingMore: boolean = false;
  private totalLoaded: number = 0;

  constructor(displayMode: DisplayMode = 'all') {
    this.displayMode = displayMode;
  }

  // Display State
  getDisplayState(): DisplayState {
    return this.displayState;
  }

  setDisplayState(state: DisplayState): void {
    this.displayState = state;
  }

  // Pause State
  isPausedState(): boolean {
    return this.displayState === 'stream_paused';
  }

  togglePause(): void {
    this.displayState = this.displayState === 'stream_paused' ? 'stream_live' : 'stream_paused';
  }

  // Display Mode
  getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    // Reset UI state for clean mode transition
    this.selectedIndex = 0;
    this.viewportStartIndex = 0;
    this.hasMoreData = true; // Allow fresh data loading
  }

  // Search Pattern
  getSearchPattern(): string {
    return this.searchPattern;
  }
  
  // For backward compatibility with modules expecting getSearchText
  getSearchText(): string {
    return this.searchPattern;
  }

  setSearchPattern(pattern: string): void {
    this.searchPattern = pattern;
  }

  clearSearchPattern(): void {
    this.searchPattern = '';
  }

  appendToSearchPattern(char: string): void {
    this.searchPattern += char;
  }

  backspaceSearchPattern(): void {
    this.searchPattern = this.searchPattern.slice(0, -1);
  }

  // Event Type Filters
  getEventTypeFilters(): EventTypeFilterFlags {
    return this.eventTypeFilters;
  }

  toggleEventFilter(eventType: string): void {
    this.eventTypeFilters.toggleEventType(eventType);
  }

  resetEventFilters(): void {
    this.eventTypeFilters.resetAll();
  }
  
  // For backward compatibility
  hasEventFilter(eventType: string): boolean {
    return this.eventTypeFilters.isEventTypeEnabled(eventType);
  }

  // Reset all filters
  resetAllFilters(): void {
    this.displayMode = 'all';
    this.eventTypeFilters.resetAll();
    this.searchPattern = '';
  }

  // Events
  getEvents(): EventRow[] {
    return this.events;
  }

  setEvents(events: EventRow[]): void {
    const previousEventCount = this.events.length;
    this.events = events;
    
    // Only reset selection if it's out of bounds
    if (this.selectedIndex >= events.length && events.length > 0) {
      this.selectedIndex = events.length - 1;
    } else if (events.length === 0) {
      this.selectedIndex = -1;
    }
    
    // Preserve viewport position unless we're starting fresh
    if (previousEventCount === 0 || events.length === 0) {
      this.viewportStartIndex = 0;
    }
    
    this.adjustViewport();
  }

  getEventsCount(): number {
    return this.events.length;
  }

  // Selected Index
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  setSelectedIndex(index: number): void {
    this.selectedIndex = index;
  }

  moveSelectionUp(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.adjustViewport();
  }

  moveSelectionDown(): void {
    if (this.selectedIndex < this.events.length - 1) {
      this.selectedIndex++;
      this.adjustViewport();
    }
  }

  // Daemon Status
  getDaemonStatus(): string {
    return this.daemonStatus;
  }

  setDaemonStatus(status: string): void {
    this.daemonStatus = status;
  }

  // Directory Width
  getDirectoryWidth(): number {
    return this.directoryWidth;
  }

  setDirectoryWidth(width: number): void {
    this.directoryWidth = width;
  }

  // Filter editing start
  startEditing(mode: 'event_type_filter' | 'keyword_filter'): void {
    this.savedState = {
      displayMode: this.displayMode,
      eventTypeFilters: this.eventTypeFilters.clone(),
      searchPattern: this.searchPattern
    };
    this.displayState = mode;
  }

  // ESC: Cancel editing and restore saved state
  cancelEditing(): void {
    if (this.savedState) {
      this.displayMode = this.savedState.displayMode;
      this.eventTypeFilters = this.savedState.eventTypeFilters;
      this.searchPattern = this.savedState.searchPattern;
      this.savedState = undefined;
    }
    this.displayState = 'stream_live';
  }

  // Enter: Confirm editing
  confirmEditing(): void {
    this.savedState = undefined;
    this.displayState = 'stream_live';
  }

  // Dynamic loading state
  hasMoreDataToLoad(): boolean {
    return this.hasMoreData;
  }

  setHasMoreData(hasMore: boolean): void {
    this.hasMoreData = hasMore;
  }

  isLoadingMoreData(): boolean {
    return this.isLoadingMore;
  }

  setLoadingMore(loading: boolean): void {
    this.isLoadingMore = loading;
  }

  getTotalLoaded(): number {
    return this.totalLoaded;
  }

  setTotalLoaded(total: number): void {
    this.totalLoaded = total;
  }

  isNearBottom(): boolean {
    // Check if user is near the bottom (within last 5 items)
    const buffer = 5;
    return this.selectedIndex >= this.events.length - buffer;
  }

  isScreenFilled(): boolean {
    return this.events.length >= this.viewportHeight;
  }

  shouldLoadMoreData(): boolean {
    // Don't load in filter/search modes
    if (this.displayState === 'event_type_filter' || this.displayState === 'keyword_filter') {
      return false;
    }

    // Must have more data available and not currently loading
    if (!this.hasMoreData || this.isLoadingMore) {
      return false;
    }

    // If screen is not filled, always load more
    if (!this.isScreenFilled()) {
      return true;
    }

    // If screen is filled, only load when near bottom
    return this.isNearBottom();
  }

  // Calculate Dynamic Width
  calculateDynamicWidth(): void {
    const terminalWidth = process.stdout.columns || 80;
    const fixedWidth = 107;
    this.directoryWidth = Math.max(10, terminalWidth - fixedWidth);
    
    // Also update viewport height based on terminal size
    const terminalHeight = process.stdout.rows || 24;
    this.viewportHeight = Math.max(1, terminalHeight - 7);
  }

  // Viewport management
  getViewportStartIndex(): number {
    return this.viewportStartIndex;
  }

  getViewportHeight(): number {
    return this.viewportHeight;
  }

  setViewportHeight(height: number): void {
    this.viewportHeight = height;
    this.adjustViewport();
  }

  adjustViewport(): void {
    // Ensure selected item is visible in viewport
    if (this.selectedIndex < this.viewportStartIndex) {
      // Selected item is above viewport - scroll up
      this.viewportStartIndex = this.selectedIndex;
    } else if (this.selectedIndex >= this.viewportStartIndex + this.viewportHeight) {
      // Selected item is below viewport - scroll down
      this.viewportStartIndex = Math.max(0, this.selectedIndex - this.viewportHeight + 1);
    }
  }

  getVisibleEvents(): EventRow[] {
    return this.events.slice(
      this.viewportStartIndex, 
      this.viewportStartIndex + this.viewportHeight
    );
  }
  
  isTopRowVisible(): boolean {
    return this.viewportStartIndex === 0;
  }

  getRelativeSelectedIndex(): number {
    return this.selectedIndex - this.viewportStartIndex;
  }

  // Apply filters to events (for UI display)
  applyFilters(events: EventRow[]): EventRow[] {
    let filteredEvents = events;

    // Apply event type filters
    if (this.eventTypeFilters.countActiveFilters() < 6) {
      filteredEvents = filteredEvents.filter(event => 
        this.eventTypeFilters.isEventTypeEnabled(event.event_type)
      );
    }

    // Note: regex pattern filter is now handled by database search
    // This method only applies event type filters

    return filteredEvents;
  }

  // Get active filters for database query
  getActiveFilters(): string[] {
    return this.eventTypeFilters.getActiveFilters();
  }
}