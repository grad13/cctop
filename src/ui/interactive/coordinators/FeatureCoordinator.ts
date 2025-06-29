/**
 * Feature Coordinator
 * Coordinates interaction between interactive components
 */

import type {
  InteractiveComponents,
  InteractiveMode,
  FileItem,
  IDisplayRenderer,
  EventType,
  ICLIDisplay,
  DatabaseManager
} from '../types/ComponentTypes';

export class FeatureCoordinator {
  private components: InteractiveComponents;
  private currentMode: InteractiveMode = 'waiting';
  private displayRenderer: IDisplayRenderer | null = null;
  private cliDisplay: ICLIDisplay | null = null;
  private databaseManager: DatabaseManager | null = null;
  private debug: boolean;

  constructor(
    components: InteractiveComponents,
    displayRenderer: IDisplayRenderer | null = null,
    cliDisplay: ICLIDisplay | null = null,
    databaseManager: DatabaseManager | null = null
  ) {
    this.components = components;
    this.displayRenderer = displayRenderer;
    this.cliDisplay = cliDisplay;
    this.databaseManager = databaseManager;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    this.initializeComponents();
  }

  /**
   * Initialize components and setup callbacks
   */
  private initializeComponents(): void {
    try {
      // Setup legacy callbacks
      this.setupLegacyCallbacks();
      
      // Setup component integration
      this.setupComponentIntegration();
      
      // Setup state change handler
      if (this.components.keyInputManager) {
        this.components.keyInputManager.onStateChange = (newState: string) => {
          this.handleStateChange(newState);
        };
      }
      
      if (this.debug) {
        console.log('[FeatureCoordinator] Components initialized');
      }
    } catch (error) {
      console.error('[FeatureCoordinator] Initialization failed:', error);
    }
  }

  /**
   * Setup callbacks for existing CLI functionality
   */
  private setupLegacyCallbacks(): void {
    if (!this.cliDisplay || !this.components.keyInputManager) {
      return;
    }

    const keyManager = this.components.keyInputManager;
    
    // Display mode callbacks
    keyManager.handleDisplayAll = () => {
      if (this.cliDisplay?.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('all');
      }
    };

    keyManager.handleDisplayUnique = () => {
      if (this.cliDisplay?.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('unique');
      }
    };

    // Event filter callback
    keyManager.handleEventFilter = (eventType: EventType) => {
      if (this.cliDisplay?.filterManager) {
        this.cliDisplay.filterManager.toggleFilter(eventType);
      }
    };
  }

  /**
   * Setup integration between components
   */
  private setupComponentIntegration(): void {
    // Selection Manager → Detail Controller integration
    if (this.components.selectionManager && this.components.detailController) {
      this.components.selectionManager.onSelectionConfirmed = async (selectedFile: string) => {
        try {
          if (this.databaseManager) {
            const fileRecord = await this.databaseManager.findByPath(selectedFile);
            if (fileRecord && this.components.detailController.showFileDetails) {
              await this.components.detailController.showFileDetails(fileRecord.id, selectedFile);
            }
          }
        } catch (error) {
          if (this.debug) {
            console.error('[FeatureCoordinator] Selection confirmation failed:', error);
          }
        }
      };
    }

    // Detail Controller → Selection Manager integration
    if (this.components.detailController) {
      this.components.detailController.onExit = () => {
        this.handleStateChange('waiting');
      };
    }
  }

  /**
   * Handle state changes across the system
   */
  handleStateChange(newMode: string): void {
    const previousMode = this.currentMode;
    this.currentMode = newMode as InteractiveMode;
    
    // Update display based on new mode
    if (this.displayRenderer?.updateMode) {
      this.displayRenderer.updateMode(newMode);
    }

    // Refresh display if returning to waiting mode
    if (newMode === 'waiting' && this.displayRenderer?.refresh) {
      this.displayRenderer.refresh();
    }
    
    if (this.debug) {
      console.log(`[FeatureCoordinator] Mode changed: ${previousMode} -> ${newMode}`);
    }
  }

  /**
   * Get current interactive mode
   */
  getCurrentMode(): InteractiveMode {
    return this.currentMode;
  }

  /**
   * Check if detail mode is active
   */
  isDetailModeActive(): boolean {
    return this.components.detailController?.isActive() || false;
  }

  /**
   * Check if selection mode is active
   */
  isSelectionModeActive(): boolean {
    return this.components.selectionManager?.isSelecting() || false;
  }

  /**
   * Force exit to waiting mode
   */
  async exitToWaitingMode(): Promise<void> {
    if (this.components.detailController?.isActive()) {
      await this.components.detailController.exitDetailMode();
    }
    
    if (this.components.selectionManager?.isSelecting()) {
      await this.components.selectionManager.exitSelectionMode();
    }
    
    if (this.components.keyInputManager) {
      this.components.keyInputManager.setState('waiting');
    }
  }

  /**
   * Refresh current display
   */
  async refresh(): Promise<void> {
    if (this.components.detailController?.isActive()) {
      await this.components.detailController.refresh();
    }
    
    if (this.displayRenderer?.refresh) {
      this.displayRenderer.refresh();
    }
  }

  /**
   * Update file list for selection
   */
  updateFileList(fileList: string[]): void {
    if (this.components.selectionManager) {
      this.components.selectionManager.updateFileList(fileList);
    }
  }

  /**
   * Get selection state
   */
  getSelectionState(): any {
    return this.components.selectionManager?.getSelectionState() || null;
  }

  /**
   * Handle key input
   */
  handleKeyInput(key: string): boolean {
    if (this.components.keyInputManager?.handleKey) {
      return this.components.keyInputManager.handleKey(key);
    }
    return false;
  }

  /**
   * Get active component name
   */
  getActiveComponent(): string {
    if (this.components.detailController?.isActive()) {
      return 'detail';
    }
    if (this.components.selectionManager?.isSelecting()) {
      return 'selection';
    }
    return 'waiting';
  }

  /**
   * Update display renderer
   */
  setDisplayRenderer(renderer: IDisplayRenderer): void {
    this.displayRenderer = renderer;
  }

  /**
   * Get coordinator status
   */
  getCoordinatorStatus(): object {
    return {
      currentMode: this.currentMode,
      detailModeActive: this.isDetailModeActive(),
      selectionModeActive: this.isSelectionModeActive(),
      activeComponent: this.getActiveComponent()
    };
  }
}