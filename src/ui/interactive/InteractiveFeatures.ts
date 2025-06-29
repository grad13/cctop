/**
 * Interactive Features Integration (FUNC-400/401/402/403)
 * Central coordinator for all interactive functionality
 */

import {
  DatabaseManager,
  KeyInputManager,
  SelectionManager,
  DetailInspectionController,
  AggregateDisplayRenderer,
  HistoryDisplayRenderer,
  DisplayRenderer,
  CLIDisplayForInteractive,
  InteractiveFeaturesComponents,
  EventType
} from '../../types/common';

const KeyInputManagerClass = require('../../interactive/key-input-manager');
const SelectionManagerClass = require('./SelectionManager');
const DetailInspectionControllerClass = require('./DetailInspectionController');
const AggregateDisplayRendererClass = require('./AggregateDisplayRenderer');
const HistoryDisplayRendererClass = require('./HistoryDisplayRenderer');

class InteractiveFeatures {
  private databaseManager: DatabaseManager;
  private displayRenderer: DisplayRenderer | null;
  private cliDisplay: CLIDisplayForInteractive | null;
  private keyInputManager: KeyInputManager;
  private aggregateDisplay: AggregateDisplayRenderer;
  private historyDisplay: HistoryDisplayRenderer;
  private detailController: DetailInspectionController;
  private selectionManager: SelectionManager;

  constructor(databaseManager: DatabaseManager, displayRenderer: DisplayRenderer | null = null, cliDisplay: CLIDisplayForInteractive | null = null) {
    this.databaseManager = databaseManager;
    this.displayRenderer = displayRenderer;
    this.cliDisplay = cliDisplay;
    
    // Initialize components
    this.keyInputManager = new KeyInputManagerClass();
    this.aggregateDisplay = new AggregateDisplayRendererClass(this.databaseManager);
    this.historyDisplay = new HistoryDisplayRendererClass(this.databaseManager);
    this.detailController = new DetailInspectionControllerClass(
      this.aggregateDisplay, 
      this.historyDisplay, 
      this.keyInputManager
    );
    this.selectionManager = new SelectionManagerClass(
      this.keyInputManager, 
      this.displayRenderer
    );
    
    // Setup component integration
    this.setupIntegration();
  }

  /**
   * Initialize interactive features
   */
  async initialize(): Promise<void> {
    // Set up callbacks for legacy functionality
    this.setupLegacyCallbacks();
    
    // Initialize all components
    await (this.keyInputManager as any).start();
    
    // Initial file list setup
    this.updateFileListFromEvents();
  }

  /**
   * Setup callbacks for existing CLI functionality
   */
  private setupLegacyCallbacks(): void {
    if (!this.cliDisplay) {
      return;
    }

    // Hook into KeyInputManager for existing functionality
    const originalHandleDisplayAll = (this.keyInputManager as any).handleDisplayAll;
    (this.keyInputManager as any).handleDisplayAll = () => {
      if (this.cliDisplay?.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('all');
      }
    };

    const originalHandleDisplayUnique = (this.keyInputManager as any).handleDisplayUnique;
    (this.keyInputManager as any).handleDisplayUnique = () => {
      if (this.cliDisplay?.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('unique');
      }
    };

    const originalHandleEventFilter = (this.keyInputManager as any).handleEventFilter;
    (this.keyInputManager as any).handleEventFilter = (eventType: EventType) => {
      if (this.cliDisplay?.filterManager) {
        this.cliDisplay.filterManager.toggleFilter(eventType);
      }
    };
  }

  /**
   * Setup integration between components
   */
  private setupIntegration(): void {

    // Selection Manager → Detail Controller integration
    if (this.selectionManager && this.detailController) {
      // Connect selection events to detail inspection
      (this.selectionManager as any).onSelectionConfirmed = async (selectedFile: string) => {
        try {
          // Get file ID from database
          const fileRecord = await this.databaseManager.findByPath(selectedFile);
          if (fileRecord) {
            await (this.detailController as any).showFileDetails(fileRecord.id, selectedFile);
          }
        } catch (error) {
          // Error handled silently
        }
      };
    }

    // Detail Controller → Selection Manager integration
    if (this.detailController && this.selectionManager) {
      // Connect detail exit back to selection mode
      (this.detailController as any).onExit = async () => {
        // Refresh the main display
        this.handleStateChange('waiting');
      };
    }

    // Global state change handler
    if (this.keyInputManager) {
      (this.keyInputManager as any).onStateChange = (newState: string) => {
        this.handleStateChange(newState);
      };
    }
  }

  /**
   * Handle state changes across the system
   */
  private handleStateChange(newMode: string): void {

    // Update display based on new mode
    if (this.displayRenderer && this.displayRenderer.updateMode) {
      this.displayRenderer.updateMode(newMode);
    }

    // Refresh display if returning to waiting mode
    if (newMode === 'waiting' && this.displayRenderer && this.displayRenderer.refresh) {
      this.displayRenderer.refresh();
    }
  }

  /**
   * Update file list for selection
   */
  updateFileList(fileList: string[]): void {
    if (this.selectionManager) {
      this.selectionManager.updateFileList(fileList);
    }
  }

  /**
   * Get current selection state
   */
  getSelectionState(): any {
    return this.selectionManager ? this.selectionManager.getSelectionState() : null;
  }

  /**
   * Check if detail mode is active
   */
  isDetailModeActive(): boolean {
    return this.detailController ? this.detailController.isActive() : false;
  }

  /**
   * Check if selection mode is active
   */
  isSelectionModeActive(): boolean {
    return this.selectionManager ? this.selectionManager.isSelecting() : false;
  }

  /**
   * Get current mode from key input manager
   */
  getCurrentMode(): string {
    return this.keyInputManager ? (this.keyInputManager as any).currentMode : 'waiting';
  }

  /**
   * Force exit to waiting mode
   */
  async exitToWaitingMode(): Promise<void> {
    if (this.detailController && this.detailController.isActive()) {
      await this.detailController.exitDetailMode();
    }
    
    if (this.selectionManager && this.selectionManager.isSelecting()) {
      await this.selectionManager.exitSelectionMode();
    }
    
    if (this.keyInputManager) {
      this.keyInputManager.setState('waiting');
    }
  }

  /**
   * Refresh current display
   */
  async refresh(): Promise<void> {
    if (this.detailController && this.detailController.isActive()) {
      await this.detailController.refresh();
    }
    
    if (this.displayRenderer && this.displayRenderer.refresh) {
      this.displayRenderer.refresh();
    }
  }

  /**
   * Get component references for external integration
   */
  getComponents(): InteractiveFeaturesComponents {
    return {
      keyInputManager: this.keyInputManager,
      selectionManager: this.selectionManager,
      detailController: this.detailController,
      aggregateDisplay: this.aggregateDisplay,
      historyDisplay: this.historyDisplay
    };
  }

  /**
   * Register external display renderer
   */
  setDisplayRenderer(renderer: DisplayRenderer): void {
    this.displayRenderer = renderer;
    
    // Update selection manager with new renderer
    // Note: SelectionManager doesn't have setDisplayRenderer method
    // This was likely from an older version
    // if (this.selectionManager) {
    //   (this.selectionManager as any).setDisplayRenderer(renderer);
    // }
  }

  /**
   * Update file list from current events (for selection mode)
   */
  updateFileListFromEvents(): void {
    if (!this.cliDisplay) return;
    
    try {
      // Extract file list from current display events
      const fileList: string[] = [];
      
      // If we have access to the event display manager
      if (this.cliDisplay.eventDisplayManager) {
        // Get current events and extract unique file paths
        const events = (this.cliDisplay.eventDisplayManager as any).getEventsToDisplay?.();
        if (events && Array.isArray(events)) {
          const uniqueFiles = new Set<string>();
          events.forEach((event: any) => {
            if (event.file_name) {
              uniqueFiles.add(event.file_name);
            }
          });
          fileList.push(...Array.from(uniqueFiles));
        }
      }
      
      // Update selection manager
      this.updateFileList(fileList);
      
    } catch (error) {
    }
  }

  /**
   * Handle key input (delegate to key input manager)
   */
  handleKeyInput(key: string): boolean {
    if (this.keyInputManager && (this.keyInputManager as any).handleKey) {
      return (this.keyInputManager as any).handleKey(key);
    }
    return false;
  }

  /**
   * Get current active component name
   */
  getActiveComponent(): string {
    if (this.detailController && this.detailController.isActive()) {
      return 'detail';
    }
    if (this.selectionManager && this.selectionManager.isSelecting()) {
      return 'selection';
    }
    return 'waiting';
  }

  /**
   * Destroy all components and clean up resources
   */
  destroy(): void {
    if (this.detailController) {
      (this.detailController as any).destroy?.();
      this.detailController = null as any;
    }
    
    if (this.selectionManager) {
      (this.selectionManager as any).destroy?.();
      this.selectionManager = null as any;
    }
    
    if (this.historyDisplay) {
      (this.historyDisplay as any).cleanup?.();
      this.historyDisplay = null as any;
    }
    
    if (this.aggregateDisplay) {
      this.aggregateDisplay.cleanup();
      this.aggregateDisplay = null as any;
    }
    
    if (this.keyInputManager) {
      (this.keyInputManager as any).destroy?.();
      this.keyInputManager = null as any;
    }
    
    this.databaseManager = null as any;
    this.displayRenderer = null;
  }
}

export = InteractiveFeatures;