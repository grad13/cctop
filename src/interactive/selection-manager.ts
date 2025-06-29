/**
 * FUNC-400: Interactive Selection Mode
 * Keyboard-based item selection with visual feedback
 */

import ColorManager = require('../color/ColorManager');

interface SelectionColors {
  background: string;
  foreground: string;
  reset: string;
}

interface SelectionStateResult {
  mode: 'waiting' | 'selecting';
  currentIndex: number;
  selectedFile: string | null;
  totalItems: number;
  isSelecting: boolean;
}

interface SelectedItem {
  index: number;
  file: string;
  displayItem: string;
}

class SelectionManager {
  private mode: 'waiting' | 'selecting';
  private currentIndex: number;
  private selectedFile: string | null;
  private displayItems: string[];
  private maxDisplayItems: number;
  private colorManager: ColorManager;
  private selectionColors: SelectionColors;

  constructor(configPath: string = '.cctop') {
    this.mode = 'waiting'; // waiting | selecting
    this.currentIndex = 0;
    this.selectedFile = null;
    this.displayItems = [];
    this.maxDisplayItems = 20; // Match EventDisplayManager default
    
    // Color management
    this.colorManager = new ColorManager(configPath);
    this.selectionColors = this.loadSelectionColors();
  }

  /**
   * Load selection colors from theme
   */
  private loadSelectionColors(): SelectionColors {
    return {
      background: this.colorManager.getColor('selection.background') || '\x1b[44m', // Blue background
      foreground: this.colorManager.getColor('selection.foreground') || '\x1b[97m', // Bright white
      reset: '\x1b[0m'
    };
  }

  /**
   * Start selection mode
   */
  startSelection(displayItems: string[] = []): SelectionStateResult {
    this.mode = 'selecting';
    this.displayItems = displayItems;
    this.currentIndex = 0;
    
    // Select first item if available
    if (this.displayItems.length > 0) {
      this.selectedFile = this.displayItems[0];
    }
    
    // Started selection mode
    
    return this.getSelectionState();
  }

  /**
   * Move selection up or down
   */
  moveSelection(direction: 'up' | 'down'): SelectionStateResult {
    if (this.mode !== 'selecting' || this.displayItems.length === 0) {
      return this.getSelectionState();
    }

    const previousIndex = this.currentIndex;
    
    if (direction === 'up') {
      this.currentIndex = Math.max(0, this.currentIndex - 1);
    } else if (direction === 'down') {
      this.currentIndex = Math.min(this.displayItems.length - 1, this.currentIndex + 1);
    }

    // Update selected file
    if (this.currentIndex >= 0 && this.currentIndex < this.displayItems.length) {
      this.selectedFile = this.displayItems[this.currentIndex];
    }

    // Selection moved

    return this.getSelectionState();
  }

  /**
   * Confirm selection (Enter key)
   */
  confirmSelection(): SelectedItem | null {
    if (this.mode !== 'selecting' || !this.selectedFile) {
      return null;
    }

    const selectedItem: SelectedItem = {
      index: this.currentIndex,
      file: this.selectedFile,
      displayItem: this.displayItems[this.currentIndex]
    };

    // Selection confirmed

    return selectedItem;
  }

  /**
   * Cancel selection (Escape key)
   */
  cancelSelection(): SelectionStateResult {
    // Selection cancelled
    
    this.mode = 'waiting';
    this.currentIndex = 0;
    this.selectedFile = null;
    this.displayItems = [];
    
    return this.getSelectionState();
  }

  /**
   * Apply selection highlighting to display line
   */
  applySelectionHighlight(lineText: string, lineIndex: number): string {
    if (this.mode === 'selecting' && lineIndex === this.currentIndex) {
      // Apply selection colors
      return `${this.selectionColors.background}${this.selectionColors.foreground}${lineText}${this.selectionColors.reset}`;
    }
    return lineText;
  }

  /**
   * Check if a line should be highlighted
   */
  isLineSelected(lineIndex: number): boolean {
    return this.mode === 'selecting' && lineIndex === this.currentIndex;
  }

  /**
   * Update display items (called when display refreshes)
   */
  updateDisplayItems(newDisplayItems: string[]): SelectionStateResult {
    const wasSelecting = this.mode === 'selecting';
    this.displayItems = newDisplayItems;
    
    // Maintain selection if possible
    if (wasSelecting) {
      // Clamp current index to valid range
      this.currentIndex = Math.min(this.currentIndex, Math.max(0, this.displayItems.length - 1));
      
      // Update selected file
      if (this.currentIndex >= 0 && this.currentIndex < this.displayItems.length) {
        this.selectedFile = this.displayItems[this.currentIndex];
      } else {
        this.selectedFile = null;
      }
    }

    // Display items updated

    return this.getSelectionState();
  }

  /**
   * Get current selection state
   */
  getSelectionState(): SelectionStateResult {
    return {
      mode: this.mode,
      currentIndex: this.currentIndex,
      selectedFile: this.selectedFile,
      totalItems: this.displayItems.length,
      isSelecting: this.mode === 'selecting'
    };
  }

  /**
   * Get selection colors for external use
   */
  getSelectionColors(): SelectionColors {
    return this.selectionColors;
  }

  /**
   * Set custom selection colors
   */
  setSelectionColors(colors: Partial<SelectionColors>): void {
    this.selectionColors = { ...this.selectionColors, ...colors };
    
    // Selection colors updated
  }

  /**
   * Integration methods for FUNC-300
   */
  
  // Called by KeyInputManager when starting selection
  onStartSelection(displayItems: string[]): SelectionStateResult {
    return this.startSelection(displayItems);
  }

  // Called by KeyInputManager for selection movement
  onSelectionMove(direction: 'up' | 'down'): SelectionStateResult {
    return this.moveSelection(direction);
  }

  // Called by KeyInputManager for selection confirmation
  onSelectionConfirm(): SelectedItem | null {
    return this.confirmSelection();
  }

  // Called by KeyInputManager for selection cancellation
  onSelectionCancel(): SelectionStateResult {
    return this.cancelSelection();
  }

  /**
   * Utility methods
   */
  
  // Check if currently in selection mode
  isInSelectionMode(): boolean {
    return this.mode === 'selecting';
  }

  // Get currently selected item
  getCurrentSelection(): { index: number; file: string } | null {
    if (this.mode === 'selecting' && this.selectedFile) {
      return {
        index: this.currentIndex,
        file: this.selectedFile
      };
    }
    return null;
  }

  // Reset selection state
  reset(): void {
    this.mode = 'waiting';
    this.currentIndex = 0;
    this.selectedFile = null;
    this.displayItems = [];
    
    // Reset to initial state
  }
}

export = SelectionManager;