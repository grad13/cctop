/**
 * Style formatting utilities for blessed tags
 * Provides unified interface for applying colors, backgrounds, and text styles
 */

export type Color = 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'black';
export type TextStyle = 'bold' | 'underline' | 'blink' | 'inverse' | 'invisible';

/**
 * Apply foreground color to text
 */
export function fg(text: string, color: Color): string {
  return `{${color}-fg}${text}{/${color}-fg}`;
}

/**
 * Apply background color to text
 */
export function bg(text: string, color: Color): string {
  return `{${color}-bg}${text}{/${color}-bg}`;
}

/**
 * Apply bold style to text
 */
export function bold(text: string): string {
  return `{bold}${text}{/bold}`;
}

/**
 * Apply underline style to text
 */
export function underline(text: string): string {
  return `{underline}${text}{/underline}`;
}

/**
 * Apply multiple styles to text
 */
export function style(text: string, options: {
  fg?: Color;
  bg?: Color;
  bold?: boolean;
  underline?: boolean;
}): string {
  let result = text;
  
  // Apply styles in specific order for proper nesting
  if (options.bg) {
    result = bg(result, options.bg);
  }
  if (options.fg) {
    result = fg(result, options.fg);
  }
  if (options.bold) {
    result = bold(result);
  }
  if (options.underline) {
    result = underline(result);
  }
  
  return result;
}

/**
 * Strip all blessed style tags from text
 */
export function stripStyles(text: string): string {
  return text.replace(/\{[^}]+\}/g, '');
}

/**
 * Apply event type specific coloring
 */
export function eventTypeColor(eventType: string): string {
  const colorMap: Record<string, Color> = {
    'find': 'cyan',
    'create': 'green',
    'modify': 'yellow',
    'delete': 'red',
    'move': 'magenta',
    'restore': 'blue',
    'back': 'blue'
  };
  
  const color = colorMap[eventType.toLowerCase().trim()] || 'white';
  return fg(eventType, color);
}