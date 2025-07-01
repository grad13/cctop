/**
 * Mock Progressive Loader for Testing
 * Extracted from progressive-loader.test.js for reusability
 */

const { EventEmitter } = require('events');

class MockProgressiveLoader extends EventEmitter {
  constructor(databaseManager, displayManager, statusDisplay) {
    super();
    this.db = databaseManager;
    this.display = displayManager;
    this.status = statusDisplay;
    this.loadedCount = 0;
    this.batchSize = 100;
    this.loadDelay = 10;
    this.lastLoadedEventId = 0;
  }
  
  async loadData() {
    const totalCount = await this.db.getEventCount();
    if (totalCount === 0) {
      this.status.updateMessage(">> No existing events found");
      return;
    }
    await this.loadEventsProgressively(totalCount);
    this.emit('complete', { loadedCount: this.loadedCount });
  }
  
  async loadEventsProgressively(totalCount) {
    let offset = 0;
    while (offset < totalCount) {
      const events = await this.db.getEventsBatch(offset, this.batchSize);
      if (events.length === 0) break;
      
      if (this.display && this.display.addEvents) {
        this.display.addEvents(events);
      }
      
      this.loadedCount += events.length;
      offset += events.length;
      
      const percentage = Math.round((this.loadedCount / totalCount) * 100);
      this.status.updateMessage(`>> Loading existing events... (${this.loadedCount}/${totalCount} - ${percentage}%)`);
      this.emit('progress', { loaded: this.loadedCount, total: totalCount, percentage });
    }
    this.status.updateMessage(">> Loaded " + this.loadedCount + " events");
  }
  
  async loadRecentEvents(limit = 50) {
    console.log(`[ProgressiveLoader] Loading ${limit} recent events only`);
    const events = await this.db.getRecentEvents(limit);
    if (events.length > 0) {
      this.lastLoadedEventId = Math.max(...events.map(e => e.id || 0));
      console.log(`[ProgressiveLoader] Set lastLoadedEventId to: ${this.lastLoadedEventId}`);
    }
    if (this.display && this.display.addEvents) {
      this.display.addEvents(events);
    }
    return events;
  }
  
  async loadRecentEventsFirst(limit = 50) {
    try {
      const events = await this.loadRecentEvents(limit);
      return events.length;
    } catch (error) {
      console.error('Error loading recent events:', error);
      return 0;
    }
  }
  
  createEventStream() {
    const { Readable } = require('stream');
    return new Readable({ objectMode: true, read() {} });
  }
  
  getStats() {
    return {
      loadedCount: this.loadedCount,
      batchSize: this.batchSize,
      lastLoadedEventId: this.lastLoadedEventId
    };
  }
}

module.exports = MockProgressiveLoader;