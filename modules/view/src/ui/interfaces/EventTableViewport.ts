/**
 * EventTable Viewport Interface
 * Defines contract for EventTable interaction without exposing implementation details
 * Part of Phase 3: Architecture improvement for responsibility separation
 */

import blessed from 'blessed';
import { EventRow } from '../../types/event-row';
import { ViewConfig } from '../../config/ViewConfig';

export interface ViewportInfo {
  selectedIndex: number;
  totalEvents: number;
  viewportStart: number;
  viewportEnd: number;
}

export interface EventTableViewport {
  /**
   * Update EventTable with new data and selection
   */
  updateContent(events: EventRow[], selectedIndex: number, hasMoreData?: boolean): void;
  
  /**
   * Get column header string for display
   */
  getColumnHeader(): string;
  
  /**
   * Update screen width for responsive layout
   */
  updateScreenWidth(width: number): void;
  
  /**
   * Force refresh of all rows (for elapsed time updates)
   */
  refresh(): void;
  
  /**
   * Get blessed box element for layout management
   */
  getBox(): blessed.Widgets.BoxElement;
  
  /**
   * Get current viewport information
   */
  getViewportInfo(): ViewportInfo;
  
  /**
   * Destroy the event table
   */
  destroy(): void;
  
  /**
   * Update ViewConfig and refresh display
   */
  setViewConfig(viewConfig: ViewConfig): void;
}