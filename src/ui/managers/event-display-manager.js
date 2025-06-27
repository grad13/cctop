/**
 * Event Display Manager (Single Responsibility: Event data management)
 * Extracted from cli-display.js for better maintainability
 */

const chalk = require('chalk');

class EventDisplayManager {
  constructor(config = {}) {
    this.maxLines = config.maxEvents || 20;
    this.displayMode = config.mode || 'all'; // 'all' or 'unique'
    this.events = [];
    this.uniqueEvents = new Map(); // fileName -> latest event
    this.filterManager = null; // Set externally
    this.db = null; // Set externally
  }

  /**
   * Set dependencies
   */
  setFilterManager(filterManager) {
    this.filterManager = filterManager;
  }

  setDatabase(db) {
    this.db = db;
  }

  /**
   * Add new event to display
   */
  addEvent(eventData) {
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log('[EventDisplayManager] Adding event:', eventData.event_type, 'for', eventData.file_name);
    }
    
    // Check for duplicate event ID
    if (eventData.id && this.events.some(e => e.id === eventData.id)) {
      return; // Skip duplicate
    }
    
    this.events.unshift(eventData);
    
    // Remove old events if maximum lines exceeded
    if (this.events.length > this.maxLines) {
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`[EventDisplayManager] Trimming single event: from ${this.events.length} to ${this.maxLines}`);
      }
      this.events = this.events.slice(0, this.maxLines);
    }
    
    // Update map for Unique mode
    const fileName = eventData.file_name;
    this.uniqueEvents.set(fileName, eventData);
  }

  /**
   * Add multiple events to display (for progressive loading)
   */
  addEvents(events) {
    // Create a Set to track event IDs and prevent duplicates
    const existingIds = new Set(this.events.map(e => e.id));
    
    if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
      console.log(`[EventDisplayManager] Adding ${events.length} events, current count: ${this.events.length}, maxLines: ${this.maxLines}`);
    }
    
    // Add events in reverse order so newest appear first
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      
      // Skip if event already exists
      if (existingIds.has(event.id)) {
        continue;
      }
      
      this.events.unshift(event);
      this.uniqueEvents.set(event.file_name, event);
      existingIds.add(event.id);
    }
    
    // Enforce strict limit based on maxLines
    if (this.events.length > this.maxLines) {
      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`[EventDisplayManager] Trimming from ${this.events.length} to ${this.maxLines} events`);
      }
      this.events = this.events.slice(0, this.maxLines);
    }
  }

  /**
   * Load initial events from database
   */
  async loadInitialEvents() {
    if (!this.db) {
      console.warn('[EventDisplayManager] Database not set, skipping initial load');
      return;
    }

    try {
      const recentEvents = await this.db.getRecentEvents(this.maxLines);
      this.events = recentEvents;
      
      // Build map for Unique mode
      for (const event of recentEvents) {
        this.uniqueEvents.set(event.file_name, event);
      }

      if (process.env.NODE_ENV === 'test' || process.env.CCTOP_VERBOSE) {
        console.log(`[EventDisplayManager] Loaded ${recentEvents.length} initial events`);
      }
    } catch (error) {
      console.error('[EventDisplayManager] Error loading initial events:', error);
    }
  }

  /**
   * Get events to display based on current mode and filters
   */
  getEventsToDisplay() {
    let eventsToShow;
    
    if (this.displayMode === 'unique') {
      // Unique mode: Only latest per file
      eventsToShow = Array.from(this.uniqueEvents.values())
        .sort((a, b) => b.timestamp - a.timestamp);
    } else {
      // All mode: All events
      eventsToShow = this.events;
    }
    
    // Apply filtering if filter manager is available
    if (this.filterManager) {
      return this.filterManager.filterEvents(eventsToShow);
    }
    
    return eventsToShow;
  }

  /**
   * Switch display mode
   */
  setDisplayMode(mode) {
    if (mode !== this.displayMode) {
      this.displayMode = mode;
      console.log(chalk.yellow(`Switched to ${mode.toUpperCase()} mode`));
    }
  }

  /**
   * Get current display mode
   */
  getDisplayMode() {
    return this.displayMode;
  }

  /**
   * Get statistics for display
   */
  getStats() {
    const totalEvents = this.events.length;
    const uniqueFiles = this.uniqueEvents.size;
    
    // DEBUG: Log current state
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log(`[EventDisplayManager] getStats: mode=${this.displayMode}, totalEvents=${totalEvents}, uniqueFiles=${uniqueFiles}, uniqueEvents.size=${this.uniqueEvents.size}`);
    }
    
    const modeIndicator = this.displayMode === 'all' ? 'All Activities' : 'Unique Files';
    const stats = this.displayMode === 'all' 
      ? `${modeIndicator}  (${totalEvents}/${this.maxLines})`
      : `${modeIndicator}  (${uniqueFiles}/${this.maxLines})`;

    return {
      displayMode: this.displayMode,
      modeIndicator,
      totalEvents,
      uniqueFiles,
      stats,
      displayText: stats
    };
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
    this.uniqueEvents.clear();
  }

  /**
   * Get raw events array
   */
  getRawEvents() {
    return this.events;
  }

  /**
   * Get unique events map
   */
  getUniqueEvents() {
    return this.uniqueEvents;
  }

  /**
   * Update max lines configuration
   */
  setMaxLines(maxLines) {
    this.maxLines = maxLines;
    
    // Trim events if needed
    if (this.events.length > this.maxLines * 2) {
      this.events = this.events.slice(0, this.maxLines * 2);
    }
  }

  /**
   * Get status for debugging
   */
  getStatus() {
    return {
      displayMode: this.displayMode,
      totalEvents: this.events.length,
      uniqueFiles: this.uniqueEvents.size,
      maxLines: this.maxLines
    };
  }
}

module.exports = EventDisplayManager;