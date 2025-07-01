/**
 * Beautiful color theme configuration
 */

import { ThemeColors } from './types';

export const THEMES = {
  default: {
    primary: 'cyan',
    secondary: 'blue', 
    accent: 'magenta',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    border: 'gray',
    text: 'white',
    background: 'black'
  } as ThemeColors,

  ocean: {
    primary: 'cyan',
    secondary: 'blue',
    accent: 'magenta',
    success: 'green',
    warning: 'yellow', 
    error: 'red',
    info: 'blue',
    border: 'blue',
    text: 'white',
    background: 'black'
  } as ThemeColors,

  sunset: {
    primary: 'yellow',
    secondary: 'red',
    accent: 'magenta',
    success: 'green',
    warning: 'yellow',
    error: 'red', 
    info: 'cyan',
    border: 'yellow',
    text: 'white',
    background: 'black'
  } as ThemeColors
};

export const ICONS = {
  events: {
    create: '✨',
    modify: '✏️', 
    delete: '🗑️',
    move: '📁',
    find: '🔍',
    restore: '♻️'
  },
  ui: {
    logo: '🚀',
    folder: '📂',
    file: '📄',
    arrow: '→',
    bullet: '•',
    check: '✓',
    cross: '✗',
    warning: '⚠️',
    info: 'ℹ️'
  },
  navigation: {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    enter: '⏎',
    escape: '⎋'
  }
};

export const BORDERS = {
  double: 'line',
  single: 'line',
  rounded: 'line',
  thick: 'line'
} as const;