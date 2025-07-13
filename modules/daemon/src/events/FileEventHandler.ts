/**
 * File Event Processing
 */

import { FileEventRecorder } from '../database/FileEventRecorder';
import { FileEvent, EventMeasurement } from '../database/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';
import { MoveDetector } from './MoveDetector';
import { MeasurementCalculator } from './MeasurementCalculator';

export class FileEventHandler {
  private db: FileEventRecorder;
  private logger: LogManager;
  private moveDetector: MoveDetector;
  private moveThresholdMs: number;
  private measurementCalculator: MeasurementCalculator;

  constructor(db: FileEventRecorder, logger: LogManager, moveThresholdMs: number = 100) {
    this.db = db;
    this.logger = logger;
    this.moveThresholdMs = moveThresholdMs;
    this.moveDetector = new MoveDetector(moveThresholdMs);
    this.measurementCalculator = new MeasurementCalculator(logger);
  }

  async handleFileEvent(eventType: string, filePath: string, preservedInode?: number): Promise<void> {
    if (eventType === 'find') {
      this.logger.log('info', `Processing find event for: ${filePath}`);
    }
    
    try {
      let stats: any = null;
      let inode = 0;

      this.logger.debugLog(`DEBUG: handleFileEvent start`, { eventType, filePath, preservedInode });

      if (eventType !== 'delete') {
        try {
          stats = await fs.stat(filePath);
          inode = stats.ino;
          this.logger.debugLog(`DEBUG: fs.stat success`, { filePath, inode, size: stats.size });
        } catch (statError) {
          this.logger.log('warn', `Could not get stats for ${filePath}: ${statError}`);
          inode = 0;
          stats = { size: 0 };
        }
      } else if (preservedInode !== undefined) {
        // For delete events, use preserved inode from before deletion
        inode = preservedInode;
        stats = { size: 0 };
      }

      const event: FileEvent = {
        eventType: eventType as any,
        filePath,
        directory: path.dirname(filePath),
        fileName: path.basename(filePath),
        timestamp: new Date()
      };

      // Prepare measurement data - always include inode as required by database schema
      let measurement: EventMeasurement | undefined;
      try {
        if (eventType === 'create' || eventType === 'modify' || eventType === 'find') {
          const result = await this.measurementCalculator.calculateMeasurements(filePath, inode);
          measurement = {
            eventId: 0, // Will be set by database
            inode: result.inode,
            fileSize: stats?.size || 0,
            lineCount: result.lineCount,
            blockCount: result.blockCount ?? undefined
          };
          this.logger.debugLog(`DEBUG: measurement created`, { filePath, measurement });
        } else {
          // For delete/move events, still need inode for file tracking
          measurement = {
            eventId: 0,
            inode: inode,
            fileSize: 0,
            lineCount: 0,
            blockCount: undefined
          };
          this.logger.debugLog(`DEBUG: delete/move measurement created`, { filePath, measurement });
        }
      } catch (error) {
        this.logger.log('warn', `Could not calculate measurements for ${filePath}: ${error}`);
        // Still provide minimal measurement with inode
        measurement = {
          eventId: 0,
          inode: inode,
          fileSize: 0,
          lineCount: 0,
          blockCount: undefined
        };
        this.logger.debugLog(`DEBUG: error measurement created`, { filePath, measurement });
      }

      this.logger.debugLog(`DEBUG: before insertEvent`, { filePath, eventType, measurement });
      const eventId = await this.db.insertEvent(event, measurement);
      this.logger.debugLog(`Event recorded`, { eventType, filePath, inode, eventId })
      
    } catch (error) {
      this.logger.log('error', `Failed to handle ${eventType} event for ${filePath}: ${error}`);
    }
  }

  async handleUnlinkEvent(filePath: string): Promise<void> {
    try {
      this.logger.debugLog(`handleUnlinkEvent start`, { filePath });
      
      const events = await this.db.getRecentEvents(1, filePath);
      if (events.length > 0) {
        const lastEvent = events[0];
        // Get inode from last measurement if available
        let lastInode = 0;
        if (lastEvent.id) {
          const measurement = await this.db.getMeasurementByEventId(lastEvent.id);
          if (measurement) {
            lastInode = measurement.inode;
          }
        }
        
        this.logger.debugLog(`Found last event for unlinked file`, { 
          lastEvent: { id: lastEvent.id, type: lastEvent.eventType, inode: lastInode } 
        });
        
        this.moveDetector.addPendingUnlink(filePath, lastInode);
        this.logger.debugLog(`Added to pending unlinks`, { 
          inode: lastInode, 
          pendingUnlinksSize: this.moveDetector.getPendingUnlinksSize() 
        });
        
        this.moveDetector.setupUnlinkTimeout(lastInode, () => {
          this.logger.debugLog(`Pending unlink timeout - converting to delete`, { filePath, inode: lastInode });
          this.handleFileEvent('delete', filePath, lastInode);
        });
      } else {
        this.logger.debugLog(`No previous record found - direct delete`, { filePath });
        // For direct delete without previous record, try to use default inode 0
        // This could happen if file was created and deleted before daemon recorded it
        await this.handleFileEvent('delete', filePath, 0);
      }
    } catch (error) {
      this.logger.log('error', `Failed to handle unlink event: ${error}`);
    }
  }

  async handleAddEvent(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const inode = stats.ino;
      
      this.logger.debugLog(`handleAddEvent start`, { 
        filePath, 
        inode, 
        pendingUnlinksSize: this.moveDetector.getPendingUnlinksSize() 
      });

      setTimeout(async () => {
        await this.processAddEvent({ filePath, inode, stats, timestamp: Date.now() });
      }, 50);
      
    } catch (error) {
      this.logger.log('error', `Failed to handle add event: ${error}`);
    }
  }

  private async processAddEvent(addData: { filePath: string, inode: number, stats: any, timestamp: number }): Promise<void> {
    try {
      const { filePath, inode, stats } = addData;
      
      this.logger.debugLog(`processAddEvent start`, { 
        filePath, 
        inode, 
        pendingUnlinksSize: this.moveDetector.getPendingUnlinksSize() 
      });
      
      // Check for move operation
      const pendingUnlink = this.moveDetector.checkForMove(inode);
      if (pendingUnlink) {
        const event: FileEvent = {
          eventType: 'move',
          filePath,
          directory: path.dirname(filePath),
          fileName: path.basename(filePath),
          timestamp: new Date()
        };
        
        // Calculate measurements for move event
        const result = await this.measurementCalculator.calculateMeasurements(filePath, inode);
        const measurement: EventMeasurement = {
          eventId: 0,
          inode: result.inode,
          fileSize: result.fileSize,
          lineCount: result.lineCount,
          blockCount: result.blockCount ?? undefined
        };
        await this.db.insertEvent(event, measurement);
        this.logger.debugLog(`Move detected (unlink→add)`, { from: pendingUnlink.filePath, to: filePath });
        return;
      }
      
      // Check for restore condition ONLY if there was a recent delete
      const restoreTimeLimit = 5 * 60 * 1000;
      const recentEvents = await this.db.getRecentEvents(10, filePath);
      
      // Only consider restore if the LAST event was a delete
      if (recentEvents.length > 0 && recentEvents[0].eventType === 'delete') {
        const recentDeleteEvent = recentEvents[0];
        const timeSinceDelete = Date.now() - recentDeleteEvent.timestamp.getTime();
        
        if (timeSinceDelete <= restoreTimeLimit) {
          this.logger.debugLog(`Restore detected`, { 
            filePath, 
            deleteTime: recentDeleteEvent.timestamp, 
            timeSinceDelete
          });
          
          const restoreEvent: FileEvent = {
            eventType: 'restore',
            filePath,
            directory: path.dirname(filePath),
            fileName: path.basename(filePath),
            timestamp: new Date()
          };
          
          const measurement: EventMeasurement = {
            eventId: 0,
            inode: inode,
            fileSize: stats.size,
            lineCount: 0,
            blockCount: 0
          };
          await this.db.insertEvent(restoreEvent, measurement);
          this.logger.debugLog(`Restore event created`, { filePath, newInode: inode });
          return;
        }
      }
      
      // Check for move by same inode - need to check measurements
      const recentSameInodeEvents: FileEvent[] = [];
      for (const event of recentEvents) {
        if (event.id && (Date.now() - event.timestamp.getTime()) <= this.moveThresholdMs) {
          const measurement = await this.db.getMeasurementByEventId(event.id);
          if (measurement && measurement.inode === inode) {
            recentSameInodeEvents.push(event);
          }
        }
      }
      
      if (recentSameInodeEvents.length > 0) {
        const createEvent = recentSameInodeEvents.find((e: any) => e.eventType === 'create');
        
        if (createEvent && createEvent.filePath !== filePath) {
          const moveEvent: FileEvent = {
            eventType: 'move',
            filePath,
            directory: path.dirname(filePath),
            fileName: path.basename(filePath),
            timestamp: new Date()
          };
          
          // Calculate measurements for move event
          const result = await this.measurementCalculator.calculateMeasurements(filePath, inode);
          const measurement: EventMeasurement = {
            eventId: 0,
            inode: result.inode,
            fileSize: result.fileSize,
            lineCount: result.lineCount,
            blockCount: result.blockCount ?? undefined
          };
          await this.db.insertEvent(moveEvent, measurement);
          this.logger.debugLog(`Move detected (create→add same inode)`, { from: createEvent.filePath, to: filePath });
          return;
        }
      }
      
      // Default: create event
      // Trust chokidar's add event - it knows the difference between new files and existing files
      await this.handleFileEvent('create', filePath);
      
    } catch (error) {
      this.logger.log('error', `Failed to process add event: ${error}`);
    }
  }


  cleanup(): void {
    this.moveDetector.cleanup();
  }
}