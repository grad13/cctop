/**
 * Event polling mechanism for real-time updates
 */

import { Database, FileEvent, EventFilter, EventStats } from '@cctop/shared';
import { EventEmitter } from 'events';

export interface PollerOptions {
  dbPath: string;
  pollingInterval: number; // milliseconds
  maxEvents: number;
}

export class EventPoller extends EventEmitter {
  private database: Database;
  private pollingInterval: number;
  private maxEvents: number;
  private isPolling: boolean = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastEventId: number = 0;
  private events: FileEvent[] = [];

  constructor(options: PollerOptions) {
    super();
    this.database = new Database(options.dbPath, true); // Read-only mode
    this.pollingInterval = options.pollingInterval;
    this.maxEvents = options.maxEvents;
  }

  async start(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    await this.database.connect();
    this.isPolling = true;
    
    // Initial load
    await this.poll();
    
    // Start polling
    this.pollTimer = setInterval(() => {
      this.poll().catch(err => {
        this.emit('error', err);
      });
    }, this.pollingInterval);
  }

  async stop(): Promise<void> {
    this.isPolling = false;
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    await this.database.close();
  }

  private async poll(): Promise<void> {
    try {
      // Get latest events
      const filter: EventFilter = {
        limit: this.maxEvents * 2 // Get more than needed to find new ones
      };
      
      const latestEvents = await this.database.getEvents(filter);
      
      // Find new events
      const newEvents: FileEvent[] = [];
      for (const event of latestEvents) {
        if (event.id > this.lastEventId) {
          newEvents.push(event);
          this.lastEventId = Math.max(this.lastEventId, event.id);
        }
      }
      
      if (newEvents.length > 0) {
        // Prepend new events and trim to maxEvents
        this.events = [...newEvents.reverse(), ...this.events].slice(0, this.maxEvents);
        this.emit('events', this.events);
        this.emit('newEvents', newEvents);
      }
      
      // Get stats
      const stats = await this.database.getEventStats();
      this.emit('stats', stats);
      
    } catch (error) {
      this.emit('error', error);
    }
  }

  getEvents(): FileEvent[] {
    return this.events;
  }

  async getEventStats(): Promise<EventStats> {
    return this.database.getEventStats();
  }

  async applyFilter(filter: EventFilter): Promise<FileEvent[]> {
    const events = await this.database.getEvents({
      ...filter,
      limit: this.maxEvents
    });
    this.events = events;
    this.emit('events', this.events);
    return events;
  }

  setPollingInterval(interval: number): void {
    this.pollingInterval = interval;
    
    if (this.isPolling && this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(() => {
        this.poll().catch(err => {
          this.emit('error', err);
        });
      }, this.pollingInterval);
    }
  }
}