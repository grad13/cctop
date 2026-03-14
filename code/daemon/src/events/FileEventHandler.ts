/**
 * File Event Processing
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-14
 */

import { FileEventRecorder } from '../database/FileEventRecorder';
import { FileEvent, EventMeasurement } from '../database/types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';
import { MoveDetector } from './MoveDetector';
import { MeasurementCalculator } from './MeasurementCalculator';
import { FileMetadataCollector } from './FileMetadataCollector';

export class FileEventHandler {
  private db: FileEventRecorder;
  private logger: LogManager;
  private moveDetector: MoveDetector;
  private moveThresholdMs: number;
  private measurementCalculator: MeasurementCalculator;
  private metadataCollector: FileMetadataCollector;

  constructor(db: FileEventRecorder, logger: LogManager, moveThresholdMs: number = 100) {
    this.db = db;
    this.logger = logger;
    this.moveThresholdMs = moveThresholdMs;
    this.moveDetector = new MoveDetector(moveThresholdMs);
    this.measurementCalculator = new MeasurementCalculator(logger);
    this.metadataCollector = new FileMetadataCollector(logger);
  }

  async handleFileEvent(eventType: string, filePath: string, preservedInode?: number): Promise<void> {
    if (eventType === 'find') {
      this.logger.log('info', `Processing find event for: ${filePath}`);
    }

    try {
      let inode = 0;
      let fileSize = 0;

      this.logger.debugLog(`DEBUG: handleFileEvent start`, { eventType, filePath, preservedInode });

      if (eventType !== 'delete') {
        const metadata = await this.metadataCollector.collect(filePath);
        if (!metadata) {
          this.logger.log('warn', `Skipping ${eventType} event for ${filePath}: file not accessible`);
          return;
        }
        inode = metadata.inode;
        fileSize = metadata.size;
      } else if (preservedInode !== undefined) {
        inode = preservedInode;
      }

      const event: FileEvent = {
        eventType: eventType as any,
        filePath,
        directory: path.dirname(filePath),
        fileName: path.basename(filePath),
        timestamp: new Date()
      };

      const measurement = await this.buildMeasurement(eventType, filePath, inode, fileSize);
      if (!measurement) {
        this.logger.log('warn', `Skipping ${eventType} event for ${filePath}: measurement failed`);
        return;
      }

      this.logger.debugLog(`DEBUG: before insertEvent`, { filePath, eventType, measurement });
      const eventId = await this.db.insertEvent(event, measurement);
      this.logger.debugLog(`Event recorded`, { eventType, filePath, inode, eventId })

    } catch (error) {
      this.logger.log('error', `Failed to handle ${eventType} event for ${filePath}: ${error}`);
    }
  }

  private async buildMeasurement(
    eventType: string,
    filePath: string,
    inode: number,
    fileSize: number
  ): Promise<EventMeasurement | null> {
    try {
      if (eventType === 'create' || eventType === 'modify' || eventType === 'find') {
        const result = await this.measurementCalculator.calculateMeasurements(filePath, inode);
        const measurement: EventMeasurement = {
          eventId: 0,
          inode: result.inode,
          fileSize: fileSize,
          lineCount: result.lineCount,
          blockCount: result.blockCount ?? undefined
        };
        this.logger.debugLog(`DEBUG: measurement created`, { filePath, measurement });
        return measurement;
      } else {
        const measurement: EventMeasurement = {
          eventId: 0,
          inode: inode,
          fileSize: 0,
          lineCount: 0,
          blockCount: undefined
        };
        this.logger.debugLog(`DEBUG: delete/move measurement created`, { filePath, measurement });
        return measurement;
      }
    } catch (error) {
      this.logger.log('warn', `Could not calculate measurements for ${filePath}: ${error}`);
      return null;
    }
  }

  async handleUnlinkEvent(filePath: string): Promise<void> {
    try {
      this.logger.debugLog(`handleUnlinkEvent start`, { filePath });

      const events = await this.db.getRecentEvents(1, filePath);
      if (events.length > 0) {
        const lastEvent = events[0];
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
        await this.handleFileEvent('delete', filePath, 0);
      }
    } catch (error) {
      this.logger.log('error', `Failed to handle unlink event: ${error}`);
    }
  }

  async handleAddEvent(filePath: string): Promise<void> {
    try {
      const metadata = await this.metadataCollector.collect(filePath);
      if (!metadata) {
        this.logger.log('warn', `Skipping add event for ${filePath}: file not accessible`);
        return;
      }

      this.logger.debugLog(`handleAddEvent start`, {
        filePath,
        inode: metadata.inode,
        pendingUnlinksSize: this.moveDetector.getPendingUnlinksSize()
      });

      const stats = await fs.stat(filePath);

      setTimeout(async () => {
        await this.processAddEvent({ filePath, inode: metadata.inode, stats, timestamp: Date.now() });
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

      // Check for move by same inode
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
      await this.handleFileEvent('create', filePath);

    } catch (error) {
      this.logger.log('error', `Failed to process add event: ${error}`);
    }
  }


  cleanup(): void {
    this.moveDetector.cleanup();
  }
}
