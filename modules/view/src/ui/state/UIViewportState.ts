/**
 * UI Viewport State Management
 * Manages viewport-specific state (scrolling, selection, display area)
 * Part of Phase 3: State management separation
 */

export class UIViewportState {
  // Selection and viewport management
  private selectedIndex: number = 0;
  private viewportStartIndex: number = 0;
  private viewportHeight: number = 20;  // Will be updated based on terminal size
  
  constructor() {}

  /**
   * Get current selected index (absolute position in all events)
   */
  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  /**
   * Set selected index with bounds checking
   */
  setSelectedIndex(index: number, totalEvents: number): void {
    this.selectedIndex = Math.max(0, Math.min(index, totalEvents - 1));
    this.adjustViewportForSelection(totalEvents);
  }

  /**
   * Get viewport start index
   */
  getViewportStartIndex(): number {
    return this.viewportStartIndex;
  }

  /**
   * Get viewport height (number of visible rows)
   */
  getViewportHeight(): number {
    return this.viewportHeight;
  }

  /**
   * Set viewport height (called on terminal resize)
   */
  setViewportHeight(height: number): void {
    this.viewportHeight = Math.max(1, height);
  }

  /**
   * Calculate visible events slice for current viewport
   */
  getVisibleSlice<T>(allEvents: T[]): T[] {
    const endIndex = Math.min(
      this.viewportStartIndex + this.viewportHeight,
      allEvents.length
    );
    return allEvents.slice(this.viewportStartIndex, endIndex);
  }

  /**
   * Get relative selected index within viewport
   */
  getRelativeSelectedIndex(): number {
    return this.selectedIndex - this.viewportStartIndex;
  }

  /**
   * Move selection up
   */
  moveSelectionUp(totalEvents: number): void {
    if (this.selectedIndex > 0) {
      this.setSelectedIndex(this.selectedIndex - 1, totalEvents);
    }
  }

  /**
   * Move selection down
   */
  moveSelectionDown(totalEvents: number): void {
    if (this.selectedIndex < totalEvents - 1) {
      this.setSelectedIndex(this.selectedIndex + 1, totalEvents);
    }
  }

  /**
   * Check if top row is visible (for auto-refresh logic)
   */
  isTopRowVisible(): boolean {
    return this.viewportStartIndex === 0;
  }

  /**
   * Adjust viewport to keep selection visible
   */
  private adjustViewportForSelection(totalEvents: number): void {
    // If selection is above viewport, scroll up
    if (this.selectedIndex < this.viewportStartIndex) {
      this.viewportStartIndex = this.selectedIndex;
    }
    
    // If selection is below viewport, scroll down
    const viewportEndIndex = this.viewportStartIndex + this.viewportHeight - 1;
    if (this.selectedIndex > viewportEndIndex) {
      this.viewportStartIndex = Math.max(0, this.selectedIndex - this.viewportHeight + 1);
    }
    
    // Ensure viewport doesn't go beyond available data
    const maxViewportStart = Math.max(0, totalEvents - this.viewportHeight);
    this.viewportStartIndex = Math.min(this.viewportStartIndex, maxViewportStart);
  }

  /**
   * Reset viewport to top
   */
  resetViewport(): void {
    this.selectedIndex = 0;
    this.viewportStartIndex = 0;
  }

  /**
   * Get viewport state info for debugging
   */
  getViewportInfo() {
    return {
      selectedIndex: this.selectedIndex,
      viewportStartIndex: this.viewportStartIndex,
      viewportHeight: this.viewportHeight,
      relativeSelectedIndex: this.getRelativeSelectedIndex()
    };
  }
}