/**
 * Type definitions for Beautiful CCTOP UI
 */

export interface EventData {
  id?: number;
  timestamp: string;
  elapsed: string;
  filename: string;
  event: 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
  lines: number;
  blocks: number;
  directory: string;
}

export type DisplayMode = 'all' | 'unique';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  text: string;
  background: string;
}

export interface UIConfig {
  theme: ThemeColors;
  animations: boolean;
  doubleBuffer: boolean;
  showIcons: boolean;
}

export interface ColumnConfig {
  timestamp: number;
  elapsed: number;
  filename: number;
  event: number;
  lines: number;
  blocks: number;
  directory: number;
}