/**
 * FUNC-202 Compliant Frameless UI Implementation
 * Single responsibility UI with state management
 * FUNC-200 East Asian Width support
 */

import * as blessed from 'blessed';
import stringWidth from 'string-width';
import { EventRow } from '../types/event-row';
import { DatabaseAdapter } from '../database/database-adapter';
import { CLIConfig } from '../config/cli-config';
import { ConfigLoader } from '../config/config-loader';

// FUNC-202 Display States
type DisplayState = 'normal' | 'filter' | 'search' | 'paused' | 'detail';

export interface UIFramelessConfigSimple {
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: 'all' | 'unique';
  config?: CLIConfig;
}

export class BlessedFramelessUISimple {
  private screen!: blessed.Widgets.Screen;
  private headerPanel: any;
  private statusBar: any;
  private keyGuideBar: any;
  private dynamicControlBar: any;
  
  // Event display area
  private eventArea: any;
  private eventList: any;
  
  // FUNC-204: Dynamic width config
  private directoryWidth: number = 20;
  
  // State management
  private displayState: DisplayState = 'normal';
  private isPaused: boolean = false;
  private displayMode: 'all' | 'unique' = 'all';
  private filterMode: boolean = false;
  private searchMode: boolean = false;
  private searchText: string = '';
  private eventFilters: Set<string> = new Set(['find', 'create', 'modify', 'delete', 'move', 'restore']);
  
  // Data
  private db: DatabaseAdapter;
  private cliConfig!: CLIConfig;
  private events: EventRow[] = [];
  private selectedIndex: number = -1;
  private refreshTimer?: NodeJS.Timeout;
  
  // Config
  private initConfig?: UIFramelessConfigSimple;

  constructor(db: DatabaseAdapter, config: UIFramelessConfigSimple = {}) {
    this.db = db;
    this.displayMode = config.displayMode || 'all';
    this.initConfig = config;
  }

  private async initializeConfig(config: UIFramelessConfigSimple): Promise<void> {
    if (config.config) {
      this.cliConfig = config.config;
    } else {
      const configLoader = new ConfigLoader();
      const mergedConfig = await configLoader.loadConfiguration();
      this.cliConfig = mergedConfig.cli;
    }
  }

  private initializeScreen(): void {
    // Suppress terminal compatibility warnings
    const originalStderr = process.stderr.write.bind(process.stderr);
    (process.stderr as any).write = function(chunk: any, encoding?: any, callback?: any): boolean {
      const str = chunk.toString();
      if (str.includes('Error on xterm') || str.includes('Setulc')) {
        return true;
      }
      return originalStderr(chunk, encoding, callback);
    };

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP v1.0.0 - FUNC-202 Compliant',
      fullUnicode: true,
      autoPadding: false,
      warnings: false,
      forceUnicode: true,
      dockBorders: false,
      ignoreDockContrast: true
    });
  }

  private setupFramelessLayout(): void {
    // FUNC-202: Header Area (Line 1-2)
    this.headerPanel = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.buildHeaderContent(),
      style: {
        fg: 'white',
        bg: 'black',
        bold: true
      },
      tags: true
    });

    // FUNC-202: Event Rows Area (Main content)
    this.eventArea = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-6',
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    this.eventList = blessed.list({
      parent: this.eventArea,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      keys: true,
      vi: true,
      scrollable: true,
      style: {
        fg: 'white',
        bg: 'black',
        selected: {
          fg: 'black',
          bg: 'cyan'
        }
      },
      tags: true
    });

    // FUNC-202: Command Keys Area (Bottom-2, Bottom-1)
    this.statusBar = blessed.box({
      bottom: 2,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildCommandLine1(),
      style: {
        fg: 'cyan',
        bg: 'black'
      },
      tags: true
    });

    this.keyGuideBar = blessed.box({
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      content: '[↑↓] Select an event  [Enter] Show Details',
      style: {
        fg: 'cyan',
        bg: 'black'
      },
      tags: true
    });

    // FUNC-202: Dynamic Control Area (Bottom)
    this.dynamicControlBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildDynamicControlContent(),
      style: {
        fg: 'yellow',
        bg: 'black'
      },
      tags: true
    });

    // Append all components
    this.screen.append(this.headerPanel);
    this.screen.append(this.eventArea);
    this.screen.append(this.statusBar);
    this.screen.append(this.keyGuideBar);
    this.screen.append(this.dynamicControlBar);
  }

  private buildHeaderContent(): string {
    // FUNC-202: Header Area format with filter/search status
    let header = `{bold}cctop v1.0.0.0 {green-fg}Daemon: ●RUNNING{/green-fg}`;
    
    // Add filter status if filters are active
    const activeFilters = 6 - this.eventFilters.size;
    if (activeFilters > 0) {
      const filterTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore']
        .filter(type => !this.eventFilters.has(type))
        .join(',');
      header += ` │ Filter: ${filterTypes}`;
    }
    
    // Add search status if search is active
    if (this.searchText) {
      header += ` │ Search: "${this.searchText}"`;
    }
    
    header += `{/bold}\n\nEvent Timestamp    Elapsed  File Name                          Event    Lines  Blocks Directory`;
    return header;
  }
  
  private buildCommandLine1(): string {
    const pauseText = this.isPaused ? 'Resume' : 'Pause';
    return `[q] Exit  [space] ${pauseText}  [x] Refresh  [a] All  [u] Unique`;
  }

  private buildDynamicControlContent(): string {
    // FUNC-202: Dynamic Control Area - changes based on state
    switch (this.displayState) {
      case 'filter':
        return '[f] Find [c] Create [m] Modify [d] Delete [v] Move [r] Restore [ESC] Back';
      
      case 'search':
        return `Search: [${this.searchText}_________________________________] [Enter] Apply [ESC] Cancel`;
      
      case 'normal':
      case 'paused':
      default:
        return '[f] Filter Events  [/] Quick search  [ESC] Clear';
    }
  }

  private setupKeyHandlers(): void {
    // Exit
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // FUNC-202: State transitions
    this.screen.key(['f'], () => {
      if (this.displayState === 'normal' || this.displayState === 'paused') {
        this.enterFilterMode();
      } else if (this.displayState === 'filter') {
        // Toggle find filter
        this.toggleEventFilter('find');
      }
    });

    this.screen.key(['/'], () => {
      if (this.displayState === 'normal' || this.displayState === 'paused') {
        this.enterSearchMode();
      }
    });

    // Filter mode toggle
    this.screen.key(['f'], () => {
      if (this.displayState === 'normal' || this.displayState === 'paused') {
        this.enterFilterMode();
      } else if (this.displayState === 'filter') {
        this.toggleEventFilter('find');
      }
    });

    this.screen.key(['escape'], () => {
      this.exitSpecialMode();
    });

    // Filter mode keys
    this.screen.key(['c'], () => {
      if (this.displayState === 'filter') {
        this.toggleEventFilter('create');
      }
    });

    this.screen.key(['m'], () => {
      if (this.displayState === 'filter') {
        this.toggleEventFilter('modify');
      }
    });

    this.screen.key(['d'], () => {
      if (this.displayState === 'filter') {
        this.toggleEventFilter('delete');
      }
    });

    this.screen.key(['v'], () => {
      if (this.displayState === 'filter') {
        this.toggleEventFilter('move');
      }
    });

    this.screen.key(['r'], () => {
      if (this.displayState === 'filter') {
        this.toggleEventFilter('restore');
      }
    });

    // Search mode
    this.screen.key(['enter'], () => {
      if (this.displayState === 'search') {
        this.applySearch();
      }
    });

    // Display mode switching
    this.screen.key(['a'], () => {
      this.switchDisplayMode('all');
    });

    this.screen.key(['u'], () => {
      this.switchDisplayMode('unique');
    });

    // Pause/Resume
    this.screen.key(['space'], () => {
      this.togglePause();
    });

    // Navigation
    this.eventList.key(['up', 'k'], () => {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateDisplay();
    });

    this.eventList.key(['down', 'j'], () => {
      this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 1);
      this.updateDisplay();
    });

    // Manual refresh
    this.screen.key(['x'], () => {
      this.refreshData();
    });
  }

  private enterFilterMode(): void {
    this.displayState = 'filter';
    this.updateDynamicControl();
    this.updateStatusBar();
    this.screen.render();
  }

  private enterSearchMode(): void {
    this.displayState = 'search';
    this.searchText = '';
    this.updateDynamicControl();
    this.updateStatusBar();
    this.screen.render();
  }

  private exitSpecialMode(): void {
    if (this.displayState === 'filter' || this.displayState === 'search') {
      this.displayState = this.isPaused ? 'paused' : 'normal';
      this.updateDynamicControl();
      this.updateStatusBar();
      this.screen.render();
    } else {
      // Clear filters and search
      this.eventFilters = new Set(['find', 'create', 'modify', 'delete', 'move', 'restore']);
      this.searchText = '';
      this.refreshData();
    }
  }

  private toggleEventFilter(eventType: string): void {
    if (this.eventFilters.has(eventType)) {
      this.eventFilters.delete(eventType);
    } else {
      this.eventFilters.add(eventType);
    }
    this.refreshData();
  }

  private applySearch(): void {
    // Apply search and return to normal mode
    this.displayState = this.isPaused ? 'paused' : 'normal';
    this.updateDynamicControl();
    this.refreshData();
  }

  private switchDisplayMode(mode: 'all' | 'unique'): void {
    if (this.displayMode !== mode) {
      this.displayMode = mode;
      this.refreshData();
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.displayState = this.isPaused ? 'paused' : 'normal';
    this.updateStatusBar();
    this.screen.render();
  }

  private updateDynamicControl(): void {
    this.dynamicControlBar.setContent(this.buildDynamicControlContent());
  }

  private updateStatusBar(): void {
    // Update command line 1 with current pause state
    this.statusBar.setContent(this.buildCommandLine1());
    
    // Update header with filter/search status
    this.headerPanel.setContent(this.buildHeaderContent());
  }

  private updateDisplay(): void {
    const items = this.formatEventList();
    this.eventList.setItems(items);
    this.updateStatusBar();
    this.screen.render();
  }

  private formatEventList(): string[] {
    // FUNC-204: Calculate dynamic directory width
    this.calculateDynamicWidth();
    
    return this.events.map((event, index) => {
      const timestamp = this.formatTimestamp(event.timestamp);
      const elapsed = this.formatElapsed(event.timestamp);
      const filename = this.padOrTruncate(event.filename || '', 35);
      const eventType = this.colorizeEventType(event.event_type);
      const lines = this.padLeft(event.lines?.toString() || '', 6);
      const blocks = this.padLeft(event.blocks?.toString() || '', 7);
      const directory = this.truncateDirectoryPath(event.directory || '', this.directoryWidth);

      const isSelected = index === this.selectedIndex;
      const marker = isSelected ? '>' : ' ';
      
      return `${marker}${timestamp} ${elapsed} ${filename} ${eventType} ${lines} ${blocks} ${directory}`;
    });
  }
  
  private calculateDynamicWidth(): void {
    // FUNC-204: Dynamic width calculation
    const terminalWidth = process.stdout.columns || 80;
    // Fixed columns: Timestamp(19) + Elapsed(7) + FileName(35) + Event(8) + Lines(6) + Blocks(7) + spaces(6) + marker(1) = 89
    const fixedWidth = 89;
    this.directoryWidth = Math.max(10, terminalWidth - fixedWidth);
  }
  
  private truncateDirectoryPath(path: string, maxWidth: number): string {
    // FUNC-204: Tail-first truncation for directories
    const width = stringWidth(path);
    
    if (width <= maxWidth) {
      return path;
    }
    
    const ellipsis = '...';
    const ellipsisWidth = 3;
    const targetWidth = maxWidth - ellipsisWidth;
    
    // Take characters from the end
    let result = '';
    let currentWidth = 0;
    
    // Iterate from the end of the string
    for (let i = path.length - 1; i >= 0 && currentWidth < targetWidth; i--) {
      const char = path[i];
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth <= targetWidth) {
        result = char + result;
        currentWidth += charWidth;
      } else {
        break;
      }
    }
    
    return ellipsis + result;
  }

  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatElapsed(timestamp: string): string {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    const diffSeconds = Math.floor((now - eventTime) / 1000);
    
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private colorizeEventType(eventType: string): string {
    const colors: { [key: string]: string } = {
      find: '{cyan-fg}find   {/cyan-fg}',
      create: '{green-fg}create {/green-fg}',
      modify: '{yellow-fg}modify {/yellow-fg}',
      delete: '{red-fg}delete {/red-fg}',
      move: '{magenta-fg}move   {/magenta-fg}',
      restore: '{blue-fg}restore{/blue-fg}'
    };
    
    return colors[eventType] || eventType.padEnd(8);
  }

  private padOrTruncate(text: string, targetWidth: number): string {
    // FUNC-200: East Asian Width support
    // Remove blessed tags for width calculation
    const cleanText = text.replace(/\{[^}]+\}/g, '');
    const currentWidth = stringWidth(cleanText);
    
    if (currentWidth > targetWidth) {
      return this.truncateWithEllipsis(text, targetWidth);
    }
    
    // Preserve tags in original text and add padding
    return text + ' '.repeat(targetWidth - currentWidth);
  }
  
  private truncateWithEllipsis(text: string, maxWidth: number): string {
    // FUNC-200: Proper truncation with East Asian Width support
    const ellipsis = '...';
    const ellipsisWidth = 3;
    
    // Extract and preserve tags
    const tagRegex = /\{[^}]+\}/g;
    const tags = text.match(tagRegex);
    const cleanText = text.replace(tagRegex, '');
    
    if (stringWidth(cleanText) <= maxWidth) return text;
    
    let result = '';
    let width = 0;
    
    for (const char of cleanText) {
      const charWidth = stringWidth(char);
      if (width + charWidth + ellipsisWidth > maxWidth) {
        // Re-apply tags if they existed
        if (tags && tags.length > 0) {
          return tags[0] + result + ellipsis + tags[tags.length - 1];
        }
        return result + ellipsis;
      }
      result += char;
      width += charWidth;
    }
    
    return text;
  }

  private padLeft(text: string, targetWidth: number): string {
    // FUNC-200: Right-aligned padding with East Asian Width support
    const currentWidth = stringWidth(text);
    
    if (currentWidth > targetWidth) {
      return this.truncateWithEllipsis(text, targetWidth);
    }
    
    return ' '.repeat(targetWidth - currentWidth) + text;
  }

  private async refreshData(): Promise<void> {
    try {
      if (this.displayMode === 'unique') {
        this.events = await this.db.getUniqueFiles(100);
      } else {
        this.events = await this.db.getLatestEvents(100);
      }
      
      // Apply filters
      if (this.eventFilters.size < 6) {
        this.events = this.events.filter(event => 
          this.eventFilters.has(event.event_type)
        );
      }
      
      // Apply search
      if (this.searchText) {
        const searchLower = this.searchText.toLowerCase();
        this.events = this.events.filter(event => 
          (event.filename || '').toLowerCase().includes(searchLower) ||
          (event.directory || '').toLowerCase().includes(searchLower)
        );
      }
      
      this.updateDisplay();
    } catch (error) {
      // Ignore errors silently
    }
  }

  public async start(): Promise<void> {
    // Initialize configuration
    await this.initializeConfig(this.initConfig || {});
    this.initializeScreen();
    this.setupFramelessLayout();
    this.setupKeyHandlers();
    
    // FUNC-204: Handle terminal resize
    process.stdout.on('resize', () => {
      this.calculateDynamicWidth();
      this.updateDisplay();
    });
    
    // Start refreshing
    await this.refreshData();
    
    this.refreshTimer = setInterval(async () => {
      if (!this.isPaused) {
        await this.refreshData();
      }
    }, 100); // FUNC-202: 100ms refresh interval

    this.screen.render();
  }

  public stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    try {
      this.screen.destroy();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}