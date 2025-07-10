/**
 * Database Event Processor
 * Handles event processing and demo data generation
 */

import { EventRow } from '../types/event-row';
import { DemoDataGenerator } from '../utils/demo-data-generator';
import { DatabaseConnection } from './DatabaseConnection';

export class DatabaseEventProcessor {
  private dataGenerator: DemoDataGenerator;

  constructor(private connection: DatabaseConnection) {
    this.dataGenerator = new DemoDataGenerator();
  }

  async getUniqueFiles(limit: number = 25): Promise<EventRow[]> {
    if (this.connection.isUsingRandomData()) {
      return this.generateDemoUniqueFiles(limit);
    }

    const events = await this.getAllEvents(limit * 3);
    return this.filterUniqueFiles(events, limit);
  }

  private async getAllEvents(limit: number): Promise<EventRow[]> {
    // This would be implemented by injecting the query engine
    // For now, return empty array as this is a refactoring step
    return [];
  }

  private generateDemoUniqueFiles(limit: number): EventRow[] {
    const events = this.dataGenerator.generateEvents(limit * 3);
    return this.filterUniqueFiles(events, limit);
  }

  private filterUniqueFiles(events: EventRow[], limit: number): EventRow[] {
    const uniqueFiles = new Map<string, EventRow>();
    
    events.forEach(event => {
      const key = `${event.directory}/${event.filename}`;
      if (!uniqueFiles.has(key) || 
          new Date(event.timestamp) > new Date(uniqueFiles.get(key)!.timestamp)) {
        uniqueFiles.set(key, event);
      }
    });
    
    return Array.from(uniqueFiles.values()).slice(0, limit);
  }

  generateRandomEvents(limit: number, mode: 'all' | 'unique' = 'all'): EventRow[] {
    const events = this.dataGenerator.generateEvents(limit * (mode === 'unique' ? 3 : 1));
    
    if (mode === 'unique') {
      return this.filterUniqueFiles(events, limit);
    }
    
    return events;
  }

  processEventData(rows: any[]): EventRow[] {
    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      filename: row.filename || 'Unknown',
      directory: row.directory || '.',
      event_type: row.event_type || 'unknown',
      size: row.size || 0,
      lines: row.lines || 0,
      blocks: row.blocks || 0,
      inode: row.inode || 0,
      elapsed_ms: row.elapsed_ms || 0
    }));
  }

  validateEventRow(row: any): boolean {
    return row && 
           (row.timestamp !== undefined) && 
           (row.filename !== undefined) && 
           (row.event_type !== undefined);
  }

  filterEventsByType(events: EventRow[], eventType: string): EventRow[] {
    return events.filter(event => event.event_type === eventType);
  }

  filterEventsByDirectory(events: EventRow[], directory: string): EventRow[] {
    return events.filter(event => event.directory.includes(directory));
  }

  sortEventsByTimestamp(events: EventRow[], descending: boolean = true): EventRow[] {
    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return descending ? timeB - timeA : timeA - timeB;
    });
  }
}