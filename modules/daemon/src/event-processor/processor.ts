import { FileEvent, FileEventRepository } from '@cctop/shared';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface ProcessorOptions {
  batchSize: number;
  flushInterval: number;
}

export class EventProcessor extends EventEmitter {
  private repository: FileEventRepository;
  private options: ProcessorOptions;
  private eventQueue: FileEvent[] = [];
  private flushTimer: NodeJS.Timer | null = null;
  private isProcessing = false;

  constructor(repository: FileEventRepository, options: ProcessorOptions) {
    super();
    this.repository = repository;
    this.options = options;
  }

  start(): void {
    if (this.flushTimer) {
      throw new Error('Processor already started');
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        logger.error('Error flushing events', error);
        this.emit('error', error);
      });
    }, this.options.flushInterval);

    logger.info('Event processor started');
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    this.flush().catch(error => {
      logger.error('Error flushing events on stop', error);
    });

    logger.info('Event processor stopped');
  }

  async addEvent(event: FileEvent): Promise<void> {
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.options.batchSize) {
      await this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const events = this.eventQueue.splice(0, this.options.batchSize);

    try {
      await this.repository.insertEventsBatch(events);
      logger.debug(`Flushed ${events.length} events to database`);
      this.emit('flush', events.length);
    } catch (error) {
      logger.error('Failed to insert events batch', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...events);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }
}