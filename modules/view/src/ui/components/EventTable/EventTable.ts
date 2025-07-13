/**
 * EventTable - Optimized event list display component
 * 
 * Display-only component with intelligent diff detection for performance.
 * Handles formatting and rendering of event rows with minimal re-rendering.
 */

import blessed from 'blessed';
import { EventRow as EventRowData } from '../../../types/event-row';
import { EventRow } from './EventRow';
import { EventTableOptions, EventTableColors, generateColorsFromView } from './types';
import { HeaderRenderer } from './renderers';
import { stripTags } from './utils/stringUtils';
import { style } from '../../utils/styleFormatter';
import { ViewConfig, defaultViewConfig } from '../../../config/ViewConfig';
import { EventTableViewport, ViewportInfo } from '../../interfaces/EventTableViewport';

export class EventTable implements EventTableViewport {
  private box: blessed.Widgets.BoxElement;
  private screenWidth: number;
  
  // EventRow instances management
  private rows: Map<number, EventRow> = new Map(); // key: event.id
  private rowOrder: number[] = []; // ordered event IDs
  private selectedId: number | null = null;
  private directoryWidth: number = 40; // Will be calculated dynamically
  private colors: EventTableColors;
  private directoryMutePaths?: string[];
  private viewConfig: ViewConfig;
  private hasMoreData: boolean = true; // Whether more data is available to load
  
  constructor(options: EventTableOptions, screenWidth: number) {
    this.screenWidth = screenWidth;
    
    // Store ViewConfig reference
    this.viewConfig = options.viewConfig || defaultViewConfig;
    
    this.colors = generateColorsFromView(this.viewConfig);
    this.directoryMutePaths = this.viewConfig.display.directoryMutePaths;
    
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
   * Update EventTable with new data and selection (EventTableViewport interface)
   */
  updateContent(events: EventRowData[], selectedIndex: number, hasMoreData: boolean = true): void {
    this.hasMoreData = hasMoreData;
    this.update(events, selectedIndex);
  }

  /**
   * Main update method - handles event list changes (private implementation)
   */
  private update(events: EventRowData[], selectedIndex: number): void {
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
        row = new EventRow(event, this.viewConfig, this.directoryWidth, this.colors, this.directoryMutePaths);
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
   * Update ViewConfig and refresh all rows
   */
  setViewConfig(newViewConfig: ViewConfig): void {
    this.viewConfig = newViewConfig;
    this.colors = generateColorsFromView(this.viewConfig);
    this.directoryMutePaths = this.viewConfig.display.directoryMutePaths;
    
    // Update all existing rows with new directoryMutePaths
    for (const row of this.rows.values()) {
      row.setDirectoryMutePaths(this.directoryMutePaths);
    }
    
    this.calculateDirectoryWidth();
    this.render();
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
    this.updateBoxContent(formattedRows.join('\n'));
  }

  /**
   * Should show "end of data" message
   */
  private shouldShowEndOfData(): boolean {
    // Show "end of data" when no more data is available to load
    return !this.hasMoreData;
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
  private updateBoxContent(content: string): void {
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
    // Calculate fixed width from ViewConfig
    let fixedWidth = 0;
    let columnCount = 0;
    
    const columns = this.viewConfig.display.columns;
    const columnsOrder = this.viewConfig.display['columns-order'] || [];
    
    for (const columnName of columnsOrder) {
      const columnConfig = columns[columnName];
      if (columnConfig && columnConfig.visible && columnConfig.width !== 'auto') {
        fixedWidth += columnConfig.width as number;
        columnCount++;
      }
    }
    
    // Add spacing between columns (1 space between each column)
    const spacing = Math.max(0, columnCount);
    fixedWidth += spacing;
    
    this.directoryWidth = Math.max(20, this.screenWidth - fixedWidth);
  }

  /**
   * Get table header
   */
  getHeader(): string {
    return HeaderRenderer.renderHeader(this.viewConfig, this.screenWidth, this.directoryWidth);
  }

  /**
   * Get column header line only
   */
  getColumnHeader(): string {
    return HeaderRenderer.renderColumnLine(this.viewConfig, this.directoryWidth);
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
   * Get current viewport information (EventTableViewport interface)
   */
  getViewportInfo(): ViewportInfo {
    return {
      selectedIndex: this.selectedId || -1,
      totalEvents: this.rowOrder.length,
      viewportStart: 0, // EventTable manages all visible events
      viewportEnd: this.rowOrder.length
    };
  }

  /**
   * Destroy the event table
   */
  destroy(): void {
    this.rows.clear();
    this.box.destroy();
  }
}