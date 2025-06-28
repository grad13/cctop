/**
 * Interactive Features Integration (FUNC-400/401/402/403)
 * Central coordinator for all interactive functionality
 */

const KeyInputManager = require('../../interactive/key-input-manager');
const SelectionManager = require('./SelectionManager');
const DetailInspectionController = require('./DetailInspectionController');
const AggregateDisplayRenderer = require('./AggregateDisplayRenderer');
const HistoryDisplayRenderer = require('./HistoryDisplayRenderer');

class InteractiveFeatures {
  constructor(databaseManager, displayRenderer = null, cliDisplay = null) {
    this.databaseManager = databaseManager;
    this.displayRenderer = displayRenderer;
    this.cliDisplay = cliDisplay;
    
    // Initialize components
    this.keyInputManager = new KeyInputManager();
    this.aggregateDisplay = new AggregateDisplayRenderer(this.databaseManager);
    this.historyDisplay = new HistoryDisplayRenderer(this.databaseManager);
    this.detailController = new DetailInspectionController(
      this.aggregateDisplay, 
      this.historyDisplay, 
      this.keyInputManager
    );
    this.selectionManager = new SelectionManager(
      this.keyInputManager, 
      this.displayRenderer
    );
    
    // Setup component integration
    this.setupIntegration();
  }

  /**
   * Initialize interactive features
   */
  async initialize() {
    // Set up callbacks for legacy functionality
    this.setupLegacyCallbacks();
    
    // Initialize all components
    await this.keyInputManager.start();
    
    // Initial file list setup
    this.updateFileListFromEvents();
  }

  /**
   * Setup callbacks for existing CLI functionality
   */
  setupLegacyCallbacks() {
    if (!this.cliDisplay) {
      return;
    }

    // Hook into KeyInputManager for existing functionality
    const originalHandleDisplayAll = this.keyInputManager.handleDisplayAll;
    this.keyInputManager.handleDisplayAll = () => {
      if (this.cliDisplay.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('all');
      }
    };

    const originalHandleDisplayUnique = this.keyInputManager.handleDisplayUnique;
    this.keyInputManager.handleDisplayUnique = () => {
      if (this.cliDisplay.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('unique');
      }
    };

    const originalHandleEventFilter = this.keyInputManager.handleEventFilter;
    this.keyInputManager.handleEventFilter = (eventType) => {
      if (this.cliDisplay.filterManager) {
        this.cliDisplay.filterManager.toggleEventFilter(eventType);
      }
    };

    // Update file list for selection when events change
    if (this.cliDisplay.eventDisplayManager) {
      const originalAddEvents = this.cliDisplay.eventDisplayManager.addEvents;
      this.cliDisplay.eventDisplayManager.addEvents = (events) => {
        originalAddEvents.call(this.cliDisplay.eventDisplayManager, events);
        this.updateFileListFromEvents();
      };
    }
  }

  /**
   * Update file list for selection manager from current events
   */
  updateFileListFromEvents() {
    if (!this.cliDisplay || !this.cliDisplay.eventDisplayManager) {
      return;
    }

    try {
      const events = this.cliDisplay.eventDisplayManager.getDisplayedEvents();
      const fileList = events.map(event => ({
        name: event.file_name,
        path: event.directory,
        lastEvent: event.event_type,
        timestamp: event.timestamp
      }));

this.selectionManager.updateFileList(fileList);
    } catch (error) {
      console.error('[InteractiveFeatures] ❌ Error updating file list:', error);
    }
  }

  /**
   * Setup integration between components
   */
  setupIntegration() {
    // Set selectionManager reference in keyInputManager
    this.keyInputManager.selectionManager = this.selectionManager;
    
    // Set renderController reference in keyInputManager if available
    if (this.displayRenderer) {
      this.keyInputManager.renderController = this.displayRenderer;
    }
    
    // Hook selection confirmation to detail mode activation
    const originalConfirmSelection = this.selectionManager.confirmSelection.bind(this.selectionManager);
    this.selectionManager.confirmSelection = async () => {
      const selectedFile = await originalConfirmSelection();
      
      if (selectedFile) {
        await this.detailController.activateDetailMode(selectedFile);
      }
      return selectedFile;
    };

    // Hook key input manager state changes to update display
    this.keyInputManager.onStateChange = (newMode) => {
      this.handleStateChange(newMode);
    };
  }

  /**
   * Handle state changes across the system
   */
  handleStateChange(newMode) {
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
  updateFileList(fileList) {
    if (this.selectionManager) {
      this.selectionManager.updateFileList(fileList);
    }
  }

  /**
   * Get current selection state
   */
  getSelectionState() {
    return this.selectionManager ? this.selectionManager.getSelectionState() : null;
  }

  /**
   * Check if detail mode is active
   */
  isDetailModeActive() {
    return this.detailController ? this.detailController.isActive() : false;
  }

  /**
   * Check if selection mode is active
   */
  isSelectionModeActive() {
    return this.selectionManager ? this.selectionManager.isSelecting() : false;
  }

  /**
   * Get current mode from key input manager
   */
  getCurrentMode() {
    return this.keyInputManager ? this.keyInputManager.currentMode : 'waiting';
  }

  /**
   * Force exit to waiting mode
   */
  async exitToWaitingMode() {
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
  async refresh() {
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
  getComponents() {
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
  setDisplayRenderer(displayRenderer) {
    this.displayRenderer = displayRenderer;
    
    // Update selection manager
    if (this.selectionManager) {
      this.selectionManager.displayRenderer = displayRenderer;
    }
    
    // Update key input manager
    if (this.keyInputManager) {
      this.keyInputManager.renderController = displayRenderer;
    }
    
    // FUNC-401: Pass RenderController to DetailInspectionController
    if (displayRenderer && this.detailController) {
      this.detailController.setRenderController(displayRenderer);
    }
  }


  /**
   * Cleanup and destroy all components
   */
  destroy() {
    // Destroy in reverse order of creation
    if (this.selectionManager) {
      this.selectionManager.destroy();
      this.selectionManager = null;
    }
    
    if (this.detailController) {
      this.detailController.destroy();
      this.detailController = null;
    }
    
    if (this.historyDisplay) {
      this.historyDisplay.cleanup();
      this.historyDisplay = null;
    }
    
    if (this.aggregateDisplay) {
      this.aggregateDisplay.cleanup();
      this.aggregateDisplay = null;
    }
    
    if (this.keyInputManager) {
      this.keyInputManager.destroy();
      this.keyInputManager = null;
    }
    
    this.databaseManager = null;
    this.displayRenderer = null;
  }
}

module.exports = InteractiveFeatures;