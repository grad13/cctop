/**
 * Status Display (FUNC-205 compliant)
 * Status area with streaming messages and scrolling support
 */

const stringWidth = require('string-width');
const chalk = require('chalk');

// Type-only imports
import type { 
  StatusAreaConfig,
  DatabaseManager,
  EventTypeRecord,
  StatusDisplay as IStatusDisplay
} from '../types/common';

// Status Display specific interfaces
interface StatusMessage {
  text: string;
  prefix: string;
  color: string;
  type: string;
  priority: number;
  timestamp: number;
  scrollPosition: number;
  scrollDirection: number; // 1 for forward, -1 for backward
  scrollPause: number;
}

interface ScrollState {
  position: number;
  direction: number;
  pause: number;
}

interface MessagePriorities {
  [key: string]: number;
  error: number;
  warning: number;
  progress: number;
  info: number;
  stats: number;
}

interface StatusDisplayConfig {
  display?: {
    statusArea?: StatusAreaConfig;
  };
}

interface StatusDisplayStatus {
  enabled: boolean;
  messageCount: number;
  maxLines: number;
  terminalWidth: number;
}

interface DatabaseStats {
  total_events: number;
  active_files: number;
}

interface EventStats {
  event_type: string;
  count: number;
  unique_files: number;
}

class StatusDisplay {
  private messageLines: StatusMessage[] = [];
  private scrollStates: ScrollState[] = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private scrollInterval: NodeJS.Timeout | null = null;
  private statisticsTimer: NodeJS.Timeout | null = null;
  private terminalWidth: number;
  private config: StatusAreaConfig | {};
  private maxLines: number;
  private enabled: boolean;
  private scrollSpeed: number;
  private updateIntervalMs: number;
  private priorities: MessagePriorities;

  constructor(config?: StatusDisplayConfig) {
    this.terminalWidth = process.stdout.columns || 80;
    this.config = config?.display?.statusArea || {};
    this.maxLines = (this.config as StatusAreaConfig).maxLines || 3;
    this.enabled = (this.config as StatusAreaConfig).enabled !== false;
    this.scrollSpeed = (this.config as StatusAreaConfig).scrollSpeed || 200;
    this.updateIntervalMs = (this.config as StatusAreaConfig).updateInterval || 5000;
    
    // Message types and their priorities
    this.priorities = {
      'error': 1,    // !! messages - highest priority
      'warning': 1,  // !! messages - highest priority  
      'progress': 2, // >> messages - normal priority
      'info': 2,     // >> messages - normal priority
      'stats': 3     // >> messages - lower priority
    };
    
    // Start scrolling timer
    if (this.enabled) {
      this.startScrolling();
    }
  }

  /**
   * Add new message (insert at top, shift others down)
   */
  addMessage(text: string, type: string = 'info'): void {
    if (!this.enabled) return;
    
    const priority = this.priorities[type] || 2;
    const prefix = (type === 'error' || type === 'warning') ? '!!' : '>>';
    const color = (type === 'error' || type === 'warning') ? 'red' : 'white';
    
    const message: StatusMessage = {
      text: text,
      prefix: prefix,
      color: color,
      type: type,
      priority: priority,
      timestamp: Date.now(),
      scrollPosition: 0,
      scrollDirection: 1, // 1 for forward, -1 for backward
      scrollPause: 0
    };
    
    // Check for duplicate messages (update instead of add)
    const existingIndex = this.messageLines.findIndex(
      msg => msg.text === text && msg.type === type
    );
    
    if (existingIndex !== -1) {
      // Update existing message timestamp
      this.messageLines[existingIndex].timestamp = Date.now();
      return;
    }
    
    // Insert at top based on priority
    if (priority === 1) {
      // High priority: insert at very top
      this.messageLines.unshift(message);
    } else {
      // Lower priority: insert after all high priority messages
      const insertIndex = this.messageLines.findIndex(msg => msg.priority > priority);
      if (insertIndex === -1) {
        this.messageLines.push(message);
      } else {
        this.messageLines.splice(insertIndex, 0, message);
      }
    }
    
    // Limit to maxLines
    if (this.messageLines.length > this.maxLines) {
      this.messageLines = this.messageLines.slice(0, this.maxLines);
    }
    
    // Reset scroll states
    this.scrollStates = this.messageLines.map(() => ({
      position: 0,
      direction: 1,
      pause: 0
    }));
  }

  /**
   * Update existing message (same line update, no shift)
   */
  updateMessage(oldText: string, newText: string, type: string = 'info'): void {
    if (!this.enabled) return;
    
    const messageIndex = this.messageLines.findIndex(
      msg => msg.text === oldText && msg.type === type
    );
    
    if (messageIndex !== -1) {
      this.messageLines[messageIndex].text = newText;
      this.messageLines[messageIndex].timestamp = Date.now();
      // Reset scroll for updated message
      this.messageLines[messageIndex].scrollPosition = 0;
      this.messageLines[messageIndex].scrollPause = 0;
    } else {
      // If not found, add as new message
      this.addMessage(newText, type);
    }
  }

  /**
   * Get display lines with current scroll positions
   */
  getDisplayLines(): string[] {
    if (!this.enabled || this.messageLines.length === 0) {
      return [];
    }
    
    return this.messageLines.map((message) => {
      const fullText = `${message.prefix} ${message.text}`;
      const textWidth = stringWidth(fullText);
      
      if (textWidth <= this.terminalWidth) {
        // Short message: display normally
        const coloredText = chalk[message.color as keyof typeof chalk](fullText);
        return (coloredText as string).padEnd(this.terminalWidth);
      } else {
        // Long message: apply scrolling
        const scrollPos = message.scrollPosition || 0;
        const visibleText = this.getScrolledText(fullText, scrollPos);
        const coloredText = chalk[message.color as keyof typeof chalk](visibleText);
        return (coloredText as string).padEnd(this.terminalWidth);
      }
    });
  }

  /**
   * Get scrolled text based on position
   */
  private getScrolledText(text: string, scrollPos: number): string {
    const textWidth = stringWidth(text);
    
    if (textWidth <= this.terminalWidth) {
      return text;
    }
    
    // Calculate visible portion
    const startPos = Math.max(0, scrollPos);
    const endPos = Math.min(textWidth, startPos + this.terminalWidth);
    
    // Extract visible characters (handle multi-byte characters)
    let visibleText = '';
    let currentWidth = 0;
    let charIndex = 0;
    
    // Skip characters before start position
    while (charIndex < text.length && currentWidth < startPos) {
      const char = text[charIndex];
      currentWidth += stringWidth(char);
      charIndex++;
    }
    
    // Collect visible characters
    while (charIndex < text.length && stringWidth(visibleText) < this.terminalWidth) {
      const char = text[charIndex];
      if (stringWidth(visibleText + char) > this.terminalWidth) break;
      visibleText += char;
      charIndex++;
    }
    
    return visibleText;
  }

  /**
   * Start scrolling timer
   */
  private startScrolling(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
    }
    
    this.scrollInterval = setInterval(() => {
      this.updateScrolling();
    }, this.scrollSpeed);
  }

  /**
   * Update scrolling positions
   */
  private updateScrolling(): void {
    if (!this.enabled) return;
    
    this.messageLines.forEach((message) => {
      const fullText = `${message.prefix} ${message.text}`;
      const textWidth = stringWidth(fullText);
      
      if (textWidth <= this.terminalWidth) {
        // No scrolling needed
        message.scrollPosition = 0;
        return;
      }
      
      // Handle scrolling pause (3 seconds at start/end)
      if (message.scrollPause > 0) {
        message.scrollPause--;
        return;
      }
      
      // Calculate scroll bounds
      const maxScroll = textWidth - this.terminalWidth;
      
      if (message.scrollDirection === 1) {
        // Scrolling forward
        message.scrollPosition = (message.scrollPosition || 0) + 1;
        
        if (message.scrollPosition >= maxScroll) {
          // Reached end, pause then reverse
          message.scrollPause = Math.floor(3000 / this.scrollSpeed); // 3 second pause
          message.scrollDirection = -1;
        }
      } else {
        // Scrolling backward
        message.scrollPosition = Math.max(0, (message.scrollPosition || 0) - 1);
        
        if (message.scrollPosition <= 0) {
          // Reached start, pause then forward
          message.scrollPause = Math.floor(3000 / this.scrollSpeed); // 3 second pause
          message.scrollDirection = 1;
        }
      }
    });
  }

  /**
   * Update terminal width (called on resize)
   */
  updateTerminalWidth(width?: number): void {
    this.terminalWidth = width || process.stdout.columns || 80;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messageLines = [];
    this.scrollStates = [];
  }

  /**
   * Generate statistics message from database
   */
  async generateStatistics(databaseManager: any): Promise<void> {
    if (!databaseManager || !databaseManager.isConnected()) {
      return;
    }
    

    try {
      // 10 minute statistics
      const tenMinStatsQuery = `
        SELECT 
          et.code as event_type,
          COUNT(*) as count,
          COUNT(DISTINCT e.file_id) as unique_files
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        WHERE e.timestamp > ?
        GROUP BY et.code
      `;
      
      const tenMinStats: EventStats[] = await databaseManager.all(tenMinStatsQuery, [Date.now() - 10 * 60 * 1000]);

      if (tenMinStats.length > 0) {
        const totalEvents = tenMinStats.reduce((sum, stat) => sum + stat.count, 0);
        const totalFiles = new Set(tenMinStats.map(stat => stat.unique_files)).size;
        
        // Format breakdown
        const breakdown = tenMinStats
          .map(stat => `${stat.count} ${stat.event_type}`)
          .join(', ');
        
        const message = `Last 10min: ${totalEvents} changes (${breakdown}) in ${totalFiles} files`;
        this.updateMessage('Last 10min:', message, 'stats');
      }

      // Database size statistics
      const dbStatsQuery = `
        SELECT 
          COUNT(*) as total_events,
          (SELECT COUNT(*) FROM files WHERE is_active = TRUE) as active_files
        FROM events
      `;
      
      const dbStats: DatabaseStats | null = await databaseManager.get(dbStatsQuery);

      if (dbStats) {
        const message = `Database: ${dbStats.total_events} events, ${dbStats.active_files} active files`;
        this.updateMessage('Database:', message, 'stats');
      }

    } catch (error: any) {
      // Enhanced error message with query context
      const errorContext = error.message.includes('event_type') ? '[10min stats query]' : 
                           error.message.includes('is_active') ? '[db stats query]' : '[unknown query]';
      this.addMessage(`Statistics error ${errorContext}: ${error.message}`, 'error');
    }
  }

  /**
   * Start periodic statistics update
   */
  startStatisticsTimer(databaseManager: any): void {
    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
    }

    this.statisticsTimer = setInterval(() => {
      this.generateStatistics(databaseManager);
    }, this.updateIntervalMs);
  }

  /**
   * Stop periodic statistics update
   */
  stopStatisticsTimer(): void {
    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
  }

  /**
   * Get current status for debugging
   */
  getStatus(): StatusDisplayStatus {
    return {
      enabled: this.enabled,
      messageCount: this.messageLines.length,
      maxLines: this.maxLines,
      terminalWidth: this.terminalWidth
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
    this.stopStatisticsTimer();
    this.messageLines = [];
    this.scrollStates = [];
  }
}

export = StatusDisplay;