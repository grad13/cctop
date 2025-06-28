/**
 * FUNC-401: Detailed Inspection Mode Controller
 * Coordinates FUNC-402 and FUNC-403 modules
 */

// Type-only imports
import type { 
  DetailInspectionController as IDetailInspectionController,
  KeyInputManager,
  AggregateDisplay,
  HistoryDisplay,
  RenderController
} from '../../types/common';

// Detail Inspection Controller specific interfaces
interface SelectedFileObject {
  name?: string;
  path?: string;
  [key: string]: any;
}

type SelectedFile = string | SelectedFileObject;

interface DetailRenderController extends RenderController {
  setDetailModeActive?(active: boolean): void;
  cliDisplay?: {
    refreshInterval?: NodeJS.Timeout | null;
    updateDisplay?(): void;
  };
  isDetailMode?(): boolean;
  render?(): void;
}

interface DetailAggregateDisplay extends AggregateDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  cleanup?(): void;
}

interface DetailHistoryDisplay extends HistoryDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  navigate?(key: string): Promise<void>;
  cleanup?(): void;
}

class DetailInspectionController implements IDetailInspectionController {
  private aggregateDisplay: DetailAggregateDisplay;
  private historyDisplay: DetailHistoryDisplay;
  private keyInputManager: KeyInputManager;
  private active: boolean = false;
  private selectedFile: SelectedFile | null = null;
  private renderController: DetailRenderController | null = null;
  
  constructor(aggregateDisplay: DetailAggregateDisplay, historyDisplay: DetailHistoryDisplay, keyInputManager: KeyInputManager) {
    this.aggregateDisplay = aggregateDisplay;  // FUNC-402
    this.historyDisplay = historyDisplay;      // FUNC-403
    this.keyInputManager = keyInputManager;
    
    // Register key handlers
    this.registerKeyHandlers();
  }

  /**
   * Register key handlers with FUNC-300
   */
  private registerKeyHandlers(): void {
    this.keyInputManager.registerHandler('detail', 'ArrowUp', {
      id: 'detail-navigate-up',
      callback: () => this.handleKeyInput('ArrowUp')
    });
    
    this.keyInputManager.registerHandler('detail', 'ArrowDown', {
      id: 'detail-navigate-down',
      callback: () => this.handleKeyInput('ArrowDown')
    });

    this.keyInputManager.registerHandler('detail', 'Escape', {
      id: 'detail-exit-esc',
      callback: () => this.handleKeyInput('Escape')
    });

    this.keyInputManager.registerHandler('detail', 'q', {
      id: 'detail-exit-q',
      callback: () => this.handleKeyInput('q')
    });
  }

  /**
   * Mode activation from FUNC-400
   */
  async activateDetailMode(selectedFile: SelectedFile): Promise<void> {
    if (!selectedFile) {
      return;
    }
    
    // Extract file path from selectedFile object if needed
    let filePath = selectedFile as string;
    if (typeof selectedFile === 'object') {
      const fileObj = selectedFile as SelectedFileObject;
      if (fileObj.name && fileObj.name.trim()) {
        filePath = fileObj.path ? `${fileObj.path}/${fileObj.name}` : fileObj.name;
      } else {
        // If name is empty, use a placeholder or get from file list
        filePath = 'empty_filename_entry';
      }
    }

    this.active = true;
    this.selectedFile = selectedFile;
    
    // FUNC-401: Notify RenderController to stop interfering
    if (this.renderController && this.renderController.setDetailModeActive) {
      this.renderController.setDetailModeActive(true);
    }
    
    // Stop CLI Display refresh to prevent overwrites
    if (this.renderController && this.renderController.cliDisplay && this.renderController.cliDisplay.refreshInterval) {
      clearInterval(this.renderController.cliDisplay.refreshInterval);
      this.renderController.cliDisplay.refreshInterval = null;
    }
    
    try {
      
      // Initialize both modules
      await this.aggregateDisplay.initialize(filePath);
      
      await this.historyDisplay.initialize(filePath);
      
      // Notify key input manager of state change
      this.keyInputManager.setState('detail');
      
      // Render combined display
      this.render();
      
    } catch (error: any) {
      console.error('[DetailInspectionController] ❌ Failed to activate detail mode:', error);
      await this.exitDetailMode();
    }
  }

  /**
   * Key distribution to modules
   */
  private async handleKeyInput(key: string): Promise<void> {
    if (!this.active) {
      return;
    }
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
        // Forward to FUNC-403 for history navigation
        if (this.historyDisplay && this.historyDisplay.navigate) {
          await this.historyDisplay.navigate(key);
          this.render(); // Re-render after navigation
        }
        break;
        
      case 'Escape':
      case 'q':
        await this.exitDetailMode();
        break;
        
      default:
        // Ignore unhandled keys
    }
  }

  /**
   * Render combined display (FUNC-402 + FUNC-403)
   */
  private render(): void {
    if (!this.active) {
      return;
    }

    try {
      // Clear screen
      process.stdout.write('\x1b[2J\x1b[0f');
      
      // Render aggregate display (upper section)
      
      let aggregateContent: string | null = null;
      try {
        aggregateContent = this.aggregateDisplay.render();
      } catch (error) {
        console.error('[DetailInspectionController] ❌ Aggregate render error:', error);
        aggregateContent = null;
      }
      
      if (aggregateContent) {
        process.stdout.write(aggregateContent);
        process.stdout.write('\n');
      }
      
      // Render history display (lower section)
      const historyContent = this.historyDisplay.render();
      if (historyContent) {
        process.stdout.write(historyContent);
      } else {
        process.stdout.write('(No history content)\n');
      }
      
      // Force flush
      process.stdout.write('\x1b[999;1H'); // Move cursor to bottom
      
    } catch (error) {
      console.error('[DetailInspectionController] ❌ Render error:', error);
    }
  }

  /**
   * Mode termination
   */
  async exitDetailMode(): Promise<void> {
    this.active = false;
    this.selectedFile = null;
    
    
    // FUNC-401: Notify RenderController that detail mode is ended
    if (this.renderController && this.renderController.setDetailModeActive) {
      this.renderController.setDetailModeActive(false);
    }
    
    // Restart CLI Display refresh
    if (this.renderController && this.renderController.cliDisplay && !this.renderController.cliDisplay.refreshInterval) {
      this.renderController.cliDisplay.refreshInterval = setInterval(() => {
        if (!this.renderController!.isDetailMode || !this.renderController!.isDetailMode()) {
          this.renderController!.cliDisplay!.updateDisplay!();
        }
      }, 100);
    }
    
    try {
      // Cleanup modules
      if (this.aggregateDisplay && this.aggregateDisplay.cleanup) {
        this.aggregateDisplay.cleanup();
      }
      
      if (this.historyDisplay && this.historyDisplay.cleanup) {
        this.historyDisplay.cleanup();
      }
      
      // Return to waiting mode
      this.keyInputManager.setState('waiting');
      
      // Clear detail display
      process.stdout.write('\x1b[2J\x1b[0f');
      
      // Re-enable main view rendering
      if (this.renderController && this.renderController.render) {
        this.renderController.render();
      }
      
    } catch (error) {
      console.error('[DetailInspectionController] Error during exit:', error);
    }
  }

  /**
   * Check if detail mode is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get current selected file
   */
  getSelectedFile(): SelectedFile | null {
    return this.selectedFile;
  }

  /**
   * FUNC-401: Set RenderController reference to prevent interference
   */
  setRenderController(renderController: DetailRenderController): void {
    this.renderController = renderController;
  }

  /**
   * Force refresh display
   */
  async refresh(): Promise<void> {
    if (this.active && this.selectedFile) {
      try {
        // Extract file path for refresh
        let filePath = this.selectedFile as string;
        if (typeof this.selectedFile === 'object') {
          const fileObj = this.selectedFile as SelectedFileObject;
          filePath = fileObj.path ? `${fileObj.path}/${fileObj.name}` : fileObj.name || 'empty_filename_entry';
        }
        
        // Re-initialize modules with fresh data
        await this.aggregateDisplay.initialize(filePath);
        await this.historyDisplay.initialize(filePath);
        
        // Re-render
        this.render();
        
      } catch (error) {
        console.error('[DetailInspectionController] Refresh error:', error);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Exit detail mode if active
    if (this.active) {
      this.exitDetailMode();
    }
    
    // Unregister key handlers
    this.keyInputManager.unregisterHandler('detail', 'ArrowUp');
    this.keyInputManager.unregisterHandler('detail', 'ArrowDown');
    this.keyInputManager.unregisterHandler('detail', 'Escape');
    this.keyInputManager.unregisterHandler('detail', 'q');
  }

  // Interface compatibility methods
  async showFileDetails?(fileId: number, fileName: string): Promise<void> {
    // Convert to SelectedFile format and activate
    const selectedFile: SelectedFileObject = {
      name: fileName,
      path: '', // Will be handled in activateDetailMode
      fileId: fileId
    };
    await this.activateDetailMode(selectedFile);
  }
}

module.exports = DetailInspectionController;