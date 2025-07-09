/**
 * UI Layout Manager
 * Manages UI components and layout structure
 */

import * as blessed from 'blessed';
import { UIState, EventType } from './UIState';
import { KeywordSearchManager } from '../search';

export class UILayoutManager {
  private screen: blessed.Widgets.Screen;
  private uiState: UIState;
  
  // UI Components
  private headerPanel: any;
  private statusBar: any;
  private keyGuideBar: any;
  private dynamicControlBar: any;
  private separatorLine: any;
  private eventArea: any;
  private eventList: any;

  constructor(screen: blessed.Widgets.Screen, uiState: UIState) {
    this.screen = screen;
    this.uiState = uiState;
  }

  setupFramelessLayout(): void {
    // FUNC-202: Header Area (Line 1-2)
    this.headerPanel = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.buildHeaderContent(),
      style: {
        fg: 'white',
        bg: 'transparent',
        bold: true
      },
      tags: true
    });

    // FUNC-202: Event Rows Area (Main content)
    this.eventArea = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-7',  // Adjusted for separator line
      style: {
        fg: 'white',
        bg: 'transparent'
      }
    });

    // Use box instead of list to support colors
    this.eventList = blessed.box({
      parent: this.eventArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      keys: false,  // Disable key handling on the box
      scrollable: false,  // Disable scrolling to prevent auto-wrap
      alwaysScroll: false,
      style: {
        fg: 'white',
        bg: 'transparent'
      },
      tags: true,  // This WILL work with box
      mouse: false
    }) as any;

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

    // FUNC-202: Command Keys Area (Bottom-2, Bottom-1)
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

    // FUNC-202: Dynamic Control Area (Bottom)
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
    this.screen.append(this.eventArea);
    this.screen.append(this.separatorLine);
    this.screen.append(this.statusBar);
    this.screen.append(this.keyGuideBar);
    this.screen.append(this.dynamicControlBar);
  }

  buildHeaderContent(): string {
    // FUNC-202: Header Area format
    let header = `{bold}cctop v1.0.0.0 ${this.uiState.getDaemonStatus()}{/bold}\n`;
    header += `Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks    Size  Directory\n`;
    header += `${'─'.repeat(Number(this.screen.width) || 180)}`;  // Column header separator line
    return header;
  }

  buildCommandLine1(): string {
    const pauseText = this.uiState.isPausedState() ? 'Resume' : 'Pause';
    const displayMode = this.uiState.getDisplayMode();
    
    // Highlight currently selected mode with green color styling (same as Daemon status)
    const allText = displayMode === 'all' ? '{green-fg}[a] All{/green-fg}' : '[a] All';
    const uniqueText = displayMode === 'unique' ? '{green-fg}[u] Unique{/green-fg}' : '[u] Unique';
    
    return `[q] Exit  [space] ${pauseText}  [x] Refresh  ${allText}  ${uniqueText}`;
  }

  buildKeyGuideContent(): string {
    // FUNC-202: Command Keys Area (2nd line) - changes based on state
    const displayState = this.uiState.getDisplayState();
    
    switch (displayState) {
      case 'filter':
      case 'search':
        return '[Enter] Confirm Filter [ESC] Cancel Back [↑↓] Select an Event';
      
      case 'normal':
      case 'paused':
      default:
        return '[ESC] Reset All Filters [↑↓] Select an Event';
    }
  }

  buildDynamicControlContent(): string {
    // FUNC-202: Dynamic Control Area - changes based on state
    const displayState = this.uiState.getDisplayState();
    const searchText = this.uiState.getSearchText();
    
    switch (displayState) {
      case 'filter':
        return this.buildFilterModeDisplay();
      
      case 'search':
        const maxSearchLength = 40;
        const paddingLength = Math.max(0, maxSearchLength - searchText.length);
        const padding = '_'.repeat(paddingLength);
        return `{bold}{yellow-fg}Search: [${searchText}${padding}] [Shift+Enter] Search DB{/yellow-fg}{/bold}`;
      
      case 'normal':
      case 'paused':
      default:
        // Check if keyword filter is active
        if (searchText) {
          const normalizedText = KeywordSearchManager.getDisplayText(searchText);
          return `{bold}{yellow-fg}[f] Event-Type Filter  [/] Keyword Filter (current keyword:"${normalizedText}"){/yellow-fg}{/bold}`;
        }
        return '{bold}{yellow-fg}[f] Event-Type Filter  [/] Keyword Filter{/yellow-fg}{/bold}';
    }
  }

  buildFilterModeDisplay(): string {
    const FILTER_KEY_MAP: { [key: string]: EventType } = {
      'f': 'find',
      'c': 'create',
      'm': 'modify',
      'd': 'delete',
      'v': 'move',
      'r': 'restore'
    };

    const filterItems = Object.entries(FILTER_KEY_MAP).map(([key, type]) => {
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const isEnabled = this.uiState.hasEventFilter(type);
      
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
    
    // FUNC-202: Update key guide bar with state-dependent content
    this.keyGuideBar.setContent(this.buildKeyGuideContent());
    
    // Update header with filter/search status
    this.headerPanel.setContent(this.buildHeaderContent());
    
    // Update separator line width
    this.separatorLine.setContent('─'.repeat(Number(this.screen.width) || 80));
  }

  updateDisplay(items: string[]): void {
    // Since we're using box instead of list, join items with newlines
    const newContent = items.join('\n');
    const currentContent = this.eventList.getContent();
    
    // Strip ANSI/blessed tags for comparison
    const stripTags = (str: string) => str.replace(/\{[^}]+\}/g, '');
    const newContentStripped = stripTags(newContent);
    const currentContentStripped = stripTags(currentContent);
    
    // Only update and render if content actually changed (ignoring color tags)
    if (newContentStripped !== currentContentStripped) {
      this.eventList.setContent(newContent);
      this.updateStatusBar();
      this.screen.render();
    }
  }

  // Getters for components
  getEventList(): any {
    return this.eventList;
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