/**
 * Simple Table-based CCTOP UI (based on previous implementation)
 * Clean, minimal design with proper East Asian width support
 */

import blessed from 'blessed';
import stringWidth from 'string-width';
import { EventData, DisplayMode } from './types';

export class SimpleUI {
  private screen: blessed.Widgets.Screen;
  private table: blessed.Widgets.ListTableElement;
  private statusBar: blessed.Widgets.BoxElement;
  private controlBar: blessed.Widgets.BoxElement;
  
  private events: EventData[] = [];
  private displayMode: DisplayMode = 'all';
  private isPaused = false;
  private eventCount = 0;

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CCTOP - File Event Monitor',
      fullUnicode: true,
      warnings: false,
      autoPadding: false,
      dockBorders: false
    });

    this.initializeLayout();
    this.setupEventHandlers();
  }

  private initializeLayout(): void {
    // Main table for events
    this.table = blessed.listtable({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-2',
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      interactive: true,
      style: {
        bg: 'black',
        fg: 'white',
        header: {
          bg: 'blue',
          fg: 'white',
          bold: true
        },
        cell: {
          fg: 'white',
          selected: {
            bg: 'blue',
            fg: 'white'
          }
        },
        border: {
          fg: 'cyan'
        }
      },
      border: {
        type: 'line'
      },
      align: 'left'
    });

    // Status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        bg: 'green',
        fg: 'black',
        bold: true
      },
      content: this.buildStatusContent()
    });

    // Control guide bar
    this.controlBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        bg: 'black',
        fg: 'green'
      },
      content: '[a] All Mode [u] Unique Mode [space] Pause/Resume [r] Refresh [q] Exit'
    });

    this.updateTable();
    this.table.focus();
  }

  private buildStatusContent(): string {
    const displayEvents = this.displayMode === 'unique' ? this.getUniqueEvents() : this.events;
    const status = this.isPaused ? 'PAUSED' : 'RUNNING';
    const mode = this.displayMode === 'all' ? 'ALL' : 'UNIQUE';
    
    return `● Status: ${status}  Mode: ${mode}  Events: ${displayEvents.length}/${this.events.length}`;
  }

  private updateTable(): void {
    const headers = [
      'Event',
      'Timestamp', 
      'Elapsed',
      'File Name',
      'Event',
      'Lines',
      'Blocks',
      'Directory'
    ];

    const displayEvents = this.displayMode === 'unique' 
      ? this.getUniqueEvents() 
      : this.events;

    const rows = displayEvents.slice(-100).map(event => {
      const eventColor = this.getEventColor(event.event);
      
      return [
        (event.id || 0).toString(),
        this.truncateEastAsian(event.timestamp, 19),
        this.truncateEastAsian(event.elapsed, 8),
        this.truncateEastAsian(event.filename, 35),
        `{${eventColor}-fg}${event.event}{/}`,
        event.lines.toString(),
        event.blocks.toString(),
        this.truncateEastAsian(event.directory, 25)
      ];
    });

    this.table.setData([headers, ...rows]);
    this.statusBar.setContent(this.buildStatusContent());
  }

  private getEventColor(event: string): string {
    const colorMap: Record<string, string> = {
      'create': 'green',
      'modify': 'cyan', 
      'delete': 'red',
      'move': 'yellow',
      'find': 'blue',
      'restore': 'magenta'
    };
    return colorMap[event] || 'white';
  }

  private truncateEastAsian(text: string, maxWidth: number): string {
    const width = stringWidth(text);
    if (width <= maxWidth) {
      return text + ' '.repeat(maxWidth - width); // Pad to exact width
    }
    
    // Binary search for optimal truncation with East Asian width
    let left = 0;
    let right = text.length;
    let result = text;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = text.slice(0, mid);
      const candidateWidth = stringWidth(candidate);
      
      if (candidateWidth <= maxWidth - 3) { // Reserve space for "..."
        result = candidate + '...';
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // Ensure exact width
    const finalWidth = stringWidth(result);
    if (finalWidth < maxWidth) {
      result += ' '.repeat(maxWidth - finalWidth);
    }
    
    return result;
  }

  private getUniqueEvents(): EventData[] {
    const seen = new Set<string>();
    return this.events.filter(event => {
      const key = `${event.filename}-${event.event}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private setupEventHandlers(): void {
    // Quit
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });

    // Toggle display mode
    this.screen.key(['a'], () => {
      this.displayMode = 'all';
      this.updateTable();
      this.screen.render();
    });

    this.screen.key(['u'], () => {
      this.displayMode = 'unique';
      this.updateTable();
      this.screen.render();
    });

    // Pause/Resume
    this.screen.key(['space'], () => {
      this.isPaused = !this.isPaused;
      this.updateTable();
      this.screen.render();
    });

    // Refresh
    this.screen.key(['r'], () => {
      this.updateTable();
      this.screen.render();
    });

    // Auto-focus table
    this.table.focus();
  }

  public addEvent(event: EventData): void {
    if (this.isPaused) return;
    
    this.eventCount++;
    const eventWithId = { ...event, id: this.eventCount };
    this.events.push(eventWithId);
    
    // Keep last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    this.updateTable();
    this.refresh();
  }

  public addEvents(events: EventData[]): void {
    if (this.isPaused) return;
    
    const eventsWithIds = events.map(event => ({
      ...event, 
      id: ++this.eventCount
    }));
    
    this.events.push(...eventsWithIds);
    
    // Keep last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
    
    this.updateTable();
    this.refresh();
  }

  public refresh(): void {
    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }
}