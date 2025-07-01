/**
 * Theme Type Definitions
 * Color themes and color management interfaces
 */

import { EventType } from './event.types';

// Theme color definition
export interface ThemeColor {
  find: string;
  create: string;
  modify: string;
  delete: string;
  move: string;
  restore: string;
  header: string;
  footer: string;
  border: string;
  selection: string;
  default: string;
  table?: string | {
    column_headers: string;
    row: {
      event_timestamp: string;
      elapsed_time: string;
      file_name: string;
      event_type: {
        find: string;
        create: string;
        modify: string;
        delete: string;
        move: string;
        restore: string;
      };
      lines: string;
      blocks: string;
      directory: string;
    };
  };
  status_bar?: string | {
    label: string;
    count: string;
    separator: string;
  };
  [key: string]: any;  // Allow additional properties
}

// Alias for backward compatibility
export interface ThemeColors extends ThemeColor {}

// RGB color components
export interface RGBComponents {
  r: number;
  g: number;
  b: number;
}

// Theme definition
export interface Theme {
  name: string;
  colors: ThemeColor;
}

// Theme configuration
export interface ThemeConfig {
  themes: Theme[];
  default: string;
}

// Current theme state
export interface CurrentTheme {
  name: string;
  timestamp: number;
}

// Color manager interface
export interface ColorManager {
  getEventColor(eventType: EventType): string;
  getThemeColor(element: keyof ThemeColor): string;
  getCurrentTheme(): Theme;
  setTheme(themeName: string): void;
  listThemes(): string[];
}

// Additional color types
export interface ColorMap {
  [key: string]: string;
}

export interface ColorConfig {
  default: ColorMap;
  custom?: ColorMap;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface ThemeMetadata {
  name: string;
  description?: string;
  author?: string;
  version?: string;
}

export interface FullThemeData extends Theme {
  metadata?: ThemeMetadata;
  lastUpdated?: number;
  description?: string;
  version?: string;
}

export interface ThemeInfoResult {
  name: string;
  isDefault: boolean;
  colors: ThemeColor;
  description?: string;
  version?: string;
  lastUpdated?: number;
}

export interface ThemeData {
  colors: ThemeColor;
  metadata?: ThemeMetadata;
  name?: string;
  description?: string;
  version?: string;
}

export interface ThemeInfo {
  name: string;
  theme: ThemeData;
  isDefault: boolean;
}