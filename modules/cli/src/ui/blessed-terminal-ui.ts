/**
 * Blessed.js Terminal UI for CCTOP
 * Reference implementation based on image specification
 */

import * as blessed from 'blessed';
import { EventRow } from '../types/event-row';
import { DatabaseAdapter } from '../database/database-adapter';

export interface UIConfig {
  refreshInterval?: number;
  maxRows?: number;
  colors?: {
    header: string;
    status: string;
    find: string;
    create: string;
    modify: string;
    delete: string;
    move: string;
    restore: string;
  };
}

export class BlessedTerminalUI {
  private screen: blessed.Widgets.Screen;
  private table: any; // blessed.Widgets.ListTable;
  private statusBar: any; // blessed.Widgets.Box;
  private headerBox: any; // blessed.Widgets.Box;
  private db: DatabaseAdapter;
  private isRunning: boolean = false;
  private refreshTimer?: NodeJS.Timeout;
  private config: Required<UIConfig>;
  private selectedIndex: number = -1;
  private isSelectionMode: boolean = false;
  private events: EventRow[] = [];

  constructor(db: DatabaseAdapter, config: UIConfig = {}) {
    this.db = db;
    this.config = {
      refreshInterval: config.refreshInterval || 1000,
      maxRows: config.maxRows || 25,
      colors: {
        header: config.colors?.header || 'white',
        status: config.colors?.status || 'green',
        find: config.colors?.find || 'cyan',
        create: config.colors?.create || 'green',
        modify: config.colors?.modify || 'yellow',
        delete: config.colors?.delete || 'red',
        move: config.colors?.move || 'magenta',
        restore: config.colors?.restore || 'blue',
        ...config.colors
      }
    };

    this.initializeScreen();
    this.setupComponents();
    this.setupKeyHandlers();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - Code Change Monitor',
      dockBorders: true,
      fullUnicode: true,
      autoPadding: true
    });
  }

  private setupComponents(): void {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildHeader(),
      style: {
        fg: this.config.colors.header,
        bold: true
      },
      tags: true
    });

    // Main table
    this.table = blessed.listtable({
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-2',
      border: 'line',
      style: {
        header: {
          fg: this.config.colors.header,
          bold: true
        },
        cell: {
          fg: 'white'
        }
      },
      align: 'left',
      pad: 1,
      scrollable: true,
      keys: true,
      vi: true,
      mouse: true,
      tags: true
    });

    // Status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: this.buildStatusBar(),
      style: {
        fg: this.config.colors.status,
        bg: 'black'
      },
      tags: true
    });

    this.screen.append(this.headerBox);
    this.screen.append(this.table);
    this.screen.append(this.statusBar);
  }

  private buildHeader(): string {
    return '{bold}Timestamp{/}    {bold}Elapsed{/} {bold}File Name{/}                     {bold}Event{/}    {bold}Lines{/}  {bold}Blocks{/} {bold}Directory{/}';
  }

  private buildStatusBar(): string {
    const status = this.isRunning ? 'RUNNING' : 'STOPPED';
    const mode = this.isSelectionMode ? 'SELECT' : 'ALL';
    const eventCount = this.events.length;
    const totalCount = Math.floor(Math.random() * 50) + 150; // Simulated total
    return `{green-fg}● Status: ${status}{/}  Mode: ${mode}     All Activities (${eventCount}/${totalCount})     {cyan-fg}[a] All  [u] Unique  [d] Directory  [↑] Select  [Enter] Confirm  [Esc] Cancel  [space] Pause  [q] Exit{/}`;
  }

  private setupKeyHandlers(): void {
    // Global key handlers
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Selection mode keys
    this.screen.key(['up', 'k'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateDisplay();
      }
    });

    this.screen.key(['down', 'j'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 1);
        this.updateDisplay();
      }
    });

    this.screen.key(['enter'], () => {
      if (this.isSelectionMode && this.selectedIndex >= 0) {
        this.confirmSelection();
      }
    });

    this.screen.key(['escape'], () => {
      if (this.isSelectionMode) {
        this.exitSelectionMode();
      }
    });

    // Display mode keys
    this.screen.key(['a'], () => {
      this.setDisplayMode('all');
    });

    this.screen.key(['u'], () => {
      this.setDisplayMode('unique');
    });

    this.screen.key(['d'], () => {
      this.setDisplayMode('directory');
    });

    // Pause/resume
    this.screen.key(['space'], () => {
      this.togglePause();
    });
  }

  private enterSelectionMode(): void {
    if (!this.isSelectionMode) {
      this.isSelectionMode = true;
      this.selectedIndex = 0;
      this.updateStatusBar();
    }
  }

  private exitSelectionMode(): void {
    this.isSelectionMode = false;
    this.selectedIndex = -1;
    this.updateDisplay();
    this.updateStatusBar();
  }

  private confirmSelection(): void {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
      const event = this.events[this.selectedIndex];
      // TODO: Show event details
      this.showEventDetails(event);
    }
  }

  private showEventDetails(event: EventRow): void {
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
{cyan-fg}Event Type:{/} ${event.event_type}
{cyan-fg}Directory:{/} ${event.directory}
{cyan-fg}Lines:{/} ${event.lines || 'N/A'}
{cyan-fg}Blocks:{/} ${event.blocks || 'N/A'}
{cyan-fg}Inode:{/} ${event.inode}
{cyan-fg}Size:{/} ${event.size} bytes

{gray-fg}Press Esc or q to close{/}`;
  }

  private setDisplayMode(mode: string): void {
    // TODO: Implement different display modes
    this.refreshData();
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
      this.updateDisplay();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  private updateDisplay(): void {
    const data = this.formatTableData();
    this.table.setData(data);
    this.updateStatusBar();
    this.screen.render();
  }

  private formatTableData(): string[][] {
    const headers = ['Timestamp', 'Elapsed', 'File Name', 'Event', 'Lines', 'Blocks', 'Directory'];
    const rows: string[][] = [headers];

    this.events.forEach((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleString().substring(11, 19);
      const elapsed = this.formatElapsed(event.timestamp);
      const filename = this.truncateText(event.filename, 25);
      const eventType = this.colorizeEventType(event.event_type);
      const lines = event.lines?.toString() || '';
      const blocks = event.blocks?.toString() || '';
      const directory = this.truncateText(event.directory, 15);

      // Add selection marker
      const marker = (this.isSelectionMode && index === this.selectedIndex) ? '>>> ' : '';
      const row = [
        `${marker}${timestamp}`,
        elapsed,
        filename,
        eventType,
        lines,
        blocks,
        directory
      ];

      rows.push(row);
    });

    return rows;
  }

  private formatElapsed(timestamp: string): string {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    const diff = Math.floor((now - eventTime) / 1000);
    
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private colorizeEventType(eventType: string): string {
    const colors = this.config.colors;
    switch (eventType.toLowerCase()) {
      case 'find': return `{${colors.find}-fg}${eventType}{/}`;
      case 'create': return `{${colors.create}-fg}${eventType}{/}`;
      case 'modify': return `{${colors.modify}-fg}${eventType}{/}`;
      case 'delete': return `{${colors.delete}-fg}${eventType}{/}`;
      case 'move': return `{${colors.move}-fg}${eventType}{/}`;
      case 'restore': return `{${colors.restore}-fg}${eventType}{/}`;
      default: return eventType;
    }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private updateStatusBar(): void {
    this.statusBar.setContent(this.buildStatusBar());
  }
}