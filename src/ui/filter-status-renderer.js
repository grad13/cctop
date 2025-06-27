/**
 * Filter Status Renderer (FUNC-020)
 * Filter status line rendering
 * FUNC-207: Integrated with ColorManager for customizable colors
 */

const ColorManager = require('../color/ColorManager');

class FilterStatusRenderer {
  /**
   * Render filter line
   * @param {Object} filters - Filter state object
   * @param {number} width - Screen width (optional)
   * @param {string} configPath - Config path for ColorManager (optional)
   * @returns {string} Rendering string
   */
  static renderFilterLine(filters, width = process.stdout.columns || 80, configPath = '.cctop') {
    // FUNC-207: Initialize ColorManager for theming
    const colorManager = new ColorManager(configPath);
    
    const filterItems = [
      { key: 'f', name: 'Find', type: 'find' },
      { key: 'c', name: 'Create', type: 'create' },
      { key: 'm', name: 'Modify', type: 'modify' },
      { key: 'd', name: 'Delete', type: 'delete' },
      { key: 'v', name: 'Move', type: 'move' },
      { key: 'r', name: 'Restore', type: 'restore' }  // FUNC-023 specification compliant
    ];
    
    // Render each filter item
    const filterParts = filterItems.map(item => {
      const isActive = filters[item.type];
      return this.renderFilterItem(item.key, item.name, isActive, colorManager);
    });
    
    // Build filter line
    const filterLine = filterParts.join(' ');
    
    // Padding to match screen width
    const padding = ' '.repeat(Math.max(0, width - this.stripAnsi(filterLine).length));
    
    return filterLine + padding;
  }
  
  /**
   * Render individual filter item (FUNC-207: Theme-based coloring)
   * @param {string} key - Key character
   * @param {string} name - Filter name
   * @param {boolean} isActive - Active state
   * @param {ColorManager} colorManager - ColorManager instance
   * @returns {string} Rendering string
   */
  static renderFilterItem(key, name, isActive, colorManager) {
    // FUNC-207: Use ColorManager for theme-based colors
    const keyColorPath = isActive ? 'event_filters.key_active' : 'event_filters.key_inactive';
    const nameColorPath = isActive ? 'event_filters.label_active' : 'event_filters.label_inactive';
    
    const coloredKey = colorManager.colorize(`[${key}]`, keyColorPath);
    const coloredName = colorManager.colorize(name, nameColorPath);
    
    return `${coloredKey}:${coloredName}`;
  }
  
  /**
   * Get filter status summary
   * @param {Object} filters - Filter state object
   * @returns {string} Status summary string
   */
  static getFilterSummary(filters) {
    const activeFilters = Object.entries(filters)
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
   * @param {string} str - String
   * @returns {string} String with ANSI codes removed
   */
  static stripAnsi(str) {
    // Regular expression to remove ANSI escape sequences
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    return str.replace(ansiRegex, '');
  }
  
  /**
   * Get filter line height (usually 1 line)
   * @returns {number} Number of lines
   */
  static getFilterLineHeight() {
    return 1;
  }
  
  /**
   * Get minimum required width
   * @returns {number} Minimum width
   */
  static getMinimumWidth() {
    // Minimum width for [f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
    return 60;  // 10 characters added due to restore addition
  }
}

module.exports = FilterStatusRenderer;