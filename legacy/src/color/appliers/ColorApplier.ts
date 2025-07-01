/**
 * Color Applier
 * Applies theme colors to text using chalk
 */

import chalk = require('chalk');
import { 
  ColorTheme, 
  TableElementType, 
  EventTypeColor, 
  StatusType,
  MessageType 
} from '../types/ThemeTypes';
import { ColorConverter } from '../converters/ColorConverter';

export class ColorApplier {
  constructor(
    private colorConverter: ColorConverter,
    private currentTheme: ColorTheme | null
  ) {}

  /**
   * Update current theme
   */
  updateTheme(theme: ColorTheme | null): void {
    this.currentTheme = theme;
  }

  /**
   * Apply table element colors
   */
  applyTableColors(text: string, elementType: TableElementType): string {
    const colorPath = `table.${elementType}`;
    const color = this.getColorFromTheme(colorPath);
    
    if (color) {
      return this.applyChalkColor(text, color);
    }
    
    // Default colors for table elements
    const defaults: Record<TableElementType, string> = {
      'column_headers': 'white',
      'row': 'white',
      'event_timestamp': 'gray',
      'event_type': 'white',
      'lines': 'cyan',
      'blocks': 'yellow',
      'directory': 'blue',
      'file_name': 'white',
      'elapsed': 'gray'
    };
    
    return this.applyChalkColor(text, defaults[elementType] || 'white');
  }

  /**
   * Apply event type colors
   */
  applyEventTypeColor(text: string, eventType: EventTypeColor): string {
    // Check theme first - using correct path for common.ts structure
    const themeColor = this.getColorFromTheme(`table.row.event_type.${eventType}`);
    if (themeColor) {
      return this.applyChalkColor(text, themeColor);
    }
    
    // Default event type colors
    const eventColors: Record<EventTypeColor, string> = {
      'find': 'cyan',
      'create': 'green',
      'modify': 'yellow',
      'delete': 'red',
      'move': 'magenta',
      'restore': 'blue'
    };
    
    return this.applyChalkColor(text, eventColors[eventType] || 'white');
  }

  /**
   * Apply status bar colors
   */
  applyStatusColor(text: string, statusType: StatusType): string {
    const colorPath = `status_bar.${statusType}`;
    const color = this.getColorFromTheme(colorPath);
    
    if (color) {
      return this.applyChalkColor(text, color);
    }
    
    // Default status colors
    const defaults: Record<StatusType, string> = {
      'label': 'white',
      'count': 'green',
      'separator': 'gray'
    };
    
    return this.applyChalkColor(text, defaults[statusType] || 'white');
  }

  /**
   * Apply general key colors
   */
  applyGeneralKeyColor(text: string, active: boolean): string {
    const key = active ? 'key_active' : 'key_inactive';
    const color = this.getColorFromTheme(`general_keys.${key}`);
    
    if (color) {
      return this.applyChalkColor(text, color);
    }
    
    // Default key colors
    return this.applyChalkColor(text, active ? 'green' : 'white');
  }

  /**
   * Apply filter key colors
   */
  applyFilterKeyColor(text: string, filterType: EventTypeColor, active: boolean): string {
    const key = active ? 'key_active' : 'key_inactive';
    const color = this.getColorFromTheme(`event_filters.${key}`);
    
    if (color) {
      return this.applyChalkColor(text, color);
    }
    
    // Fall back to event type color if active
    if (active) {
      return this.applyEventTypeColor(text, filterType);
    }
    
    return this.applyChalkColor(text, 'white');
  }

  /**
   * Apply message colors
   */
  applyMessageColor(text: string, messageType: MessageType): string {
    // Map message types to available message_area fields
    const mapping: Record<MessageType, string> = {
      'info': 'status',
      'warning': 'prompt',
      'error': 'summary'
    };
    
    const color = this.getColorFromTheme(`message_area.${mapping[messageType]}`);
    
    if (color) {
      return this.applyChalkColor(text, color);
    }
    
    // Default message colors
    const defaults: Record<MessageType, string> = {
      'info': 'cyan',
      'warning': 'yellow',
      'error': 'red'
    };
    
    return this.applyChalkColor(text, defaults[messageType] || 'white');
  }

  /**
   * Get color value from theme using dot notation path
   */
  private getColorFromTheme(path: string): string | undefined {
    if (!this.currentTheme || !this.currentTheme.colors) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current: any = this.currentTheme.colors;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Apply chalk color to text
   */
  private applyChalkColor(text: string, color: string): string {
    try {
      const chalkColor = this.colorConverter.parseColorValue(color);
      return chalkColor(text);
    } catch (error) {
      // Fallback to white on error
      console.warn(`[ColorApplier] Failed to apply color "${color}":`, error);
      return chalk.white(text);
    }
  }
}