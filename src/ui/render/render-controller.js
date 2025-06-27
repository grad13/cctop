/**
 * Render Controller (Single Responsibility: Screen rendering control)
 * Extracted from cli-display.js for better maintainability
 * FUNC-207: Integrated with ColorManager for customizable colors
 */

const chalk = require('chalk');
const { padEndWithWidth } = require('../../utils/display-width');
const BufferedRenderer = require('../../utils/buffered-renderer');
const FilterStatusRenderer = require('../filter-status-renderer');
const ColorManager = require('../../color/ColorManager');

class RenderController {
  constructor(config = {}) {
    this.isRunning = false;
    this.maxLines = config.maxEvents || 20;
    
    // Initialize BufferedRenderer
    this.renderer = new BufferedRenderer({
      renderInterval: 16, // 60fps limit
      clearOnRender: true
    });
    
    // FUNC-207: Initialize ColorManager
    this.colorManager = new ColorManager(config.configPath || '.cctop');
    
    // Dependencies (set externally)
    this.eventDisplayManager = null;
    this.eventFormatter = null;
    this.layoutManager = null;
    this.filterManager = null;
    this.statusDisplay = null;
  }

  /**
   * Set dependencies
   */
  setEventDisplayManager(eventDisplayManager) {
    this.eventDisplayManager = eventDisplayManager;
  }

  setEventFormatter(eventFormatter) {
    this.eventFormatter = eventFormatter;
  }

  setLayoutManager(layoutManager) {
    this.layoutManager = layoutManager;
    
    // Register for resize events
    this.layoutManager.onResize((widthConfig) => {
      if (this.eventFormatter) {
        this.eventFormatter.updateWidthConfig(widthConfig);
      }
      this.handleResize();
    });
  }

  setFilterManager(filterManager) {
    this.filterManager = filterManager;
  }

  setStatusDisplay(statusDisplay) {
    this.statusDisplay = statusDisplay;
  }

  /**
   * Start rendering
   */
  start() {
    this.isRunning = true;
  }

  /**
   * Stop rendering
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * Main render method (FUNC-018: Double buffer rendering)
   */
  render() {
    if (!this.isRunning) {
      return;
    }
    
    // Build buffer for BufferedRenderer
    this.renderer.clear();
    
    // Add header
    this.buildHeader();
    
    // Add events list
    this.buildEvents();
    
    // Add footer
    this.buildFooter();
    
    // Double buffer rendering (delayed rendering)
    this.renderer.renderDebounced();
  }

  /**
   * Build header section
   */
  buildHeader() {
    if (!this.layoutManager) {
      console.warn('[RenderController] LayoutManager not set');
      return;
    }

    const widthConfig = this.layoutManager.getWidthConfig();
    const directoryHeaderWidth = widthConfig.directory;
    const directoryHeader = padEndWithWidth('Directory', directoryHeaderWidth);
    const header = `Modified               Elapsed  File Name                    Event    Lines Blocks ${directoryHeader}`;
    const separator = '─'.repeat(widthConfig.terminal || 97);
    
    // FUNC-207: Apply theme colors to header
    const coloredHeader = this.colorManager.colorize(header, 'table.column_headers');
    const coloredSeparator = this.colorManager.colorize(separator, 'status_bar.separator');
    
    this.renderer.addLine(coloredHeader);
    this.renderer.addLine(coloredSeparator);
  }

  /**
   * Build events list section
   */
  buildEvents() {
    if (!this.eventDisplayManager || !this.eventFormatter) {
      console.warn('[RenderController] EventDisplayManager or EventFormatter not set');
      return;
    }

    const eventsToShow = this.eventDisplayManager.getEventsToDisplay();
    
    for (let i = 0; i < Math.min(eventsToShow.length, this.maxLines); i++) {
      const event = eventsToShow[i];
      const eventLine = this.eventFormatter.formatEventLine(event);
      this.renderer.addLine(eventLine);
    }
    
    // Fill with empty lines
    const remainingLines = this.maxLines - Math.min(eventsToShow.length, this.maxLines);
    for (let i = 0; i < remainingLines; i++) {
      this.renderer.addLine('');
    }
  }

  /**
   * Build footer section
   */
  buildFooter() {
    if (!this.eventDisplayManager || !this.layoutManager) {
      console.warn('[RenderController] Dependencies not set for footer');
      return;
    }

    const stats = this.eventDisplayManager.getStats();
    const widthConfig = this.layoutManager.getWidthConfig();
    
    const separator = '─'.repeat(widthConfig.terminal || 97);
    // DEBUG: Log render values
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log(`[RenderController] statusLine: displayMode=${stats.displayMode}, totalEvents=${stats.totalEvents}, uniqueFiles=${stats.uniqueFiles}`);
    }
    
    const statusLine = `${stats.modeIndicator}  ${stats.displayMode === 'all' ? stats.totalEvents : stats.uniqueFiles} ${stats.displayMode === 'all' ? 'events' : 'files'}`;
    const helpLine = '[a] All  [u] Unique  [q] Exit';
    
    // FUNC-207: Apply theme colors to footer elements
    const coloredSeparator = this.colorManager.colorize(separator, 'status_bar.separator');
    const coloredStatusLine = this.colorManager.colorize(statusLine, 'status_bar.label');
    const coloredHelpLine = this.colorManager.colorize(helpLine, 'general_keys.label_active');
    
    this.renderer.addLine(coloredSeparator);
    this.renderer.addLine(coloredStatusLine);
    this.renderer.addLine(coloredHelpLine);
    
    // Filter line (FUNC-020)
    if (this.filterManager) {
      const filterStates = this.filterManager.getFilterStates();
      const filterLine = FilterStatusRenderer.renderFilterLine(filterStates, widthConfig.terminal, this.colorManager.configPath);
      this.renderer.addLine(filterLine);
    }
    
    // FUNC-205: Status display area
    if (this.statusDisplay) {
      const statusLines = this.statusDisplay.getDisplayLines();
      statusLines.forEach(line => {
        this.renderer.addLine(line);
      });
    }
  }

  /**
   * Force immediate render
   */
  forceRender() {
    this.render();
  }

  /**
   * Handle terminal resize
   */
  handleResize() {
    if (this.renderer && this.isRunning) {
      this.renderer.reset();
      this.render(); // Redraw immediately
    }
  }

  /**
   * Update display immediately
   */
  updateDisplay() {
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Reset renderer buffer
   */
  reset() {
    if (this.renderer) {
      this.renderer.reset();
    }
  }

  /**
   * Get renderer statistics
   */
  getStats() {
    return this.renderer ? this.renderer.getStats() : {};
  }

  /**
   * Set max lines for events display
   */
  setMaxLines(maxLines) {
    this.maxLines = maxLines;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.isRunning = false;
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }
}

module.exports = RenderController;