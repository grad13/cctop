import * as blessed from 'blessed';
import { FileEvent } from '@cctop/shared';
import { EventFormatter } from '../display/formatter';

export interface TerminalUIOptions {
  refreshRate: number;
  maxRows: number;
  colorEnabled: boolean;
}

export class TerminalUI {
  private screen: blessed.Widgets.Screen;
  private eventBox: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private formatter: EventFormatter;
  private options: TerminalUIOptions;
  private events: FileEvent[] = [];

  constructor(options: TerminalUIOptions) {
    this.options = options;
    this.formatter = new EventFormatter({
      maxWidth: process.stdout.columns || 80,
      colorEnabled: options.colorEnabled
    });

    // Create blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      autoPadding: true,
      warning: true
    });

    // Create event display box
    this.eventBox = blessed.box({
      parent: this.screen,
      label: ' File Activity ',
      top: 0,
      left: 0,
      width: '100%',
      height: '80%',
      border: {
        type: 'line'
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      scrollbar: {
        style: {
          bg: 'blue'
        }
      }
    });

    // Create status box
    this.statusBox = blessed.box({
      parent: this.screen,
      label: ' Status ',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '20%',
      border: {
        type: 'line'
      },
      padding: 1
    });

    // Set up key bindings
    this.setupKeyBindings();
  }

  private setupKeyBindings(): void {
    this.screen.key(['q', 'C-c'], () => {
      this.destroy();
      process.exit(0);
    });

    this.screen.key(['pageup'], () => {
      this.eventBox.scroll(-10);
      this.screen.render();
    });

    this.screen.key(['pagedown'], () => {
      this.eventBox.scroll(10);
      this.screen.render();
    });

    this.screen.key(['home'], () => {
      this.eventBox.setScrollPerc(0);
      this.screen.render();
    });

    this.screen.key(['end'], () => {
      this.eventBox.setScrollPerc(100);
      this.screen.render();
    });
  }

  addEvents(newEvents: FileEvent[]): void {
    this.events.push(...newEvents);
    
    // Keep only the most recent events
    if (this.events.length > this.options.maxRows) {
      this.events = this.events.slice(-this.options.maxRows);
    }

    this.updateEventDisplay();
  }

  updateStats(stats: any): void {
    const lines = this.formatter.formatStats(stats);
    this.statusBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  private updateEventDisplay(): void {
    const lines = this.events.map(event => this.formatter.formatEvent(event));
    this.eventBox.setContent(lines.join('\n'));
    
    // Auto-scroll to bottom
    this.eventBox.setScrollPerc(100);
    
    this.screen.render();
  }

  render(): void {
    this.screen.render();
  }

  destroy(): void {
    this.screen.destroy();
  }

  showError(message: string): void {
    const errorBox = blessed.message({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '50%',
      height: 'shrink',
      label: ' Error ',
      content: message,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'red'
        }
      }
    });

    errorBox.display(message, () => {
      errorBox.destroy();
      this.screen.render();
    });
  }
}