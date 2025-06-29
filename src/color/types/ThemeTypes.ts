/**
 * Theme Type Definitions for Color Management
 * FUNC-207: Display Color Customization
 */

// Import existing ThemeColors from common.ts for compatibility
import { ThemeColors as CommonThemeColors } from '../../types/common';

// Basic color types
export type EventTypeColor = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
export type StatusType = 'label' | 'count' | 'separator';
export type TableElementType = 'column_headers' | 'row' | 'event_timestamp' | 'event_type' | 
                               'lines' | 'blocks' | 'directory' | 'file_name' | 'elapsed';
export type MessageType = 'info' | 'warning' | 'error';

// RGB Color definition
export interface RGBColor {
  r: number;
  g: number;  
  b: number;
}

// Table color configurations
export interface TableColors {
  column_headers?: string;
  row?: string;
  event_timestamp?: string;
  event_type?: string;
  lines?: string;
  blocks?: string;
  directory?: string;
  file_name?: string;
  elapsed?: string;
}

// Status bar color configurations
export interface StatusBarColors {
  label?: string;
  count?: string;
  separator?: string;
}

// Key color configurations
export interface KeyColors {
  active?: string;
  inactive?: string;
}

// Filter color configurations  
export interface FilterColors {
  find?: KeyColors;
  create?: KeyColors;
  modify?: KeyColors;
  delete?: KeyColors;
  move?: KeyColors;
  restore?: KeyColors;
}

// Message area color configurations
export interface MessageColors {
  info?: string;
  warning?: string;
  error?: string;
}

// Re-export ThemeColors for this module
export type ThemeColors = CommonThemeColors;

// Theme metadata
export interface ThemeMetadata {
  name: string;
  description?: string;
  version?: string;
  lastUpdated?: string;
  author?: string;
}

// Complete theme structure
export interface ColorTheme extends ThemeMetadata {
  colors: ThemeColors;
}

// Theme info for listing
export interface ThemeInfo {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
  author?: string;
}

// Theme loading result
export interface ThemeLoadResult {
  success: boolean;
  theme?: ColorTheme;
  error?: string;
}

// Color value types
export type ColorValue = string | RGBColor;

// ANSI color mapping
export interface ColorMap {
  [key: string]: string;
}

// Theme validation result
export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}