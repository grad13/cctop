/**
 * Buffered Renderer (FUNC-018 compliant)
 * Double buffering functionality to prevent screen flickering
 * Ported from VERSIONs/product-v01, optimized for v0.1.0.0
 */

class BufferedRenderer {
  constructor(options = {}) {
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
   * Clear buffer
   */
  clear() {
    this.previousBuffer = [...this.buffer];
    this.buffer = [];
  }

  /**
   * Add line to buffer
   */
  addLine(line) {
    // Buffer size limit
    if (this.buffer.length >= this.maxBufferSize) {
      this.buffer.shift(); // Remove old lines
    }
    this.buffer.push(line || '');
  }

  /**
   * Save cursor position
   */
  saveCursor() {
    if (!this.cursorSaved) {
      process.stdout.write('\x1b[s'); // Save cursor position
      this.cursorSaved = true;
    }
  }

  /**
   * Restore cursor position
   */
  restoreCursor() {
    if (this.cursorSaved) {
      process.stdout.write('\x1b[u'); // Restore cursor position
    }
  }

  /**
   * Move cursor to specified line
   */
  moveCursor(row, col = 1) {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  /**
   * Clear current line
   */
  clearLine() {
    process.stdout.write('\x1b[2K'); // Clear entire line
  }

  /**
   * Clear screen to bottom
   */
  clearToBottom() {
    process.stdout.write('\x1b[J'); // Clear from cursor to end of screen
  }

  /**
   * Hide cursor
   */
  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  /**
   * Show cursor
   */
  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  /**
   * Delayed rendering (60fps limit)
   */
  renderDebounced() {
    if (!this.enableDebounce) {
      this.render();
      return;
    }

    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => {
      this.render();
    }, this.renderInterval);
  }

  /**
   * Cancel pending render timer (for detail mode)
   */
  cancelPendingRender() {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
  }

  /**
   * Render buffer contents to screen (double buffer method)
   */
  render() {
    // Clear entire screen on first render
    if (!this.cursorSaved) {
      console.clear();
      this.saveCursor();
    }

    // Hide cursor and start rendering
    this.hideCursor();

    // Return cursor to beginning
    this.restoreCursor();

    // Update all lines (ANSI escape sequence support)
    const maxLines = Math.max(this.buffer.length, this.previousBuffer.length);
    
    for (let i = 0; i < maxLines; i++) {
      this.moveCursor(i + 1, 1);
      this.clearLine();
      
      if (i < this.buffer.length && this.buffer[i]) {
        process.stdout.write(this.buffer[i]);
      }
    }

    // Move cursor after last line then show
    this.moveCursor(this.buffer.length + 1, 1);
    this.showCursor();

    // Update previousBuffer after rendering completes
    this.previousBuffer = [...this.buffer];
  }

  /**
   * Complete redraw (for emergency use)
   */
  fullRender() {
    console.clear();
    this.buffer.forEach(line => console.log(line));
    this.cursorSaved = false;
  }

  /**
   * Reset renderer
   */
  reset() {
    clearTimeout(this.renderTimer);
    this.renderTimer = null;
    this.buffer = [];
    this.previousBuffer = [];
    this.cursorSaved = false;
    this.showCursor(); // Ensure cursor is visible
  }

  /**
   * Release resources
   */
  destroy() {
    this.reset();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      bufferSize: this.buffer.length,
      previousBufferSize: this.previousBuffer.length,
      maxBufferSize: this.maxBufferSize,
      renderInterval: this.renderInterval,
      cursorSaved: this.cursorSaved,
      enableDebounce: this.enableDebounce
    };
  }
}

module.exports = BufferedRenderer;