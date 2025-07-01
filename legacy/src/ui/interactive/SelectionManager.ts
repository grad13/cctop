/**
 * FUNC-400: Interactive Selection Manager
 * Handles keyboard-driven file selection interface
 */

import { 
  SelectionState, 
  KeyHandler, 
  KeyInputManager, 
  RenderController 
} from '../../types';

// Type aliases for compatibility
type SelectionManagerState = SelectionState;
type SelectionRenderState = SelectionState;

const SelectionRenderer = require('./SelectionRenderer');

class SelectionManager {
  private keyInputManager: KeyInputManager;
  private renderController: RenderController;
  private state: SelectionState;
  private selectionRenderer: any;
  private displayRenderer?: any;

  constructor(keyInputManager: KeyInputManager, renderController: RenderController) {
    this.keyInputManager = keyInputManager;
    this.renderController = renderController;
    this.state = {
      enabled: false,
      index: -1,
      count: 0,
      mode: 'waiting',           // 'waiting' | 'selecting'
      currentIndex: -1,          // Selected item index
      selectedFile: null,        // Selected file name
      fileList: []              // Available files
    };
    
    // Initialize SelectionRenderer (FUNC-400 requirement)
    this.selectionRenderer = new SelectionRenderer();
    
    // Register with key input manager
    this.registerKeyHandlers();
  }

  /**
   * Register key handlers with FUNC-300
   */
  private registerKeyHandlers(): void {
    // Check if registerHandler method exists
    if (!this.keyInputManager.registerHandler) {
      console.error('[SelectionManager] KeyInputManager does not support registerHandler method');
      return;
    }

    // Override FUNC-300 default handlers for selection control
    this.keyInputManager.registerHandler('waiting', 'ArrowUp', (() => this.enterSelectionMode()) as any, 'start-selection-up');
    
    this.keyInputManager.registerHandler('waiting', 'ArrowDown', (() => this.enterSelectionMode()) as any, 'start-selection-down');

    this.keyInputManager.registerHandler('selecting', 'ArrowUp', (() => this.navigate('up')) as any, 'selection-navigate-up');
    
    this.keyInputManager.registerHandler('selecting', 'ArrowDown', (() => this.navigate('down')) as any, 'selection-navigate-down');

    this.keyInputManager.registerHandler('selecting', 'Enter', (() => this.confirmSelection()) as any, 'selection-confirm');

    this.keyInputManager.registerHandler('selecting', 'Escape', (() => this.exitSelectionMode()) as any, 'selection-cancel');
  }

  /**
   * Update file list for selection
   */
  updateFileList(fileList: string[]): void {
    this.state.fileList = fileList || [];
    
    // Reset selection if current index is out of bounds
    if (this.state.currentIndex >= this.state.fileList.length) {
      this.state.currentIndex = Math.max(0, this.state.fileList.length - 1);
    }
    
    // Update selected file
    if (this.state.fileList.length > 0 && this.state.currentIndex >= 0) {
      this.state.selectedFile = this.state.fileList[this.state.currentIndex];
    } else {
      this.state.selectedFile = null;
    }
  }

  /**
   * State transition: waiting → selecting
   */
  async enterSelectionMode(): Promise<void> {
    if (this.state.fileList.length === 0) {
      return;
    }

    this.state.mode = 'selecting';
    this.state.currentIndex = 0;
    this.state.selectedFile = this.state.fileList[0];
    
    // Notify key input manager of state change
    this.keyInputManager.setState('selecting');
    
    // Update display
    this.updateDisplay();
  }

  /**
   * Navigation: ↑↓ keys
   */
  async navigate(direction: 'up' | 'down'): Promise<void> {
    if (this.state.mode !== 'selecting' || this.state.fileList.length === 0) {
      return;
    }
    
    if (direction === 'up') {
      this.state.currentIndex = Math.max(this.state.currentIndex - 1, 0);
    } else if (direction === 'down') {
      this.state.currentIndex = Math.min(
        this.state.currentIndex + 1, 
        this.state.fileList.length - 1
      );
    }
    
    this.state.selectedFile = this.state.fileList[this.state.currentIndex];
    this.updateDisplay();
  }

  /**
   * Selection confirmation: Enter key
   */
  async confirmSelection(): Promise<string | null> {
    if (this.state.mode !== 'selecting' || !this.state.selectedFile) {
      return null;
    }
    
    const selectedFile: string = this.state.selectedFile;
    
    this.exitSelectionMode();
    
    // Transition to FUNC-401 handled by caller
    return selectedFile;
  }

  /**
   * Selection cancellation: ESC key
   */
  async exitSelectionMode(): Promise<void> {
    this.state.mode = 'waiting';
    this.state.currentIndex = -1;
    this.state.selectedFile = null;
    
    // Notify key input manager of state change
    this.keyInputManager.setState('waiting');
    
    // Update display
    this.updateDisplay();
  }

  /**
   * Update display with selection state (FUNC-400 core requirement)
   * This triggers the visual change: "該当行の色(背景色・文字色)が変わる"
   */
  private updateDisplay(): void {
    if (!this.renderController) {
      return;
    }

    try {
      // Set selection state in render controller
      if (this.renderController.setSelectionState) {
        const selectionState = {
          isSelecting: this.state.mode === 'selecting',
          selectedIndex: this.state.currentIndex,
          selectionRenderer: this.selectionRenderer
        };
        this.renderController.setSelectionState(selectionState);
      }

      // Force render update
      if (this.renderController.render) {
        // FUNC-401: Don't render if detail mode is active
        if (!this.renderController.isDetailMode || !this.renderController.isDetailMode()) {
          this.renderController.render();
        }
      }

    } catch (error) {
    }
  }

  /**
   * Get current selection state
   */
  getSelectionState(): SelectionManagerState {
    return {
      enabled: this.state.enabled,
      index: this.state.index,
      count: this.state.count,
      mode: this.state.mode,
      currentIndex: this.state.currentIndex,
      selectedFile: this.state.selectedFile,
      fileCount: this.state.fileList.length
    };
  }

  /**
   * Check if in selection mode
   */
  isSelecting(): boolean {
    return this.state.mode === 'selecting';
  }

  /**
   * Get available files for selection
   */
  getFileList(): string[] {
    return [...this.state.fileList];
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Unregister key handlers if supported
    if (this.keyInputManager.unregisterHandler) {
      this.keyInputManager.unregisterHandler('waiting', 'ArrowUp');
      this.keyInputManager.unregisterHandler('waiting', 'ArrowDown');
      this.keyInputManager.unregisterHandler('selecting', 'ArrowUp');
      this.keyInputManager.unregisterHandler('selecting', 'ArrowDown');
      this.keyInputManager.unregisterHandler('selecting', 'Enter');
      this.keyInputManager.unregisterHandler('selecting', 'Escape');
    }
  }
}

export = SelectionManager;