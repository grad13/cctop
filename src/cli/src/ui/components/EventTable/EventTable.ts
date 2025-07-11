/**
 * EventTable - Optimized event list display component
 * 
 * Display-only component with intelligent diff detection for performance.
 * Handles formatting and rendering of event rows with minimal re-rendering.
 */

import blessed from 'blessed';
import { EventRow } from '../../../types/event-row';
import { EventTableOptions } from './types';
import { RowRenderer, HeaderRenderer } from './renderers';
import { stripTags } from './utils/stringUtils';

export class EventTable {
  private box: blessed.Widgets.BoxElement;
  private screenWidth: number;
  
  // State tracking for optimization
  private previousEvents: EventRow[] = [];
  private previousSelectedIndex: number = -1;
  private formattedRowsCache: Map<string, string> = new Map(); // key: eventId_isSelected
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
   * Main render method - optimized with diff detection
   */
  render(events: EventRow[], selectedIndex: number): void {
    // Fast path: selection-only change
    if (this.isSelectionOnlyChange(events, selectedIndex)) {
      this.updateSelectionOnly(selectedIndex);
      return;
    }
    
    // Full or partial update needed
    this.renderFull(events, selectedIndex);
  }

  /**
   * Check if only selection changed
   */
  private isSelectionOnlyChange(events: EventRow[], selectedIndex: number): boolean {
    if (selectedIndex === this.previousSelectedIndex) return false;
    if (events.length !== this.previousEvents.length) return false;
    
    // Compare event IDs to detect if list is the same
    for (let i = 0; i < events.length; i++) {
      if (events[i].id !== this.previousEvents[i].id) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Optimized update for selection change only
   */
  private updateSelectionOnly(newSelectedIndex: number): void {
    const formattedRows: string[] = [];
    
    // Get all cached rows, updating only selection states
    for (let i = 0; i < this.previousEvents.length; i++) {
      const event = this.previousEvents[i];
      const isSelected = i === newSelectedIndex;
      const wasSelected = i === this.previousSelectedIndex;
      
      // Only re-format if selection state changed
      if (isSelected || wasSelected) {
        const formatted = this.formatRow(event, i, isSelected);
        formattedRows.push(formatted);
      } else {
        // Use cached version
        const cacheKey = this.getCacheKey(event, false);
        const cached = this.formattedRowsCache.get(cacheKey);
        formattedRows.push(cached || this.formatRow(event, i, false));
      }
    }
    
    // Add end of data if needed
    if (this.shouldShowEndOfData()) {
      formattedRows.push(RowRenderer.renderEndOfData(this.screenWidth));
    }
    
    // Update display
    this.updateContent(formattedRows.join('\n'));
    this.previousSelectedIndex = newSelectedIndex;
  }

  /**
   * Full render with caching
   */
  private renderFull(events: EventRow[], selectedIndex: number): void {
    const formattedRows: string[] = [];
    
    // Clear cache if event list is completely different
    if (!this.haveSomeCommonEvents(events)) {
      this.formattedRowsCache.clear();
    }
    
    // Format each row
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const isSelected = i === selectedIndex;
      const formatted = this.formatRow(event, i, isSelected);
      formattedRows.push(formatted);
    }
    
    // Add end of data if needed
    if (this.shouldShowEndOfData()) {
      formattedRows.push(RowRenderer.renderEndOfData(this.screenWidth));
    }
    
    // Update display
    this.updateContent(formattedRows.join('\n'));
    
    // Save state
    this.previousEvents = events;
    this.previousSelectedIndex = selectedIndex;
  }

  /**
   * Format a single row with caching
   */
  private formatRow(event: EventRow, index: number, isSelected: boolean): string {
    const cacheKey = this.getCacheKey(event, isSelected);
    
    // Check cache first
    const cached = this.formattedRowsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Format new row
    const formatted = RowRenderer.renderRow(
      event,
      index,
      index, // absoluteIndex same as index since we receive visible events
      isSelected ? index : -1,
      this.directoryWidth
    );
    
    // Cache it
    this.formattedRowsCache.set(cacheKey, formatted);
    
    // Limit cache size to prevent memory bloat
    if (this.formattedRowsCache.size > 2000) {
      // Remove oldest entries
      const keysToDelete = Array.from(this.formattedRowsCache.keys()).slice(0, 500);
      keysToDelete.forEach(key => this.formattedRowsCache.delete(key));
    }
    
    return formatted;
  }

  /**
   * Generate cache key for a row
   */
  private getCacheKey(event: EventRow, isSelected: boolean): string {
    // Include all fields that affect display
    return `${event.id}_${isSelected}_${event.size}_${event.lines || 0}_${event.blocks || 0}`;
  }

  /**
   * Check if current and previous events have some overlap
   */
  private haveSomeCommonEvents(events: EventRow[]): boolean {
    if (this.previousEvents.length === 0) return false;
    
    const previousIds = new Set(this.previousEvents.map(e => e.id));
    return events.some(e => previousIds.has(e.id));
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
    // Fixed columns total: 19 + 1 + 9 + 1 + 35 + 1 + 8 + 1 + 6 + 1 + 8 + 1 + 7 + 1 = 99
    const fixedWidth = 99;
    this.directoryWidth = Math.max(20, this.screenWidth - fixedWidth);
  }

  /**
   * Get table header
   */
  getHeader(): string {
    return HeaderRenderer.renderHeader(this.screenWidth);
  }

  /**
   * Get column header line only
   */
  getColumnHeader(): string {
    return HeaderRenderer.renderColumnLine();
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
    // Force re-render on next update
    this.formattedRowsCache.clear();
  }

  /**
   * Destroy the event table
   */
  destroy(): void {
    this.formattedRowsCache.clear();
    this.box.destroy();
  }
}