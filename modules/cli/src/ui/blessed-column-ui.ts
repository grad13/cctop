/**
 * Column-based Vertical Panel UI for CCTOP
 * Each column (Timestamp, Elapsed, File Name, etc.) is displayed as a separate vertical panel
 */

import * as blessed from 'blessed';
import { EventRow } from '../types/event-row';
import { DatabaseAdapter } from '../database/database-adapter';

export interface UIColumnConfig {
  refreshInterval?: number;
  maxRows?: number;
  columnWidths?: {
    timestamp: number;
    elapsed: number;
    filename: number;
    event: number;
    lines: number;
    blocks: number;
    directory: number;
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

export class BlessedColumnUI {
  private screen: blessed.Widgets.Screen;
  private headerBox: any; // blessed.Widgets.Box;
  private statusBar: any; // blessed.Widgets.Box;
  
  // Column panels
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
  private config: Required<UIColumnConfig>;
  private selectedIndex: number = -1;
  private events: EventRow[] = [];
  private scrollOffset: number = 0;

  constructor(db: DatabaseAdapter, config: UIColumnConfig = {}) {
    this.db = db;
    this.config = {
      refreshInterval: config.refreshInterval || 1000,
      maxRows: config.maxRows || 25,
      columnWidths: {
        timestamp: config.columnWidths?.timestamp || 20,
        elapsed: config.columnWidths?.elapsed || 10,
        filename: config.columnWidths?.filename || 25,
        event: config.columnWidths?.event || 10,
        lines: config.columnWidths?.lines || 8,
        blocks: config.columnWidths?.blocks || 8,
        directory: config.columnWidths?.directory || 20,
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
    this.setupColumnPanels();
    this.setupKeyHandlers();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - Column View',
      dockBorders: true,
      fullUnicode: true,
      autoPadding: true
    });
  }

  private setupColumnPanels(): void {
    // Title header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{center}{bold}CCTOP - Column View{/}{/}',
      style: {
        fg: this.config.colors.header,
        bold: true
      },
      tags: true
    });

    // Column headers bar
    const headerBar = blessed.box({
      top: 1,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildColumnHeaders(),
      style: {
        fg: this.config.colors.header,
        bold: true,
        bg: 'black'
      },
      tags: true
    });
    
    this.screen.append(headerBar);

    // Calculate column positions
    let leftPos = 0;
    const columnSpacing = 1; // Space between panels
    
    // Timestamp Column
    this.timestampPanel = this.createColumnPanel(
      'Timestamp',
      leftPos,
      this.config.columnWidths.timestamp
    );
    this.timestampList = this.createColumnList(this.timestampPanel);
    leftPos += this.config.columnWidths.timestamp + columnSpacing;

    // Elapsed Column
    this.elapsedPanel = this.createColumnPanel(
      'Elapsed',
      leftPos,
      this.config.columnWidths.elapsed
    );
    this.elapsedList = this.createColumnList(this.elapsedPanel);
    leftPos += this.config.columnWidths.elapsed + columnSpacing;

    // Filename Column
    this.filenamePanel = this.createColumnPanel(
      'File Name',
      leftPos,
      this.config.columnWidths.filename
    );
    this.filenameList = this.createColumnList(this.filenamePanel);
    leftPos += this.config.columnWidths.filename + columnSpacing;

    // Event Column
    this.eventPanel = this.createColumnPanel(
      'Event',
      leftPos,
      this.config.columnWidths.event
    );
    this.eventList = this.createColumnList(this.eventPanel);
    leftPos += this.config.columnWidths.event + columnSpacing;

    // Lines Column
    this.linesPanel = this.createColumnPanel(
      'Lines',
      leftPos,
      this.config.columnWidths.lines
    );
    this.linesList = this.createColumnList(this.linesPanel);
    leftPos += this.config.columnWidths.lines + columnSpacing;

    // Blocks Column
    this.blocksPanel = this.createColumnPanel(
      'Blocks',
      leftPos,
      this.config.columnWidths.blocks
    );
    this.blocksList = this.createColumnList(this.blocksPanel);
    leftPos += this.config.columnWidths.blocks + columnSpacing;

    // Directory Column
    this.directoryPanel = this.createColumnPanel(
      'Directory',
      leftPos,
      this.config.columnWidths.directory
    );
    this.directoryList = this.createColumnList(this.directoryPanel);

    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 2,
      content: this.buildStatusBar(),
      style: {
        fg: this.config.colors.status,
        bg: 'black'
      },
      border: {
        type: 'line'
      },
      tags: true
    });

    // Append all components
    this.screen.append(this.headerBox);
    this.screen.append(this.timestampPanel);
    this.screen.append(this.elapsedPanel);
    this.screen.append(this.filenamePanel);
    this.screen.append(this.eventPanel);
    this.screen.append(this.linesPanel);
    this.screen.append(this.blocksPanel);
    this.screen.append(this.directoryPanel);
    this.screen.append(this.statusBar);
  }

  private createColumnPanel(title: string, left: number, width: number): any {
    const panel = blessed.box({
      top: 2,  // Start below title + header bar
      left: left,
      width: width,
      height: '100%-4',
      border: left === 0 ? {
        type: 'line'
      } : {
        type: 'line'
      },
      style: {
        border: { fg: this.config.colors.border }
      },
      tags: true
    });

    return panel;
  }

  private createColumnList(parent: any): any {
    return blessed.list({
      parent: parent,
      top: 0,  // No top margin needed
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

  private buildColumnHeaders(): string {
    const { columnWidths } = this.config;
    
    // Build header row with proper spacing matching column widths
    const timestampHeader = this.padToWidth('Timestamp', columnWidths.timestamp);
    const elapsedHeader = this.padToWidth('Elapsed', columnWidths.elapsed);
    const filenameHeader = this.padToWidth('File Name', columnWidths.filename);
    const eventHeader = this.padToWidth('Event', columnWidths.event);
    const linesHeader = this.padToWidth('Lines', columnWidths.lines);
    const blocksHeader = this.padToWidth('Blocks', columnWidths.blocks);
    const directoryHeader = this.padToWidth('Directory', columnWidths.directory);
    
    return `${timestampHeader} ${elapsedHeader} ${filenameHeader} ${eventHeader} ${linesHeader} ${blocksHeader} ${directoryHeader}`;
  }

  private buildHeader(): string {
    const { columnWidths } = this.config;
    
    // Build header row with proper spacing matching column widths
    const timestampHeader = this.padToWidth('Timestamp', columnWidths.timestamp);
    const elapsedHeader = this.padToWidth('Elapsed', columnWidths.elapsed);
    const filenameHeader = this.padToWidth('File Name', columnWidths.filename);
    const eventHeader = this.padToWidth('Event', columnWidths.event);
    const linesHeader = this.padToWidth('Lines', columnWidths.lines);
    const blocksHeader = this.padToWidth('Blocks', columnWidths.blocks);
    const directoryHeader = this.padToWidth('Directory', columnWidths.directory);
    
    const headerRow = `${timestampHeader}│${elapsedHeader}│${filenameHeader}│${eventHeader}│${linesHeader}│${blocksHeader}│${directoryHeader}`;
    
    return `{center}{bold}CCTOP - Column View{/}{/}
${headerRow}`;
  }

  private padToWidth(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width - 1);
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
    
    return `{green-fg}● Status: ${status}{/}  Events: ${eventCount}${selectedInfo}
{cyan-fg}[↑↓] Navigate  [Enter] Select  [space] Pause  [r] Refresh  [q] Exit{/}`;
  }

  private setupKeyHandlers(): void {
    // Global key handlers
    this.screen.key(['q', 'C-c'], () => {
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
    }
    this.screen.destroy();
  }

  private async refreshData(): Promise<void> {
    try {
      // Get latest events from database
      this.events = await this.db.getLatestEvents(this.config.maxRows);
      this.updateAllColumns();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  private updateAllColumns(): void {
    // Update each column with corresponding data
    const timestampItems = this.events.map(event => 
      new Date(event.timestamp).toLocaleString().substring(11, 19)
    );
    
    const elapsedItems = this.events.map(event => 
      this.formatElapsed(event.timestamp)
    );
    
    const filenameItems = this.events.map(event => 
      this.truncateText(event.filename, this.config.columnWidths.filename - 2)
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
      this.truncateText(event.directory, this.config.columnWidths.directory - 2)
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

    this.updateStatusBar();
    this.screen.render();
  }

  private updateStatusBar(): void {
    this.statusBar.setContent(this.buildStatusBar());
  }

  private formatElapsed(timestamp: string): string {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    const diff = Math.floor((now - eventTime) / 1000);
    
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h`;
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