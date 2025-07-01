/**
 * Frameless Column UI for CCTOP
 * Independent header panel with borderless columns below
 */

import * as blessed from 'blessed';
import { EventRow } from '../types/event-row';
import { DatabaseAdapter } from '../database/database-adapter';

export interface UIFramelessConfig {
  refreshInterval?: number;
  maxRows?: number;
  displayMode?: 'all' | 'unique';  // FUNC-202: All/Uniqueモード
  columnWidths?: {
    timestamp: number;    // FUNC-202: Event Timestamp - 19
    elapsed: number;      // FUNC-202: Elapsed - 9  
    filename: number;     // FUNC-202: File Name - 35
    event: number;        // FUNC-202: Event - 8
    lines: number;        // FUNC-202: Lines - 6
    blocks: number;       // FUNC-202: Blocks - 8
    directory: number;    // FUNC-202: Directory - 可変
  };
  colors?: {
    header: string;
    status: string;
    find: string;
    create: string;
    modify: string;
    delete: string;
    move: string;
    restore: string;
    border: string;
  };
}

export class BlessedFramelessUI {
  private screen!: blessed.Widgets.Screen;
  private titleBox: any; // blessed.Widgets.Box;
  private headerPanel: any; // blessed.Widgets.Box;
  private statusBar: any; // blessed.Widgets.Box;
  private keyGuideBar: any; // blessed.Widgets.Box;
  
  // Column panels (borderless)
  private timestampPanel: any; // blessed.Widgets.Box;
  private elapsedPanel: any; // blessed.Widgets.Box;
  private filenamePanel: any; // blessed.Widgets.Box;
  private eventPanel: any; // blessed.Widgets.Box;
  private linesPanel: any; // blessed.Widgets.Box;
  private blocksPanel: any; // blessed.Widgets.Box;
  private directoryPanel: any; // blessed.Widgets.Box;
  
  // Column lists
  private timestampList: any; // blessed.Widgets.List;
  private elapsedList: any; // blessed.Widgets.List;
  private filenameList: any; // blessed.Widgets.List;
  private eventList: any; // blessed.Widgets.List;
  private linesList: any; // blessed.Widgets.List;
  private blocksList: any; // blessed.Widgets.List;
  private directoryList: any; // blessed.Widgets.List;
  
  private db: DatabaseAdapter;
  private isRunning: boolean = false;
  private refreshTimer?: NodeJS.Timeout;
  private config: Required<UIFramelessConfig>;
  private selectedIndex: number = -1;
  private events: EventRow[] = [];
  private displayMode: 'all' | 'unique' = 'all';  // FUNC-202: 表示モード

  constructor(db: DatabaseAdapter, config: UIFramelessConfig = {}) {
    this.db = db;
    this.config = {
      refreshInterval: config.refreshInterval || 1000,
      maxRows: config.maxRows || 25,
      displayMode: config.displayMode || 'all',  // FUNC-202: デフォルトAllモード
      columnWidths: {
        timestamp: config.columnWidths?.timestamp || 20,    // YYYY-MM-DD HH:MM:SS = 19文字 + 1余裕
        elapsed: config.columnWidths?.elapsed || 7,         // mm:ss = 5文字 + 2余裕  
        filename: config.columnWidths?.filename || 35,      // FUNC-202仕様
        event: config.columnWidths?.event || 8,             // FUNC-202仕様
        lines: config.columnWidths?.lines || 6,             // FUNC-202仕様
        blocks: config.columnWidths?.blocks || 8,           // FUNC-202仕様
        directory: config.columnWidths?.directory || 20,    // FUNC-202可変（デフォルト20）
        ...config.columnWidths
      },
      colors: {
        header: config.colors?.header || 'white',
        status: config.colors?.status || 'green',
        find: config.colors?.find || 'cyan',
        create: config.colors?.create || 'green',
        modify: config.colors?.modify || 'yellow',
        delete: config.colors?.delete || 'red',
        move: config.colors?.move || 'magenta',
        restore: config.colors?.restore || 'blue',
        border: config.colors?.border || 'cyan',
        ...config.colors
      }
    };

    this.initializeScreen();
    this.setupFramelessLayout();
    this.setupKeyHandlers();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - Frameless View',
      dockBorders: true,
      fullUnicode: true,
      autoPadding: true,
      forceUnicode: false,  // Fix xterm-256color.Setulc error
      useBCE: false         // Disable problematic background color erase
    });
  }

  private setupFramelessLayout(): void {
    // Title
    this.titleBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{center}{bold}CCTOP - Frameless Column View{/}{/}',
      style: {
        fg: this.config.colors.header,
        bold: true
      },
      tags: true
    });

    // Independent header panel with underline
    this.headerPanel = blessed.box({
      top: 1,
      left: 0,
      width: '100%',
      height: 2,  // Height 2 to include underline
      content: this.buildHeaderContent(),
      style: {
        fg: this.config.colors.header,
        bold: true,
        bg: 'black'  // Same as other panels
      },
      tags: true
    });

    // Calculate column positions
    let leftPos = 0;
    
    // Timestamp Column (no border)
    this.timestampPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.timestamp);
    this.timestampList = this.createColumnList(this.timestampPanel);
    leftPos += this.config.columnWidths.timestamp;

    // Elapsed Column (no border)
    this.elapsedPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.elapsed);
    this.elapsedList = this.createColumnList(this.elapsedPanel);
    leftPos += this.config.columnWidths.elapsed;

    // Filename Column (no border)
    this.filenamePanel = this.createFramelessPanel(leftPos, this.config.columnWidths.filename);
    this.filenameList = this.createColumnList(this.filenamePanel);
    leftPos += this.config.columnWidths.filename;

    // Event Column (no border)
    this.eventPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.event);
    this.eventList = this.createColumnList(this.eventPanel);
    leftPos += this.config.columnWidths.event;

    // Lines Column (no border)
    this.linesPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.lines);
    this.linesList = this.createColumnList(this.linesPanel);
    leftPos += this.config.columnWidths.lines;

    // Blocks Column (no border)
    this.blocksPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.blocks);
    this.blocksList = this.createColumnList(this.blocksPanel);
    leftPos += this.config.columnWidths.blocks;

    // Directory Column (no border)
    this.directoryPanel = this.createFramelessPanel(leftPos, this.config.columnWidths.directory);
    this.directoryList = this.createColumnList(this.directoryPanel);

    // Status bar - Split into 2 separate boxes for reliable display
    this.statusBar = blessed.box({
      bottom: 1,  // Above the key guide
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      style: {
        fg: this.config.colors.status,
        bg: 'black'
      },
      tags: true
    });

    // Key guide bar (separate from status)
    this.keyGuideBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{cyan-fg}[a] All  [u] Unique  [↑↓] Navigate  [Enter] Select  [space] Pause  [r] Refresh  [q] Exit{/}',
      style: {
        fg: 'cyan',
        bg: 'black'
      },
      tags: true
    });

    // Append all components
    this.screen.append(this.titleBox);
    this.screen.append(this.headerPanel);
    this.screen.append(this.timestampPanel);
    this.screen.append(this.elapsedPanel);
    this.screen.append(this.filenamePanel);
    this.screen.append(this.eventPanel);
    this.screen.append(this.linesPanel);
    this.screen.append(this.blocksPanel);
    this.screen.append(this.directoryPanel);
    this.screen.append(this.statusBar);
    this.screen.append(this.keyGuideBar);
  }

  private createFramelessPanel(left: number, width: number): any {
    return blessed.box({
      top: 3,  // Below title + header panel (adjusted for 2-line header)
      left: left,
      width: width,
      height: '100%-5',  // Adjusted for 2 separate status bars
      style: {
        fg: 'white',
        bg: 'black'
      },
      tags: true
      // No border property = frameless
    });
  }

  private createColumnList(parent: any): any {
    return blessed.list({
      parent: parent,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: {
        fg: 'white',
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      scrollable: true,
      tags: true
    });
  }

  private buildHeaderContent(): string {
    const { columnWidths } = this.config;
    
    // Build header with FUNC-202 column alignment
    const timestampHeader = this.padToWidth('Event Timestamp', columnWidths.timestamp);     // FUNC-202準拠
    const elapsedHeader = this.padToWidth('Elapsed', columnWidths.elapsed);
    const filenameHeader = this.padToWidth('File Name', columnWidths.filename);
    const eventHeader = this.padToWidth('Event', columnWidths.event);
    const linesHeader = this.padToWidth('Lines', columnWidths.lines);
    const blocksHeader = this.padToWidth('Blocks', columnWidths.blocks);
    const directoryHeader = this.padToWidth('Directory', columnWidths.directory);
    
    const headerRow = `${timestampHeader}${elapsedHeader}${filenameHeader}${eventHeader}${linesHeader}${blocksHeader}${directoryHeader}`;
    
    // Create underline with same width as header
    const totalWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    const underline = '─'.repeat(totalWidth);
    
    return `${headerRow}
${underline}`;
  }

  private padToWidth(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    const padding = width - text.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  private buildStatusBar(): string {
    const status = this.isRunning ? 'RUNNING' : 'STOPPED';
    const eventCount = this.events.length;
    const selectedInfo = this.selectedIndex >= 0 ? ` | Selected: ${this.selectedIndex + 1}` : '';
    const modeInfo = this.displayMode === 'all' ? 'All Activities' : 'Unique Files';
    
    return `{green-fg}● ${modeInfo} (${eventCount}){/}  Status: ${status}${selectedInfo}`;
  }

  private setupKeyHandlers(): void {
    // Global key handlers with proper cleanup
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      setTimeout(() => process.exit(0), 100);
    });

    // Handle process termination signals
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });

    // Navigation keys - synchronize all columns
    this.screen.key(['up', 'k'], () => {
      if (this.events.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.synchronizeSelection();
        this.updateStatusBar();
        this.screen.render();
      }
    });

    this.screen.key(['down', 'j'], () => {
      if (this.events.length > 0) {
        this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 1);
        this.synchronizeSelection();
        this.updateStatusBar();
        this.screen.render();
      }
    });

    // Page navigation
    this.screen.key(['pageup'], () => {
      if (this.events.length > 0) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 10);
        this.synchronizeSelection();
        this.updateStatusBar();
        this.screen.render();
      }
    });

    this.screen.key(['pagedown'], () => {
      if (this.events.length > 0) {
        this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 10);
        this.synchronizeSelection();
        this.updateStatusBar();
        this.screen.render();
      }
    });

    // Selection confirmation
    this.screen.key(['enter'], () => {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
        this.showEventDetails();
      }
    });

    // Pause/resume
    this.screen.key(['space'], () => {
      this.togglePause();
    });

    // Manual refresh
    this.screen.key(['r'], () => {
      this.refreshData();
    });

    // FUNC-202: All/Unique mode switching
    this.screen.key(['a'], () => {
      this.switchDisplayMode('all');
    });

    this.screen.key(['u'], () => {
      this.switchDisplayMode('unique');
    });
  }

  private synchronizeSelection(): void {
    // Synchronize selection across all column lists
    const lists = [
      this.timestampList,
      this.elapsedList,
      this.filenameList,
      this.eventList,
      this.linesList,
      this.blocksList,
      this.directoryList
    ];

    lists.forEach(list => {
      if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
        list.select(this.selectedIndex);
      }
    });
  }

  private showEventDetails(): void {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.events.length) return;
    
    const event = this.events[this.selectedIndex];
    const detailBox = blessed.box({
      top: 'center',
      left: 'center',
      width: '80%',
      height: '60%',
      border: 'line',
      style: {
        border: { fg: 'cyan' }
      },
      content: this.formatEventDetails(event),
      scrollable: true,
      keys: true,
      tags: true
    });

    detailBox.key(['escape', 'q'], () => {
      this.screen.remove(detailBox);
      this.screen.render();
    });

    this.screen.append(detailBox);
    detailBox.focus();
    this.screen.render();
  }

  private formatEventDetails(event: EventRow): string {
    return `{bold}Event Details{/}

{cyan-fg}Timestamp:{/} ${new Date(event.timestamp).toLocaleString()}
{cyan-fg}File:{/} ${event.filename}
{cyan-fg}Event Type:{/} ${this.colorizeEventType(event.event_type)}
{cyan-fg}Directory:{/} ${event.directory}
{cyan-fg}Lines:{/} ${event.lines || 'N/A'}
{cyan-fg}Blocks:{/} ${event.blocks || 'N/A'}
{cyan-fg}Inode:{/} ${event.inode}
{cyan-fg}Size:{/} ${event.size} bytes
{cyan-fg}Elapsed:{/} ${this.formatElapsed(event.timestamp)}

{gray-fg}Press Esc or q to close{/}`;
  }

  private togglePause(): void {
    if (this.isRunning) {
      this.pause();
    } else {
      this.resume();
    }
  }

  private pause(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.isRunning = false;
    this.updateStatusBar();
  }

  private resume(): void {
    this.start();
  }

  // FUNC-202: Display mode switching
  private switchDisplayMode(mode: 'all' | 'unique'): void {
    if (this.displayMode !== mode) {
      this.displayMode = mode;
      this.selectedIndex = -1;  // Reset selection
      this.refreshData();       // Refresh data with new mode
      this.updateStatusBar();   // Update status display
      this.screen.render();
    }
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    await this.refreshData();
    
    this.refreshTimer = setInterval(async () => {
      await this.refreshData();
    }, this.config.refreshInterval);

    this.screen.render();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    
    // Properly cleanup blessed screen
    try {
      this.screen.destroy();
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Reset terminal
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?1049l'); // Exit alternate screen
      process.stdout.write('\x1b[?25h');   // Show cursor
    }
  }

  private async refreshData(): Promise<void> {
    try {
      // FUNC-202: Get data based on display mode
      if (this.displayMode === 'unique') {
        this.events = await this.db.getUniqueFiles(this.config.maxRows);
      } else {
        this.events = await this.db.getLatestEvents(this.config.maxRows);
      }
      this.updateAllColumns();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  private updateAllColumns(): void {
    // Update each column with corresponding data
    const timestampItems = this.events.map(event => 
      this.formatTimestamp(event.timestamp)
    );
    
    const elapsedItems = this.events.map(event => 
      this.formatElapsed(event.timestamp)
    );
    
    const filenameItems = this.events.map(event => 
      this.truncateText(event.filename, this.config.columnWidths.filename)
    );
    
    const eventItems = this.events.map(event => 
      this.colorizeEventType(event.event_type)
    );
    
    const linesItems = this.events.map(event => 
      (event.lines || 0).toString()
    );
    
    const blocksItems = this.events.map(event => 
      (event.blocks || 0).toString()
    );
    
    const directoryItems = this.events.map(event => 
      this.truncateText(event.directory, this.config.columnWidths.directory)
    );

    // Set items for each column
    this.timestampList.setItems(timestampItems);
    this.elapsedList.setItems(elapsedItems);
    this.filenameList.setItems(filenameItems);
    this.eventList.setItems(eventItems);
    this.linesList.setItems(linesItems);
    this.blocksList.setItems(blocksItems);
    this.directoryList.setItems(directoryItems);

    // Synchronize selection if valid
    if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
      this.synchronizeSelection();
    }

    // Force status bar update and render
    this.updateStatusBar();
    this.screen.render();
  }

  private updateStatusBar(): void {
    this.statusBar.setContent(this.buildStatusBar());
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
    const color = this.getEventColor(eventType);
    return `{${color}-fg}${eventType.toUpperCase()}{/}`;
  }

  private getEventColor(eventType: string): string {
    const colors = this.config.colors;
    switch (eventType.toLowerCase()) {
      case 'find': return colors.find;
      case 'create': return colors.create;
      case 'modify': return colors.modify;
      case 'delete': return colors.delete;
      case 'move': return colors.move;
      case 'restore': return colors.restore;
      default: return 'white';
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}