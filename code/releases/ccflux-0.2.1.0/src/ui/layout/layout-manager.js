/**
 * Layout Manager (Single Responsibility: Screen layout and width calculation)
 * Extracted from cli-display.js for better maintainability
 */

class LayoutManager {
  constructor() {
    this.widthConfig = this.calculateDynamicWidth();
    this.resizeCallbacks = [];
  }

  /**
   * Calculate dynamic width for responsive directory display
   */
  calculateDynamicWidth() {
    const terminalWidth = process.stdout.columns || 80;
    // Fixed columns: Modified(19) + Elapsed(10) + FileName(28) + Event(8) + Lines(5) + Blocks(6) + Spaces(6*2=12)
    const fixedWidth = 19 + 10 + 28 + 8 + 5 + 6 + 12; // 88文字
    const directoryWidth = Math.max(10, terminalWidth - fixedWidth - 2); // Minimum 10 chars guaranteed, last 2 chars for spacing
    
    return {
      terminal: terminalWidth,
      directory: directoryWidth
    };
  }

  /**
   * Get current width configuration
   */
  getWidthConfig() {
    return this.widthConfig;
  }

  /**
   * Update width configuration (call on terminal resize)
   */
  updateWidthConfig() {
    this.widthConfig = this.calculateDynamicWidth();
    
    // Notify all callbacks about the width change
    this.resizeCallbacks.forEach(callback => {
      try {
        callback(this.widthConfig);
      } catch (error) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.error('Error in resize callback:', error);
        }
      }
    });
  }

  /**
   * Setup terminal resize event handler
   */
  setupResizeHandler() {
    if (process.stdout.isTTY) {
      process.stdout.on('resize', () => {
        this.updateWidthConfig();
        
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.log(`Terminal resized: ${this.widthConfig.terminal}x? Directory width: ${this.widthConfig.directory}`);
        }
      });
    }
  }

  /**
   * Register callback for resize events
   */
  onResize(callback) {
    if (typeof callback === 'function') {
      this.resizeCallbacks.push(callback);
    }
  }

  /**
   * Remove resize callback
   */
  offResize(callback) {
    const index = this.resizeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.resizeCallbacks.splice(index, 1);
    }
  }

  /**
   * Get terminal dimensions
   */
  getTerminalDimensions() {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }

  /**
   * Check if terminal is wide enough for full display
   */
  isWideEnoughForFullDisplay() {
    const minRequiredWidth = 88; // Fixed columns minimum
    return this.widthConfig.terminal >= minRequiredWidth;
  }

  /**
   * Get layout mode based on terminal width
   */
  getLayoutMode() {
    const width = this.widthConfig.terminal;
    
    if (width < 80) {
      return 'narrow';
    } else if (width < 120) {
      return 'normal';
    } else {
      return 'wide';
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.resizeCallbacks = [];
    // Note: Cannot remove process.stdout resize listeners easily
    // This is acceptable as the process will handle cleanup
  }
}

module.exports = LayoutManager;