/**
 * FUNC-300: Key Input Manager
 * System-wide keyboard input management with state machine
 */

// Type-only imports
import type { 
  KeyInputManager as IKeyInputManager,
  KeyHandler,
  SelectionManager,
  RenderController
} from '../types';

// Key Input Manager specific interfaces
interface StateMaps {
  [stateName: string]: Map<string, KeyHandler>;
}

interface StateChangeCallback {
  (newMode: string): void;
}

type InputMode = 'waiting' | 'selecting' | 'detail';

// Internal handler structure
interface InternalHandler {
  id: string;
  callback: KeyHandler;
}

class KeyInputManager implements IKeyInputManager {
  public currentMode: InputMode = 'waiting';
  private modeHistory: InputMode[] = [];
  private stateMaps: Map<string, Map<string, InternalHandler>> = new Map();
  private isInputSetup: boolean = false;
  
  // Component references for handlers
  public selectionManager?: SelectionManager;
  public renderController?: RenderController;
  public onStateChange?: StateChangeCallback;
  
  constructor() {
    // Initialize state maps
    this.initializeStateMaps();
    
    // Raw input will be setup in start() method
  }

  /**
   * Initialize state-based key maps
   */
  private initializeStateMaps(): void {
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
  async start(): Promise<void> {
    // Setup raw input processing
    this.setupRawInput();
    return Promise.resolve();
  }

  /**
   * Setup raw keyboard input processing
   */
  private setupRawInput(): void {
    if (this.isInputSetup) {
      return;
    }

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      process.stdin.on('data', (key: any) => {
        this.handleKeyInput(key);
      });
      
      this.isInputSetup = true;
    }
  }

  /**
   * Main key input handler
   */
  private handleKeyInput(rawKey: any): void {
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
        // Debug logging
        if (!handler.callback) {
          console.error(`[KeyInputManager] Handler for key '${key}' has no callback property:`, handler);
          console.error(`[KeyInputManager] Handler type:`, typeof handler);
          console.error(`[KeyInputManager] Handler keys:`, Object.keys(handler));
          return;
        }
        handler.callback(key);
      } catch (error) {
        console.error(`[KeyInputManager] Handler error:`, error);
      }
    }
    // Ignore unhandled keys (silent)
  }

  /**
   * Parse raw key input to normalized key names
   */
  private parseKey(rawKey: any): string {
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
  setState(newMode: string): void {
    this.modeHistory.push(this.currentMode);
    this.currentMode = newMode as InputMode;
    
    // Notify components of state change
    this.notifyStateChange(newMode);
  }

  popState(): void {
    if (this.modeHistory.length > 0) {
      const previousMode = this.modeHistory.pop();
      if (previousMode) {
        this.currentMode = previousMode;
        this.notifyStateChange(previousMode);
      }
    }
  }

  private notifyStateChange(newMode: string): void {
    // Notify other components (to be implemented)
    if (this.onStateChange) {
      this.onStateChange(newMode);
    }
  }

  /**
   * Key handler methods (placeholders)
   */
  private handleDisplayAll(): void {
    // FUNC-202 integration point
    // TODO: Call FUNC-202 display manager
  }

  private handleDisplayUnique(): void {
    // FUNC-202 integration point
    // TODO: Call FUNC-202 display manager
  }

  private handleQuit(): void {
    process.exit(0);
  }

  private handleEventFilter(eventType: string): void {
    // FUNC-203 integration point
    // TODO: Call FUNC-203 event filter manager
  }

  private handleStartSelection(): void {
    // FUNC-400 integration point
    this.setState('selecting');
    // TODO: Call FUNC-400 selection manager
  }

  private handleSelectionMove(direction: string): void {
    // FUNC-400 integration point
    
    // Call selection manager to handle movement
    if (this.selectionManager) {
      (this.selectionManager as any).moveSelection(direction);
      // Trigger display refresh if needed
      if (this.renderController && (this.renderController as any).refresh) {
        (this.renderController as any).refresh();
      }
    }
  }

  private async handleSelectionConfirm(): Promise<void> {
    // FUNC-400 → FUNC-401 transition
    
    // Call selection manager to handle confirmation
    if (this.selectionManager) {
      const result = await (this.selectionManager as any).confirmSelection();
      if (result) {
        this.setState('detail');
      }
    } else {
      console.error('[KeyInputManager] No selectionManager set!');
    }
  }

  private handleSelectionCancel(): void {
    // FUNC-400 → waiting transition
    this.setState('waiting');
    // TODO: Call FUNC-400 selection manager
  }

  private handleDetailExit(): void {
    // FUNC-401 → waiting transition
    this.setState('waiting');
    // TODO: Call FUNC-401 detail manager
  }

  /**
   * Dynamic handler registration for other components
   */
  registerHandler(state: string, key: string, handler: KeyHandler, id?: string): void {
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      // Debug log
      console.log(`[KeyInputManager] Registering handler for state '${state}', key '${key}', id '${id}'`);
      stateMap.set(key, {
        id: id || `dynamic-${key}`,
        callback: handler
      });
    }
  }

  unregisterHandler(state: string, key: string): void {
    const stateMap = this.stateMaps.get(state);
    if (stateMap) {
      stateMap.delete(key);
    }
  }

  /**
   * Stop the key input manager
   */
  stop(): void {
    this.destroy();
  }

  /**
   * Add a key handler
   */
  addHandler(key: string, handler: KeyHandler, options?: any): void {
    const state = options?.state || this.currentMode;
    this.registerHandler(state, key, handler, options?.id);
  }

  /**
   * Remove a key handler
   */
  removeHandler(key: string): void {
    this.unregisterHandler(this.currentMode, key);
  }

  /**
   * Check if the key input manager is active
   */
  isActive(): boolean {
    return this.isInputSetup;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeAllListeners('data');
    }
    this.isInputSetup = false;
  }
}

module.exports = KeyInputManager;