/**
 * FUNC-403: History Display Module
 * Display file event history with navigation in detail mode lower section
 */

class HistoryDisplay {
  constructor(databaseManager, configPath = '.cctop') {
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
  async loadHistoryData(fileId) {
    try {
      // Get total count from aggregates
      const countResult = await this.db.get(`
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
      const offset = this.currentPage * this.itemsPerPage;
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
  moveFocus(direction) {
    if (this.historyData.length === 0) {
      return false;
    }

    const previousIndex = this.focusIndex;
    
    if (direction === 'up') {
      this.focusIndex = Math.max(0, this.focusIndex - 1);
    } else if (direction === 'down') {
      this.focusIndex = Math.min(this.historyData.length - 1, this.focusIndex + 1);
    }

    const moved = previousIndex !== this.focusIndex;
    
    if (this.debug && moved) {
      console.log(`[HistoryDisplay] Focus moved ${direction}: ${previousIndex} → ${this.focusIndex}`);
    }

    return moved;
  }

  /**
   * Navigate to previous/next page
   */
  async navigatePage(direction, fileId) {
    const maxPages = Math.ceil(this.totalItems / this.itemsPerPage);
    const previousPage = this.currentPage;
    
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
  formatTimestamp(timestamp) {
    if (!timestamp) return '-'.padEnd(19);
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * Format event type for display
   */
  formatEventType(eventType) {
    if (!eventType) return '-'.padEnd(6);
    return eventType.padEnd(6);
  }

  /**
   * Format number for display
   */
  formatNumber(num) {
    if (num === null || num === undefined) return '-'.padEnd(5);
    return String(num).padEnd(5);
  }

  /**
   * Apply focus highlighting to a line
   */
  applyFocusHighlight(lineText, isFocused) {
    if (isFocused) {
      // Apply focus background color (similar to selection)
      return `\x1b[44m\x1b[97m${lineText}\x1b[0m`; // Blue background, bright white text
    }
    return lineText;
  }

  /**
   * Render history display section
   */
  renderHistoryDisplay(width = 76) {
    const lines = [];
    const displayCount = Math.min(this.itemsPerPage, this.totalItems);
    
    // Header
    const headerText = `Event History (Latest ${displayCount})`;
    const border = '─'.repeat(width - headerText.length - 6);
    lines.push(`├─ ${headerText} ${border}┤`);
    
    // Column headers
    const headerLine = '│ Event Timestamp     Event       Lines Blocks │';
    lines.push(headerLine + ' '.repeat(Math.max(0, width - headerLine.length)) + '│');
    
    if (this.historyData.length === 0) {
      // No data message
      lines.push(`│ No event history available${' '.repeat(Math.max(0, width - 30))}│`);
      lines.push(`│${' '.repeat(width - 2)}│`);
    } else {
      // History entries
      this.historyData.forEach((entry, index) => {
        const timestamp = this.formatTimestamp(entry.timestamp);
        const eventType = this.formatEventType(entry.event_type);
        const lines_count = this.formatNumber(entry.line_count);
        const blocks_count = this.formatNumber(entry.block_count);
        
        let entryLine = `│ ${timestamp} ${eventType}     ${lines_count} ${blocks_count}`;
        entryLine = entryLine + ' '.repeat(Math.max(0, width - entryLine.length)) + '│';
        
        // Apply focus highlighting
        const isFocused = index === this.focusIndex;
        entryLine = this.applyFocusHighlight(entryLine, isFocused);
        
        lines.push(entryLine);
      });
      
      // Fill remaining space if needed
      const remainingLines = this.itemsPerPage - this.historyData.length;
      for (let i = 0; i < remainingLines && lines.length < 25; i++) {
        lines.push(`│${' '.repeat(width - 2)}│`);
      }
    }
    
    // Status line
    const currentItem = this.currentPage * this.itemsPerPage + this.focusIndex + 1;
    const statusText = `[↑↓] Move  [ESC] Back  [q] Quit  [${currentItem}/${this.totalItems}]`;
    const statusLine = `│ ${statusText}`;
    lines.push(statusLine + ' '.repeat(Math.max(0, width - statusLine.length)) + '│');
    
    // Bottom border
    lines.push(`└${border}┘`);
    
    return lines.join('\n');
  }


  /**
   * Get current focused history entry
   */
  getCurrentFocusedEntry() {
    if (this.focusIndex >= 0 && this.focusIndex < this.historyData.length) {
      return this.historyData[this.focusIndex];
    }
    return null;
  }

  /**
   * Get display height (number of lines)
   */
  getDisplayHeight() {
    return Math.max(this.itemsPerPage + 5, 25); // Header + items + status + borders
  }

  /**
   * Get pagination info
   */
  getPaginationInfo() {
    const maxPages = Math.ceil(this.totalItems / this.itemsPerPage);
    return {
      currentPage: this.currentPage + 1,
      totalPages: maxPages,
      currentItem: this.currentPage * this.itemsPerPage + this.focusIndex + 1,
      totalItems: this.totalItems,
      itemsOnPage: this.historyData.length
    };
  }

  /**
   * Reset pagination and focus
   */
  reset() {
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
  hasNextPage() {
    const maxPages = Math.ceil(this.totalItems / this.itemsPerPage);
    return this.currentPage < maxPages - 1;
  }

  hasPrevPage() {
    return this.currentPage > 0;
  }

  /**
   * Get focused item details for external use
   */
  getFocusedItemDetails() {
    const entry = this.getCurrentFocusedEntry();
    if (!entry) return null;

    return {
      eventId: entry.event_id,
      timestamp: entry.timestamp,
      eventType: entry.event_type,
      eventCode: entry.event_code,
      lineCount: entry.line_count,
      blockCount: entry.block_count,
      formattedTimestamp: this.formatTimestamp(entry.timestamp)
    };
  }
}

module.exports = HistoryDisplay;