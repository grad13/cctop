/**
 * File Metadata Collector
 * Collects file system metadata (stat, inode) for event processing
 */

import * as fs from 'fs/promises';
import { LogManager } from '../logging/LogManager';

export interface FileMetadata {
  inode: number;
  size: number;
}

export class FileMetadataCollector {
  constructor(private logger: LogManager) {}

  async collect(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);
      this.logger.debugLog(`DEBUG: fs.stat success`, { filePath, inode: stats.ino, size: stats.size });
      return {
        inode: stats.ino,
        size: stats.size,
      };
    } catch (error) {
      this.logger.log('warn', `Could not get stats for ${filePath}: ${error}`);
      return null;
    }
  }
}
