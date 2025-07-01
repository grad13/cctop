/**
 * FUNC-403: History Display Module
 * Display file event history with navigation in detail mode lower section
 */

import { 
  HistoryEntry, 
  PaginationInfo, 
  FocusedItemDetails, 
  EventCountResult, 
  HistoryDatabaseManager 
} from '../types';

class HistoryDisplay {
  private db: HistoryDatabaseManager;
  private configPath: string;
  private debug: boolean;
  private itemsPerPage: number;
  private currentPage: number;
  private focusIndex: number;
  private totalItems: number;
  private historyData: HistoryEntry[];

  constructor(databaseManager: HistoryDatabaseManager, configPath: string = '.cctop') {
    this.db = databaseManager;
    this.configPath = configPath;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Pagination settings
    this.itemsPerPage = 20;
    this.currentPage = 0;
    this.focusIndex = 0;
    this.totalItems = 0;
    this.historyData = [];
    
    if (this.debug) {
      console.log('[HistoryDisplay] Initialized');
    }
  }

  /**
   * Load history data for a file
   */
  async loadHistoryData(fileId: number): Promise<void> {
    try {
      // Get total count from aggregates
      const countResult: EventCountResult | null = await this.db.get(`
        SELECT total_events
        FROM aggregates
        WHERE file_id = ?
      `, [fileId]);
      
      this.totalItems = countResult?.total_events || 0;
      
      if (this.totalItems === 0) {
        this.historyData = [];
        return;
      }

      // Get history data for current page
      const offset: number = this.currentPage * this.itemsPerPage;
      this.historyData = await this.db.all(`
        SELECT 
          e.timestamp,
          et.name as event_type,
          et.code as event_code,
          m.line_count,
          m.block_count,
          e.id as event_id
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE e.file_id = ?
        ORDER BY e.timestamp DESC
        LIMIT ? OFFSET ?
      `, [fileId, this.itemsPerPage, offset]);

      // Reset focus to top of page
      this.focusIndex = 0;
      
      if (this.debug) {
        console.log(`[HistoryDisplay] Loaded ${this.historyData.length} history items for file ${fileId}`);
      }

    } catch (error) {
      if (this.debug) {
        console.error('[HistoryDisplay] Error loading history data:', error);
      }
      this.historyData = [];
      this.totalItems = 0;
    }
  }

  /**
   * Move focus up or down
   */
  moveFocus(direction: 'up' | 'down'): boolean {
    if (this.historyData.length === 0) {
      return false;
    }

    const previousIndex: number = this.focusIndex;
    
    if (direction === 'up') {
      this.focusIndex = Math.max(0, this.focusIndex - 1);
    } else if (direction === 'down') {
      this.focusIndex = Math.min(this.historyData.length - 1, this.focusIndex + 1);
    }

    const moved: boolean = previousIndex !== this.focusIndex;
    
    if (this.debug && moved) {
      console.log(`[HistoryDisplay] Focus moved ${direction}: ${previousIndex} → ${this.focusIndex}`);
    }

    return moved;
  }

  /**
   * Navigate to previous/next page
   */
  async navigatePage(direction: 'prev' | 'next', fileId: number): Promise<boolean> {
    const maxPages: number = Math.ceil(this.totalItems / this.itemsPerPage);
    const previousPage: number = this.currentPage;
    
    if (direction === 'prev') {
      this.currentPage = Math.max(0, this.currentPage - 1);
    } else if (direction === 'next') {
      this.currentPage = Math.min(maxPages - 1, this.currentPage + 1);
    }

    if (previousPage !== this.currentPage) {
      await this.loadHistoryData(fileId);
      
      if (this.debug) {
        console.log(`[HistoryDisplay] Page changed: ${previousPage} → ${this.currentPage}`);
      }
      return true;
    }
    
    return false;
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: number): string {
    if (!timestamp) return '-'.padEnd(19);
    
    const date: Date = new Date(timestamp);
    const year: number = date.getFullYear();
    const month: string = String(date.getMonth() + 1).padStart(2, '0');
    const day: string = String(date.getDate()).padStart(2, '0');
    const hour: string = String(date.getHours()).padStart(2, '0');
    const minute: string = String(date.getMinutes()).padStart(2, '0');
    const second: string = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * Format event type for display
   */
  private formatEventType(eventType: string): string {
    if (!eventType) return '-'.padEnd(6);
    return eventType.padEnd(6);
  }

  /**
   * Format number for display
   */
  private formatNumber(num: number | null): string {
    if (num === null || num === undefined) return '-'.padEnd(5);
    return String(num).padEnd(5);
  }

  /**
   * Apply focus highlighting to a line
   */
  private applyFocusHighlight(lineText: string, isFocused: boolean): string {
    if (isFocused) {
      // Apply focus background color (similar to selection)
      return `\x1b[44m\x1b[97m${lineText}\x1b[0m`; // Blue background, bright white text
    }
    return lineText;
  }

  /**
   * Render history display section
   */
  renderHistoryDisplay(width: number = 76): string {
    const lines: string[] = [];
    const displayCount: number = Math.min(this.itemsPerPage, this.totalItems);
    
    // Header
    const headerText: string = `Event History (Latest ${displayCount})`;
    const border: string = '─'.repeat(width - headerText.length - 6);
    lines.push(`├─ ${headerText} ${border}┤`);
    
    // Column headers
    const headerLine: string = '│ Event Timestamp     Event       Lines Blocks │';
    lines.push(headerLine + ' '.repeat(Math.max(0, width - headerLine.length)) + '│');
    
    if (this.historyData.length === 0) {
      // No data message
      lines.push(`│ No event history available${' '.repeat(Math.max(0, width - 30))}│`);
      lines.push(`│${' '.repeat(width - 2)}│`);
    } else {
      // History entries
      this.historyData.forEach((entry: HistoryEntry, index: number) => {
        const timestamp: string = this.formatTimestamp(entry.timestamp);
        const eventType: string = this.formatEventType(entry.event_type);
        const lines_count: string = this.formatNumber(entry.line_count);
        const blocks_count: string = this.formatNumber(entry.block_count);
        
        let entryLine: string = `│ ${timestamp} ${eventType}     ${lines_count} ${blocks_count}`;
        entryLine = entryLine + ' '.repeat(Math.max(0, width - entryLine.length)) + '│';
        
        // Apply focus highlighting
        const isFocused: boolean = index === this.focusIndex;
        entryLine = this.applyFocusHighlight(entryLine, isFocused);
        
        lines.push(entryLine);
      });
      
      // Fill remaining space if needed
      const remainingLines: number = this.itemsPerPage - this.historyData.length;
      for (let i = 0; i < remainingLines && lines.length < 25; i++) {
        lines.push(`│${' '.repeat(width - 2)}│`);
      }
    }
    
    // Status line
    const currentItem: number = this.currentPage * this.itemsPerPage + this.focusIndex + 1;
    const statusText: string = `[↑↓] Move  [ESC] Back  [q] Quit  [${currentItem}/${this.totalItems}]`;
    const statusLine: string = `│ ${statusText}`;
    lines.push(statusLine + ' '.repeat(Math.max(0, width - statusLine.length)) + '│');
    
    // Bottom border
    lines.push(`└${border}┘`);
    
    return lines.join('\n');
  }

  /**
   * Get current focused history entry
   */
  getCurrentFocusedEntry(): HistoryEntry | null {
    if (this.focusIndex >= 0 && this.focusIndex < this.historyData.length) {
      return this.historyData[this.focusIndex];
    }
    return null;
  }

  /**
   * Get display height (number of lines)
   */
  getDisplayHeight(): number {
    return Math.max(this.itemsPerPage + 5, 25); // Header + items + status + borders
  }

  /**
   * Get pagination info
   */
  getPaginationInfo(): PaginationInfo {
    const maxPages: number = Math.ceil(this.totalItems / this.itemsPerPage);
    return {
      currentPage: this.currentPage + 1,
      totalPages: maxPages,
      itemsPerPage: this.itemsPerPage,
      totalItems: this.totalItems,
      currentItem: this.currentPage * this.itemsPerPage + this.focusIndex + 1,
      itemsOnPage: this.historyData.length
    };
  }

  /**
   * Reset pagination and focus
   */
  reset(): void {
    this.currentPage = 0;
    this.focusIndex = 0;
    this.totalItems = 0;
    this.historyData = [];
    
    if (this.debug) {
      console.log('[HistoryDisplay] Reset to initial state');
    }
  }

  /**
   * Check if there are more pages
   */
  hasNextPage(): boolean {
    const maxPages: number = Math.ceil(this.totalItems / this.itemsPerPage);
    return this.currentPage < maxPages - 1;
  }

  hasPrevPage(): boolean {
    return this.currentPage > 0;
  }

  /**
   * Get focused item details for external use
   */
  getFocusedItemDetails(): FocusedItemDetails | null {
    const entry: HistoryEntry | null = this.getCurrentFocusedEntry();
    if (!entry) return null;

    return {
      index: this.focusIndex,
      item: entry,
      relativeIndex: this.focusIndex,
      eventId: entry.event_id,
      timestamp: entry.timestamp,
      eventType: entry.event_type
    };
  }
}

export = HistoryDisplay;