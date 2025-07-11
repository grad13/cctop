/**
 * ESCOperationManager
 * Manages two different ESC behaviors (discard edits vs clear all)
 */

export interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];
  keywordFilter: string;
}

/**
 * ESCOperationManager
 * 
 * Core features:
 * 1. Edit mode vs normal mode management
 * 2. ESC in edit mode: Discard edits and restore original state
 * 3. ESC in normal mode: Clear all filters
 * 4. Save and restore previousState functionality
 */
export class ESCOperationManager {
  private currentState: FilterState;
  private previousState: FilterState | null = null;
  private currentMode: 'normal' | 'editing' = 'normal';

  constructor(initialState?: FilterState) {
    this.currentState = initialState || this.getDefaultState();
  }

  /**
   * Get default state
   */
  private getDefaultState(): FilterState {
    return {
      mode: 'all',
      eventFilters: ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'],
      keywordFilter: ''
    };
  }

  /**
   * Enter editing mode
   * Save previousState to record state before editing
   */
  enterEditingMode(field: 'eventFilter' | 'keywordFilter'): void {
    this.previousState = { ...this.currentState };
    this.currentMode = 'editing';
  }

  /**
   * Update state
   */
  updateState(updates: Partial<FilterState>): void {
    this.currentState = { ...this.currentState, ...updates };
  }

  /**
   * Execute ESC operation
   * 
   * Behavior patterns:
   * 1. In edit mode: Discard edits and restore original state
   * 2. In normal mode: Clear all filters to default state
   */
  executeEscape(): FilterState {
    if (this.currentMode === 'editing') {
      // ESC in edit mode: Discard edit results and restore previous state
      if (this.previousState) {
        this.currentState = { ...this.previousState };
        this.previousState = null;
      }
      this.currentMode = 'normal';
    } else {
      // ESC in normal mode: Clear all edits
      this.currentState = this.getDefaultState();
    }
    
    return { ...this.currentState };
  }

  /**
   * Get current state
   */
  getCurrentState(): FilterState {
    return { ...this.currentState };
  }

  /**
   * Get current mode
   */
  getCurrentMode(): string {
    return this.currentMode;
  }

  /**
   * Check if in editing mode
   */
  isEditing(): boolean {
    return this.currentMode === 'editing';
  }

  /**
   * Confirm and exit edit mode
   * Unlike ESC, this saves the edits and returns to normal mode
   */
  confirmEdit(): FilterState {
    this.currentMode = 'normal';
    this.previousState = null;
    return { ...this.currentState };
  }

  /**
   * Sync state from external source
   * Used for integration with FilterStateManager
   */
  syncState(newState: FilterState): void {
    this.currentState = { ...newState };
  }

  /**
   * Check if previousState exists (for debugging)
   */
  hasPreviousState(): boolean {
    return this.previousState !== null;
  }
}