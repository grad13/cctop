/**
 * Event Display Type Definitions
 * Interfaces for event display management and formatting
 */

import { EventData, FilterState } from './event.types';
import { Theme } from './theme.types';
import { ColumnWidths } from './display.types';

// Event display manager interface
export interface EventDisplayManager {
  displayEvents(events: EventData[], filterState: FilterState): void;
  setColumnWidths(widths: ColumnWidths): void;
  setTheme(theme: Theme): void;
  getDisplayedEvents(): EventData[];
  clear(): void;
  getStats?(): EventDisplayStats;
  getEventsToDisplay?(): EventData[];
}

// Event display manager configuration
export interface EventDisplayManagerConfig {
  maxEvents?: number;
  verbose?: boolean;
  debug?: boolean;
  mode?: string;
}

// Event display statistics
export interface EventDisplayStats {
  totalEvents: number;
  visibleEvents: number;
  filteredEvents: number;
  lastUpdate: number;
  displayMode?: string;
  modeIndicator?: string;
  uniqueFiles?: number;
  stats?: any;
  displayText?: string;
}

// Event display status
export interface EventDisplayStatus {
  active: boolean;
  mode: string;
  lastError?: Error;
  displayMode?: string;
  totalEvents?: number;
  uniqueFiles?: number;
  maxLines?: number;
}

// Event database interface
export interface EventDatabase {
  getEvents(): Promise<any[]>;
  getEventCount(): Promise<number>;
  getRecentEvents?(limit: number): Promise<any[]>;
}

// Event formatter type
export type EventFormatter = (event: any) => string;

// Filter states type alias
export type FilterStates = FilterState;