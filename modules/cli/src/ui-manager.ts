/**
 * Beautiful blessed.js UI Manager for CCTOP
 * Features: Panel layouts, themes, double buffering, East Asian width support
 */

import blessed from 'blessed';
import stringWidth from 'string-width';
import { EventData, UIConfig, ColumnConfig, DisplayMode } from './types';
import { THEMES, ICONS, BORDERS } from './theme';

export class UIManager {
  private screen: blessed.Widgets.Screen;
  private eventTable: blessed.Widgets.ListTableElement;
  private statusPanel: blessed.Widgets.BoxElement;
  private headerPanel: blessed.Widgets.BoxElement;
  private footerPanel: blessed.Widgets.BoxElement;
  private sidePanel: blessed.Widgets.BoxElement;
  
  private config: UIConfig;
  private events: EventData[] = [];
  private displayMode: DisplayMode = 'all';
  private selectedTheme = 'ocean';
  
  private columnConfig: ColumnConfig = {
    timestamp: 16,
    elapsed: 8,
    filename: 30,
    event: 8,
    lines: 6,
    blocks: 6,
    directory: 25
  };

  constructor(config?: Partial<UIConfig>) {
    // Set theme first
    this.selectedTheme = 'ocean';
    this.config = {
      theme: THEMES[this.selectedTheme],
      animations: true,
      doubleBuffer: true,
      showIcons: true,
      ...config
    };

    this.screen = blessed.screen({
      smartCSR: this.config.doubleBuffer,
      title: 'CCTOP - Code Change Top',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null
      },
      debug: false,
      dockBorders: false,
      fullUnicode: true,
      autoPadding: true,
      warnings: false,
      fastCSR: true,
      useBCE: true
    });

    this.initializeLayout();
    this.setupEventHandlers();
  }

  private initializeLayout(): void {
    // Header Panel with Logo and Stats
    this.headerPanel = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%' as any,
      height: 3,
      content: this.buildHeaderContent(),
      tags: true,
      border: {
        type: BORDERS.single,
        fg: this.config.theme.border as any
      },
      style: {
        fg: this.config.theme.text,
        bg: this.config.theme.background,
        border: {
          fg: this.config.theme.primary as any
        }
      }
    });

    // Side Panel for Directory Tree and Filters
    this.sidePanel = blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: 25,
      height: '100%-6' as any,
      label: ` ${ICONS.ui.folder} Directories `,
      border: {
        type: BORDERS.single,
        fg: this.config.theme.border as any
      },
      style: {
        fg: this.config.theme.text,
        bg: this.config.theme.background,
        border: {
          fg: this.config.theme.secondary as any
        }
      },
      content: this.buildSidePanelContent(),
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true
    });

    // Main Event Table
    this.eventTable = blessed.listtable({
      parent: this.screen,
      top: 3,
      left: 25,
      width: '100%-25' as any,
      height: '100%-6' as any,
      label: ` ${ICONS.ui.logo} File Change Events `,
      border: {
        type: BORDERS.single,
        fg: this.config.theme.border as any
      },
      style: {
        fg: this.config.theme.text,
        bg: this.config.theme.background,
        border: {
          fg: this.config.theme.primary as any
        },
        header: {
          fg: this.config.theme.accent as any,
          bold: true
        },
        cell: {
          fg: this.config.theme.text,
          selected: {
            bg: this.config.theme.primary,
            fg: 'black'
          }
        }
      },
      tags: true,
      keys: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      interactive: true
    });

    // Status Panel at Bottom
    this.statusPanel = blessed.box({
      parent: this.screen,
      bottom: 3,
      left: 0,
      width: '100%' as any,
      height: 3,
      content: this.buildStatusContent(),
      tags: true,
      border: {
        type: BORDERS.single,
        fg: this.config.theme.border as any
      },
      style: {
        fg: this.config.theme.text,
        bg: this.config.theme.background,
        border: {
          fg: this.config.theme.info as any
        }
      }
    });

    // Footer with Keybindings
    this.footerPanel = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%' as any,
      height: 3,
      content: this.buildFooterContent(),
      tags: true,
      style: {
        fg: this.config.theme.warning,
        bg: this.config.theme.background
      }
    });

    this.updateEventTable();
  }

  private buildHeaderContent(): string {
    const totalEvents = this.events.length;
    const uniqueFiles = new Set(this.events.map(e => e.filename)).size;
    const uniqueDirs = new Set(this.events.map(e => e.directory)).size;
    
    return [
      `{center}{${this.config.theme.primary}-fg}${ICONS.ui.logo} CCTOP - Real-time Code Change Monitor{/}`,
      `{center}{${this.config.theme.secondary}-fg}Events: {${this.config.theme.accent}-fg}${totalEvents}{/} | Files: {${this.config.theme.accent}-fg}${uniqueFiles}{/} | Dirs: {${this.config.theme.accent}-fg}${uniqueDirs}{/}{/}`
    ].join('\n');
  }

  private buildSidePanelContent(): string {
    const directories = [...new Set(this.events.map(e => e.directory))];
    const content = [
      `{${this.config.theme.accent}-fg}${ICONS.ui.bullet} Filters:{/}`,
      `{${this.config.theme.info}-fg}  ${ICONS.navigation.right} All Events (${this.events.length}){/}`,
      `{${this.config.theme.info}-fg}  ${ICONS.navigation.right} Unique Files{/}`,
      '',
      `{${this.config.theme.accent}-fg}${ICONS.ui.bullet} Directories:{/}`
    ];

    directories.slice(0, 10).forEach(dir => {
      const count = this.events.filter(e => e.directory === dir).length;
      const icon = ICONS.ui.folder;
      const shortDir = dir.length > 20 ? '...' + dir.slice(-17) : dir;
      content.push(`{${this.config.theme.text}-fg}  ${icon} ${shortDir} (${count}){/}`);
    });

    if (directories.length > 10) {
      content.push(`{${this.config.theme.secondary}-fg}  ... and ${directories.length - 10} more{/}`);
    }

    return content.join('\n');
  }

  private buildStatusContent(): string {
    const lastEvent = this.events[this.events.length - 1];
    if (!lastEvent) {
      return `{center}{${this.config.theme.info}-fg}${ICONS.ui.info} Waiting for file changes...{/}`;
    }

    const eventIcon = ICONS.events[lastEvent.event] || ICONS.ui.bullet;
    const eventColor = this.getEventColor(lastEvent.event);
    
    return [
      `{${this.config.theme.accent}-fg}Latest Event:{/} {${eventColor}-fg}${eventIcon} ${lastEvent.event.toUpperCase()}{/} {${this.config.theme.text}-fg}${lastEvent.filename}{/}`,
      `{${this.config.theme.secondary}-fg}Time: ${lastEvent.timestamp} | Elapsed: ${lastEvent.elapsed} | Lines: ${lastEvent.lines} | Directory: ${lastEvent.directory}{/}`
    ].join('\n');
  }

  private buildFooterContent(): string {
    return [
      `{center}{${this.config.theme.warning}-fg}Controls:{/}`,
      `{center}{${this.config.theme.text}-fg}${ICONS.navigation.up}${ICONS.navigation.down} Navigate | ${ICONS.navigation.enter} Select | {${this.config.theme.accent}-fg}q{/} Quit | {${this.config.theme.accent}-fg}r{/} Refresh | {${this.config.theme.accent}-fg}t{/} Theme | {${this.config.theme.accent}-fg}f{/} Filter{/}`
    ].join('\n');
  }

  private getEventColor(event: string): string {
    const colorMap: Record<string, string> = {
      create: this.config.theme.success,
      modify: this.config.theme.info,
      delete: this.config.theme.error,
      move: this.config.theme.warning,
      find: this.config.theme.secondary,
      restore: this.config.theme.accent
    };
    return colorMap[event] || this.config.theme.text;
  }

  private updateEventTable(): void {
    const headers = [
      'Time',
      'Elapsed', 
      'File',
      'Event',
      'Lines',
      'Blocks',
      'Directory'
    ];

    const displayEvents = this.displayMode === 'unique' 
      ? this.getUniqueEvents() 
      : this.events;

    const rows = displayEvents.slice(-50).map(event => { // Show last 50 events
      const eventIcon = this.config.showIcons ? ICONS.events[event.event] || '' : '';
      const eventColor = this.getEventColor(event.event);
      
      return [
        this.truncateWithWidth(event.timestamp, this.columnConfig.timestamp),
        this.truncateWithWidth(event.elapsed, this.columnConfig.elapsed),
        this.truncateWithWidth(event.filename, this.columnConfig.filename),
        `{${eventColor}-fg}${eventIcon}${event.event.toUpperCase()}{/}`,
        event.lines.toString(),
        event.blocks.toString(),
        this.truncateWithWidth(event.directory, this.columnConfig.directory)
      ];
    });

    this.eventTable.setData([headers, ...rows]);
  }

  private truncateWithWidth(text: string, maxWidth: number): string {
    const width = stringWidth(text);
    if (width <= maxWidth) {
      return text;
    }
    
    // Binary search for optimal truncation point
    let left = 0;
    let right = text.length;
    let result = '';
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = text.slice(0, mid) + '...';
      const candidateWidth = stringWidth(candidate);
      
      if (candidateWidth <= maxWidth) {
        result = candidate;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return result || text.slice(0, 1) + '...';
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
    // Quit application
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });

    // Refresh display
    this.screen.key(['r', 'f5'], () => {
      this.refresh();
    });

    // Toggle theme
    this.screen.key(['t'], () => {
      this.cycleTheme();
    });

    // Toggle display mode
    this.screen.key(['f'], () => {
      this.toggleDisplayMode();
    });

    // Focus event table
    this.eventTable.focus();
    
    // Handle table selection
    this.eventTable.on('select', (item, index) => {
      if (index > 0) { // Skip header
        const event = this.events[index - 1];
        if (event) {
          this.showEventDetails(event);
        }
      }
    });
  }

  private cycleTheme(): void {
    const themes = Object.keys(THEMES);
    const currentIndex = themes.indexOf(this.selectedTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.selectedTheme = themes[nextIndex];
    this.config.theme = THEMES[this.selectedTheme];
    
    // Update all panel styles
    this.updatePanelStyles();
    this.refresh();
  }

  private updatePanelStyles(): void {
    // Update styles for all panels with new theme
    const panels = [this.headerPanel, this.sidePanel, this.statusPanel, this.footerPanel];
    panels.forEach(panel => {
      if (panel) {
        panel.style.fg = this.config.theme.text;
        panel.style.bg = this.config.theme.background;
      }
    });

    if (this.eventTable) {
      this.eventTable.style.fg = this.config.theme.text;
      this.eventTable.style.bg = this.config.theme.background;
    }
  }

  private toggleDisplayMode(): void {
    this.displayMode = this.displayMode === 'all' ? 'unique' : 'all';
    this.updateEventTable();
    this.refresh();
  }

  private showEventDetails(event: EventData): void {
    const detailsBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 60,
      height: 15,
      border: {
        type: 'line',
        fg: this.config.theme.accent as any
      },
      style: {
        fg: this.config.theme.text,
        bg: this.config.theme.background,
        border: {
          fg: this.config.theme.accent as any
        }
      },
      label: ` ${ICONS.ui.info} Event Details `,
      content: [
        `{${this.config.theme.accent}-fg}File:{/} ${event.filename}`,
        `{${this.config.theme.accent}-fg}Event:{/} ${ICONS.events[event.event]} ${event.event.toUpperCase()}`,
        `{${this.config.theme.accent}-fg}Timestamp:{/} ${event.timestamp}`,
        `{${this.config.theme.accent}-fg}Elapsed:{/} ${event.elapsed}`,
        `{${this.config.theme.accent}-fg}Lines:{/} ${event.lines}`,
        `{${this.config.theme.accent}-fg}Blocks:{/} ${event.blocks}`,
        `{${this.config.theme.accent}-fg}Directory:{/} ${event.directory}`,
        '',
        `{center}{${this.config.theme.info}-fg}Press any key to close{/}`
      ].join('\n'),
      tags: true,
      keys: true,
      mouse: true
    });

    detailsBox.key(['escape', 'enter', 'space'], () => {
      this.screen.remove(detailsBox);
      this.eventTable.focus();
      this.screen.render();
    });

    detailsBox.focus();
    this.screen.render();
  }

  public addEvent(event: EventData): void {
    this.events.push(event);
    this.updateEventTable();
    this.updatePanels();
    this.refresh();
  }

  public addEvents(events: EventData[]): void {
    this.events.push(...events);
    this.updateEventTable();
    this.updatePanels();
    this.refresh();
  }

  private updatePanels(): void {
    this.headerPanel.setContent(this.buildHeaderContent());
    this.sidePanel.setContent(this.buildSidePanelContent());
    this.statusPanel.setContent(this.buildStatusContent());
    this.footerPanel.setContent(this.buildFooterContent());
  }

  public refresh(): void {
    this.screen.render();
  }

  public destroy(): void {
    this.screen.destroy();
  }
}