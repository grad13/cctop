/**
 * Render Controller (Single Responsibility: Screen rendering control)
 * Extracted from cli-display.js for better maintainability
 * FUNC-207: Integrated with ColorManager for customizable colors
 */

import chalk = require('chalk');
import { padEndWithWidth } from '../../utils/display-width';
import BufferedRenderer = require('../../utils/buffered-renderer');
import FilterStatusRenderer = require('../filter-status-renderer');
import ColorManager = require('../../color/ColorManager');
import {
  RenderControllerConfig,
  RenderSelectionState,
  WidthConfig,
  EventDisplayManager,
  EventFormatter,
  LayoutManager,
  FilterManager,
  StatusDisplay,
  FilterStates
} from '../../types/common';

class RenderController {
  private isRunning: boolean = false;
  private maxLines: number;
  private isDetailModeActive: boolean = false; // FUNC-401: Track detail mode to prevent interference
  private selectionState: RenderSelectionState;
  private renderer: any; // BufferedRenderer instance
  private colorManager: any; // ColorManager instance
  
  // Dependencies (set externally)
  private eventDisplayManager: EventDisplayManager | null = null;
  private eventFormatter: EventFormatter | null = null;
  private layoutManager: LayoutManager | null = null;
  private filterManager: FilterManager | null = null;
  private statusDisplay: StatusDisplay | null = null;

  constructor(config: RenderControllerConfig = {}) {
    this.maxLines = config.maxEvents || 20;
    
    // FUNC-400: Selection state
    this.selectionState = {
      isSelecting: false,
      selectedIndex: -1,
      selectionRenderer: null
    };
    
    // Initialize BufferedRenderer
    this.renderer = new BufferedRenderer({
      renderInterval: 16, // 60fps limit
      clearOnRender: true
    });
    
    // FUNC-207: Initialize ColorManager
    this.colorManager = new ColorManager(config.configPath || '.cctop');
  }

  /**
   * Set dependencies
   */
  setEventDisplayManager(eventDisplayManager: EventDisplayManager): void {
    this.eventDisplayManager = eventDisplayManager;
  }

  setEventFormatter(eventFormatter: EventFormatter): void {
    this.eventFormatter = eventFormatter;
  }

  setLayoutManager(layoutManager: LayoutManager): void {
    this.layoutManager = layoutManager;
    
    // Register for resize events
    this.layoutManager.onResize((widthConfig: WidthConfig) => {
      if (this.eventFormatter) {
        this.eventFormatter.updateWidthConfig(widthConfig);
      }
      this.handleResize();
    });
  }

  setFilterManager(filterManager: FilterManager): void {
    this.filterManager = filterManager;
  }

  setStatusDisplay(statusDisplay: StatusDisplay): void {
    this.statusDisplay = statusDisplay;
  }

  /**
   * Start rendering
   */
  start(): void {
    this.isRunning = true;
  }

  /**
   * Stop rendering
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main render method (FUNC-018: Double buffer rendering)
   */
  render(): void {
    if (!this.isRunning) {
      return;
    }
    
    // FUNC-401: Do not render if detail mode is active (but allow selecting mode)
    if (this.isDetailModeActive) {
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
    
    // Double buffer rendering
    // FUNC-401: Use immediate render during detail mode to prevent overwrites
    if (this.isDetailModeActive) {
      this.renderer.render(); // Direct render, no delay
    } else {
      this.renderer.renderDebounced(); // Normal delayed rendering
    }
  }

  /**
   * Build header section
   */
  private buildHeader(): void {
    if (!this.layoutManager) {
      console.warn('[RenderController] LayoutManager not set');
      return;
    }

    const widthConfig = this.layoutManager.getWidthConfig();
    const directoryHeaderWidth = widthConfig.directory;
    const directoryHeader = padEndWithWidth('Directory', directoryHeaderWidth);
    const header = `Event Timestamp       Elapsed  File Name                    Event    Lines Blocks ${directoryHeader}`;
    const separator = '─'.repeat(widthConfig.terminal || 97);
    
    // FUNC-207: Apply theme colors to header
    const coloredHeader = this.colorManager.colorize(header, 'table.column_headers');
    const coloredSeparator = this.colorManager.colorize(separator, 'status_bar.separator');
    
    this.renderer.addLine(coloredHeader);
    this.renderer.addLine(coloredSeparator);
  }

  /**
   * Set selection state (FUNC-400 integration)
   */
  setSelectionState(state: Partial<RenderSelectionState>): void {
    this.selectionState = {
      ...this.selectionState,
      ...state
    };
  }

  /**
   * Build events list section
   */
  private buildEvents(): void {
    if (!this.eventDisplayManager || !this.eventFormatter) {
      console.warn('[RenderController] EventDisplayManager or EventFormatter not set');
      return;
    }

    const eventsToShow = this.eventDisplayManager.getEventsToDisplay();
    
    for (let i = 0; i < Math.min(eventsToShow.length, this.maxLines); i++) {
      const event = eventsToShow[i];
      let eventLine = this.eventFormatter.formatEventLine(event);
      
      // FUNC-400: Apply selection styling if this line is selected
      if (this.selectionState.isSelecting && 
          this.selectionState.selectedIndex === i && 
          this.selectionState.selectionRenderer) {
        eventLine = this.selectionState.selectionRenderer.renderLine(eventLine, true);
      }
      
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
  private buildFooter(): void {
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
      const filterStates = (this.filterManager as any).getFilterStates() as FilterStates;
      const filterLine = (FilterStatusRenderer as any).renderFilterLine(filterStates, widthConfig.terminal, this.colorManager.configPath);
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
  forceRender(): void {
    this.render();
  }

  /**
   * Handle terminal resize
   */
  private handleResize(): void {
    if (this.renderer && this.isRunning) {
      this.renderer.reset();
      this.render(); // Redraw immediately
    }
  }

  /**
   * Update display immediately
   */
  updateDisplay(): void {
    if (this.isRunning) {
      this.render();
    }
  }

  /**
   * Reset renderer buffer
   */
  reset(): void {
    if (this.renderer) {
      this.renderer.reset();
    }
  }

  /**
   * Get renderer statistics
   */
  getStats(): any {
    return this.renderer ? this.renderer.getStats() : {};
  }

  /**
   * Set max lines for events display
   */
  setMaxLines(maxLines: number): void {
    this.maxLines = maxLines;
  }

  /**
   * FUNC-401: Set detail mode state to prevent main view interference
   */
  setDetailModeActive(isActive: boolean): void {
    this.isDetailModeActive = isActive;
    
    // Cancel any pending renders when entering detail mode
    if (isActive && this.renderer) {
      this.renderer.cancelPendingRender();
    }
  }

  /**
   * FUNC-401: Check if detail mode is active
   */
  isDetailMode(): boolean {
    return this.isDetailModeActive;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.isRunning = false;
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
  }
}

export = RenderController;