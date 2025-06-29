/**
 * FUNC-401: Detailed Inspection Mode Controller
 * Coordinates FUNC-402 and FUNC-403 modules
 */

// Type imports
import type { 
  IDetailInspectionController,
  KeyInputManager,
  IAggregateDisplay,
  IHistoryDisplay,
  IRenderController,
  SelectedFile,
  ISelectedFile,
  IKeyHandler
} from './interfaces/ControllerInterfaces';

// Component imports
import { DetailModeState } from './state/DetailModeState';
import { DisplayCoordinator } from './coordinators/DisplayCoordinator';
import { DetailRenderer } from './renderers/DetailRenderer';

class DetailInspectionController implements IDetailInspectionController {
  private displayCoordinator: DisplayCoordinator;
  private detailState: DetailModeState;
  private detailRenderer: DetailRenderer;
  private keyInputManager: KeyInputManager;
  private renderController: IRenderController | null = null;
  
  constructor(aggregateDisplay: IAggregateDisplay, historyDisplay: IHistoryDisplay, keyInputManager: KeyInputManager) {
    // Initialize components
    this.displayCoordinator = new DisplayCoordinator(aggregateDisplay, historyDisplay);
    this.detailState = new DetailModeState();
    this.detailRenderer = new DetailRenderer(aggregateDisplay, historyDisplay);
    this.keyInputManager = keyInputManager;
    
    // Register key handlers
    this.registerKeyHandlers();
  }

  /**
   * Register key handlers with FUNC-300
   */
  private registerKeyHandlers(): void {
    const handlers: Array<[string, IKeyHandler]> = [
      ['ArrowUp', { id: 'detail-navigate-up', callback: () => this.handleKeyInput('ArrowUp') }],
      ['ArrowDown', { id: 'detail-navigate-down', callback: () => this.handleKeyInput('ArrowDown') }],
      ['Escape', { id: 'detail-exit-esc', callback: () => this.handleKeyInput('Escape') }],
      ['q', { id: 'detail-exit-q', callback: () => this.handleKeyInput('q') }]
    ];

    handlers.forEach(([key, handler]) => {
      this.keyInputManager.registerHandler('detail', key, handler);
    });
  }

  /**
   * Mode activation from FUNC-400
   */
  async activateDetailMode(selectedFile: SelectedFile): Promise<void> {
    if (!selectedFile) {
      return;
    }
    
    try {
      // Activate state
      this.detailState.activate(selectedFile);
      
      // Notify RenderController to stop interfering
      this.notifyRenderController(true);
      
      // Stop CLI Display refresh to prevent overwrites
      this.stopCliRefresh();
      
      // Coordinate displays
      await this.displayCoordinator.coordinateDisplays(selectedFile);
      
      // Notify key input manager of state change
      this.keyInputManager.setState('detail');
      
      // Render combined display
      this.render();
      
    } catch (error: any) {
      console.error('[DetailInspectionController] Failed to activate detail mode:', error);
      await this.exitDetailMode();
    }
  }

  /**
   * Key distribution to modules
   */
  private async handleKeyInput(key: string): Promise<void> {
    if (!this.detailState.isActive()) {
      return;
    }
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
        // Forward navigation to coordinator
        await this.displayCoordinator.handleKeyNavigation(key);
        this.render(); // Re-render after navigation
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
    if (!this.detailState.isActive()) {
      return;
    }

    try {
      const content = this.detailRenderer.renderDetailMode();
      
      if (content) {
        DetailRenderer.writeToStdout(content);
      }
    } catch (error) {
      console.error('[DetailInspectionController] Render error:', error);
    }
  }

  /**
   * Mode termination
   */
  async exitDetailMode(): Promise<void> {
    // Deactivate state
    this.detailState.deactivate();
    
    // Notify RenderController that detail mode is ended
    this.notifyRenderController(false);
    
    // Restart CLI Display refresh
    this.restartCliRefresh();
    
    try {
      // Cleanup displays
      this.displayCoordinator.cleanupDisplays();
      
      // Return to waiting mode
      this.keyInputManager.setState('waiting');
      
      // Clear detail display
      DetailRenderer.clearDisplay();
      
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
    return this.detailState.isActive();
  }

  /**
   * Get current selected file
   */
  getSelectedFile(): SelectedFile | null {
    return this.detailState.getSelectedFile();
  }

  /**
   * FUNC-401: Set RenderController reference to prevent interference
   */
  setRenderController(renderController: IRenderController): void {
    this.renderController = renderController;
  }

  /**
   * Force refresh display
   */
  async refresh(): Promise<void> {
    if (this.detailState.isActive()) {
      try {
        const selectedFile = this.detailState.getSelectedFile();
        if (selectedFile) {
          // Re-coordinate displays with fresh data
          await this.displayCoordinator.coordinateDisplays(selectedFile);
          
          // Re-render
          this.render();
        }
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
    if (this.detailState.isActive()) {
      this.exitDetailMode();
    }
    
    // Unregister key handlers
    const keys = ['ArrowUp', 'ArrowDown', 'Escape', 'q'];
    keys.forEach(key => {
      this.keyInputManager.unregisterHandler('detail', key);
    });
  }

  // Interface compatibility methods
  async showFileDetails?(fileId: number, fileName: string): Promise<void> {
    // Convert to SelectedFile format and activate
    const selectedFile: ISelectedFile = {
      name: fileName,
      path: '', // Will be handled in activateDetailMode
      fileId: fileId
    };
    await this.activateDetailMode(selectedFile);
  }

  // Private helper methods
  private notifyRenderController(active: boolean): void {
    if (this.renderController?.setDetailModeActive) {
      this.renderController.setDetailModeActive(active);
    }
  }

  private stopCliRefresh(): void {
    if (this.renderController?.cliDisplay?.refreshInterval) {
      clearInterval(this.renderController.cliDisplay.refreshInterval);
      this.renderController.cliDisplay.refreshInterval = null;
    }
  }

  private restartCliRefresh(): void {
    if (this.renderController?.cliDisplay && !this.renderController.cliDisplay.refreshInterval) {
      this.renderController.cliDisplay.refreshInterval = setInterval(() => {
        if (!this.renderController!.isDetailMode || !this.renderController!.isDetailMode()) {
          this.renderController!.cliDisplay!.updateDisplay!();
        }
      }, 100);
    }
  }
}

module.exports = DetailInspectionController;