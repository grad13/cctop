/**
 * FUNC-400: Interactive Selection Manager
 * Handles keyboard-driven file selection interface
 */

import { 
  SelectionState, 
  SelectionManagerState, 
  SelectionRenderState, 
  KeyHandler, 
  KeyInputManager, 
  RenderController 
} from '../../types/common';

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
    // Override FUNC-300 default handlers for selection control
    this.keyInputManager.registerHandler('waiting', 'ArrowUp', {
      id: 'start-selection-up',
      callback: () => this.enterSelectionMode()
    });
    
    this.keyInputManager.registerHandler('waiting', 'ArrowDown', {
      id: 'start-selection-down', 
      callback: () => this.enterSelectionMode()
    });

    this.keyInputManager.registerHandler('selecting', 'ArrowUp', {
      id: 'selection-navigate-up',
      callback: () => this.navigate('up')
    });
    
    this.keyInputManager.registerHandler('selecting', 'ArrowDown', {
      id: 'selection-navigate-down',
      callback: () => this.navigate('down')
    });

    this.keyInputManager.registerHandler('selecting', 'Enter', {
      id: 'selection-confirm',
      callback: () => {
        return this.confirmSelection();
      }
    });

    this.keyInputManager.registerHandler('selecting', 'Escape', {
      id: 'selection-cancel',
      callback: () => this.exitSelectionMode()
    });
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
        const selectionState: SelectionRenderState = {
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
    // Unregister key handlers
    this.keyInputManager.unregisterHandler('waiting', 'ArrowUp');
    this.keyInputManager.unregisterHandler('waiting', 'ArrowDown');
    this.keyInputManager.unregisterHandler('selecting', 'ArrowUp');
    this.keyInputManager.unregisterHandler('selecting', 'ArrowDown');
    this.keyInputManager.unregisterHandler('selecting', 'Enter');
    this.keyInputManager.unregisterHandler('selecting', 'Escape');
  }
}

export = SelectionManager;