/**
 * Buffered Renderer (FUNC-018 compliant)
 * Double buffering functionality to prevent screen flickering
 * Ported from VERSIONs/product-v01, optimized for v0.1.0.0
 */

interface BufferedRendererOptions {
  renderInterval?: number;
  maxBufferSize?: number;
  enableDebounce?: boolean;
}

class BufferedRenderer {
  private buffer: string[];
  private previousBuffer: string[];
  private cursorSaved: boolean;
  private renderInterval: number;
  private renderTimer: NodeJS.Timeout | null;
  private maxBufferSize: number;
  private enableDebounce: boolean;

  constructor(options: BufferedRendererOptions = {}) {
    this.buffer = [];
    this.previousBuffer = [];
    this.cursorSaved = false;
    
    // FUNC-018 specification: 60fps limit (16ms interval)
    this.renderInterval = options.renderInterval || 16;
    this.renderTimer = null;
    this.maxBufferSize = options.maxBufferSize || 10000;
    this.enableDebounce = options.enableDebounce !== false; // Debounce enabled by default
  }

  /**
   * Add content to buffer (maintains screen position)
   * @param {string} content Content to add
   */
  addToBuffer(content: string): void {
    if (this.buffer.length >= this.maxBufferSize) {
      // Buffer overflow prevention
      this.buffer = this.buffer.slice(-Math.floor(this.maxBufferSize * 0.8));
    }
    
    this.buffer.push(content);
    
    if (this.enableDebounce) {
      this.scheduleRender();
    } else {
      this.render();
    }
  }

  /**
   * Clear buffer completely
   */
  clearBuffer(): void {
    this.buffer = [];
    this.previousBuffer = [];
  }

  /**
   * Save cursor position (used with cursor restoration)
   */
  saveCursor(): void {
    if (!this.cursorSaved) {
      process.stdout.write('\x1b[s');  // Save cursor position
      this.cursorSaved = true;
    }
  }

  /**
   * Restore cursor position
   */
  restoreCursor(): void {
    if (this.cursorSaved) {
      process.stdout.write('\x1b[u');  // Restore cursor position
      this.cursorSaved = false;
    }
  }

  /**
   * Clear screen and reset cursor
   */
  clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');  // Clear screen and move to top
    this.cursorSaved = false;
  }

  /**
   * Move cursor to specific position
   * @param {number} row Row position (1-based)
   * @param {number} col Column position (1-based)
   */
  moveCursor(row: number, col: number): void {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  /**
   * Hide cursor
   */
  hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  /**
   * Show cursor
   */
  showCursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  /**
   * Schedule render with debounce (throttle rapid updates)
   */
  private scheduleRender(): void {
    if (this.renderTimer) {
      return; // Already scheduled
    }

    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      this.render();
    }, this.renderInterval);
  }

  /**
   * Cancel pending render timer (for detail mode)
   */
  cancelPendingRender(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  /**
   * Render buffer contents to screen (double buffer method)
   * Only renders if content has changed to avoid flicker
   */
  render(): void {
    this.renderTimer = null;
    
    // Double buffer comparison: Only render if content changed
    const currentContent = this.buffer.join('');
    const previousContent = this.previousBuffer.join('');
    
    if (currentContent === previousContent) {
      return; // No changes, skip render
    }
    
    // Save cursor and clear for fresh render
    this.saveCursor();
    this.clearScreen();
    
    // Render current buffer
    if (this.buffer.length > 0) {
      process.stdout.write(currentContent);
    }
    
    // Update previous buffer for next comparison
    this.previousBuffer = [...this.buffer];
  }

  /**
   * Force render without comparison (for initial render)
   */
  forceRender(): void {
    this.clearScreen();
    const content = this.buffer.join('');
    if (content) {
      process.stdout.write(content);
    }
    this.previousBuffer = [...this.buffer];
  }

  /**
   * Get current buffer content as string
   * @returns {string} Current buffer content
   */
  getBufferContent(): string {
    return this.buffer.join('');
  }

  /**
   * Get buffer line count
   * @returns {number} Number of lines in buffer
   */
  getBufferLineCount(): number {
    return this.buffer.length;
  }

  /**
   * Set entire buffer content (replaces existing)
   * @param {string[]} lines Array of lines to set as buffer
   */
  setBuffer(lines: string[]): void {
    this.buffer = [...lines];
    if (this.enableDebounce) {
      this.scheduleRender();
    } else {
      this.render();
    }
  }

  /**
   * Check if render is pending
   * @returns {boolean} True if render is scheduled but not executed
   */
  isRenderPending(): boolean {
    return this.renderTimer !== null;
  }

  /**
   * Get renderer statistics for debugging
   * @returns {Object} Renderer statistics
   */
  getStats(): { bufferSize: number; maxBufferSize: number; renderInterval: number; isPending: boolean } {
    return {
      bufferSize: this.buffer.length,
      maxBufferSize: this.maxBufferSize,
      renderInterval: this.renderInterval,
      isPending: this.isRenderPending()
    };
  }
}

export = BufferedRenderer;