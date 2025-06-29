/**
 * Event Data Manager
 * Manages event storage and retrieval
 */

import { EventData, DatabaseManager } from '../../types/common';

export class EventDataManager {
  private db: DatabaseManager;
  private events: EventData[] = [];
  private uniqueEvents: Map<string, EventData> = new Map();
  private maxEvents: number;

  constructor(databaseManager: DatabaseManager, maxEvents: number = 20) {
    this.db = databaseManager;
    this.maxEvents = maxEvents;
  }

  /**
   * Add a new event
   */
  addEvent(eventData: EventData): void {
    // Add to all events
    this.events.unshift(eventData);
    
    // Limit array size
    if (this.events.length > this.maxEvents * 2) {
      this.events = this.events.slice(0, this.maxEvents * 2);
    }
    
    // Update unique events map
    this.uniqueEvents.set(eventData.path, eventData);
  }

  /**
   * Load initial events from database
   */
  async loadInitialEvents(): Promise<void> {
    try {
      // Load recent events
      const recentEvents = await this.db.getRecentEvents(this.maxEvents);
      
      // Process in reverse order (oldest first)
      for (let i = recentEvents.length - 1; i >= 0; i--) {
        this.addEvent(recentEvents[i]);
      }
    } catch (error: any) {
      console.error('Failed to load initial events:', error);
    }
  }

  /**
   * Get events for display based on mode
   */
  getEventsToDisplay(displayMode: 'all' | 'unique'): EventData[] {
    if (displayMode === 'unique') {
      // Get unique events sorted by most recent update
      const uniqueArray = Array.from(this.uniqueEvents.values());
      uniqueArray.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      return uniqueArray.slice(0, this.maxEvents);
    } else {
      // Return recent events
      return this.events.slice(0, this.maxEvents);
    }
  }

  /**
   * Get statistics
   */
  getStats(): { totalEvents: number; uniqueFiles: number } {
    return {
      totalEvents: this.events.length,
      uniqueFiles: this.uniqueEvents.size
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.uniqueEvents.clear();
  }

  /**
   * Update max events setting
   */
  setMaxEvents(maxEvents: number): void {
    this.maxEvents = maxEvents;
  }

  /**
   * Get all events (for testing)
   */
  getAllEvents(): EventData[] {
    return [...this.events];
  }

  /**
   * Get unique events map (for testing)
   */
  getUniqueEventsMap(): Map<string, EventData> {
    return new Map(this.uniqueEvents);
  }
}