/**
 * Filter Status Renderer (FUNC-020)
 * Filter status line rendering
 * FUNC-207: Integrated with ColorManager for customizable colors
 */

import ColorManager = require('../color/ColorManager');

interface FilterItem {
  key: string;
  name: string;
  type: string;
}

interface FilterState {
  find?: boolean;
  create?: boolean;
  modify?: boolean;
  delete?: boolean;
  move?: boolean;
  restore?: boolean;
  [key: string]: boolean | undefined;
}

class FilterStatusRenderer {
  /**
   * Render filter line
   * @param filters - Filter state object
   * @param width - Screen width (optional)
   * @param configPath - Config path for ColorManager (optional)
   * @returns Rendering string
   */
  static renderFilterLine(filters: FilterState, width: number = process.stdout.columns || 80, configPath: string = '.cctop'): string {
    // FUNC-207: Initialize ColorManager for theming
    const colorManager = new ColorManager(configPath);
    
    const filterItems: FilterItem[] = [
      { key: 'f', name: 'Find', type: 'find' },
      { key: 'c', name: 'Create', type: 'create' },
      { key: 'm', name: 'Modify', type: 'modify' },
      { key: 'd', name: 'Delete', type: 'delete' },
      { key: 'v', name: 'Move', type: 'move' },
      { key: 'r', name: 'Restore', type: 'restore' }  // FUNC-023 specification compliant
    ];
    
    // Render each filter item
    const filterParts: string[] = filterItems.map(item => {
      const isActive: boolean = filters[item.type] || false;
      return this.renderFilterItem(item.key, item.name, isActive, colorManager);
    });
    
    // Build filter line
    const filterLine: string = filterParts.join(' ');
    
    // Padding to match screen width
    const padding: string = ' '.repeat(Math.max(0, width - this.stripAnsi(filterLine).length));
    
    return filterLine + padding;
  }
  
  /**
   * Render individual filter item (FUNC-207: Theme-based coloring)
   * @param key - Key character
   * @param name - Filter name
   * @param isActive - Active state
   * @param colorManager - ColorManager instance
   * @returns Rendering string
   */
  static renderFilterItem(key: string, name: string, isActive: boolean, colorManager: ColorManager): string {
    // FUNC-207: Use ColorManager for theme-based colors
    const keyColorPath: string = isActive ? 'event_filters.key_active' : 'event_filters.key_inactive';
    const nameColorPath: string = isActive ? 'event_filters.label_active' : 'event_filters.label_inactive';
    
    const coloredKey: string = colorManager.colorize(`[${key}]`, keyColorPath);
    const coloredName: string = colorManager.colorize(name, nameColorPath);
    
    return `${coloredKey}:${coloredName}`;
  }
  
  /**
   * Get filter status summary
   * @param filters - Filter state object
   * @returns Status summary string
   */
  static getFilterSummary(filters: FilterState): string {
    const activeFilters: string[] = Object.entries(filters)
      .filter(([key, value]) => value && ['find', 'create', 'modify', 'delete', 'move', 'restore'].includes(key))
      .map(([key]) => key);
    
    if (activeFilters.length === 6) {  // Changed to 6 due to restore addition
      return 'All filters active';
    } else if (activeFilters.length === 0) {
      return 'No filters active';
    } else {
      return `Active: ${activeFilters.join(', ')}`;
    }
  }
  
  /**
   * Remove ANSI escape codes (for string length calculation)
   * @param str - String
   * @returns String with ANSI codes removed
   */
  static stripAnsi(str: string): string {
    // Regular expression to remove ANSI escape sequences
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    return str.replace(ansiRegex, '');
  }
  
  /**
   * Get filter line height (usually 1 line)
   * @returns Number of lines
   */
  static getFilterLineHeight(): number {
    return 1;
  }
  
  /**
   * Get minimum required width
   * @returns Minimum width
   */
  static getMinimumWidth(): number {
    // Minimum width for [f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
    return 60;  // 10 characters added due to restore addition
  }
}

export = FilterStatusRenderer;