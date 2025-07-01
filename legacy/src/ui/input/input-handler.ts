/**
 * Input Handler (Single Responsibility: Keyboard input processing)
 * Extracted from cli-display.js for better maintainability
 */

import chalk = require('chalk');

interface EventDisplayManager {
  getDisplayMode(): string;
  setDisplayMode(mode: string): void;
}

interface FilterManager {
  toggleByKey(key: string): boolean;
  getHelpText(): string;
  getKeyBindings(): { [key: string]: string };
}

interface RenderController {
  resetCursor?(): void;
  clearScreen?(): void;
  restoreTerminal?(): void;
  [key: string]: any;
}

type KeyCallback = (key: string) => void;
type ExitCallback = () => void;

interface KeyBindings {
  [key: string]: string;
}

class InputHandler {
  private isSetup: boolean;
  private keyPressCallbacks: Map<string, KeyCallback>;
  
  // Dependencies (set externally)
  private eventDisplayManager: EventDisplayManager | null;
  private filterManager: FilterManager | null;
  private renderController: RenderController | null;
  private onExit: ExitCallback | null; // Callback function for exit handling

  constructor() {
    this.isSetup = false;
    this.keyPressCallbacks = new Map<string, KeyCallback>();
    
    // Dependencies (set externally)
    this.eventDisplayManager = null;
    this.filterManager = null;
    this.renderController = null;
    this.onExit = null; // Callback function for exit handling
  }

  /**
   * Set dependencies
   */
  setEventDisplayManager(eventDisplayManager: EventDisplayManager): void {
    this.eventDisplayManager = eventDisplayManager;
  }

  setFilterManager(filterManager: FilterManager): void {
    this.filterManager = filterManager;
  }

  setRenderController(renderController: RenderController): void {
    this.renderController = renderController;
  }

  setExitCallback(callback: ExitCallback): void {
    this.onExit = callback;
  }

  /**
   * Setup keyboard handlers
   */
  setupKeyboardHandlers(): void {
    if (this.isSetup) {
      return;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key: string) => {
        this.handleKeyPress(key);
      });
      
      this.isSetup = true;
    }
  }

  /**
   * Handle key press events
   */
  handleKeyPress(key: string): void {
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
  setDisplayMode(mode: string): void {
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
  handleSearch(): void {
    // TODO: Implement search functionality
    console.log(chalk.blue('Search functionality coming soon...'));
  }

  /**
   * Handle exit processing
   */
  handleExit(): void {
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
  defaultExitHandler(): void {
    // Reset renderer
    if (this.renderController) {
      if (typeof this.renderController.resetCursor === 'function') {
        this.renderController.resetCursor();
      }
      if (typeof this.renderController.clearScreen === 'function') {
        this.renderController.clearScreen();
      }
      if (typeof this.renderController.restoreTerminal === 'function') {
        this.renderController.restoreTerminal();
      }
    }
    
    // Reset terminal settings
    this.destroy();
    
    console.log(chalk.green('\nGoodbye!'));
    process.exit(0);
  }

  /**
   * Register custom key callback
   */
  registerKeyCallback(key: string, callback: KeyCallback): void {
    if (typeof callback === 'function') {
      this.keyPressCallbacks.set(key.toLowerCase(), callback);
    }
  }

  /**
   * Unregister custom key callback
   */
  unregisterKeyCallback(key: string): void {
    this.keyPressCallbacks.delete(key.toLowerCase());
  }

  /**
   * Execute custom callback for key
   */
  executeCustomCallback(key: string): void {
    const callback = this.keyPressCallbacks.get(key.toLowerCase());
    if (callback) {
      try {
        callback(key);
      } catch (error: any) {
        if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
          console.error(`Error in custom key callback for '${key}':`, error);
        }
      }
    }
  }

  /**
   * Get help text for available keys
   */
  getHelpText(): string {
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
  getKeyBindings(): KeyBindings {
    const bindings: KeyBindings = {
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
  destroy(): void {
    if (this.isSetup && process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(false);
        process.stdin.pause();
      } catch (error: any) {
        // Ignore errors during cleanup
      }
    }
    
    this.keyPressCallbacks.clear();
    this.isSetup = false;
  }
}

export = InputHandler;