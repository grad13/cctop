/**
 * Database - Main Coordinator
 * Refactored modular architecture with single responsibility principle
 */

import { FileEvent } from './types';
import { DatabaseConnection } from './database/DatabaseConnection';
import { SchemaManager } from './database/SchemaManager';
import { TriggerManager } from './database/TriggerManager';
import { EventOperations } from './database/EventOperations';
import { AggregateOperations } from './database/AggregateOperations';

export class Database {
  private connection: DatabaseConnection;
  private schemaManager: SchemaManager | null = null;
  private triggerManager: TriggerManager | null = null;
  private eventOps: EventOperations | null = null;
  private aggregateOps: AggregateOperations | null = null;

  constructor(dbPath: string) {
    this.connection = new DatabaseConnection(dbPath);
  }

  async connect(): Promise<void> {
    const db = await this.connection.connect();
    
    // Initialize all managers with the connected database
    this.schemaManager = new SchemaManager(db);
    this.triggerManager = new TriggerManager(db);
    this.eventOps = new EventOperations(db);
    this.aggregateOps = new AggregateOperations(db);

    // Initialize schema and triggers
    await this.schemaManager.initializeSchema();
    await this.triggerManager.createTriggers();
  }

  async close(): Promise<void> {
    await this.connection.close();
    this.schemaManager = null;
    this.triggerManager = null;
    this.eventOps = null;
    this.aggregateOps = null;
  }

  // Event Operations
  async insertEvent(event: FileEvent): Promise<void> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.insertEvent(event);
  }

  async getRecentEvents(limit: number = 100, filePath?: string): Promise<FileEvent[]> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.getRecentEvents(limit, filePath);
  }

  async getEventTypeStatistics(): Promise<any[]> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.getEventTypeStatistics();
  }

  async getTimeBasedStatistics(intervalMinutes: number = 10): Promise<any[]> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.getTimeBasedStatistics(intervalMinutes);
  }

  // Aggregate Operations
  async getAggregateData(filePath?: string): Promise<any[]> {
    if (!this.aggregateOps) throw new Error('Database not connected');
    return this.aggregateOps.getAggregateData(filePath);
  }

  async getGlobalStatistics(): Promise<any> {
    if (!this.aggregateOps) throw new Error('Database not connected');
    return this.aggregateOps.getGlobalStatistics();
  }

  async getFileStatistics(filePath: string): Promise<any> {
    if (!this.aggregateOps) throw new Error('Database not connected');
    return this.aggregateOps.getFileStatistics(filePath);
  }

  async getTopFilesByEvents(limit: number = 10): Promise<any[]> {
    if (!this.aggregateOps) throw new Error('Database not connected');
    return this.aggregateOps.getTopFilesByEvents(limit);
  }

  // Trigger Management
  async recreateTriggers(): Promise<void> {
    if (!this.triggerManager) throw new Error('Database not connected');
    return this.triggerManager.recreateTriggers();
  }

  // Connection Status
  isConnected(): boolean {
    return this.connection.isConnected();
  }
}