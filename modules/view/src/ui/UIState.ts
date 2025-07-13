/**
 * UI State Management
 * Simplified state management for display, filters, and search
 * Updated for Phase 3: Uses separated state management classes
 */

import { EventRow } from '../types/event-row';
import { EventTypeFilterFlags } from './EventTypeFilterFlags';
import { UIViewportState, UIDataState } from './state';

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
  
  // Separated state management (Phase 3)
  private viewportState = new UIViewportState();
  private dataState = new UIDataState();
  
  // UI state
  private daemonStatus: string = '{yellow-fg}Daemon: ●CHECKING{/yellow-fg}';

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

  // Display Mode
  getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    // Reset UI state for clean mode transition (using separated states)
    this.viewportState.resetViewport();
    this.dataState.setHasMoreData(true); // Allow fresh data loading
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

  getActiveFilters(): string[] {
    // Delegate to EventTypeFilterFlags which has the correct implementation
    return this.eventTypeFilters.getActiveFilters();
  }

  // Clear all filters and search
  clearAllFilters(): void {
    this.eventTypeFilters.resetAll();
    this.searchPattern = '';
  }

  // Events (delegated to data state)
  getEvents(): EventRow[] {
    return this.dataState.getEvents();
  }

  setEvents(events: EventRow[]): void {
    this.dataState.setEvents(events);
    
    // Adjust viewport for new events
    const eventsCount = this.dataState.getEventsCount();
    if (this.viewportState.getSelectedIndex() >= eventsCount && eventsCount > 0) {
      this.viewportState.setSelectedIndex(eventsCount - 1, eventsCount);
    } else if (eventsCount === 0) {
      this.viewportState.setSelectedIndex(-1, eventsCount);
    }
  }

  getEventsCount(): number {
    return this.dataState.getEventsCount();
  }

  // Selected Index (delegated to viewport state)
  getSelectedIndex(): number {
    return this.viewportState.getSelectedIndex();
  }

  setSelectedIndex(index: number): void {
    this.viewportState.setSelectedIndex(index, this.dataState.getEventsCount());
  }

  moveSelectionUp(): void {
    this.viewportState.moveSelectionUp(this.dataState.getEventsCount());
  }

  moveSelectionDown(): void {
    this.viewportState.moveSelectionDown(this.dataState.getEventsCount());
  }

  // Viewport management (delegated to viewport state)
  getViewportStartIndex(): number {
    return this.viewportState.getViewportStartIndex();
  }

  getViewportHeight(): number {
    return this.viewportState.getViewportHeight();
  }

  setViewportHeight(height: number): void {
    this.viewportState.setViewportHeight(height);
  }

  // Get visible events for current viewport
  getVisibleEvents(): EventRow[] {
    return this.viewportState.getVisibleSlice(this.dataState.getEvents());
  }

  // Data loading state (delegated to data state)
  hasMoreDataToLoad(): boolean {
    return this.dataState.hasMoreDataToLoad();
  }

  setHasMoreData(hasMore: boolean): void {
    this.dataState.setHasMoreData(hasMore);
  }

  isLoadingMoreData(): boolean {
    return this.dataState.isLoadingMoreData();
  }

  setLoadingMore(loading: boolean): void {
    this.dataState.setLoadingMore(loading);
  }

  getTotalLoaded(): number {
    return this.dataState.getTotalLoaded();
  }

  setTotalLoaded(total: number): void {
    // This is handled automatically by dataState.setEvents()
    // Kept for backward compatibility
  }

  // Check if should load more data
  shouldLoadMoreData(): boolean {
    return this.dataState.shouldLoadMoreData(
      this.getSelectedIndex(),      // Current selection index
      this.dataState.getEventsCount() // Total events count
    );
  }

  // Check if top row is visible
  isTopRowVisible(): boolean {
    return this.viewportState.isTopRowVisible();
  }

  // Daemon Status
  getDaemonStatus(): string {
    return this.daemonStatus;
  }

  setDaemonStatus(status: string): void {
    this.daemonStatus = status;
  }

  // Display state management
  isPausedState(): boolean {
    return this.displayState === 'stream_paused';
  }

  // Dynamic width calculation
  calculateDynamicWidth(): void {
    // This might need to be handled elsewhere or removed
    // For now, just update viewport height based on terminal size
    const terminalHeight = process.stdout.rows || 24;
    const headerHeight = 3; // Header lines
    const controlHeight = 4; // Control area lines
    const availableHeight = Math.max(1, terminalHeight - headerHeight - controlHeight);
    this.viewportState.setViewportHeight(availableHeight);
  }

  // ESC operation support
  saveCurrentState(): void {
    this.savedState = {
      displayMode: this.displayMode,
      eventTypeFilters: this.eventTypeFilters.clone(),
      searchPattern: this.searchPattern
    };
  }

  restoreFromSaved(): void {
    if (this.savedState) {
      this.displayMode = this.savedState.displayMode;
      this.eventTypeFilters = this.savedState.eventTypeFilters;
      this.searchPattern = this.savedState.searchPattern;
      this.savedState = undefined;
    }
  }

  clearSavedState(): void {
    this.savedState = undefined;
  }

  hasSavedState(): boolean {
    return this.savedState !== undefined;
  }

  // Debug information
  getStateInfo() {
    return {
      displayMode: this.displayMode,
      displayState: this.displayState,
      searchPattern: this.searchPattern,
      viewport: this.viewportState.getViewportInfo(),
      data: this.dataState.getDataInfo(),
      daemonStatus: this.daemonStatus
    };
  }

  // Methods needed by UIKeyHandler (backward compatibility)
  adjustViewport(): void {
    // This is now handled automatically by viewportState
    // Kept for backward compatibility with UIKeyHandler
  }

  startEditing(type: 'filter' | 'search' | 'event_type_filter' | 'keyword_filter'): void {
    if (type === 'filter' || type === 'event_type_filter') {
      this.setDisplayState('event_type_filter');
    } else if (type === 'search' || type === 'keyword_filter') {
      this.setDisplayState('keyword_filter');
    }
  }

  cancelEditing(): void {
    this.restoreFromSaved();
    this.setDisplayState('stream_live');
  }

  confirmEditing(): void {
    this.clearSavedState();
    this.setDisplayState('stream_live');
  }

  resetAllFilters(): void {
    this.clearAllFilters();
    this.setDisplayState('stream_live');
  }

  togglePause(): void {
    if (this.displayState === 'stream_paused') {
      this.setDisplayState('stream_live');
    } else {
      this.setDisplayState('stream_paused');
    }
  }
}