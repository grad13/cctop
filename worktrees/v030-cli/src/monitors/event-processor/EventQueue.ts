/**
 * Event Queue Management
 * Handles queueing and sequential processing of file events
 */

import { EventEmitter } from 'events';
import {
  FileEventInput,
  EventProcessingError,
  MAX_EVENT_QUEUE_SIZE,
  RETRY_DELAY,
  MAX_RETRY_COUNT
} from './EventTypes';

export class EventQueue extends EventEmitter {
  private eventQueue: FileEventInput[] = [];
  private processing: boolean = false;
  private destroyed: boolean = false;
  private maxQueueSize: number;

  constructor(maxQueueSize: number = MAX_EVENT_QUEUE_SIZE) {
    super();
    this.maxQueueSize = maxQueueSize;
  }

  /**
   * Add event to queue
   */
  enqueue(event: FileEventInput): void {
    // Initialize retry count if not present
    if (!event.retryCount) {
      event.retryCount = 0;
    }

    // Check queue size limit
    if (this.eventQueue.length >= this.maxQueueSize) {
      console.warn('[EventQueue] Queue size limit reached, dropping oldest events');
      this.eventQueue.splice(0, Math.floor(this.maxQueueSize * 0.1));
    }

    this.eventQueue.push(event);
  }

  /**
   * Retry event with delay
   */
  retryEvent(event: FileEventInput): void {
    if (!event.retryCount) {
      event.retryCount = 0;
    }

    event.retryCount++;

    if (event.retryCount > MAX_RETRY_COUNT) {
      console.error('[EventQueue] Max retries exceeded, dropping event:', event.path);
      return;
    }

    // Delayed re-queueing to prevent infinite loop
    setTimeout(() => {
      if (!this.destroyed && this.eventQueue.length < this.maxQueueSize) {
        this.eventQueue.push(event);
      }
    }, RETRY_DELAY);
  }

  /**
   * Get next event from queue
   */
  dequeue(): FileEventInput | undefined {
    return this.eventQueue.shift();
  }

  /**
   * Check if queue has events
   */
  hasEvents(): boolean {
    return this.eventQueue.length > 0 && !this.destroyed;
  }

  /**
   * Get queue size
   */
  getSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Check if currently processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Set processing state
   */
  setProcessing(state: boolean): void {
    this.processing = state;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.eventQueue = [];
    this.processing = false;
  }

  /**
   * Cleanup and destroy
   */
  cleanup(): void {
    this.destroyed = true;
    this.clear();
    this.removeAllListeners();
  }

  /**
   * Check if destroyed
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}