/**
 * FUNC-300: Key Input Manager
 * System-wide keyboard input management with state machine
 */

class KeyInputManager {
  constructor() {
    this.currentMode = 'waiting'; // waiting | selecting | detail
    this.modeHistory = [];
    this.stateMaps = new Map();
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    this.isInputSetup = false;
    
    // Initialize state maps
    this.initializeStateMaps();
    
    // Raw input will be setup in start() method
    
    if (this.debug) {
      console.log('[KeyInputManager] Initialized with state machine');
    }
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
    if (this.debug) {
      console.log('[KeyInputManager] Starting - setting up raw input');
    }
    
    // Setup raw input processing
    this.setupRawInput();
    
    if (this.debug) {
      console.log('[KeyInputManager] Started successfully');
    }
    return Promise.resolve();
  }

  /**
   * Setup raw keyboard input processing
   */
  setupRawInput() {
    if (this.isInputSetup) {
      if (this.debug) {
        console.log('[KeyInputManager] Raw input already setup, skipping');
      }
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
      
      if (this.debug) {
        console.log('[KeyInputManager] Raw input setup completed');
      }
    } else {
      if (this.debug) {
        console.warn('[KeyInputManager] Not a TTY, raw input not available');
      }
    }
  }

  /**
   * Main key input handler
   */
  handleKeyInput(rawKey) {
    // Parse special keys
    const key = this.parseKey(rawKey);
    
    // EMERGENCY DEBUG - Always log key presses
    console.log(`[KeyInputManager] 🔑 KEY PRESSED: key=${key}, mode=${this.currentMode}, raw=${JSON.stringify(rawKey)}`);
    
    if (this.debug) {
      console.log(`[KeyInputManager] Key: ${key}, Mode: ${this.currentMode}, Raw: ${JSON.stringify(rawKey)}`);
    }

    // Get current state keymap
    const currentMap = this.stateMaps.get(this.currentMode);
    if (!currentMap) {
      console.log(`[KeyInputManager] ❌ No state map for mode: ${this.currentMode}`);
      if (this.debug) {
        console.warn(`[KeyInputManager] Unknown state: ${this.currentMode}`);
      }
      return;
    }

    // Find handler for this key
    const handler = currentMap.get(key);
    if (handler) {
      console.log(`[KeyInputManager] ✅ Handler found for ${key}: ${handler.id}`);
      try {
        handler.callback(key);
      } catch (error) {
        console.log(`[KeyInputManager] ❌ Handler error:`, error);
        if (this.debug) {
          console.error(`[KeyInputManager] Handler error:`, error);
        }
      }
    } else {
      console.log(`[KeyInputManager] ⚠️ No handler for key: ${key} in mode: ${this.currentMode}`);
      // Debug: show all available keys in current mode
      console.log(`[KeyInputManager] Available keys in ${this.currentMode}: ${Array.from(currentMap.keys()).join(', ')}`);
    }
    // Ignore unhandled keys (silent)
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
    if (this.debug) {
      console.log(`[KeyInputManager] State: ${this.currentMode} → ${newMode}`);
    }
    
    this.modeHistory.push(this.currentMode);
    this.currentMode = newMode;
    
    // Notify components of state change
    this.notifyStateChange(newMode);
  }

  popState() {
    if (this.modeHistory.length > 0) {
      const previousMode = this.modeHistory.pop();
      if (this.debug) {
        console.log(`[KeyInputManager] State: ${this.currentMode} → ${previousMode} (pop)`);
      }
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
    // FUNC-202 integration point
    if (this.debug) {
      console.log('[KeyInputManager] Display All mode requested');
    }
    // TODO: Call FUNC-202 display manager
  }

  handleDisplayUnique() {
    // FUNC-202 integration point
    if (this.debug) {
      console.log('[KeyInputManager] Display Unique mode requested');
    }
    // TODO: Call FUNC-202 display manager
  }

  handleQuit() {
    if (this.debug) {
      console.log('[KeyInputManager] Quit requested');
    }
    process.exit(0);
  }

  handleEventFilter(eventType) {
    // FUNC-203 integration point
    if (this.debug) {
      console.log(`[KeyInputManager] Event filter toggle: ${eventType}`);
    }
    // TODO: Call FUNC-203 event filter manager
  }

  handleStartSelection() {
    // FUNC-400 integration point
    if (this.debug) {
      console.log('[KeyInputManager] Start selection mode');
    }
    this.setState('selecting');
    // TODO: Call FUNC-400 selection manager
  }

  handleSelectionMove(direction) {
    // FUNC-400 integration point
    if (this.debug) {
      console.log(`[KeyInputManager] Selection move: ${direction}`);
    }
    
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
    // FUNC-400 → FUNC-401 transition
    if (this.debug) {
      console.log('[KeyInputManager] Selection confirmed, entering detail mode');
    }
    
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
    // FUNC-400 → waiting transition
    if (this.debug) {
      console.log('[KeyInputManager] Selection cancelled, returning to waiting');
    }
    this.setState('waiting');
    // TODO: Call FUNC-400 selection manager
  }

  handleDetailExit() {
    // FUNC-401 → waiting transition
    if (this.debug) {
      console.log('[KeyInputManager] Detail mode exit, returning to waiting');
    }
    this.setState('waiting');
    // TODO: Call FUNC-401 detail manager
  }

  /**
   * Dynamic handler registration for other components
   */
  registerHandler(state, key, handler) {
    // EMERGENCY DEBUG - Always log handler registration
    console.log(`[KeyInputManager] 🔥 REGISTERING HANDLER: state=${state}, key=${key}, handler=${handler.id}`);
    
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      stateMap.set(key, handler);
      console.log(`[KeyInputManager] ✅ Handler registered successfully: ${state}.${key}`);
      if (this.debug) {
        console.log(`[KeyInputManager] Registered handler: ${state}.${key}`);
      }
    } else {
      console.log(`[KeyInputManager] ❌ State map not found for state: ${state}`);
    }
  }

  unregisterHandler(state, key) {
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      stateMap.delete(key);
      if (this.debug) {
        console.log(`[KeyInputManager] Unregistered handler: ${state}.${key}`);
      }
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
    
    if (this.debug) {
      console.log('[KeyInputManager] Destroyed');
    }
  }
}

module.exports = KeyInputManager;