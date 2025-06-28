/**
 * FUNC-402: Aggregate Display Module
 * Display file basic info and aggregate statistics in detail mode upper section
 */

class AggregateDisplay {
  constructor(databaseManager, configPath = '.cctop') {
    this.db = databaseManager;
    this.configPath = configPath;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    if (this.debug) {
      console.log('[AggregateDisplay] Initialized');
    }
  }

  /**
   * Get aggregate data for a file
   */
  async getAggregateData(fileId) {
    try {
      // Get main aggregate statistics
      const aggregateData = await this.db.get(`
        SELECT 
          -- File identification
          f.id as file_id,
          f.inode,
          
          -- Event statistics
          a.total_events,
          a.total_creates,
          a.total_modifies,
          a.total_deletes,
          a.total_moves,
          a.total_restores,
          
          -- Time series statistics
          a.first_event_timestamp,
          a.last_event_timestamp,
          
          -- Size metrics (First/Max/Last)
          a.first_size,
          a.max_size,
          a.last_size,
          
          -- Lines metrics (First/Max/Last)
          a.first_lines,
          a.max_lines,
          a.last_lines,
          
          -- Blocks metrics (First/Max/Last)
          a.first_blocks,
          a.max_blocks,
          a.last_blocks,
          
          -- Cumulative totals
          a.total_size,
          a.total_lines,
          a.total_blocks
          
        FROM files f
        LEFT JOIN aggregates a ON f.id = a.file_id
        WHERE f.id = ?
      `, [fileId]);

      if (!aggregateData) {
        return null;
      }

      // Calculate average values
      const totalEvents = aggregateData.total_events || 0;
      const avgSize = totalEvents > 0 ? Math.round(aggregateData.total_size / totalEvents) : 0;
      const avgLines = totalEvents > 0 ? Math.round(aggregateData.total_lines / totalEvents) : 0;
      const avgBlocks = totalEvents > 0 ? Math.round(aggregateData.total_blocks / totalEvents) : 0;

      return {
        ...aggregateData,
        avg_size: avgSize,
        avg_lines: avgLines,
        avg_blocks: avgBlocks
      };

    } catch (error) {
      if (this.debug) {
        console.error('[AggregateDisplay] Error getting aggregate data:', error);
      }
      return null;
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hour}:${minute}`;
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (bytes === null || bytes === undefined) return '-';
    if (bytes === 0) return '0';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return unitIndex === 0 
      ? `${size}${units[unitIndex]}`
      : `${size.toFixed(1)}${units[unitIndex]}`;
  }

  /**
   * Render aggregate display section
   */
  renderAggregateDisplay(aggregateData, width = 76) {
    if (!aggregateData) {
      return this.renderNoDataMessage(width);
    }

    const lines = [];
    const border = '─'.repeat(width - 2);
    
    // Header
    lines.push(`┌─ File Details ${border.substring(0, width - 18)}┐`);
    
    // File identification section
    const fileIdLine = `│ FileID: ${aggregateData.file_id || 'N/A'}  inode: ${aggregateData.inode || 'N/A'}`;
    lines.push(fileIdLine.padEnd(width - 1) + '│');
    lines.push(`│${' '.repeat(width - 2)}│`);
    
    // Time series section
    const created = this.formatTimestamp(aggregateData.first_event_timestamp);
    const lastUpdate = this.formatTimestamp(aggregateData.last_event_timestamp);
    const createdLine = `│ Created:     ${created}`;
    lines.push(createdLine.padEnd(width - 1) + '│');
    const lastUpdateLine = `│ Last Update: ${lastUpdate}`;
    lines.push(lastUpdateLine.padEnd(width - 1) + '│');
    lines.push(`│${' '.repeat(width - 2)}│`);
    
    // Event statistics section
    const numberLine = `│ Number of Events`;
    lines.push(numberLine.padEnd(width - 1) + '│');
    const createCount = aggregateData.total_creates || 0;
    const deleteCount = aggregateData.total_deletes || 0;
    const modifyCount = aggregateData.total_modifies || 0;
    const moveCount = aggregateData.total_moves || 0;
    const restoreCount = aggregateData.total_restores || 0;
    const totalCount = aggregateData.total_events || 0;
    
    const eventLine1 = `│ Create=${createCount}  Delete=${deleteCount}   Modify=${modifyCount}`;
    const eventLine2 = `│ Move=${moveCount}   Restore=${restoreCount}  Total=${totalCount}`;
    lines.push(eventLine1.padEnd(width - 1) + '│');
    lines.push(eventLine2.padEnd(width - 1) + '│');
    lines.push(`│${' '.repeat(width - 2)}│`);
    
    // Metric statistics section
    const metricLine = `│ Metric Statistics`;
    lines.push(metricLine.padEnd(width - 1) + '│');
    const headerLine = `│       Byte  Line Block  Date               │`;
    lines.push(headerLine.padEnd(width - 1) + '│');
    
    // First values
    const firstSize = this.formatSize(aggregateData.first_size);
    const firstLines = aggregateData.first_lines || '-';
    const firstBlocks = aggregateData.first_blocks || '-';
    const firstDate = this.formatTimestamp(aggregateData.first_event_timestamp);
    const firstLine = `│ First  ${String(aggregateData.first_size || '-').padStart(3)}   ${String(firstLines).padStart(3)}   ${String(firstBlocks).padStart(3)}  ${firstDate}`;
    lines.push(firstLine.padEnd(width - 1) + '│');
    
    // Last values
    const lastSize = this.formatSize(aggregateData.last_size);
    const lastLines = aggregateData.last_lines || '-';
    const lastBlocks = aggregateData.last_blocks || '-';
    const lastDate = this.formatTimestamp(aggregateData.last_event_timestamp);
    const lastLine = `│ Last   ${String(aggregateData.last_size || '-').padStart(3)}   ${String(lastLines).padStart(3)}   ${String(lastBlocks).padStart(3)}  ${lastDate}`;
    lines.push(lastLine.padEnd(width - 1) + '│');
    
    // Max values
    const maxSize = this.formatSize(aggregateData.max_size);
    const maxLines = aggregateData.max_lines || '-';
    const maxBlocks = aggregateData.max_blocks || '-';
    const maxLine = `│ Max    ${String(aggregateData.max_size || '-').padStart(3)}   ${String(maxLines).padStart(3)}   ${String(maxBlocks).padStart(3)}         -`;
    lines.push(maxLine.padEnd(width - 1) + '│');
    
    // Average values
    const avgSize = this.formatSize(aggregateData.avg_size);
    const avgLines = aggregateData.avg_lines || '-';
    const avgBlocks = aggregateData.avg_blocks || '-';
    const avgLine = `│ Avg    ${String(aggregateData.avg_size || '-').padStart(3)}   ${String(avgLines).padStart(3)}   ${String(avgBlocks).padStart(3)}         -`;
    lines.push(avgLine.padEnd(width - 1) + '│');
    
    // Bottom border (FUNC-403 boundary)
    const boundaryText = '(FUNC-403 境界)';
    const remainingBorder = '─'.repeat(width - boundaryText.length - 4);
    lines.push(`├─ ${boundaryText} ${remainingBorder}┤`);
    
    return lines.join('\n');
  }

  /**
   * Render no data message
   */
  renderNoDataMessage(width = 76) {
    const lines = [];
    const border = '─'.repeat(width - 2);
    
    lines.push(`┌─ File Details ${border.substring(0, width - 18)}┐`);
    lines.push(`│${' '.repeat(width - 2)}│`);
    lines.push(`│ No aggregate data available${' '.repeat(Math.max(0, width - 30))}│`);
    lines.push(`│${' '.repeat(width - 2)}│`);
    lines.push(`├${border}┤`);
    
    return lines.join('\n');
  }

  /**
   * Get display height (number of lines)
   */
  getDisplayHeight() {
    return 15; // Fixed height for aggregate display section
  }

  /**
   * Async method to render aggregate display for a file
   */
  async renderForFile(fileId, width = 76) {
    const aggregateData = await this.getAggregateData(fileId);
    return this.renderAggregateDisplay(aggregateData, width);
  }

  /**
   * Get summary data for quick display
   */
  async getSummaryData(fileId) {
    try {
      const data = await this.getAggregateData(fileId);
      if (!data) return null;

      return {
        fileId: data.file_id,
        inode: data.inode,
        totalEvents: data.total_events || 0,
        lastUpdate: this.formatTimestamp(data.last_event_timestamp),
        currentSize: this.formatSize(data.last_size),
        currentLines: data.last_lines || 0
      };
    } catch (error) {
      if (this.debug) {
        console.error('[AggregateDisplay] Error getting summary data:', error);
      }
      return null;
    }
  }
}

module.exports = AggregateDisplay;