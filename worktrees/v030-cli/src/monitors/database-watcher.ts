/**
 * Database Watcher
 * Monitors database changes and emits new events
 */

import { EventEmitter } from 'events';

interface DatabaseManager {
  isInitialized: boolean;
  get(query: string): Promise<any>;
  all(query: string, params: any[]): Promise<any[]>;
}

interface DatabaseEvent {
  id: number;
  timestamp: number;
  event_type: string;
  event_name: string;
  file_path: string;
  file_name: string;
  directory: string;
  file_size?: number;
  line_count?: number;
  block_count?: number;
  inode?: number;
  file_id: number;
}

interface MaxIdResult {
  maxId: number | null;
}

class DatabaseWatcher extends EventEmitter {
  private db: DatabaseManager;
  private lastEventId: number;
  private pollInterval: NodeJS.Timeout | null;
  private pollDelay: number;
  private isWatching: boolean;

  constructor(databaseManager: DatabaseManager) {
    super();
    this.db = databaseManager;
    this.lastEventId = 0;
    this.pollInterval = null;
    this.pollDelay = 100; // Poll every 100ms
    this.isWatching = false;
  }

  /**
   * Set the starting event ID
   */
  setLastEventId(eventId: number): void {
    this.lastEventId = eventId;
    console.log(`[DatabaseWatcher] Set starting event ID to: ${eventId}`);
  }

  /**
   * Start watching for database changes
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;
    
    // Get the latest event ID if not already set
    if (this.lastEventId === 0) {
      try {
        const result = await this.db.get('SELECT MAX(id) as maxId FROM events') as MaxIdResult;
        this.lastEventId = result?.maxId || 0;
        console.log(`[DatabaseWatcher] Starting watch from event ID: ${this.lastEventId}`);
      } catch (error: any) {
        console.error('[DatabaseWatcher] Error getting initial event ID:', error);
        this.lastEventId = 0;
      }
    }

    // Start polling
    this.pollInterval = setInterval(() => {
      this.checkForNewEvents();
    }, this.pollDelay);
  }

  /**
   * Check for new events in the database
   */
  async checkForNewEvents(): Promise<void> {
    if (!this.db || !this.db.isInitialized) {
      // Don't stop immediately - database might be temporarily unavailable
      if (process.env.CCTOP_VERBOSE === 'true') {
        console.warn('[DatabaseWatcher] Database not available, skipping this check');
      }
      return;
    }

    // DEBUG: Log polling activity
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.log(`[DatabaseWatcher] Checking for events > ${this.lastEventId}`);
    }

    try {
      // Get new events since last check
      const newEvents: DatabaseEvent[] = await this.db.all(`
        SELECT 
          e.id,
          e.timestamp,
          et.code as event_type,
          et.name as event_name,
          e.file_path,
          e.file_name,
          e.directory,
          m.file_size,
          m.line_count,
          m.block_count,
          m.inode,
          f.id as file_id
        FROM events e
        JOIN event_types et ON e.event_type_id = et.id
        JOIN files f ON e.file_id = f.id
        LEFT JOIN measurements m ON e.id = m.event_id
        WHERE e.id > ?
        ORDER BY e.id ASC
        LIMIT 100
      `, [this.lastEventId]);

      if (newEvents.length > 0) {
        // Update last event ID
        this.lastEventId = newEvents[newEvents.length - 1].id;
        
        // Emit each new event
        for (const event of newEvents) {
          this.emit('event', event);
        }
        
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`[DatabaseWatcher] Emitted ${newEvents.length} new events`);
        }

        // Emit batch for efficiency
        this.emit('events', newEvents);
        
        if (process.env.CCTOP_VERBOSE === 'true') {
          console.log(`[DatabaseWatcher] Found ${newEvents.length} new events`);
        }
      }
    } catch (error: any) {
      console.error('[DatabaseWatcher] Error checking for new events:', error);
      // If database is permanently closed, stop watching
      if (error.message && (error.message.includes('Database is closed') || error.message.includes('SQLITE_MISUSE'))) {
        console.error('[DatabaseWatcher] Database connection permanently lost, stopping watcher');
        this.stop();
      }
      // For other errors, continue watching
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isWatching = false;
    console.log('[DatabaseWatcher] Stopped watching');
    // Add stack trace to debug who called stop()
    if (process.env.CCTOP_VERBOSE === 'true') {
      console.trace('[DatabaseWatcher] Stop called from:');
    }
  }
}

export = DatabaseWatcher;