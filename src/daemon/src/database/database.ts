/**
 * Database - Main Coordinator
 * Refactored modular architecture with single responsibility principle
 */

import { FileEvent } from '../../../shared/src/types';
import { EventMeasurement, MeasurementResult } from './types';
import { DatabaseConnection } from './DatabaseConnection';
import { SchemaManager } from './SchemaManager';
import { TriggerManager } from './TriggerManager';
import { EventOperations } from './EventOperations';
import { AggregateOperations } from './AggregateOperations';
import { MeasurementOperations } from './MeasurementOperations';
import sqlite3 from 'sqlite3';

export class Database {
  private connection: DatabaseConnection;
  private schemaManager: SchemaManager | null = null;
  private triggerManager: TriggerManager | null = null;
  private eventOps: EventOperations | null = null;
  private aggregateOps: AggregateOperations | null = null;
  private measurementOps: MeasurementOperations | null = null;

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
    this.measurementOps = new MeasurementOperations(db);

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
    this.measurementOps = null;
  }

  // Event Operations
  async insertEvent(event: FileEvent, measurement?: EventMeasurement): Promise<number> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.insertEvent(event, measurement);
  }

  async getRecentEvents(limit: number = 100, filePath?: string): Promise<FileEvent[]> {
    if (!this.eventOps) throw new Error('Database not connected');
    return this.eventOps.getRecentEvents(limit, filePath);
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

  getConnection(): sqlite3.Database | null {
    return this.connection.getConnection();
  }

  // Clear internal caches (useful for testing)
  clearCache(): void {
    if (this.eventOps) {
      this.eventOps.clearCache();
    }
  }

  // Measurement Operations
  async insertMeasurement(eventId: number, measurement: MeasurementResult): Promise<void> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.insertMeasurement(eventId, measurement);
  }

  async getMeasurementByEventId(eventId: number): Promise<MeasurementResult | null> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.getMeasurementByEventId(eventId);
  }

  async getMeasurementsByFilePath(filePath: string): Promise<MeasurementResult[]> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.getMeasurementsByFilePath(filePath);
  }

  async getMeasurementStatistics(): Promise<{
    totalMeasurements: number;
    totalLines: number;
    totalBlocks: number;
    averageLines: number;
    averageBlocks: number;
    binaryFiles: number;
    textFiles: number;
  }> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.getMeasurementStatistics();
  }

  async getTopFilesByLines(limit: number = 10): Promise<Array<{
    filePath: string;
    lineCount: number;
    blockCount: number;
    lastEventType: string;
    lastTimestamp: string;
  }>> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.getTopFilesByLines(limit);
  }

  async getTopFilesByBlocks(limit: number = 10): Promise<Array<{
    filePath: string;
    lineCount: number;
    blockCount: number;
    lastEventType: string;
    lastTimestamp: string;
  }>> {
    if (!this.measurementOps) throw new Error('Database not connected');
    return this.measurementOps.getTopFilesByBlocks(limit);
  }
}