/**
 * UI Layout Manager
 * Manages UI components and layout structure
 */

import * as blessed from 'blessed';
import { UIState } from './UIState';
import { KeywordSearchManager } from '../search';
import { EventTable } from './components/EventTable';
import { ViewConfig } from '../config/ViewConfig';
import { EventTableViewport } from './interfaces/EventTableViewport';

export class UILayoutManager {
  private screen: blessed.Widgets.Screen;
  private uiState: UIState;
  private viewConfig?: ViewConfig;
  
  // UI Components
  private headerPanel: any;
  private headerSeparator: any;
  private statusBar: any;
  private keyGuideBar: any;
  private dynamicControlBar: any;
  private separatorLine: any;
  private eventArea: any;
  private eventTable!: EventTableViewport;

  constructor(screen: blessed.Widgets.Screen, uiState: UIState, viewConfig?: ViewConfig) {
    this.screen = screen;
    this.uiState = uiState;
    this.viewConfig = viewConfig;
  }

  setupFramelessLayout(): void {
    // Event Rows Area (Main content) - Create this first so we can create EventTable
    this.eventArea = blessed.box({
      top: 3,  // Start after header (2 lines) + separator (1 line)
      left: 0,
      width: '100%',
      height: '100%-7',  // Adjusted for header and control areas
      style: {
        fg: 'white',
        bg: 'transparent'
      }
    });

    // Use EventTable component - Create before header so getColumnHeader() is available
    this.eventTable = new EventTable({
      parent: this.eventArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      viewConfig: this.viewConfig,
      style: {
        fg: 'white',
        bg: 'transparent'
      }
    }, this.screen.width as number || 180);

    // Header Area (Line 1-2)
    this.headerPanel = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 2,
      content: this.buildHeaderContent(),
      style: {
        fg: 'white',
        bg: 'transparent'
      },
      tags: true
    });
    
    // Header separator line
    this.headerSeparator = blessed.box({
      top: 2,
      left: 0,
      width: '100%',
      height: 1,
      content: '─'.repeat(180),
      style: {
        fg: 'white',
        bg: 'transparent'
      }
    });

    // Separator line between event stream and control area
    this.separatorLine = blessed.box({
      bottom: 3,
      left: 0,
      width: '100%',
      height: 1,
      content: '',  // Will be set dynamically
      style: {
        fg: 'white',
        bg: 'transparent'
      }
    });

    // Command Keys Area (Bottom-2, Bottom-1)
    this.statusBar = blessed.box({
      bottom: 2,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildCommandLine1(),
      style: {
        fg: 'white',
        bg: 'transparent',
        bold: true
      },
      tags: true
    });

    this.keyGuideBar = blessed.box({
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      content: '[↑↓] Select an event',
      style: {
        fg: 'white',
        bg: 'transparent',
        bold: true
      },
      tags: true
    });

    // Dynamic Control Area (Bottom)
    this.dynamicControlBar = blessed.text({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildDynamicControlContent(),
      style: {
        bg: 'transparent',
        fg: 'white'
      },
      tags: true
    });

    // Append all components
    this.screen.append(this.headerPanel);
    this.screen.append(this.headerSeparator);
    this.screen.append(this.eventArea);
    this.screen.append(this.separatorLine);
    this.screen.append(this.statusBar);
    this.screen.append(this.keyGuideBar);
    this.screen.append(this.dynamicControlBar);
  }

  buildHeaderContent(): string {
    // Header Area format
    let header = `{bold}cctop v0.5.0.0 ${this.uiState.getDaemonStatus()}`;
    
    // Add keyword status if keyword is active
    const searchPattern = this.uiState.getSearchPattern();
    if (searchPattern) {
      const normalizedText = KeywordSearchManager.getDisplayText(searchPattern);
      header += ` │ Keyword: ${normalizedText}`;
    }
    
    header += `{/bold}\n`;
    header += this.eventTable.getColumnHeader();
    
    return header;
  }

  buildCommandLine1(): string {
    const pauseText = this.uiState.isPausedState() ? 'Resume' : 'Pause';
    const displayMode = this.uiState.getDisplayMode();
    const isSearchMode = this.uiState.getDisplayState() === 'keyword_filter';
    
    // In search mode, gray out all commands except selected All/Unique stays green
    if (isSearchMode) {
      const allText = displayMode === 'all' ? '{green-fg}[a] All{/green-fg}' : '{gray-fg}[a] All{/gray-fg}';
      const uniqueText = displayMode === 'unique' ? '{green-fg}[u] Unique{/green-fg}' : '{gray-fg}[u] Unique{/gray-fg}';
      
      return `{gray-fg}[q] Exit  [space] ${pauseText}  [x] Refresh{/gray-fg}  ${allText}  ${uniqueText}`;
    }
    
    // Normal mode: regular display
    const allText = displayMode === 'all' ? '{green-fg}[a] All{/green-fg}' : '[a] All';
    const uniqueText = displayMode === 'unique' ? '{green-fg}[u] Unique{/green-fg}' : '[u] Unique';
    
    return `[q] Exit  [space] ${pauseText}  [x] Refresh  ${allText}  ${uniqueText}`;
  }

  buildKeyGuideContent(): string {
    // Command Keys Area (2nd line) - changes based on state
    const displayState = this.uiState.getDisplayState();
    
    switch (displayState) {
      case 'event_type_filter':
      case 'keyword_filter':
        return '[Enter] Confirm Filter [ESC] Cancel Back [↑↓] Select an Event';
      
      case 'stream_live':
      case 'stream_paused':
      default:
        return '[ESC] Reset All Filters [↑↓] Select an Event';
    }
  }

  /**
   * Update ViewConfig and propagate to EventTable
   */
  setViewConfig(newViewConfig: ViewConfig): void {
    this.viewConfig = newViewConfig;
    if (this.eventTable && typeof this.eventTable.setViewConfig === 'function') {
      this.eventTable.setViewConfig(newViewConfig);
    }
  }

  buildDynamicControlContent(): string {
    // Dynamic Control Area - changes based on state
    const displayState = this.uiState.getDisplayState();
    const searchPattern = this.uiState.getSearchPattern();
    
    switch (displayState) {
      case 'event_type_filter':
        return this.buildFilterModeDisplay();
      
      case 'keyword_filter':
        const normalizedSearchText = KeywordSearchManager.getDisplayText(searchPattern);
        const maxSearchLength = 40;
        const paddingLength = Math.max(0, maxSearchLength - normalizedSearchText.length);
        const padding = '_'.repeat(paddingLength);
        return `{bold}{yellow-fg}Keyword: [${normalizedSearchText}${padding}] [Shift+Enter] Search DB{/yellow-fg}{/bold}`;
      
      case 'stream_live':
      case 'stream_paused':
      default:
        // Always show the same message regardless of keyword status (keyword is shown in header)
        return '{bold}{yellow-fg}[f] Event-Type Filter  [/] Keyword Filter{/yellow-fg}{/bold}';
    }
  }

  buildFilterModeDisplay(): string {
    const FILTER_KEY_MAP: { [key: string]: string } = {
      'f': 'find',
      'c': 'create',
      'm': 'modify',
      'd': 'delete',
      'v': 'move',
      'r': 'restore'
    };

    const filterItems = Object.entries(FILTER_KEY_MAP).map(([key, type]) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const isEnabled = this.uiState.getEventTypeFilters().isEventTypeEnabled(type);
      
      if (isEnabled) {
        // Active filters: bold yellow
        return `{bold}{yellow-fg}[${key}] ${label}{/yellow-fg}{/bold}`;
      } else {
        // Inactive filters: bold gray (or use bright-black for better gray effect)
        return `{bold}{gray-fg}[${key}] ${label}{/gray-fg}{/bold}`;
      }
    });
    
    return filterItems.join(' ');
  }

  updateDynamicControl(): void {
    const content = this.buildDynamicControlContent();
    // Use parseTags to ensure tags are processed
    this.dynamicControlBar.setContent((blessed as any).parseTags(content));
    this.screen.render();
  }

  updateStatusBar(): void {
    // Update command line 1 with current pause state
    this.statusBar.setContent(this.buildCommandLine1());
    
    // Update key guide bar with state-dependent content
    this.keyGuideBar.setContent(this.buildKeyGuideContent());
    
    // Update header with filter/search status
    this.headerPanel.setContent(this.buildHeaderContent());
    
    // Update separator line width
    const terminalWidth = process.stdout.columns || 180;
    this.headerSeparator.setContent('─'.repeat(terminalWidth));
    this.separatorLine.setContent('─'.repeat(terminalWidth));
    
    // Render screen to ensure updates are visible
    this.screen.render();
  }

  updateDisplay(): void {
    // Calculate dynamic width and viewport height based on terminal size
    this.uiState.calculateDynamicWidth();
    
    // Update EventTable screen width if terminal resized
    this.eventTable.updateScreenWidth(this.screen.width as number || 180);
    
    // Get visible events and selected index from UIState
    const visibleEvents = this.uiState.getVisibleEvents();
    const absoluteSelectedIndex = this.uiState.getSelectedIndex();
    const viewportStart = this.uiState.getViewportStartIndex();
    
    // Calculate relative selected index within viewport
    const selectedIndex = absoluteSelectedIndex - viewportStart;
    
    // Update event table with optimized rendering (using interface)
    const hasMoreData = this.uiState.hasMoreDataToLoad();
    this.eventTable.updateContent(visibleEvents, selectedIndex, hasMoreData);
    
    // Force refresh to update elapsed times for existing rows
    this.eventTable.refresh();
    
    this.updateStatusBar();
    this.screen.render();
  }

  // Getters for components
  getEventList(): any {
    return this.eventTable.getBox();
  }

  getHeaderPanel(): any {
    return this.headerPanel;
  }

  getStatusBar(): any {
    return this.statusBar;
  }

  getDynamicControlBar(): any {
    return this.dynamicControlBar;
  }

  getSeparatorLine(): any {
    return this.separatorLine;
  }
}