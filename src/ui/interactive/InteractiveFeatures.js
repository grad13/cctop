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
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
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
    
    if (this.debug) {
      console.log('[InteractiveFeatures] SelectionManager created');
    }
    
    // Setup component integration
    this.setupIntegration();
    
    if (this.debug) {
      console.log('[InteractiveFeatures] Initialized all components');
    }
  }

  /**
   * Initialize interactive features
   */
  async initialize() {
    if (this.debug) {
      console.log('[InteractiveFeatures] Starting initialization');
    }
    
    // Set up callbacks for legacy functionality
    this.setupLegacyCallbacks();
    
    // Initialize all components
    await this.keyInputManager.start();
    
    // Initial file list setup
    this.updateFileListFromEvents();
    
    if (this.debug) {
      console.log('[InteractiveFeatures] Interactive features initialized successfully');
    }
  }

  /**
   * Setup callbacks for existing CLI functionality
   */
  setupLegacyCallbacks() {
    if (!this.cliDisplay) {
      if (this.debug) {
        console.warn('[InteractiveFeatures] No CLIDisplay provided for legacy callbacks');
      }
      return;
    }

    // Hook into KeyInputManager for existing functionality
    const originalHandleDisplayAll = this.keyInputManager.handleDisplayAll;
    this.keyInputManager.handleDisplayAll = () => {
      if (this.debug) {
        console.log('[InteractiveFeatures] Display All mode requested');
      }
      if (this.cliDisplay.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('all');
      }
    };

    const originalHandleDisplayUnique = this.keyInputManager.handleDisplayUnique;
    this.keyInputManager.handleDisplayUnique = () => {
      if (this.debug) {
        console.log('[InteractiveFeatures] Display Unique mode requested');
      }
      if (this.cliDisplay.eventDisplayManager) {
        this.cliDisplay.eventDisplayManager.setDisplayMode('unique');
      }
    };

    const originalHandleEventFilter = this.keyInputManager.handleEventFilter;
    this.keyInputManager.handleEventFilter = (eventType) => {
      if (this.debug) {
        console.log(`[InteractiveFeatures] Event filter: ${eventType}`);
      }
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
    console.log('[InteractiveFeatures] 🔄 updateFileListFromEvents called');
    
    if (!this.cliDisplay || !this.cliDisplay.eventDisplayManager) {
      console.log('[InteractiveFeatures] ❌ No cliDisplay or eventDisplayManager');
      return;
    }

    try {
      const events = this.cliDisplay.eventDisplayManager.getDisplayedEvents();
      console.log(`[InteractiveFeatures] 📊 Got ${events.length} events from eventDisplayManager`);
      
      const fileList = events.map(event => ({
        name: event.file_name,
        path: event.directory,
        lastEvent: event.event_type,
        timestamp: event.timestamp
      }));

      console.log(`[InteractiveFeatures] 📋 Updating SelectionManager with ${fileList.length} files`);
      this.selectionManager.updateFileList(fileList);
      
      if (this.debug) {
        console.log(`[InteractiveFeatures] Updated file list: ${fileList.length} files`);
      }
    } catch (error) {
      console.error('[InteractiveFeatures] ❌ Error updating file list:', error);
      if (this.debug) {
        console.error('[InteractiveFeatures] Error updating file list:', error);
      }
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
      if (this.debug) {
        console.log('[InteractiveFeatures] 🔄 setupIntegration hook called');
      }
      
      const selectedFile = await originalConfirmSelection();
      
      if (this.debug) {
        console.log(`[InteractiveFeatures] Selection result: ${JSON.stringify(selectedFile)}`);
      }
      
      if (selectedFile) {
        if (this.debug) {
          console.log(`[InteractiveFeatures] 🚀 CALLING detailController.activateDetailMode with: ${JSON.stringify(selectedFile)}`);
        }
        await this.detailController.activateDetailMode(selectedFile);
      } else {
        if (this.debug) {
          console.log('[InteractiveFeatures] ❌ No selectedFile returned from confirmSelection()');
        }
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
    if (this.debug) {
      console.log(`[InteractiveFeatures] State changed to: ${newMode}`);
    }

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
   * Performance test method
   */
  async performanceTest() {
    if (!this.debug) {
      return;
    }

    console.log('[InteractiveFeatures] Running performance test...');
    
    const startTime = Date.now();
    
    // Test key processing speed
    for (let i = 0; i < 1000; i++) {
      this.keyInputManager.handleKeyInput('a');
    }
    
    const keyProcessingTime = Date.now() - startTime;
    
    // Test display rendering speed
    const renderStartTime = Date.now();
    
    if (this.aggregateDisplay && this.historyDisplay) {
      try {
        await this.aggregateDisplay.initialize('/test/file.txt');
        await this.historyDisplay.initialize('/test/file.txt');
        
        for (let i = 0; i < 100; i++) {
          this.aggregateDisplay.render();
          this.historyDisplay.render();
        }
      } catch (error) {
        // Expected for test file
      }
    }
    
    const renderTime = Date.now() - renderStartTime;
    
    console.log(`[InteractiveFeatures] Performance test results:`);
    console.log(`  Key processing: ${keyProcessingTime}ms for 1000 keys`);
    console.log(`  Display rendering: ${renderTime}ms for 100 renders`);
    
    // Verify performance requirements
    const keyProcessingPerMs = 1000 / keyProcessingTime;
    const renderPerMs = 100 / renderTime;
    
    if (keyProcessingPerMs < 10) { // Should process at least 10 keys per ms
      console.warn(`[InteractiveFeatures] Key processing slower than expected: ${keyProcessingPerMs.toFixed(2)} keys/ms`);
    }
    
    if (renderPerMs < 1) { // Should render at least 1 frame per ms
      console.warn(`[InteractiveFeatures] Rendering slower than expected: ${renderPerMs.toFixed(2)} renders/ms`);
    }
  }

  /**
   * Cleanup and destroy all components
   */
  destroy() {
    if (this.debug) {
      console.log('[InteractiveFeatures] Destroying all components...');
    }

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
    
    if (this.debug) {
      console.log('[InteractiveFeatures] All components destroyed');
    }
  }
}

module.exports = InteractiveFeatures;