import { DatabaseConnection, FileEventRepository, FileEvent } from '@cctop/shared';
import { EventEmitter } from 'events';

export interface ReaderOptions {
  pollingInterval: number;
}

export class DatabaseReader extends EventEmitter {
  private connection: DatabaseConnection;
  private repository: FileEventRepository;
  private options: ReaderOptions;
  private pollingTimer: NodeJS.Timer | null = null;
  private lastEventId: number = 0;

  constructor(dbPath: string, options: ReaderOptions) {
    super();
    this.connection = new DatabaseConnection(dbPath, true); // Read-only
    this.repository = new FileEventRepository(this.connection);
    this.options = options;
  }

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    await this.connection.close();
  }

  startPolling(): void {
    if (this.pollingTimer) {
      return;
    }

    this.pollingTimer = setInterval(async () => {
      try {
        const events = await this.getNewEvents();
        if (events.length > 0) {
          this.emit('events', events);
        }
      } catch (error) {
        this.emit('error', error);
      }
    }, this.options.pollingInterval);

    // Initial fetch
    this.getNewEvents().then(events => {
      if (events.length > 0) {
        this.emit('events', events);
      }
    }).catch(error => {
      this.emit('error', error);
    });
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async getNewEvents(): Promise<FileEvent[]> {
    const allEvents = await this.repository.getRecentEvents(1000);
    
    // Filter events newer than our last seen ID
    const newEvents = allEvents.filter(event => {
      if (event.id && event.id > this.lastEventId) {
        return true;
      }
      return false;
    });

    // Update last seen ID
    if (newEvents.length > 0) {
      const maxId = Math.max(...newEvents.map(e => e.id || 0));
      this.lastEventId = maxId;
    }

    return newEvents;
  }

  async getRecentEvents(limit: number): Promise<FileEvent[]> {
    return this.repository.getRecentEvents(limit);
  }

  async getProjectStats(projectPath: string): Promise<any> {
    return this.repository.getProjectStats(projectPath);
  }
}