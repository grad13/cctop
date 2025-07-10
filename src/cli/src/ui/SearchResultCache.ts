/**
 * Search Result Cache with LRU eviction policy
 */

import { EventRow } from '../types/event-row';

interface CacheEntry {
  data: EventRow[];
  timestamp: number;
  memorySize: number;
}

export class SearchResultCache {
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;

  constructor(maxEntries: number = 3) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }

  /**
   * Store search results with LRU eviction
   */
  set(keyword: string, results: EventRow[]): void {
    // LRU: Remove oldest entry if cache is full
    if (this.cache.size >= this.maxEntries && !this.cache.has(keyword)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(keyword, {
      data: results,
      timestamp: Date.now(),
      memorySize: this.estimateSize(results)
    });
  }

  /**
   * Get cached results
   */
  get(keyword: string): EventRow[] | null {
    const entry = this.cache.get(keyword);
    if (!entry) return null;

    // Move to end (most recently used)
    this.cache.delete(keyword);
    this.cache.set(keyword, entry);
    
    return entry.data;
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache (called on mode switch, ESC, memory pressure)
   */
  invalidate(): void {
    this.clear();
  }

  /**
   * Estimate memory size of results
   */
  private estimateSize(results: EventRow[]): number {
    // Rough estimation: assume each EventRow is ~200 bytes
    return results.length * 200;
  }

  /**
   * Get total memory usage
   */
  getTotalMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.memorySize;
    }
    return total;
  }

  /**
   * Check if cache has results for keyword
   */
  has(keyword: string): boolean {
    return this.cache.has(keyword);
  }
}