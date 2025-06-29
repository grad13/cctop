/**
 * Status Display (FUNC-205 compliant)
 * Status area with streaming messages and scrolling support
 */

const chalk = require('chalk');

// Type imports
import type { 
  StatusAreaConfig,
  DatabaseManager,
  IStatusDisplay,
  StatusDisplayConfig,
  StatusDisplayStatus,
  MessageType
} from './types/MessageTypes';

// Component imports
import { MessageManager } from './managers/MessageManager';
import { ScrollController } from './controllers/ScrollController';
import { StatisticsProvider } from './providers/StatisticsProvider';

// Legacy config adapter
interface StatusDisplayLegacyConfig {
  display?: {
    statusArea?: StatusAreaConfig;
  };
}

class StatusDisplay implements IStatusDisplay {
  private messageManager: MessageManager;
  private scrollController: ScrollController;
  private statisticsProvider: StatisticsProvider;
  private config: StatusDisplayConfig;
  private enabled: boolean;
  private scrollTimer: NodeJS.Timeout | null = null;
  private databaseManager: DatabaseManager | null = null;

  constructor(config?: StatusDisplayLegacyConfig) {
    // Extract configuration
    const statusAreaConfig = config?.display?.statusArea || {};
    this.config = {
      maxLines: (statusAreaConfig as StatusAreaConfig).maxLines || 3,
      enabled: (statusAreaConfig as StatusAreaConfig).enabled !== false,
      scrollSpeed: (statusAreaConfig as StatusAreaConfig).scrollSpeed || 200,
      updateInterval: (statusAreaConfig as StatusAreaConfig).updateInterval || 5000
    } as StatusDisplayConfig;
    this.enabled = this.config.enabled!;

    // Initialize components
    this.messageManager = new MessageManager(this.config);
    this.scrollController = new ScrollController(this.config);
    this.statisticsProvider = new StatisticsProvider(null, this.config);

    // Connect components
    this.statisticsProvider.setMessageManager(this.messageManager);

    // Start services if enabled
    if (this.enabled) {
      this.startScrolling();
    }
  }

  /**
   * Add new message (insert at top, shift others down)
   */
  addMessage(text: string, type: string = 'info'): void {
    if (!this.enabled) return;
    this.messageManager.addMessage(text, type as MessageType);
  }

  /**
   * Update existing message (same line update, no shift)
   * Overloaded to support both signatures
   */
  updateMessage(oldText: string, newText?: string, type?: string): void {
    if (!this.enabled) return;
    
    // Support single argument (message only)
    if (newText === undefined) {
      // Find and update any existing message
      this.messageManager.addMessage(oldText, 'info');
    } else {
      // Normal update with old and new text
      this.messageManager.updateMessage(oldText, newText, (type || 'info') as MessageType);
    }
  }

  /**
   * Get display lines with current scroll positions
   */
  getDisplayLines(): string[] {
    if (!this.enabled) return [];

    const messages = this.messageManager.getDisplayMessages();
    const terminalWidth = process.stdout.columns || 80;
    
    return messages.map(message => {
      const scrolledText = this.scrollController.calculateScrolledText(message);
      const coloredText = chalk[message.color as keyof typeof chalk](scrolledText);
      return (coloredText as string).padEnd(terminalWidth);
    });
  }

  /**
   * Start scrolling timer
   */
  private startScrolling(): void {
    this.scrollController.startScrolling();
    
    // Start update timer for scroll positions
    if (this.scrollTimer) {
      clearInterval(this.scrollTimer);
    }
    
    this.scrollTimer = setInterval(() => {
      const messages = this.messageManager.getAllMessages();
      this.scrollController.updateAllMessages(messages);
    }, this.config.scrollSpeed || 200);
  }

  /**
   * Update terminal width (called on resize)
   */
  updateTerminalWidth(width?: number): void {
    this.scrollController.updateTerminalWidth(width);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messageManager.clearMessages();
  }

  /**
   * Generate statistics message from database
   */
  async generateStatistics(databaseManager: DatabaseManager): Promise<void> {
    // Store database manager reference for statistics
    if (!this.databaseManager && databaseManager) {
      this.databaseManager = databaseManager;
      this.statisticsProvider = new StatisticsProvider(databaseManager, this.config);
      this.statisticsProvider.setMessageManager(this.messageManager);
    }
    
    await this.statisticsProvider.generateStatistics();
  }

  /**
   * Start periodic statistics update
   */
  startStatisticsTimer(databaseManager: DatabaseManager): void {
    // Store database manager reference
    if (!this.databaseManager && databaseManager) {
      this.databaseManager = databaseManager;
      this.statisticsProvider = new StatisticsProvider(databaseManager, this.config);
      this.statisticsProvider.setMessageManager(this.messageManager);
    }
    
    this.statisticsProvider.startPeriodicUpdates();
  }

  /**
   * Stop periodic statistics update
   */
  stopStatisticsTimer(): void {
    this.statisticsProvider.stopPeriodicUpdates();
  }

  /**
   * Get current status for debugging
   */
  getStatus(): StatusDisplayStatus {
    return {
      enabled: this.enabled,
      messageCount: this.messageManager.getMessageCount(),
      maxLines: this.config.maxLines || 3,
      terminalWidth: process.stdout.columns || 80
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.scrollTimer) {
      clearInterval(this.scrollTimer);
      this.scrollTimer = null;
    }
    
    this.scrollController.cleanup();
    this.statisticsProvider.cleanup();
    this.messageManager.clearMessages();
  }

  /**
   * Get integrated status (new method for debugging)
   */
  getIntegratedStatus(): object {
    return {
      display: this.getStatus(),
      messages: this.messageManager.getMessageSummary(),
      scroll: this.scrollController.getScrollStatus(),
      statistics: this.statisticsProvider.getProviderStatus()
    };
  }
}

export = StatusDisplay;