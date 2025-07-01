/**
 * Message Manager
 * Manages status messages with priority-based ordering
 */

import type { 
  StatusMessage, 
  MessageType, 
  MessagePriorities,
  StatusDisplayConfig 
} from '../types/MessageTypes';

export class MessageManager {
  private messages: StatusMessage[] = [];
  private maxLines: number;
  private priorities: MessagePriorities;

  constructor(config: StatusDisplayConfig = {}) {
    this.maxLines = config.maxLines || 3;
    this.priorities = {
      'error': 1,    // !! messages - highest priority
      'warning': 1,  // !! messages - highest priority  
      'progress': 2, // >> messages - normal priority
      'info': 2,     // >> messages - normal priority
      'stats': 3     // >> messages - lower priority
    };
  }

  /**
   * Add new message with priority-based insertion
   */
  addMessage(text: string, type: MessageType = 'info'): void {
    const priority = this.priorities[type] || 2;
    const prefix = (type === 'error' || type === 'warning') ? '!!' : '>>';
    const color = (type === 'error' || type === 'warning') ? 'red' : 'white';

    // Check for duplicate messages
    const existingIndex = this.messages.findIndex(
      msg => msg.text === text && msg.type === type
    );
    
    if (existingIndex !== -1) {
      // Update existing message timestamp
      this.messages[existingIndex].timestamp = Date.now();
      return;
    }

    const message: StatusMessage = {
      text,
      prefix,
      color,
      type,
      priority,
      timestamp: Date.now(),
      scrollPosition: 0,
      scrollDirection: 1,
      scrollPause: 0
    };

    // Insert based on priority
    this.insertMessageByPriority(message);
    this.trimMessages();
  }

  /**
   * Update existing message or add new if not found
   */
  updateMessage(oldText: string, newText: string, type: MessageType = 'info'): void {
    const messageIndex = this.messages.findIndex(
      msg => msg.text === oldText && msg.type === type
    );
    
    if (messageIndex !== -1) {
      // Update existing message
      this.messages[messageIndex].text = newText;
      this.messages[messageIndex].timestamp = Date.now();
      // Reset scroll for updated message
      this.messages[messageIndex].scrollPosition = 0;
      this.messages[messageIndex].scrollPause = 0;
    } else {
      // Add new message if not found
      this.addMessage(newText, type);
    }
  }

  /**
   * Get messages for display (limited by maxLines)
   */
  getDisplayMessages(maxLines: number = this.maxLines): StatusMessage[] {
    return this.messages.slice(0, maxLines);
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Get total message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Update max lines configuration
   */
  setMaxLines(maxLines: number): void {
    this.maxLines = maxLines;
    this.trimMessages();
  }

  /**
   * Insert message at correct position based on priority
   */
  private insertMessageByPriority(message: StatusMessage): void {
    if (message.priority === 1) {
      // High priority: insert at very top
      this.messages.unshift(message);
    } else {
      // Lower priority: insert after all high priority messages
      const insertIndex = this.messages.findIndex(msg => msg.priority > message.priority);
      if (insertIndex === -1) {
        this.messages.push(message);
      } else {
        this.messages.splice(insertIndex, 0, message);
      }
    }
  }

  /**
   * Trim messages to maxLines limit
   */
  private trimMessages(): void {
    if (this.messages.length > this.maxLines) {
      this.messages = this.messages.slice(0, this.maxLines);
    }
  }

  /**
   * Get message summary for debugging
   */
  getMessageSummary(): object {
    const summary: Record<string, number> = {};
    this.messages.forEach(msg => {
      summary[msg.type] = (summary[msg.type] || 0) + 1;
    });
    
    return {
      total: this.messages.length,
      maxLines: this.maxLines,
      byType: summary,
      oldestMessage: this.messages.length > 0 ? 
        Date.now() - this.messages[this.messages.length - 1].timestamp : 0
    };
  }

  /**
   * Get all messages (for ScrollController access)
   */
  getAllMessages(): StatusMessage[] {
    return this.messages;
  }
}