/**
 * FUNC-401: Detailed Inspection Mode
 * Unified control of FUNC-402 (Aggregate Display) and FUNC-403 (History Display)
 */

const AggregateDisplay = require('./aggregate-display');
const HistoryDisplay = require('./history-display');

class DetailInspector {
  constructor(databaseManager, configPath = '.cctop') {
    this.db = databaseManager;
    this.configPath = configPath;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Initialize sub-modules
    this.aggregateDisplay = new AggregateDisplay(databaseManager, configPath);
    this.historyDisplay = new HistoryDisplay(databaseManager, configPath);
    
    // State management
    this.isActive = false;
    this.currentFileId = null;
    this.currentFileName = null;
    this.terminalWidth = process.stdout.columns || 76;
    this.terminalHeight = process.stdout.rows || 24;
    
    // Callbacks for external integration
    this.onExit = null;
    this.onUpdate = null;
    
    if (this.debug) {
      console.log('[DetailInspector] Initialized');
    }
  }

  /**
   * Enter detail inspection mode for a file
   */
  async enterDetailMode(fileId, fileName = null) {
    this.isActive = true;
    this.currentFileId = fileId;
    this.currentFileName = fileName;
    
    try {
      // Load data for both modules
      await this.loadFileData();
      
      // Render initial display
      await this.renderFullDisplay();
      
      if (this.debug) {
        console.log(`[DetailInspector] Entered detail mode for file ID: ${fileId}`);
      }
      
      return true;
      
    } catch (error) {
      if (this.debug) {
        console.error('[DetailInspector] Error entering detail mode:', error);
      }
      this.isActive = false;
      return false;
    }
  }

  /**
   * Exit detail inspection mode
   */
  async exitDetailMode() {
    this.isActive = false;
    this.currentFileId = null;
    this.currentFileName = null;
    
    // Reset sub-modules
    this.historyDisplay.reset();
    
    if (this.debug) {
      console.log('[DetailInspector] Exited detail mode');
    }
    
    // Notify exit callback
    if (this.onExit) {
      this.onExit();
    }
  }

  /**
   * Load data for current file
   */
  async loadFileData() {
    if (!this.currentFileId) {
      throw new Error('No file ID set for detail inspection');
    }
    
    // Load history data (aggregate data is loaded on-demand during rendering)
    await this.historyDisplay.loadHistoryData(this.currentFileId);
  }

  /**
   * Handle key input in detail mode
   */
  async handleKeyInput(key) {
    if (!this.isActive) {
      return false;
    }

    let handled = true;
    let needsRedraw = false;

    switch (key) {
      case 'Escape':
      case 'q':
        await this.exitDetailMode();
        break;
        
      case 'ArrowUp':
        needsRedraw = this.historyDisplay.moveFocus('up');
        break;
        
      case 'ArrowDown':
        needsRedraw = this.historyDisplay.moveFocus('down');
        break;
        
      case 'PageUp':
        if (this.historyDisplay.hasPrevPage()) {
          await this.historyDisplay.navigatePage('prev', this.currentFileId);
          needsRedraw = true;
        }
        break;
        
      case 'PageDown':
        if (this.historyDisplay.hasNextPage()) {
          await this.historyDisplay.navigatePage('next', this.currentFileId);
          needsRedraw = true;
        }
        break;
        
      default:
        handled = false;
        break;
    }

    // Redraw if needed
    if (needsRedraw) {
      await this.renderFullDisplay();
    }

    if (this.debug && handled) {
      console.log(`[DetailInspector] Handled key: ${key}`);
    }

    return handled;
  }

  /**
   * Render complete detail display (aggregate + history)
   */
  async renderFullDisplay() {
    if (!this.isActive || !this.currentFileId) {
      return;
    }

    try {
      // Clear screen
      process.stdout.write('\x1b[2J\x1b[H');
      
      // Render aggregate display (upper section)
      const aggregateOutput = await this.aggregateDisplay.renderForFile(
        this.currentFileId, 
        76
      );
      
      // Render history display (lower section)
      const historyOutput = this.historyDisplay.renderHistoryDisplay(76);
      
      // Combine and output
      const fullDisplay = aggregateOutput + '\n' + historyOutput;
      process.stdout.write(fullDisplay);
      
      // Notify update callback
      if (this.onUpdate) {
        this.onUpdate({
          fileId: this.currentFileId,
          fileName: this.currentFileName,
          aggregateData: await this.aggregateDisplay.getSummaryData(this.currentFileId),
          historyInfo: this.historyDisplay.getPaginationInfo(),
          focusedItem: this.historyDisplay.getFocusedItemDetails()
        });
      }
      
    } catch (error) {
      if (this.debug) {
        console.error('[DetailInspector] Error rendering display:', error);
      }
    }
  }

  /**
   * Update terminal size
   */
  updateTerminalSize(width, height) {
    this.terminalWidth = width;
    this.terminalHeight = height;
    
    if (this.isActive) {
      // Trigger re-render if active
      this.renderFullDisplay();
    }
  }

  /**
   * Get current inspection state
   */
  getInspectionState() {
    return {
      isActive: this.isActive,
      fileId: this.currentFileId,
      fileName: this.currentFileName,
      historyPagination: this.historyDisplay.getPaginationInfo(),
      focusedItem: this.historyDisplay.getFocusedItemDetails()
    };
  }

  /**
   * Refresh data and display
   */
  async refresh() {
    if (!this.isActive || !this.currentFileId) {
      return;
    }

    await this.loadFileData();
    await this.renderFullDisplay();
    
    if (this.debug) {
      console.log('[DetailInspector] Refreshed data and display');
    }
  }

  /**
   * Set callback functions
   */
  setCallbacks({ onExit, onUpdate }) {
    this.onExit = onExit;
    this.onUpdate = onUpdate;
  }

  /**
   * Get file summary for external use
   */
  async getFileSummary() {
    if (!this.currentFileId) {
      return null;
    }

    return await this.aggregateDisplay.getSummaryData(this.currentFileId);
  }

  /**
   * Get current focused history item
   */
  getFocusedHistoryItem() {
    return this.historyDisplay.getFocusedItemDetails();
  }

  /**
   * Navigate to specific history item
   */
  async navigateToHistoryItem(index) {
    if (!this.isActive) {
      return false;
    }

    // Calculate which page the item is on
    const targetPage = Math.floor(index / this.historyDisplay.itemsPerPage);
    const targetIndexOnPage = index % this.historyDisplay.itemsPerPage;

    // Navigate to the correct page if needed
    if (targetPage !== this.historyDisplay.currentPage) {
      this.historyDisplay.currentPage = targetPage;
      await this.historyDisplay.loadHistoryData(this.currentFileId);
    }

    // Set focus to the target item
    this.historyDisplay.focusIndex = targetIndexOnPage;
    
    // Re-render
    await this.renderFullDisplay();
    
    return true;
  }

  /**
   * Check if currently active
   */
  isActiveMode() {
    return this.isActive;
  }

  /**
   * Get display statistics
   */
  getDisplayStats() {
    if (!this.isActive) {
      return null;
    }

    return {
      fileId: this.currentFileId,
      fileName: this.currentFileName,
      totalHistoryItems: this.historyDisplay.totalItems,
      currentHistoryPage: this.historyDisplay.currentPage + 1,
      totalHistoryPages: Math.ceil(this.historyDisplay.totalItems / this.historyDisplay.itemsPerPage),
      currentFocusIndex: this.historyDisplay.focusIndex,
      terminalSize: {
        width: this.terminalWidth,
        height: this.terminalHeight
      }
    };
  }

  /**
   * Integration methods for FUNC-300 KeyInputManager
   */
  
  // Called by KeyInputManager when entering detail mode
  async onEnterDetailMode(fileId, fileName) {
    return await this.enterDetailMode(fileId, fileName);
  }

  // Called by KeyInputManager for detail mode key handling
  async onDetailKeyInput(key) {
    return await this.handleKeyInput(key);
  }

  // Called by KeyInputManager when exiting detail mode
  async onExitDetailMode() {
    await this.exitDetailMode();
  }
}

module.exports = DetailInspector;