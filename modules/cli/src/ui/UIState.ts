/**
 * UI State Management
 * Manages display state, filters, and search functionality
 */

import { EventRow } from '../types/event-row';
import { SearchResultCache } from './SearchResultCache';
import { KeywordSearchManager } from '../search';

// FUNC-202 Display States
export type DisplayState = 'normal' | 'filter' | 'search' | 'paused';

// Event types
export type EventType = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';

// Display modes
export type DisplayMode = 'all' | 'unique';

export class UIState {
  private displayState: DisplayState = 'normal';
  private isPaused: boolean = false;
  private displayMode: DisplayMode = 'all';
  private previousDisplayMode: DisplayMode = 'all';
  private searchText: string = '';
  private eventFilters: Set<EventType> = new Set<EventType>(['find', 'create', 'modify', 'delete', 'move', 'restore']);
  private events: EventRow[] = [];
  private selectedIndex: number = 0;
  private daemonStatus: string = '{yellow-fg}Daemon: ●CHECKING{/yellow-fg}';

  // FUNC-204: Dynamic width config
  private directoryWidth: number = 20;
  
  // Viewport management for scrolling
  private viewportStartIndex: number = 0;
  private viewportHeight: number = 20;  // Will be updated based on terminal size

  // FUNC-202 v0.3.4.0: LRU search result cache (max 3 entries)
  private searchCache: SearchResultCache = new SearchResultCache(3);
  private isSearchApplied: boolean = false; // Flag for DB search vs local search
  
  // Dynamic loading state
  private hasMoreData: boolean = true;
  private isLoadingMore: boolean = false;
  private totalLoaded: number = 0;
  
  // Search base events - snapshot captured when entering search mode for local filtering
  private searchBaseEvents: EventRow[] = [];
  
  // FUNC-202: State backup for ESC/Enter functionality
  private savedEventFilters: Set<EventType> | null = null;
  private savedSearchText: string | null = null;

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

  isNormalOrPaused(): boolean {
    return this.displayState === 'normal' || this.displayState === 'paused';
  }

  // Pause State
  isPausedState(): boolean {
    return this.isPaused;
  }

  togglePause(): void {
    this.isPaused = !this.isPaused;
    this.displayState = this.isPaused ? 'paused' : 'normal';
  }

  // Display Mode
  getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  setDisplayMode(mode: DisplayMode): void {
    this.previousDisplayMode = this.displayMode;
    this.displayMode = mode;
    // Invalidate LRU search cache on mode switch (all/unique affects results)
    this.searchCache.invalidate();
    this.isSearchApplied = false;
    // Reset UI state for clean mode transition
    this.selectedIndex = 0;
    this.viewportStartIndex = 0;
    this.hasMoreData = true; // Allow fresh data loading
  }
  
  getPreviousDisplayMode(): DisplayMode {
    return this.previousDisplayMode;
  }

  // Search Text
  getSearchText(): string {
    return this.searchText;
  }

  setSearchText(text: string): void {
    this.searchText = text;
  }

  clearSearchText(): void {
    this.searchText = '';
  }

  appendToSearchText(char: string): void {
    this.searchText += char;
    // Reset DB search flag to enable local search during typing
    this.isSearchApplied = false;
  }

  backspaceSearchText(): void {
    this.searchText = this.searchText.slice(0, -1);
    // Reset DB search flag to enable local search during typing
    this.isSearchApplied = false;
  }

  // Event Filters
  getEventFilters(): Set<EventType> {
    return this.eventFilters;
  }

  hasEventFilter(eventType: EventType): boolean {
    return this.eventFilters.has(eventType);
  }

  toggleEventFilter(eventType: EventType): void {
    if (this.eventFilters.has(eventType)) {
      this.eventFilters.delete(eventType);
    } else {
      this.eventFilters.add(eventType);
    }
  }

  resetEventFilters(): void {
    this.eventFilters = new Set(['find', 'create', 'modify', 'delete', 'move', 'restore']);
  }

  // Events
  getEvents(): EventRow[] {
    return this.events;
  }

  setEvents(events: EventRow[]): void {
    const previousEventCount = this.events.length;
    const previousSelectedIndex = this.selectedIndex;
    this.events = events;
    
    // Only reset selection if it's out of bounds
    if (this.selectedIndex >= events.length && events.length > 0) {
      // Only adjust if we're truly out of bounds
      this.selectedIndex = events.length - 1;
    } else if (events.length === 0) {
      this.selectedIndex = -1;
    }
    // Otherwise, keep the current selection index
    
    // Preserve viewport position unless we're starting fresh
    if (previousEventCount === 0 || events.length === 0) {
      this.viewportStartIndex = 0;
    }
    
    // Debug log for selection changes
    if (previousSelectedIndex !== this.selectedIndex) {
    }
    
    this.adjustViewport();
  }

  getEventsCount(): number {
    return this.events.length;
  }
  
  getSearchBaseEvents(): EventRow[] {
    return this.searchBaseEvents;
  }
  
  clearSearchBaseEvents(): void {
    this.searchBaseEvents = [];
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
    // Prevent wrapping to top when at bottom
    if (this.selectedIndex < this.events.length - 1) {
      this.selectedIndex++;
      this.adjustViewport();
    } else {
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

  // Mode Operations
  enterFilterMode(): void {
    // FUNC-202: Save current state before entering filter mode
    this.saveCurrentState();
    this.displayState = 'filter';
  }

  enterSearchMode(): void {
    // FUNC-202: Save current state before entering search mode
    this.saveCurrentState();
    this.displayState = 'search';
    this.searchText = '';
    this.isSearchApplied = false;  // Reset DB search flag for local search
    // Capture current events as search base
    this.searchBaseEvents = [...this.events];
  }

  exitSpecialMode(): void {
    if (this.displayState === 'filter' || this.displayState === 'search') {
      // Clear search text when exiting search mode
      if (this.displayState === 'search') {
        this.clearSearchText();
        this.clearSearchBaseEvents();  // Clear search base
      }
      this.displayState = this.isPaused ? 'paused' : 'normal';
    } else {
      // Clear filters and search, reset to all mode
      this.resetEventFilters();
      this.clearSearchText();
      this.displayMode = 'all';  // Reset to all mode
    }
    // Clear LRU search cache on ESC (fresh start)
    this.searchCache.invalidate();
    this.isSearchApplied = false;
  }

  applySearch(): void {
    // Apply search and return to normal mode
    this.displayState = this.isPaused ? 'paused' : 'normal';
    this.isSearchApplied = true;
    this.clearSearchBaseEvents();  // Clear search base after applying
  }

  // Filter Events
  applyFilters(events: EventRow[]): EventRow[] {
    let filteredEvents = events;

    // Apply event type filters
    if (this.eventFilters.size < 6) {
      filteredEvents = filteredEvents.filter(event => 
        this.eventFilters.has(event.event_type.toLowerCase() as EventType)
      );
    }

    // FUNC-209: Local search with multi-keyword support - only apply if not DB search
    if (this.searchText && !this.isSearchApplied) {
      filteredEvents = KeywordSearchManager.performLocalSearch(filteredEvents, this.searchText);
    }

    return filteredEvents;
  }

  // LRU search cache access for database search results
  getSearchCache(): SearchResultCache {
    return this.searchCache;
  }

  isDbSearchApplied(): boolean {
    return this.isSearchApplied;
  }

  resetDbSearchFlag(): void {
    this.isSearchApplied = false;
  }

  getActiveFilters(): string[] {
    // Convert to database format (capitalize first letter)
    return Array.from(this.eventFilters).map(filter => 
      filter.charAt(0).toUpperCase() + filter.slice(1)
    );
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

  /**
   * Check if the screen is filled with data
   * Returns true if we have enough events to fill the viewport
   */
  isScreenFilled(): boolean {
    return this.events.length >= this.viewportHeight;
  }

  /**
   * Determine if we should load more data based on screen fill state and selection position
   * - If screen is not filled: always load more (regardless of selection position)
   * - If screen is filled: only load more when near bottom
   */
  shouldLoadMoreData(): boolean {
    // Don't load in search mode or DB search mode
    if (this.displayState === 'search' || this.isSearchApplied) {
      return false;
    }

    // Must have more data available and not currently loading
    if (!this.hasMoreData || this.isLoadingMore) {
      return false;
    }

    // If screen is not filled, always load more (auto-fill strategy)
    if (!this.isScreenFilled()) {
      return true;
    }

    // If screen is filled, only load when near bottom (scroll strategy)
    return this.isNearBottom();
  }

  // Calculate Dynamic Width
  calculateDynamicWidth(): void {
    // FUNC-204: Dynamic width calculation
    const terminalWidth = process.stdout.columns || 80;
    // FUNC-202 v0.3.2.0: Fixed columns: Timestamp(19) + Elapsed(9) + FileName(35) + Event(8) + Lines(6) + Blocks(8) + Size(7) + spaces(15) = 107
    const fixedWidth = 107;
    this.directoryWidth = Math.max(10, terminalWidth - fixedWidth);
    
    // Also update viewport height based on terminal size
    // Header (3) + separator (1) + control area (3) = 7 lines reserved
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
    // Check if the first row (index 0) is within the viewport
    return this.viewportStartIndex === 0;
  }

  getRelativeSelectedIndex(): number {
    // Return selected index relative to viewport
    return this.selectedIndex - this.viewportStartIndex;
  }

  // FUNC-202: State backup and restore methods for ESC/Enter functionality
  private saveCurrentState(): void {
    this.savedEventFilters = new Set(this.eventFilters);
    this.savedSearchText = this.searchText;
  }

  restorePreviousState(): void {
    // FUNC-202: ESC behavior - discard edits and restore previous state
    if (this.savedEventFilters !== null) {
      // Restore saved state for filter/search modes
      this.eventFilters = new Set(this.savedEventFilters);
    } else if (this.displayState === 'normal' || this.displayState === 'paused') {
      // FUNC-202: In normal mode, ESC resets all filters
      this.resetEventFilters();
    }
    
    if (this.savedSearchText !== null) {
      this.searchText = this.savedSearchText;
    } else if (this.displayState === 'normal' || this.displayState === 'paused') {
      // Clear search text in normal mode
      this.searchText = '';
    }
    
    this.clearSavedState();
    this.displayState = this.isPaused ? 'paused' : 'normal';
    this.clearSearchBaseEvents();
  }

  confirmCurrentState(): void {
    // FUNC-202: Enter behavior - keep edits and overwrite state
    this.clearSavedState();
    this.displayState = this.isPaused ? 'paused' : 'normal';
    // Don't clear searchBaseEvents here - keep them for continued search filtering
  }

  private clearSavedState(): void {
    this.savedEventFilters = null;
    this.savedSearchText = null;
  }
}