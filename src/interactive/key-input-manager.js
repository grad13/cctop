/**
 * FUNC-300: Key Input Manager
 * System-wide keyboard input management with state machine
 */

class KeyInputManager {
  constructor() {
    this.currentMode = 'waiting'; // waiting | selecting | detail
    this.modeHistory = [];
    this.stateMaps = new Map();
    this.isInputSetup = false;
    
    // Initialize state maps
    this.initializeStateMaps();
    
    // Raw input will be setup in start() method
    
  }

  /**
   * Initialize state-based key maps
   */
  initializeStateMaps() {
    // Waiting state keymap
    this.stateMaps.set('waiting', new Map([
      // FUNC-202: Display control keys
      ['a', { id: 'display-all', callback: this.handleDisplayAll.bind(this) }],
      ['u', { id: 'display-unique', callback: this.handleDisplayUnique.bind(this) }],
      ['q', { id: 'quit', callback: this.handleQuit.bind(this) }],
      
      // FUNC-203: Event filter keys  
      ['f', { id: 'event-filter-find', callback: this.handleEventFilter.bind(this, 'find') }],
      ['c', { id: 'event-filter-create', callback: this.handleEventFilter.bind(this, 'create') }],
      ['m', { id: 'event-filter-modify', callback: this.handleEventFilter.bind(this, 'modify') }],
      ['d', { id: 'event-filter-delete', callback: this.handleEventFilter.bind(this, 'delete') }],
      ['v', { id: 'event-filter-move', callback: this.handleEventFilter.bind(this, 'move') }],
      ['r', { id: 'event-filter-restore', callback: this.handleEventFilter.bind(this, 'restore') }],
      
      // FUNC-400: Selection start keys (will be overridden by SelectionManager)
      // ['ArrowUp', { id: 'start-selection', callback: this.handleStartSelection.bind(this) }],
      // ['ArrowDown', { id: 'start-selection', callback: this.handleStartSelection.bind(this) }]
    ]));

    // Selecting state keymap
    this.stateMaps.set('selecting', new Map([
      // FUNC-400: Selection navigation keys
      ['ArrowUp', { id: 'selection-up', callback: this.handleSelectionMove.bind(this, 'up') }],
      ['ArrowDown', { id: 'selection-down', callback: this.handleSelectionMove.bind(this, 'down') }],
      ['Enter', { id: 'selection-confirm', callback: this.handleSelectionConfirm.bind(this) }],
      ['Escape', { id: 'selection-cancel', callback: this.handleSelectionCancel.bind(this) }],
      
      // FUNC-202: Display keys (still available during selection)
      ['a', { id: 'display-all', callback: this.handleDisplayAll.bind(this) }],
      ['u', { id: 'display-unique', callback: this.handleDisplayUnique.bind(this) }],
      
      // FUNC-203: Event filter keys (still available during selection)
      ['f', { id: 'event-filter-find', callback: this.handleEventFilter.bind(this, 'find') }],
      ['c', { id: 'event-filter-create', callback: this.handleEventFilter.bind(this, 'create') }],
      ['m', { id: 'event-filter-modify', callback: this.handleEventFilter.bind(this, 'modify') }],
      ['d', { id: 'event-filter-delete', callback: this.handleEventFilter.bind(this, 'delete') }],
      ['v', { id: 'event-filter-move', callback: this.handleEventFilter.bind(this, 'move') }],
      ['r', { id: 'event-filter-restore', callback: this.handleEventFilter.bind(this, 'restore') }]
    ]));

    // Detail state keymap
    this.stateMaps.set('detail', new Map([
      // FUNC-401: Detail mode keys
      ['Escape', { id: 'detail-exit', callback: this.handleDetailExit.bind(this) }]
    ]));
  }

  /**
   * Start the key input manager
   */
  async start() {
    // Setup raw input processing
    this.setupRawInput();
    
    return Promise.resolve();
  }

  /**
   * Setup raw keyboard input processing
   */
  setupRawInput() {
    if (this.isInputSetup) {
      return;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key) => {
        this.handleKeyInput(key);
      });
      
      this.isInputSetup = true;
      
    } else {
    }
  }

  /**
   * Main key input handler
   */
  handleKeyInput(rawKey) {
    // Parse special keys
    const key = this.parseKey(rawKey);

    // Get current state keymap
    const currentMap = this.stateMaps.get(this.currentMode);
    if (!currentMap) {
      return;
    }

    // Find handler for this key
    const handler = currentMap.get(key);
    if (handler) {
      try {
        handler.callback(key);
      } catch (error) {
        // Error handled silently
      }
    }
  }

  /**
   * Parse raw key input to normalized key names
   */
  parseKey(rawKey) {
    // Handle special keys
    switch (rawKey) {
      case '\u001b[A': return 'ArrowUp';
      case '\u001b[B': return 'ArrowDown';
      case '\u001b[C': return 'ArrowRight';
      case '\u001b[D': return 'ArrowLeft';
      case '\r': return 'Enter';
      case '\u001b': return 'Escape';
      case '\u0003': return 'Ctrl+C'; // Handle Ctrl+C
      case '\u0004': return 'Ctrl+D'; // Handle Ctrl+D
      default:
        // Return printable characters as-is
        if (rawKey.charCodeAt(0) >= 32 && rawKey.charCodeAt(0) <= 126) {
          return rawKey;
        }
        return 'Unknown';
    }
  }

  /**
   * State management methods
   */
  setState(newMode) {
    this.modeHistory.push(this.currentMode);
    this.currentMode = newMode;
    
    // Notify components of state change
    this.notifyStateChange(newMode);
  }

  popState() {
    if (this.modeHistory.length > 0) {
      const previousMode = this.modeHistory.pop();
      this.currentMode = previousMode;
      this.notifyStateChange(previousMode);
    }
  }

  notifyStateChange(newMode) {
    // Notify other components (to be implemented)
    if (this.onStateChange) {
      this.onStateChange(newMode);
    }
  }

  /**
   * Key handler methods (placeholders)
   */
  handleDisplayAll() {
    // TODO: Call FUNC-202 display manager
  }

  handleDisplayUnique() {
    // TODO: Call FUNC-202 display manager
  }

  handleQuit() {
    process.exit(0);
  }

  handleEventFilter(eventType) {
    // TODO: Call FUNC-203 event filter manager
  }

  handleStartSelection() {
    this.setState('selecting');
    // TODO: Call FUNC-400 selection manager
  }

  handleSelectionMove(direction) {
    // Call selection manager to handle movement
    if (this.selectionManager) {
      this.selectionManager.moveSelection(direction);
      // Trigger display refresh if needed
      if (this.renderController && this.renderController.refresh) {
        this.renderController.refresh();
      }
    }
  }

  async handleSelectionConfirm() {
    // Call selection manager to handle confirmation
    if (this.selectionManager) {
      const result = await this.selectionManager.confirmSelection();
      if (result) {
        this.setState('detail');
      }
    } else {
      console.error('❌ [KeyInputManager] No selectionManager set!');
    }
  }

  handleSelectionCancel() {
    this.setState('waiting');
    // TODO: Call FUNC-400 selection manager
  }

  handleDetailExit() {
    this.setState('waiting');
    // TODO: Call FUNC-401 detail manager
  }

  /**
   * Dynamic handler registration for other components
   */
  registerHandler(state, key, handler) {
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      stateMap.set(key, handler);
    }
  }

  unregisterHandler(state, key) {
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      stateMap.delete(key);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
    }
  }
}

module.exports = KeyInputManager;