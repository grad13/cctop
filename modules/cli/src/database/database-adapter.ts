/**
 * Database Adapter for CLI (Refactored)
 * Main adapter interface integrating connection, query, and processing components
 */

import { EventRow } from '../types/event-row';
import { DatabaseConnection } from './DatabaseConnection';
import { DatabaseQueryEngine } from './DatabaseQueryEngine';
import { DatabaseEventProcessor } from './DatabaseEventProcessor';

export class DatabaseAdapter {
  private connection: DatabaseConnection;
  private queryEngine: DatabaseQueryEngine;
  private eventProcessor: DatabaseEventProcessor;

  constructor(dbPath: string) {
    this.connection = new DatabaseConnection(dbPath);
    this.queryEngine = new DatabaseQueryEngine(this.connection);
    this.eventProcessor = new DatabaseEventProcessor(this.connection);
  }

  async connect(): Promise<void> {
    return this.connection.connect();
  }

  async disconnect(): Promise<void> {
    return this.connection.disconnect();
  }

  async close(): Promise<void> {
    return this.connection.close();
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    return this.connection.query(sql, params);
  }

  getDatabase() {
    return this.connection.getDatabase();
  }

  async getLatestEvents(limit: number = 25, mode: 'all' | 'unique' = 'all'): Promise<EventRow[]> {
    if (this.connection.isUsingRandomData()) {
      return this.eventProcessor.generateRandomEvents(limit, mode);
    }
    
    return this.queryEngine.getLatestEvents(limit, mode);
  }

  async getEventsByType(eventType: string, limit: number = 25): Promise<EventRow[]> {
    return this.queryEngine.getEventsByType(eventType, limit);
  }

  async getUniqueFiles(limit: number = 25): Promise<EventRow[]> {
    return this.eventProcessor.getUniqueFiles(limit);
  }

  async getDirectoryEvents(directory: string, limit: number = 25): Promise<EventRow[]> {
    return this.queryEngine.getDirectoryEvents(directory, limit);
  }

  async getEventCount(): Promise<number> {
    return this.queryEngine.getEventCount();
  }
}