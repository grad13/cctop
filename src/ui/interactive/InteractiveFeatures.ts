/**
 * Interactive Features Integration (FUNC-400/401/402/403)
 * Central coordinator for all interactive functionality
 */

import type {
  DatabaseManager,
  DisplayRenderer,
  CLIDisplayForInteractive,
  InteractiveFeaturesComponents,
  InteractiveComponents,
  IDisplayRenderer,
  ICLIDisplay
} from './types/ComponentTypes';

import { ComponentFactory } from './factories/ComponentFactory';
import { FeatureCoordinator } from './coordinators/FeatureCoordinator';
import { InteractiveEventManager } from './events/InteractiveEventManager';

class InteractiveFeatures {
  private componentFactory: ComponentFactory;
  private featureCoordinator: FeatureCoordinator;
  private eventManager: InteractiveEventManager;
  private components: InteractiveComponents;
  private debug: boolean;

  constructor(
    databaseManager: DatabaseManager, 
    displayRenderer: DisplayRenderer | null = null, 
    cliDisplay: CLIDisplayForInteractive | null = null
  ) {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Initialize factory and create components
    this.componentFactory = new ComponentFactory(
      databaseManager,
      displayRenderer,
      cliDisplay
    );
    
    this.components = this.componentFactory.createAllComponents();
    
    // Validate components
    if (!this.componentFactory.validateComponents(this.components)) {
      throw new Error('[InteractiveFeatures] Component validation failed');
    }
    
    // Initialize event manager
    this.eventManager = new InteractiveEventManager(cliDisplay as ICLIDisplay);
    
    // Initialize coordinator
    this.featureCoordinator = new FeatureCoordinator(
      this.components,
      displayRenderer as IDisplayRenderer,
      cliDisplay as ICLIDisplay,
      databaseManager
    );
    
    // Setup event listeners
    this.setupEventListeners();
    
    if (this.debug) {
      console.log('[InteractiveFeatures] Initialized successfully');
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for file list updates from event manager
    this.eventManager.onFileListUpdate((fileList: string[]) => {
      this.featureCoordinator.updateFileList(fileList);
    });
  }

  /**
   * Initialize interactive features
   */
  async initialize(): Promise<void> {
    // Initialize key input manager
    if (this.components.keyInputManager.start) {
      await this.components.keyInputManager.start();
    }
    
    // Initial file list setup
    this.updateFileListFromEvents();
  }

  // 既存API完全互換メソッド

  /**
   * Update file list for selection
   */
  updateFileList(fileList: string[]): void {
    this.featureCoordinator.updateFileList(fileList);
  }

  /**
   * Get current selection state
   */
  getSelectionState(): any {
    return this.featureCoordinator.getSelectionState();
  }

  /**
   * Check if detail mode is active
   */
  isDetailModeActive(): boolean {
    return this.featureCoordinator.isDetailModeActive();
  }

  /**
   * Check if selection mode is active
   */
  isSelectionModeActive(): boolean {
    return this.featureCoordinator.isSelectionModeActive();
  }

  /**
   * Get current mode from key input manager
   */
  getCurrentMode(): string {
    const mode = this.featureCoordinator.getCurrentMode();
    return this.components.keyInputManager.currentMode || mode;
  }

  /**
   * Force exit to waiting mode
   */
  async exitToWaitingMode(): Promise<void> {
    await this.featureCoordinator.exitToWaitingMode();
  }

  /**
   * Refresh current display
   */
  async refresh(): Promise<void> {
    await this.featureCoordinator.refresh();
  }

  /**
   * Get component references for external integration
   */
  getComponents(): InteractiveFeaturesComponents {
    return this.components as InteractiveFeaturesComponents;
  }

  /**
   * Register external display renderer
   */
  setDisplayRenderer(renderer: DisplayRenderer): void {
    this.featureCoordinator.setDisplayRenderer(renderer as IDisplayRenderer);
  }

  /**
   * Update file list from current events (for selection mode)
   */
  updateFileListFromEvents(): void {
    const fileList = this.eventManager.extractFileListFromEvents();
    this.eventManager.emitFileListUpdate(fileList);
  }

  /**
   * Handle key input (delegate to key input manager)
   */
  handleKeyInput(key: string): boolean {
    return this.featureCoordinator.handleKeyInput(key);
  }

  /**
   * Get current active component name
   */
  getActiveComponent(): string {
    return this.featureCoordinator.getActiveComponent();
  }

  /**
   * Destroy all components and clean up resources
   */
  destroy(): void {
    // Cleanup event manager
    this.eventManager.cleanup();
    
    // Destroy components
    if (this.components.detailController?.destroy) {
      this.components.detailController.destroy();
    }
    
    if (this.components.selectionManager?.destroy) {
      this.components.selectionManager.destroy();
    }
    
    if (this.components.historyDisplay?.cleanup) {
      this.components.historyDisplay.cleanup();
    }
    
    if (this.components.aggregateDisplay) {
      this.components.aggregateDisplay.cleanup();
    }
    
    if (this.components.keyInputManager?.destroy) {
      this.components.keyInputManager.destroy();
    }
  }

  /**
   * Get integrated status (new method for debugging)
   */
  getFeatureStatus(): object {
    return {
      factory: this.componentFactory.getFactoryStatus(),
      coordinator: this.featureCoordinator.getCoordinatorStatus(),
      events: this.eventManager.getEventStatus(),
      components: Object.keys(this.components)
    };
  }
}

export = InteractiveFeatures;