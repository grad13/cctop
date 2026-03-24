// meta: updated=2026-03-17 12:02 checked=2026-03-14 00:00

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
