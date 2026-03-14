/**
 * UniqueFileCacheManager
 *
 * Efficient cache for unique file display mode.
 * Uses incremental updates instead of full table scans.
 *
 * Algorithm:
 * - Initial: Build cache from latest N events
 * - Refresh: Only fetch events after lastProcessedEventId
 * - Update: Move existing files to front, add new files
 * @created 2026-03-13
 * @checked 2026-03-14
 * @updated 2026-03-13
 */

import { EventRow } from '../types/event-row';

export interface UniqueFileEntry {
  key: string;           // directory/file_name
  event: EventRow;
  lastUpdated: number;   // event id
}

export class UniqueFileCacheManager {
  // File path -> EventRow mapping
  private fileMap: Map<string, EventRow> = new Map();

  // Ordered list of keys (most recent first)
  private orderedKeys: string[] = [];

  // Last processed event ID for incremental updates
  private lastProcessedEventId: number = 0;

  // Whether cache has been initialized
  private initialized: boolean = false;

  /**
   * Check if cache is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the last processed event ID
   */
  getLastProcessedEventId(): number {
    return this.lastProcessedEventId;
  }

  /**
   * Get total cached file count
   */
  getCachedCount(): number {
    return this.fileMap.size;
  }

  /**
   * Initialize cache from events (called once at startup)
   * Events should be ordered by id DESC (newest first)
   */
  initialize(events: EventRow[]): void {
    this.fileMap.clear();
    this.orderedKeys = [];

    if (events.length === 0) {
      this.initialized = true;
      return;
    }

    // Track the highest event ID (first event since ordered DESC)
    this.lastProcessedEventId = events[0].id;

    // Build unique file map (first occurrence = latest event for that file)
    for (const event of events) {
      const key = this.makeKey(event);

      if (!this.fileMap.has(key)) {
        this.fileMap.set(key, event);
        this.orderedKeys.push(key);
      }
    }

    this.initialized = true;
  }

  /**
   * Update cache with new events (incremental update)
   * Events should be ordered by id ASC (oldest first for proper ordering)
   * Returns true if cache was modified
   */
  updateWithNewEvents(newEvents: EventRow[]): boolean {
    if (newEvents.length === 0) {
      return false;
    }

    for (const event of newEvents) {
      const key = this.makeKey(event);

      if (this.fileMap.has(key)) {
        // Existing file: update and move to front
        this.fileMap.set(key, event);
        this.moveToFront(key);
      } else {
        // New file: add to front
        this.fileMap.set(key, event);
        this.orderedKeys.unshift(key);
      }

      // Track the latest event ID
      if (event.id > this.lastProcessedEventId) {
        this.lastProcessedEventId = event.id;
      }
    }

    return true;
  }

  /**
   * Get display data for pagination
   */
  getDisplayData(offset: number, limit: number): EventRow[] {
    const result: EventRow[] = [];
    const end = Math.min(offset + limit, this.orderedKeys.length);

    for (let i = offset; i < end; i++) {
      const key = this.orderedKeys[i];
      const event = this.fileMap.get(key);
      if (event) {
        result.push(event);
      }
    }

    return result;
  }

  /**
   * Get all cached events (for compatibility)
   */
  getAllEvents(): EventRow[] {
    return this.orderedKeys.map(key => this.fileMap.get(key)!);
  }

  /**
   * Check if there's more data beyond the given offset
   */
  hasMoreData(offset: number): boolean {
    return offset < this.orderedKeys.length;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.fileMap.clear();
    this.orderedKeys = [];
    this.lastProcessedEventId = 0;
    this.initialized = false;
  }

  /**
   * Create a unique key for a file
   */
  private makeKey(event: EventRow): string {
    return `${event.directory}/${event.filename}`;
  }

  /**
   * Move a key to the front of the ordered list
   */
  private moveToFront(key: string): void {
    const index = this.orderedKeys.indexOf(key);
    if (index > 0) {
      this.orderedKeys.splice(index, 1);
      this.orderedKeys.unshift(key);
    }
  }
}
