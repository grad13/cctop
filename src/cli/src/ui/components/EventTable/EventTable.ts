/**
 * EventTable - Optimized event list display component
 * 
 * Display-only component with intelligent diff detection for performance.
 * Handles formatting and rendering of event rows with minimal re-rendering.
 */

import blessed from 'blessed';
import { EventRow as EventRowData } from '../../../types/event-row';
import { EventRow } from './EventRow';
import { EventTableOptions } from './types';
import { HeaderRenderer } from './renderers';
import { stripTags } from './utils/stringUtils';
import { style } from '../../utils/styleFormatter';

export class EventTable {
  private box: blessed.Widgets.BoxElement;
  private screenWidth: number;
  
  // EventRow instances management
  private rows: Map<number, EventRow> = new Map(); // key: event.id
  private rowOrder: number[] = []; // ordered event IDs
  private selectedId: number | null = null;
  private directoryWidth: number = 40; // Will be calculated dynamically
  
  constructor(options: EventTableOptions, screenWidth: number) {
    this.screenWidth = screenWidth;
    this.calculateDirectoryWidth();
    
    // Create blessed box
    this.box = blessed.box({
      parent: options.parent,
      top: options.top || 0,
      left: options.left || 0,
      width: options.width || '100%',
      height: options.height || '100%',
      keys: false,
      scrollable: false,
      alwaysScroll: false,
      style: options.style || {
        fg: 'white',
        bg: 'transparent'
      },
      tags: true,
      mouse: false
    });
  }

  /**
   * Main update method - handles event list changes
   */
  update(events: EventRowData[], selectedIndex: number): void {
    // Determine selected event ID
    const newSelectedId = selectedIndex >= 0 && selectedIndex < events.length 
      ? events[selectedIndex].id 
      : null;
    
    // Update rows based on new events
    this.updateRows(events, newSelectedId);
    
    // Render all rows
    this.render();
  }

  /**
   * Update EventRow instances based on new event data
   */
  private updateRows(events: EventRowData[], selectedId: number | null): void {
    const newIds = new Set(events.map(e => e.id));
    const currentIds = new Set(this.rows.keys());
    
    // Remove rows that no longer exist
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        this.rows.delete(id);
      }
    }
    
    // Update or create rows
    const newRowOrder: number[] = [];
    for (const event of events) {
      let row = this.rows.get(event.id);
      
      if (row) {
        // Update existing row
        row.update(event);
      } else {
        // Create new row
        row = new EventRow(event, this.directoryWidth);
        this.rows.set(event.id, row);
      }
      
      // Update selection state
      row.setSelected(event.id === selectedId);
      newRowOrder.push(event.id);
    }
    
    this.rowOrder = newRowOrder;
    this.selectedId = selectedId;
  }

  /**
   * Render all rows to the box
   */
  private render(): void {
    const formattedRows: string[] = [];
    
    // Render each row in order
    for (const id of this.rowOrder) {
      const row = this.rows.get(id);
      if (row) {
        formattedRows.push(row.render());
      }
    }
    
    // Add end of data if needed
    if (this.shouldShowEndOfData()) {
      formattedRows.push(this.renderEndOfData());
    }
    
    // Update display
    this.updateContent(formattedRows.join('\n'));
  }

  /**
   * Should show "end of data" message
   */
  private shouldShowEndOfData(): boolean {
    // This would need to be passed in or configured
    // For now, always false since we don't have this info
    return false;
  }

  /**
   * Render "end of data" message
   */
  private renderEndOfData(): string {
    const endMessage = '─── end of data ───';
    const padding = Math.max(0, Math.floor((this.screenWidth - endMessage.length) / 2));
    return ' '.repeat(padding) + style(endMessage, { fg: 'white', bold: true });
  }

  /**
   * Update box content with minimal re-render
   */
  private updateContent(content: string): void {
    const currentContent = this.box.getContent();
    const currentStripped = stripTags(currentContent);
    const newStripped = stripTags(content);
    
    if (currentStripped !== newStripped) {
      this.box.setContent(content);
      this.box.screen.render();
    }
  }

  /**
   * Calculate dynamic directory column width
   */
  private calculateDirectoryWidth(): void {
    // Fixed columns total: 19 + 1 + 8 + 1 + 35 + 1 + 8 + 1 + 5 + 1 + 4 + 1 + 7 + 1 = 93
    const fixedWidth = 93;
    this.directoryWidth = Math.max(20, this.screenWidth - fixedWidth);
  }

  /**
   * Get table header
   */
  getHeader(): string {
    return HeaderRenderer.renderHeader(this.screenWidth, this.directoryWidth);
  }

  /**
   * Get column header line only
   */
  getColumnHeader(): string {
    return HeaderRenderer.renderColumnLine(this.directoryWidth);
  }

  /**
   * Get the blessed box element
   */
  getBox(): blessed.Widgets.BoxElement {
    return this.box;
  }

  /**
   * Update screen width (e.g., on terminal resize)
   */
  updateScreenWidth(width: number): void {
    this.screenWidth = width;
    this.calculateDirectoryWidth();
    
    // Update all rows with new directory width
    for (const row of this.rows.values()) {
      row.setDirectoryWidth(this.directoryWidth);
    }
  }

  /**
   * Force refresh of all rows
   */
  refresh(): void {
    for (const row of this.rows.values()) {
      row.invalidate();
    }
    this.render();
  }

  /**
   * Destroy the event table
   */
  destroy(): void {
    this.rows.clear();
    this.box.destroy();
  }
}