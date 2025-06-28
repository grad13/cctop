/**
 * FUNC-402: Aggregate Display Renderer
 * Displays file statistics in upper section
 */

const chalk = require('chalk');

class AggregateDisplayRenderer {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.fileData = null;
    this.selectedFile = null;
  }

  /**
   * Initialize with selected file
   */
  async initialize(selectedFile) {
    this.selectedFile = selectedFile;
    
    try {
      // Get file ID for the selected file
      const fileId = await this.databaseManager.ensureFile(selectedFile);
      
      // Get aggregate statistics
      this.fileData = await this.databaseManager.getAggregateStats(fileId);
      
      // Get file info for inode
      const fileInfo = await this.databaseManager.get(
        'SELECT id, inode FROM files WHERE id = ?',
        [fileId]
      );
      
      // If no aggregates exist, initialize with basic file info
      if (!this.fileData) {
        this.fileData = {
          file_id: fileId,
          inode: fileInfo ? fileInfo.inode : null,
          total_events: 0,
          total_creates: 0,
          total_modifies: 0,
          total_deletes: 0,
          total_moves: 0,
          total_restores: 0,
          first_event_timestamp: null,
          last_event_timestamp: null,
          first_size: null,
          max_size: null,
          last_size: null,
          total_size: 0,
          first_lines: null,
          max_lines: null,
          last_lines: null,
          total_lines: 0,
          first_blocks: null,
          max_blocks: null,
          last_blocks: null,
          total_blocks: 0
        };
      } else {
        // Add inode to existing data
        this.fileData.inode = fileInfo ? fileInfo.inode : null;
      }
    } catch (error) {
      // Error handled silently
      this.fileData = null;
    }
  }

  /**
   * Render aggregate statistics display
   */
  render() {
    if (!this.fileData || !this.selectedFile) {
      return this.renderNoData();
    }

    try {
      const lines = [
        chalk.green('┌─ File Details ──────────────────────────────────────────────────────────┐'),
        chalk.green(`│ FileID: ${String(this.fileData.file_id).padEnd(4)}  inode: ${String(this.fileData.inode || 'N/A').padEnd(51)} │`),
        chalk.green('│                                                                          │'),
        chalk.green(`│ Created:     ${this.formatTimestamp(this.fileData.first_event_timestamp).padEnd(56)} │`),
        chalk.green(`│ Last Update: ${this.formatTimestamp(this.fileData.last_event_timestamp).padEnd(56)} │`),
        chalk.green('│                                                                          │'),
        chalk.green('│ Number of Events                                                         │'),
        chalk.green(`│ Create=${String(this.fileData.total_creates || 0).padStart(1)}  Delete=${String(this.fileData.total_deletes || 0).padStart(1)}   Modify=${String(this.fileData.total_modifies || 0).padStart(3)}                             │`),
        chalk.green(`│ Move=${String(this.fileData.total_moves || 0).padStart(2)}   Restore=${String(this.fileData.total_restores || 0).padStart(1)}  Total=${String(this.fileData.total_events || 0).padStart(3)}                              │`),
        chalk.green('│                                                                          │'),
        chalk.green('│ Metric Statistics                                                        │'),
        chalk.green('│         Bytes     Lines    Blocks    Date                               │')
      ];

      // Add metric rows with proper formatting
      const firstSizeStr = this.formatMetric(this.fileData.first_size, 6);
      const firstLinesStr = this.formatMetric(this.fileData.first_lines, 4);
      const firstBlocksStr = this.formatMetric(this.fileData.first_blocks, 5);
      const firstDateStr = this.formatTimestamp(this.fileData.first_event_timestamp, 'short');
      
      const lastSizeStr = this.formatMetric(this.fileData.last_size, 6);
      const lastLinesStr = this.formatMetric(this.fileData.last_lines, 4);
      const lastBlocksStr = this.formatMetric(this.fileData.last_blocks, 5);
      const lastDateStr = this.formatTimestamp(this.fileData.last_event_timestamp, 'short');
      
      const maxSizeStr = this.formatMetric(this.fileData.max_size, 6);
      const maxLinesStr = this.formatMetric(this.fileData.max_lines, 4);
      const maxBlocksStr = this.formatMetric(this.fileData.max_blocks, 5);
      
      // Calculate averages
      const avgSize = this.fileData.total_events > 0 ? Math.round((this.fileData.total_size || 0) / this.fileData.total_events) : 0;
      const avgLines = this.fileData.total_events > 0 ? Math.round((this.fileData.total_lines || 0) / this.fileData.total_events) : 0;
      const avgBlocks = this.fileData.total_events > 0 ? Math.round((this.fileData.total_blocks || 0) / this.fileData.total_events) : 0;
      
      const avgSizeStr = this.formatMetric(avgSize, 6);
      const avgLinesStr = this.formatMetric(avgLines, 4);
      const avgBlocksStr = this.formatMetric(avgBlocks, 5);

      lines.push(
        chalk.green(`│ First   ${firstSizeStr.padStart(10)} ${firstLinesStr.padStart(9)} ${firstBlocksStr.padStart(9)}  ${firstDateStr.padEnd(24)} │`),
        chalk.green(`│ Last    ${lastSizeStr.padStart(10)} ${lastLinesStr.padStart(9)} ${lastBlocksStr.padStart(9)}  ${lastDateStr.padEnd(24)} │`),
        chalk.green(`│ Max     ${maxSizeStr.padStart(10)} ${maxLinesStr.padStart(9)} ${maxBlocksStr.padStart(9)}  ${'-'.padEnd(24)} │`),
        chalk.green(`│ Avg     ${avgSizeStr.padStart(10)} ${avgLinesStr.padStart(9)} ${avgBlocksStr.padStart(9)}  ${'-'.padEnd(24)} │`),
        chalk.green('├─ Event History (Latest 50) ─────────────────────────────────────────────┤')
      );

      const result = lines.join('\n');
      return result;
      
    } catch (error) {
      // Error handled silently
      return this.renderError();
    }
  }

  /**
   * Render when no data available
   */
  renderNoData() {
    return [
      chalk.green('┌─ File Details ──────────────────────────────────────────────────────────┐'),
      chalk.green('│ No file selected or data unavailable                                    │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ Use ↑↓ arrows to select a file from the                                │'),
      chalk.green('│ main display, then press Enter to view                                  │'),
      chalk.green('│ detailed statistics and history.                                        │'),
      chalk.green('│                                                                          │'),
      chalk.green('├─ Event History (Latest 50) ─────────────────────────────────────────────┤')
    ].join('\n');
  }

  /**
   * Render error state
   */
  renderError() {
    return [
      chalk.green('┌─ File Details ──────────────────────────────────────────────────────────┐'),
      chalk.green('│ Error loading file statistics                                           │'),
      chalk.green('│                                                                          │'),
      chalk.green('│ Please try again or check the database                                  │'),
      chalk.green('│ connection.                                                              │'),
      chalk.green('│                                                                          │'),
      chalk.green('├─ Event History (Latest 50) ─────────────────────────────────────────────┤')
    ].join('\n');
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp, format = 'full') {
    if (!timestamp) {
      return format === 'short' ? '---' : 'Not available';
    }
    
    try {
      const date = new Date(timestamp);
      if (format === 'short') {
        return date.toISOString().slice(5, 16).replace('T', ' ');
      } else {
        return date.toISOString().slice(0, 16).replace('T', ' ');
      }
    } catch (error) {
      return format === 'short' ? '---' : 'Invalid date';
    }
  }

  /**
   * Format metric values with proper padding
   */
  formatMetric(value, width) {
    if (value === null || value === undefined) {
      return '-'.padStart(width);
    }
    return String(value).padStart(width);
  }

  /**
   * Truncate file name for display
   */
  truncateFileName(fileName, maxLength) {
    if (!fileName) {
      return 'Unknown';
    }
    
    if (fileName.length <= maxLength) {
      return fileName;
    }
    
    // Show beginning and end of long file names
    const start = fileName.substring(0, Math.floor(maxLength / 2) - 1);
    const end = fileName.substring(fileName.length - Math.floor(maxLength / 2) + 1);
    return `${start}...${end}`;
  }

  /**
   * Get current file data
   */
  getFileData() {
    return this.fileData;
  }

  /**
   * Get selected file path
   */
  getSelectedFile() {
    return this.selectedFile;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.fileData = null;
    this.selectedFile = null;
  }
}

module.exports = AggregateDisplayRenderer;