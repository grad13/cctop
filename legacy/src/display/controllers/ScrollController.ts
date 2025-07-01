/**
 * Scroll Controller
 * Manages scrolling behavior for long messages
 */

import type { 
  StatusMessage,
  StatusDisplayConfig 
} from '../types/MessageTypes';

const stringWidth = require('string-width');

export class ScrollController {
  private scrollSpeed: number;
  private terminalWidth: number;
  private scrollInterval: NodeJS.Timeout | null = null;
  private pauseDuration: number = 3000; // 3 seconds pause at boundaries

  constructor(config: StatusDisplayConfig = {}) {
    this.scrollSpeed = config.scrollSpeed || 200;
    this.terminalWidth = process.stdout.columns || 80;
  }

  /**
   * Start the scrolling timer
   */
  startScrolling(): void {
    if (this.scrollInterval) {
      return; // Already running
    }

    this.scrollInterval = setInterval(() => {
      // Scrolling is now handled per-message in updateMessageScroll
    }, this.scrollSpeed);
  }

  /**
   * Stop the scrolling timer
   */
  stopScrolling(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  /**
   * Update scroll position for a single message
   */
  updateMessageScroll(message: StatusMessage): void {
    const fullText = `${message.prefix} ${message.text}`;
    const textWidth = stringWidth(fullText);
    
    if (textWidth <= this.terminalWidth) {
      // No scrolling needed
      message.scrollPosition = 0;
      return;
    }
    
    // Handle scrolling pause
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
        message.scrollPause = Math.floor(this.pauseDuration / this.scrollSpeed);
        message.scrollDirection = -1;
      }
    } else {
      // Scrolling backward
      message.scrollPosition = Math.max(0, (message.scrollPosition || 0) - 1);
      
      if (message.scrollPosition <= 0) {
        // Reached start, pause then forward
        message.scrollPause = Math.floor(this.pauseDuration / this.scrollSpeed);
        message.scrollDirection = 1;
      }
    }
  }

  /**
   * Update scroll positions for all messages
   */
  updateAllMessages(messages: StatusMessage[]): void {
    messages.forEach(message => {
      this.updateMessageScroll(message);
    });
  }

  /**
   * Calculate scrolled text for display
   */
  calculateScrolledText(message: StatusMessage): string {
    const fullText = `${message.prefix} ${message.text}`;
    const textWidth = stringWidth(fullText);
    
    if (textWidth <= this.terminalWidth) {
      return fullText;
    }
    
    // Get scrolled portion
    const scrolledText = this.getScrolledText(fullText, message.scrollPosition || 0);
    return scrolledText;
  }

  /**
   * Extract visible portion of text based on scroll position
   */
  private getScrolledText(text: string, scrollPos: number): string {
    const textWidth = stringWidth(text);
    
    if (textWidth <= this.terminalWidth) {
      return text;
    }
    
    // Calculate visible portion
    const startPos = Math.max(0, scrollPos);
    
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
   * Update terminal width (on resize)
   */
  updateTerminalWidth(width?: number): void {
    this.terminalWidth = width || process.stdout.columns || 80;
  }

  /**
   * Reset scroll positions for messages
   */
  resetScrollPositions(messages: StatusMessage[]): void {
    messages.forEach(message => {
      message.scrollPosition = 0;
      message.scrollDirection = 1;
      message.scrollPause = 0;
    });
  }

  /**
   * Check if scrolling is active
   */
  isScrolling(): boolean {
    return this.scrollInterval !== null;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopScrolling();
  }

  /**
   * Get scroll controller status
   */
  getScrollStatus(): object {
    return {
      active: this.isScrolling(),
      scrollSpeed: this.scrollSpeed,
      terminalWidth: this.terminalWidth,
      pauseDuration: this.pauseDuration
    };
  }
}