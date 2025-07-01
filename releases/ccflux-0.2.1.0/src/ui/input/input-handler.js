/**
 * Input Handler (Single Responsibility: Keyboard input processing)
 * Extracted from cli-display.js for better maintainability
 */

const chalk = require('chalk');

class InputHandler {
  constructor() {
    this.isSetup = false;
    this.keyPressCallbacks = new Map();
    
    // Dependencies (set externally)
    this.eventDisplayManager = null;
    this.filterManager = null;
    this.renderController = null;
    this.onExit = null; // Callback function for exit handling
  }

  /**
   * Set dependencies
   */
  setEventDisplayManager(eventDisplayManager) {
    this.eventDisplayManager = eventDisplayManager;
  }

  setFilterManager(filterManager) {
    this.filterManager = filterManager;
  }

  setRenderController(renderController) {
    this.renderController = renderController;
  }

  setExitCallback(callback) {
    this.onExit = callback;
  }

  /**
   * Setup keyboard handlers
   */
  setupKeyboardHandlers() {
    if (this.isSetup) {
      return;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key) => {
        this.handleKeyPress(key);
      });
      
      this.isSetup = true;
    }
  }

  /**
   * Handle key press events
   */
  handleKeyPress(key) {
    // Check filter keys first (lowercase only)
    if (this.filterManager) {
      const lowerKey = key.toLowerCase();
      if (this.filterManager.toggleByKey(lowerKey)) {
        // End processing if filter was toggled
        // Automatically redrawn by filterChanged event
        return;
      }
    }
    
    // Handle display mode and system keys
    switch (key) {
      case 'a':
      case 'A':
        this.setDisplayMode('all');
        break;
      case 'u':
      case 'U':
        this.setDisplayMode('unique');
        break;
      case 'q':
      case 'Q':
      case '\u0003': // Ctrl+C
        this.handleExit();
        break;
      case '/':
        // TODO: Search functionality
        this.handleSearch();
        break;
      default:
        // Check for registered custom callbacks
        this.executeCustomCallback(key);
        break;
    }
  }

  /**
   * Switch display mode
   */
  setDisplayMode(mode) {
    if (this.eventDisplayManager) {
      const currentMode = this.eventDisplayManager.getDisplayMode();
      if (mode !== currentMode) {
        this.eventDisplayManager.setDisplayMode(mode);
        console.log(chalk.yellow(`Switched to ${mode.toUpperCase()} mode`));
      }
    }
  }

  /**
   * Handle search functionality (placeholder)
   */
  handleSearch() {
    // TODO: Implement search functionality
    console.log(chalk.blue('Search functionality coming soon...'));
  }

  /**
   * Handle exit processing
   */
  handleExit() {
    // Call the exit callback if provided
    if (this.onExit) {
      this.onExit();
    } else {
      // Default exit behavior
      this.defaultExitHandler();
    }
  }

  /**
   * Default exit handler
   */
  defaultExitHandler() {
    // Reset renderer
    if (this.renderController) {
      this.renderController.reset();
    }
    
    process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log(chalk.green('cctop stopped'));
    }
    
    // Emit SIGINT event to notify parent process of exit
    process.kill(process.pid, 'SIGINT');
  }

  /**
   * Register custom key callback
   */
  registerKeyCallback(key, callback) {
    if (typeof callback === 'function') {
      this.keyPressCallbacks.set(key.toLowerCase(), callback);
    }
  }

  /**
   * Unregister custom key callback
   */
  unregisterKeyCallback(key) {
    this.keyPressCallbacks.delete(key.toLowerCase());
  }

  /**
   * Execute custom callback for key
   */
  executeCustomCallback(key) {
    const callback = this.keyPressCallbacks.get(key.toLowerCase());
    if (callback) {
      try {
        callback(key);
      } catch (error) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.error(`Error in custom key callback for '${key}':`, error);
        }
      }
    }
  }

  /**
   * Get help text for available keys
   */
  getHelpText() {
    const baseHelp = '[a] All  [u] Unique  [q] Exit';
    const filterHelp = this.filterManager ? this.filterManager.getHelpText() : '';
    
    if (filterHelp) {
      return `${baseHelp}\n${filterHelp}`;
    }
    
    return baseHelp;
  }

  /**
   * Get current key bindings
   */
  getKeyBindings() {
    const bindings = {
      'a/A': 'Switch to All mode',
      'u/U': 'Switch to Unique mode',
      'q/Q': 'Exit',
      'Ctrl+C': 'Exit',
      '/': 'Search (coming soon)'
    };

    // Add filter key bindings
    if (this.filterManager) {
      const filterBindings = this.filterManager.getKeyBindings();
      Object.assign(bindings, filterBindings);
    }

    // Add custom callbacks
    for (const [key] of this.keyPressCallbacks) {
      bindings[key] = 'Custom action';
    }

    return bindings;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.isSetup && process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    this.keyPressCallbacks.clear();
    this.isSetup = false;
  }
}

module.exports = InputHandler;