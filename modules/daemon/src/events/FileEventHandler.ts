/**
 * File Event Processing
 */

import { Database, FileEvent } from '@cctop/shared';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';
import { MoveDetector } from './MoveDetector';

export class FileEventHandler {
  private db: Database;
  private logger: LogManager;
  private moveDetector: MoveDetector;
  private moveThresholdMs: number;

  constructor(db: Database, logger: LogManager, moveThresholdMs: number = 100) {
    this.db = db;
    this.logger = logger;
    this.moveThresholdMs = moveThresholdMs;
    this.moveDetector = new MoveDetector(moveThresholdMs);
  }

  async handleFileEvent(eventType: string, filePath: string, preservedInode?: number): Promise<void> {
    try {
      let stats: any = null;
      let inode = 0;

      if (eventType !== 'delete') {
        try {
          stats = await fs.stat(filePath);
          inode = stats.ino;
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
        filename: path.basename(filePath),
        fileSize: stats?.size || 0,
        timestamp: new Date(),
        inodeNumber: inode
      };

      await this.db.insertEvent(event);
      this.logger.debugLog(`Event recorded`, { eventType, filePath, inode });
      
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
        
        this.logger.debugLog(`Found last event for unlinked file`, { 
          lastEvent: { id: lastEvent.id, type: lastEvent.eventType, inode: lastEvent.inodeNumber } 
        });
        
        this.moveDetector.addPendingUnlink(filePath, lastEvent.inodeNumber);
        this.logger.debugLog(`Added to pending unlinks`, { 
          inode: lastEvent.inodeNumber, 
          pendingUnlinksSize: this.moveDetector.getPendingUnlinksSize() 
        });
        
        this.moveDetector.setupUnlinkTimeout(lastEvent.inodeNumber, () => {
          this.logger.debugLog(`Pending unlink timeout - converting to delete`, { filePath, inode: lastEvent.inodeNumber });
          this.handleFileEvent('delete', filePath, lastEvent.inodeNumber);
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
          filename: path.basename(filePath),
          fileSize: stats.size,
          timestamp: new Date(),
          inodeNumber: inode
        };
        
        await this.db.insertEvent(event);
        this.logger.debugLog(`Move detected (unlink→add)`, { from: pendingUnlink.filePath, to: filePath });
        return;
      }
      
      // Check for restore condition
      const restoreTimeLimit = 5 * 60 * 1000;
      const recentEvents = await this.db.getRecentEvents(10, filePath);
      const recentDeleteEvent = recentEvents.find(e => 
        e.eventType === 'delete' && 
        e.filePath === filePath &&
        (Date.now() - e.timestamp.getTime()) <= restoreTimeLimit
      );
      
      if (recentDeleteEvent) {
        this.logger.debugLog(`Restore detected`, { 
          filePath, 
          deleteTime: recentDeleteEvent.timestamp, 
          timeSinceDelete: Date.now() - recentDeleteEvent.timestamp.getTime()
        });
        
        const restoreEvent: FileEvent = {
          eventType: 'restore',
          filePath,
          directory: path.dirname(filePath),
          filename: path.basename(filePath),
          fileSize: stats.size,
          timestamp: new Date(),
          inodeNumber: inode
        };
        
        await this.db.insertEvent(restoreEvent);
        this.logger.debugLog(`Restore event created`, { filePath, newInode: inode, originalInode: recentDeleteEvent.inodeNumber });
        return;
      }
      
      // Check for move by same inode
      const recentSameInodeEvents = recentEvents.filter(e => 
        e.inodeNumber === inode && 
        (Date.now() - e.timestamp.getTime()) <= this.moveThresholdMs
      );
      
      if (recentSameInodeEvents.length > 0) {
        const createEvent = recentSameInodeEvents.find(e => e.eventType === 'create');
        
        if (createEvent && createEvent.filePath !== filePath) {
          const moveEvent: FileEvent = {
            eventType: 'move',
            filePath,
            directory: path.dirname(filePath),
            filename: path.basename(filePath),
            fileSize: stats.size,
            timestamp: new Date(),
            inodeNumber: inode
          };
          
          await this.db.insertEvent(moveEvent);
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