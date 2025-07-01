/**
 * Status Area Type Definitions
 * Status bar and progress bar interfaces
 */

// Status area configuration
export interface StatusAreaConfig {
  showStats?: boolean;
  showFilters?: boolean;
  showTime?: boolean;
  showPath?: boolean;
  maxLines?: number;
  enabled?: boolean;
  scrollSpeed?: number;
  updateInterval?: number;
}

// Progress bar options
export interface ProgressBarOptions {
  width?: number;
  complete?: string;
  incomplete?: string;
  head?: string;
  renderThrottle?: number;
}

// Status bar interface
export interface StatusBar {
  update(message: string): void;
  updateProgress(current: number, total: number): void;
  clear(): void;
}