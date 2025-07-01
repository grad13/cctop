/**
 * Event Filter Manager (FUNC-020)
 * Event type-based filtering management
 */

const EventEmitter = require('events');

class EventFilterManager extends EventEmitter {
  constructor() {
    super();
    
    // All filters ON by default
    this.filters = {
      find: true,
      create: true,
      modify: true,
      delete: true,
      move: true,
      restore: true
    };
    
    // Key mapping (FUNC-023 specification compliant)
    this.keyMapping = {
      'f': 'find',
      'c': 'create',
      'm': 'modify',
      'd': 'delete',
      'v': 'move',    // 'v' for moVe (m already used for modify)
      'r': 'restore'  // 'r' for restore (FUNC-023 compliant)
    };
  }
  
  /**
   * Returns whether the specified event type can be displayed
   * @param {string} eventType - Event type
   * @returns {boolean} True if displayable
   */
  isVisible(eventType) {
    // Unknown event types are hidden by default
    if (!(eventType in this.filters)) {
      return false;
    }
    return this.filters[eventType];
  }
  
  /**
   * Toggle filter state
   * @param {string} eventType - Event type
   */
  toggleFilter(eventType) {
    if (eventType in this.filters) {
      this.filters[eventType] = !this.filters[eventType];
      this.emit('filterChanged', {
        eventType,
        isVisible: this.filters[eventType],
        allFilters: this.getFilterStates()
      });
    }
  }
  
  /**
   * Toggle filter from key input
   * @param {string} key - Pressed key
   * @returns {boolean} True if filter was toggled
   */
  toggleByKey(key) {
    const eventType = this.keyMapping[key.toLowerCase()];
    if (eventType) {
      this.toggleFilter(eventType);
      return true;
    }
    return false;
  }
  
  /**
   * Get all filter states
   * @returns {Object} Filter state object
   */
  getFilterStates() {
    return { ...this.filters };
  }
  
  /**
   * Filter event array
   * @param {Array} events - Event array
   * @returns {Array} Filtered event array
   */
  filterEvents(events) {
    return events.filter(event => this.isVisible(event.event_type));
  }
  
  /**
   * Reset filters (all ON)
   */
  resetFilters() {
    Object.keys(this.filters).forEach(key => {
      this.filters[key] = true;
    });
    this.emit('filterChanged', {
      eventType: 'all',
      isVisible: true,
      allFilters: this.getFilterStates()
    });
  }
  
  /**
   * Get displayable filter key mapping
   * @returns {Object} Key mapping (main ones only)
   */
  getKeyMapping() {
    return { ...this.keyMapping };
  }
  
  /**
   * Restore filter state from config
   * @param {Object} config - Configuration object
   */
  loadFromConfig(config) {
    if (config && config.monitoring && config.monitoring.eventFilters) {
      const eventFilters = config.monitoring.eventFilters;
      Object.keys(eventFilters).forEach(key => {
        if (key in this.filters) {
          this.filters[key] = eventFilters[key];
        }
      });
    }
  }
}

module.exports = EventFilterManager;