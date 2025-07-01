/**
 * Blessed.js Panel-based Terminal UI for CCTOP
 * Multi-panel layout version with separated event types and statistics
 */

import * as blessed from 'blessed';
import { EventRow } from '../types/event-row';
import { DatabaseAdapter } from '../database/database-adapter';

export interface UIPanelConfig {
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
    border: string;
  };
}

export class BlessedPanelUI {
  private screen: blessed.Widgets.Screen;
  private mainPanel: any; // blessed.Widgets.Box;
  private eventListPanel: any; // blessed.Widgets.Box;
  private statisticsPanel: any; // blessed.Widgets.Box;
  private detailPanel: any; // blessed.Widgets.Box;
  private statusBar: any; // blessed.Widgets.Box;
  private headerBox: any; // blessed.Widgets.Box;
  
  private eventList: any; // blessed.Widgets.List;
  private statisticsBox: any; // blessed.Widgets.Box;
  private detailBox: any; // blessed.Widgets.Box;
  
  private db: DatabaseAdapter;
  private isRunning: boolean = false;
  private refreshTimer?: NodeJS.Timeout;
  private config: Required<UIPanelConfig>;
  private selectedIndex: number = -1;
  private isSelectionMode: boolean = false;
  private events: EventRow[] = [];
  private eventStats: { [key: string]: number } = {};

  constructor(db: DatabaseAdapter, config: UIPanelConfig = {}) {
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
        border: config.colors?.border || 'cyan',
        ...config.colors
      }
    };

    this.initializeScreen();
    this.setupPanels();
    this.setupKeyHandlers();
  }

  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - Code Change Monitor (Panel View)',
      dockBorders: true,
      fullUnicode: true,
      autoPadding: true
    });
  }

  private setupPanels(): void {
    // Header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: this.buildHeader(),
      style: {
        fg: this.config.colors.header,
        bold: true
      },
      border: {
        type: 'line'
      },
      tags: true
    });

    // Main container panel
    this.mainPanel = blessed.box({
      top: 3,
      left: 0,
      width: '100%',
      height: '100%-5',
      style: {
        bg: 'black'
      }
    });

    // Left panel - Event List (60% width)
    this.eventListPanel = blessed.box({
      top: 0,
      left: 0,
      width: '60%',
      height: '100%',
      border: {
        type: 'line'
      },
      style: {
        border: { fg: this.config.colors.border }
      },
      label: ' Recent Events ',
      tags: true
    });

    // Top-right panel - Statistics (40% width, 50% height)
    this.statisticsPanel = blessed.box({
      top: 0,
      left: '60%',
      width: '40%',
      height: '50%',
      border: {
        type: 'line'
      },
      style: {
        border: { fg: this.config.colors.border }
      },
      label: ' Event Statistics ',
      tags: true
    });

    // Bottom-right panel - Details (40% width, 50% height)
    this.detailPanel = blessed.box({
      top: '50%',
      left: '60%',
      width: '40%',
      height: '50%',
      border: {
        type: 'line'
      },
      style: {
        border: { fg: this.config.colors.border }
      },
      label: ' Event Details ',
      tags: true,
      scrollable: true
    });

    // Event list component
    this.eventList = blessed.list({
      parent: this.eventListPanel,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      style: {
        fg: 'white',
        selected: {
          bg: 'blue',
          fg: 'white'
        }
      },
      keys: true,
      vi: true,
      scrollable: true,
      tags: true
    });

    // Statistics content
    this.statisticsBox = blessed.box({
      parent: this.statisticsPanel,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      content: this.buildStatistics(),
      style: {
        fg: 'white'
      },
      tags: true
    });

    // Detail content
    this.detailBox = blessed.box({
      parent: this.detailPanel,
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      content: this.buildEventDetail(),
      style: {
        fg: 'white'
      },
      tags: true,
      scrollable: true
    });

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
    this.mainPanel.append(this.eventListPanel);
    this.mainPanel.append(this.statisticsPanel);
    this.mainPanel.append(this.detailPanel);
    
    this.screen.append(this.headerBox);
    this.screen.append(this.mainPanel);
    this.screen.append(this.statusBar);
  }

  private buildHeader(): string {
    return `{center}{bold}CCTOP - Code Change Top{/}{/}
{center}Panel View - Real-time File Monitoring{/}`;
  }

  private buildStatistics(): string {
    const total = this.events.length;
    const stats = Object.entries(this.eventStats)
      .map(([type, count]) => {
        const color = this.getEventColor(type);
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return `{${color}-fg}${type.toUpperCase()}{/}: ${count} (${percentage}%)`;
      })
      .join('\n');

    return `{bold}Total Events:{/} ${total}\n\n${stats}`;
  }

  private buildEventDetail(): string {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.events.length) {
      const event = this.events[this.selectedIndex];
      return `{bold}Selected Event Details:{/}

{cyan-fg}Timestamp:{/} ${new Date(event.timestamp).toLocaleString()}
{cyan-fg}File:{/} ${event.filename}
{cyan-fg}Event Type:{/} ${this.colorizeEventType(event.event_type)}
{cyan-fg}Directory:{/} ${event.directory}
{cyan-fg}Lines:{/} ${event.lines || 'N/A'}
{cyan-fg}Blocks:{/} ${event.blocks || 'N/A'}
{cyan-fg}Inode:{/} ${event.inode}
{cyan-fg}Size:{/} ${event.size} bytes
{cyan-fg}Elapsed:{/} ${this.formatElapsed(event.timestamp)}`;
    }
    
    return `{gray-fg}Select an event from the list to view details{/}`;
  }

  private buildStatusBar(): string {
    const status = this.isRunning ? 'RUNNING' : 'STOPPED';
    const mode = this.isSelectionMode ? 'SELECT' : 'VIEW';
    const eventCount = this.events.length;
    return `{green-fg}● Status: ${status}{/}  Mode: ${mode}  Events: ${eventCount}
{cyan-fg}[↑↓] Navigate  [Enter] Select  [space] Pause  [r] Refresh  [q] Exit{/}`;
  }

  private setupKeyHandlers(): void {
    // Global key handlers
    this.screen.key(['q', 'C-c'], () => {
      this.stop();
      process.exit(0);
    });

    // Navigation keys
    this.screen.key(['up', 'k'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.eventList.select(this.selectedIndex);
        this.updateDetailPanel();
        this.screen.render();
      }
    });

    this.screen.key(['down', 'j'], () => {
      if (this.events.length > 0) {
        this.enterSelectionMode();
        this.selectedIndex = Math.min(this.events.length - 1, this.selectedIndex + 1);
        this.eventList.select(this.selectedIndex);
        this.updateDetailPanel();
        this.screen.render();
      }
    });

    // Selection confirmation
    this.screen.key(['enter'], () => {
      if (this.isSelectionMode && this.selectedIndex >= 0) {
        this.confirmSelection();
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

    // Event list selection handler
    this.eventList.on('select', (item, index) => {
      this.selectedIndex = index;
      this.isSelectionMode = true;
      this.updateDetailPanel();
      this.updateStatusBar();
    });
  }

  private enterSelectionMode(): void {
    if (!this.isSelectionMode) {
      this.isSelectionMode = true;
      this.selectedIndex = 0;
      this.updateStatusBar();
    }
  }

  private confirmSelection(): void {
    // In panel view, selection automatically shows details
    // This could be extended for additional actions
    this.updateDetailPanel();
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
      this.calculateEventStats();
      this.updateAllPanels();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }

  private calculateEventStats(): void {
    this.eventStats = {};
    this.events.forEach(event => {
      const type = event.event_type.toLowerCase();
      this.eventStats[type] = (this.eventStats[type] || 0) + 1;
    });
  }

  private updateAllPanels(): void {
    this.updateEventListPanel();
    this.updateStatisticsPanel();
    this.updateDetailPanel();
    this.updateStatusBar();
    this.screen.render();
  }

  private updateEventListPanel(): void {
    const items = this.events.map((event, index) => {
      const timestamp = new Date(event.timestamp).toLocaleString().substring(11, 19);
      const elapsed = this.formatElapsed(event.timestamp);
      const filename = this.truncateText(event.filename, 20);
      const eventType = this.colorizeEventType(event.event_type);
      
      return `${timestamp} [${elapsed}] ${eventType} ${filename}`;
    });

    this.eventList.setItems(items);
    
    // Maintain selection if valid
    if (this.isSelectionMode && this.selectedIndex >= 0 && this.selectedIndex < items.length) {
      this.eventList.select(this.selectedIndex);
    }
  }

  private updateStatisticsPanel(): void {
    this.statisticsBox.setContent(this.buildStatistics());
  }

  private updateDetailPanel(): void {
    this.detailBox.setContent(this.buildEventDetail());
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