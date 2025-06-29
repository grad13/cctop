/**
 * Event Aggregator
 * Handles event filtering, metadata collection, and aggregation
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  FileEventInput,
  FileEventMetadata,
  EventType,
  FilterState,
  EVENT_TYPE_MAPPING,
  TEXT_EXTENSIONS,
  BLOCK_SIZE
} from './EventTypes';

export class EventAggregator {
  private eventFilters: FilterState;

  constructor(eventFilters: FilterState) {
    this.eventFilters = eventFilters;
  }

  /**
   * Update event filters
   */
  updateFilters(filters: FilterState): void {
    this.eventFilters = filters;
  }

  /**
   * Map event type from chokidar to internal type
   */
  mapEventType(chokidarEvent: string): EventType | null {
    return EVENT_TYPE_MAPPING[chokidarEvent] || null;
  }

  /**
   * Check if event should be filtered
   */
  shouldFilterEvent(eventType: EventType): boolean {
    return !this.eventFilters[eventType];
  }

  /**
   * Collect metadata for file event
   */
  async collectMetadata(
    filePath: string,
    stats: any,
    eventType: EventType
  ): Promise<FileEventMetadata | null> {
    const metadata: FileEventMetadata = {
      file_path: path.resolve(filePath),
      file_name: path.basename(filePath),
      directory: path.dirname(path.resolve(filePath)),
      // For 'find' events during initial scan, use file's actual modification time
      timestamp: (eventType === 'find' && stats && stats.mtime) 
        ? stats.mtime.getTime() 
        : Date.now()
    };

    if (stats) {
      // FUNC-001: Files only (directories excluded)
      if (stats.isDirectory()) {
        return null; // Skip directories entirely
      }
      
      metadata.file_size = stats.size || 0;
      metadata.inode = stats.ino || null;
      
      // Line count (text files only)
      if (this.isTextFile(filePath)) {
        metadata.line_count = await this.countLines(filePath);
      } else {
        metadata.line_count = null;
      }
      
      // Block count calculation
      metadata.block_count = this.calculateBlockCount(metadata.file_size);
    } else {
      // For delete events, stats are not available
      metadata.file_size = 0;
      metadata.inode = null;
      metadata.line_count = null;
      metadata.block_count = 0;
    }

    return metadata;
  }

  /**
   * Check if file is text file
   */
  private isTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return TEXT_EXTENSIONS.includes(ext);
  }

  /**
   * Count lines in text file
   */
  private async countLines(filePath: string): Promise<number> {
    try {
      const data = await fs.promises.readFile(filePath, 'utf8');
      const lines = data.split('\n').length;
      return lines > 0 ? lines : 1; // At least 1 line for non-empty files
    } catch (error) {
      // If unable to read file (permission, etc.), return 0
      return 0;
    }
  }

  /**
   * Calculate block count (512 byte blocks)
   */
  private calculateBlockCount(fileSize: number): number {
    return Math.ceil(fileSize / BLOCK_SIZE);
  }
}