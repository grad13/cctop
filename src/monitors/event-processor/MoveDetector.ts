/**
 * Move Detector
 * Handles move/rename detection and restore detection
 */

import {
  MoveDetectionInfo,
  FileEventMetadata,
  EventType,
  DatabaseManager,
  RESTORE_TIME_LIMIT,
  DEFAULT_MOVE_DETECTION_WINDOW
} from './EventTypes';

export class MoveDetector {
  private recentDeletes: Map<string, MoveDetectionInfo> = new Map();
  private moveDetectionWindow: number;
  private db: DatabaseManager;

  constructor(db: DatabaseManager, moveDetectionWindow: number = DEFAULT_MOVE_DETECTION_WINDOW) {
    this.db = db;
    this.moveDetectionWindow = moveDetectionWindow;
  }

  /**
   * Track delete event for move detection
   */
  async trackDelete(filePath: string): Promise<void> {
    const fileInfo = await this.db.findByPath(filePath);
    if (fileInfo && fileInfo.inode) {
      this.recentDeletes.set(filePath, {
        inode: fileInfo.inode,
        timestamp: Date.now()
      });
      
      // Clean up old entries
      this.cleanupMoveCache();
    }
  }

  /**
   * Check if create/find event is actually a move
   */
  async checkForMove(metadata: FileEventMetadata): Promise<{
    isMove: boolean;
    fromPath?: string;
  }> {
    if (!metadata.inode) {
      return { isMove: false };
    }

    for (const [deletedPath, deleteInfo] of this.recentDeletes.entries()) {
      if (deleteInfo.inode === metadata.inode && 
          Date.now() - deleteInfo.timestamp < this.moveDetectionWindow) {
        // Found a move event
        this.recentDeletes.delete(deletedPath);
        return {
          isMove: true,
          fromPath: deletedPath
        };
      }
    }

    return { isMove: false };
  }

  /**
   * Check if event is a restore
   */
  async checkForRestore(metadata: FileEventMetadata): Promise<boolean> {
    const existing = await this.db.findByPath(metadata.file_path);
    if (existing && existing.is_active === false) {
      // Check if within restore time limit
      const timeSinceDeletion = Date.now() - existing.last_event_timestamp;
      return timeSinceDeletion <= RESTORE_TIME_LIMIT;
    }
    return false;
  }

  /**
   * Check for duplicate find event
   */
  async checkDuplicateFind(metadata: FileEventMetadata): Promise<boolean> {
    if (!metadata.inode) {
      return false;
    }

    const existingByInode = await this.db.get(`
      SELECT f.id, f.is_active 
      FROM files f 
      WHERE f.inode = ? AND f.is_active = 1
      LIMIT 1
    `, [metadata.inode]);
    
    return !!existingByInode;
  }

  /**
   * Clean up old entries from move detection cache
   */
  private cleanupMoveCache(): void {
    const now = Date.now();
    for (const [path, info] of this.recentDeletes.entries()) {
      if (now - info.timestamp > this.moveDetectionWindow) {
        this.recentDeletes.delete(path);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.recentDeletes.clear();
  }
}