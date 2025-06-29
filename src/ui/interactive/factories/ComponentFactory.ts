/**
 * Component Factory
 * Creates and validates interactive UI components
 */

import type {
  DatabaseManager,
  DisplayRenderer,
  CLIDisplayForInteractive,
  InteractiveComponents,
  IKeyInputManager,
  ISelectionManager,
  IDetailController,
  IAggregateDisplay,
  IHistoryDisplay
} from '../types/ComponentTypes';

// Import actual classes using require for now (will be migrated later)
const KeyInputManagerClass = require('../../../interactive/key-input-manager');
const SelectionManagerClass = require('../SelectionManager');
const DetailInspectionControllerClass = require('../DetailInspectionController');
const AggregateDisplayRendererClass = require('../AggregateDisplayRenderer');
const HistoryDisplayRendererClass = require('../HistoryDisplayRenderer');

export class ComponentFactory {
  private databaseManager: DatabaseManager;
  private displayRenderer: DisplayRenderer | null;
  private cliDisplay: CLIDisplayForInteractive | null;
  private debug: boolean;

  constructor(
    databaseManager: DatabaseManager,
    displayRenderer: DisplayRenderer | null = null,
    cliDisplay: CLIDisplayForInteractive | null = null
  ) {
    this.databaseManager = databaseManager;
    this.displayRenderer = displayRenderer;
    this.cliDisplay = cliDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  /**
   * Create key input manager
   */
  createKeyInputManager(): IKeyInputManager {
    const manager = new KeyInputManagerClass();
    
    if (this.debug) {
      console.log('[ComponentFactory] KeyInputManager created');
    }
    
    return manager;
  }

  /**
   * Create selection manager
   */
  createSelectionManager(keyInputManager: IKeyInputManager): ISelectionManager {
    const manager = new SelectionManagerClass(
      keyInputManager,
      this.displayRenderer
    );
    
    if (this.debug) {
      console.log('[ComponentFactory] SelectionManager created');
    }
    
    return manager;
  }

  /**
   * Create detail inspection controller
   */
  createDetailController(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay,
    keyInputManager: IKeyInputManager
  ): IDetailController {
    const controller = new DetailInspectionControllerClass(
      aggregateDisplay,
      historyDisplay,
      keyInputManager
    );
    
    if (this.debug) {
      console.log('[ComponentFactory] DetailInspectionController created');
    }
    
    return controller;
  }

  /**
   * Create aggregate display renderer
   */
  createAggregateDisplay(): IAggregateDisplay {
    const display = new AggregateDisplayRendererClass(this.databaseManager);
    
    if (this.debug) {
      console.log('[ComponentFactory] AggregateDisplayRenderer created');
    }
    
    return display;
  }

  /**
   * Create history display renderer
   */
  createHistoryDisplay(): IHistoryDisplay {
    const display = new HistoryDisplayRendererClass(this.databaseManager);
    
    if (this.debug) {
      console.log('[ComponentFactory] HistoryDisplayRenderer created');
    }
    
    return display;
  }

  /**
   * Create all components in correct order
   */
  createAllComponents(): InteractiveComponents {
    try {
      // Create displays first (dependencies)
      const aggregateDisplay = this.createAggregateDisplay();
      const historyDisplay = this.createHistoryDisplay();
      
      // Create key input manager
      const keyInputManager = this.createKeyInputManager();
      
      // Create controllers
      const selectionManager = this.createSelectionManager(keyInputManager);
      const detailController = this.createDetailController(
        aggregateDisplay,
        historyDisplay,
        keyInputManager
      );

      if (this.debug) {
        console.log('[ComponentFactory] All components created successfully');
      }

      return {
        keyInputManager,
        selectionManager,
        detailController,
        aggregateDisplay,
        historyDisplay
      };
    } catch (error) {
      console.error('[ComponentFactory] Failed to create components:', error);
      throw error;
    }
  }

  /**
   * Validate created components
   */
  validateComponents(components: InteractiveComponents): boolean {
    const required: (keyof InteractiveComponents)[] = [
      'keyInputManager',
      'selectionManager', 
      'detailController',
      'aggregateDisplay',
      'historyDisplay'
    ];
    
    for (const component of required) {
      if (!components[component]) {
        console.error(`[ComponentFactory] Missing required component: ${component}`);
        return false;
      }
    }
    
    if (this.debug) {
      console.log('[ComponentFactory] All components validated successfully');
    }
    
    return true;
  }

  /**
   * Get factory configuration
   */
  getFactoryStatus(): object {
    return {
      hasDatabaseManager: !!this.databaseManager,
      hasDisplayRenderer: !!this.displayRenderer,
      hasCLIDisplay: !!this.cliDisplay,
      debug: this.debug
    };
  }
}