/**
 * FUNC-403: History Display Renderer
 * Displays event history in lower section with navigation
 */

const chalk = require('chalk');

class HistoryDisplayRenderer {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.historyData = [];
    this.focusIndex = 0;
    this.currentPage = 0;
    this.entriesPerPage = 20;
    this.selectedFile = null;
    this.totalEntries = 0;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    if (this.debug) {
      console.log('[HistoryDisplayRenderer] Initialized');
    }
  }

  /**
   * Initialize with selected file
   */
  async initialize(selectedFile) {
    this.selectedFile = selectedFile;
    this.focusIndex = 0;
    this.currentPage = 0;
    
    try {
      // Get file ID for the selected file
      const fileId = await this.databaseManager.ensureFile(selectedFile);
      
      // Load history data
      await this.loadHistory(fileId);
      
      if (this.debug) {
        console.log(`[HistoryDisplayRenderer] Initialized for file: ${selectedFile}, ${this.historyData.length} events`);
      }
      
    } catch (error) {
      console.error('[HistoryDisplayRenderer] Initialization error:', error);
      this.historyData = [];
      this.totalEntries = 0;
    }
  }

  /**
   * Load history data from database
   */
  async loadHistory(fileId) {
    try {
      // SQL query based on FUNC-403 specification
      const query = `
        SELECT 
          e.timestamp,
          et.name as event_type,
          m.line_count,
          m.block_count,
          m.file_size,
          e.id
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE e.file_id = ?
        ORDER BY e.timestamp DESC
        LIMIT ? OFFSET ?
      `;
      
      const offset = this.currentPage * this.entriesPerPage;
      this.historyData = await this.databaseManager.all(query, [fileId, this.entriesPerPage, offset]);
      
      // Get total count for pagination info
      const countQuery = `
        SELECT COUNT(*) as total
        FROM events e
        WHERE e.file_id = ?
      `;
      const countResult = await this.databaseManager.get(countQuery, [fileId]);
      this.totalEntries = countResult ? countResult.total : 0;
      
      // Reset focus if we have data
      if (this.historyData.length > 0) {
        this.focusIndex = 0;
      }
      
    } catch (error) {
      console.error('[HistoryDisplayRenderer] Error loading history:', error);
      this.historyData = [];
      this.totalEntries = 0;
    }
  }

  /**
   * Navigate history list
   */
  async navigate(direction) {
    if (this.historyData.length === 0) {
      return;
    }

    const oldIndex = this.focusIndex;
    
    if (direction === 'ArrowUp') {
      this.focusIndex = Math.max(this.focusIndex - 1, 0);
    } else if (direction === 'ArrowDown') {
      this.focusIndex = Math.min(this.focusIndex + 1, this.historyData.length - 1);
    }

    // Check if we need to load more data (pagination)
    if (direction === 'ArrowDown' && this.focusIndex === this.historyData.length - 1) {
      // Try to load next page if available
      if ((this.currentPage + 1) * this.entriesPerPage < this.totalEntries) {
        this.currentPage++;
        const fileId = await this.databaseManager.ensureFile(this.selectedFile);
        await this.loadHistory(fileId);
        this.focusIndex = 0; // Reset to top of new page
      }
    } else if (direction === 'ArrowUp' && this.focusIndex === 0 && this.currentPage > 0) {
      // Try to load previous page
      this.currentPage--;
      const fileId = await this.databaseManager.ensureFile(this.selectedFile);
      await this.loadHistory(fileId);
      this.focusIndex = this.historyData.length - 1; // Move to bottom of previous page
    }

    if (this.debug && oldIndex !== this.focusIndex) {
      console.log(`[HistoryDisplayRenderer] Navigate ${direction}: focus ${oldIndex} → ${this.focusIndex}`);
    }
  }

  /**
   * Render history display
   */
  render() {
    if (this.debug) {
      console.log(`[HistoryDisplayRenderer] 🔥 render() called - historyData.length: ${this.historyData.length}, selectedFile: ${this.selectedFile}`);
    }
    
    if (this.historyData.length === 0) {
      if (this.debug) {
        console.log('[HistoryDisplayRenderer] 📭 No history data, rendering no-history view');
      }
      return this.renderNoHistory();
    }

    try {
      const lines = [
        chalk.green('│ Time               Event     Lines  Blocks                               │')
      ];

      // Render each history entry
      this.historyData.forEach((entry, index) => {
        const timeStr = this.formatTimestamp(entry.timestamp);
        const eventStr = this.formatEventType(entry.event_type);
        const linesStr = this.formatMetric(entry.line_count, 5);
        const blocksStr = this.formatMetric(entry.block_count, 6);
        
        // Construct line without Size column
        const content = `${timeStr} ${eventStr.padEnd(8)} ${linesStr.padStart(6)} ${blocksStr.padStart(7)}`;
        let line = chalk.green(`│ ${content.padEnd(73)} │`);
        
        // Apply focus highlighting
        if (index === this.focusIndex) {
          line = this.applyFocusStyle(line);
        }
        
        lines.push(line);
      });

      // Fill remaining space if less than entriesPerPage
      const remainingLines = this.entriesPerPage - this.historyData.length;
      for (let i = 0; i < remainingLines; i++) {
        lines.push(chalk.green('│                                                                          │'));
      }

      // Add pagination and controls info
      const pageInfo = this.getPageInfo();
      const controlsLine = chalk.green(`│ [↑↓] Navigate  [ESC/q] Exit  ${pageInfo.padEnd(41)} │`);
      
      lines.push(chalk.green('│                                                                          │'));
      lines.push(controlsLine);
      lines.push(chalk.green('└──────────────────────────────────────────────────────────────────────────┘'));

      return lines.join('\n');
      
    } catch (error) {
      console.error('[HistoryDisplayRenderer] Render error:', error);
      return this.renderError();
    }
  }

  /**
   * Render when no history available
   */
  renderNoHistory() {
    return [
      chalk.green('│ No events recorded for this file                                        │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ Events will appear here as file changes                                  │'),
      chalk.green('│ are detected by the monitoring system.                                   │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ [ESC/q] Exit                                                             │'),
      chalk.green('└──────────────────────────────────────────────────────────────────────────┘')
    ].join('\n');
  }

  /**
   * Render error state
   */
  renderError() {
    return [
      chalk.green('│ Error loading event history                                              │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ Please try again or check the database                                   │'),
      chalk.green('│ connection.                                                              │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ [ESC/q] Exit                                                             │'),
      chalk.green('└──────────────────────────────────────────────────────────────────────────┘')
    ].join('\n');
  }

  /**
   * Format timestamp for history display
   */
  formatTimestamp(timestamp) {
    if (!timestamp) {
      return '---'.padEnd(11);
    }
    
    try {
      const date = new Date(timestamp);
      // Format as HH:MM:SS
      return date.toTimeString().slice(0, 8).padEnd(11);
    } catch (error) {
      return '---'.padEnd(11);
    }
  }

  /**
   * Format event type for display
   */
  formatEventType(eventType) {
    if (!eventType) {
      return 'unknown'.padEnd(8);
    }
    
    // Truncate and pad to 8 characters
    return eventType.slice(0, 8).padEnd(8);
  }

  /**
   * Format metric values
   */
  formatMetric(value, width) {
    if (value === null || value === undefined) {
      return '-'.padStart(width);
    }
    
    // Format large numbers with K/M suffixes
    if (value > 1000000) {
      return `${Math.round(value / 1000000)}M`.padStart(width);
    } else if (value > 1000) {
      return `${Math.round(value / 1000)}K`.padStart(width);
    } else {
      return String(value).padStart(width);
    }
  }

  /**
   * Apply focus highlighting to a line
   */
  applyFocusStyle(line) {
    // Apply white background with black text for focus
    const content = line.slice(2, -2); // Remove border characters
    return chalk.green('│ ') + chalk.bgWhite.black(content) + chalk.green(' │');
  }

  /**
   * Get pagination information
   */
  getPageInfo() {
    if (this.totalEntries === 0) {
      return '[0/0]';
    }
    
    const currentEntry = this.currentPage * this.entriesPerPage + this.focusIndex + 1;
    return `[${currentEntry}/${this.totalEntries}]`;
  }

  /**
   * Get current history data
   */
  getHistoryData() {
    return [...this.historyData];
  }

  /**
   * Get current focus index
   */
  getFocusIndex() {
    return this.focusIndex;
  }

  /**
   * Get focused entry
   */
  getFocusedEntry() {
    if (this.historyData.length > 0 && this.focusIndex >= 0 && this.focusIndex < this.historyData.length) {
      return this.historyData[this.focusIndex];
    }
    return null;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.historyData = [];
    this.selectedFile = null;
    this.focusIndex = 0;
    this.currentPage = 0;
    this.totalEntries = 0;
    
    if (this.debug) {
      console.log('[HistoryDisplayRenderer] Cleaned up');
    }
  }
}

module.exports = HistoryDisplayRenderer;