# event-processor.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-010  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: Medium  
**Phase**: Phase 3 - 低成功率ファイル（55%成功見込み）  
**対象ファイル**: `src/events/event-processor.ts` (612行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-200 Event Processing Engine準拠、イベント処理・変換・配信
- **責務**: イベント受信、フィルタリング、変換、配信、パフォーマンス最適化
- **依存関係**: chokidar、EventEmitter、DatabaseManager、複雑な非同期処理
- **TypeScript状況**: 高度な非同期処理、イベント型定義、パフォーマンス重視実装

### 現在の責務（詳細分析済み）
1. **イベント受信・キューイング** (~150行): chokidarからの生イベント受信、バッファリング
2. **イベントフィルタリング** (~130行): 重複排除、ignoreパターン適用、デバウンス処理
3. **イベント変換・正規化** (~120行): ファイル情報付与、メタデータ生成、型変換
4. **イベント配信・通知** (~100行): リスナー管理、非同期配信、エラーハンドリング
5. **パフォーマンス最適化** (~110行): バッチ処理、メモリ管理、統計情報

### 分解の困難さ評価
- ⚠️ **複雑な非同期フロー**: イベント処理パイプラインの複雑な相互依存
- ⚠️ **パフォーマンス要件**: 大量イベント処理での性能維持困難
- ⚠️ **状態管理の複雑性**: フィルタリング状態、バッファ状態、配信状態の協調
- ⚠️ **メモリ管理**: 大量イベントでのメモリリーク・OOM回避

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. イベント型定義・基盤 (80行程度)
src/events/types/EventTypes.ts
export interface RawFileEvent {
  type: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  path: string;
  stats?: any; // fs.Stats
  timestamp?: number;
}

export interface ProcessedFileEvent {
  id: string;
  type: 'Create' | 'Modify' | 'Delete' | 'Move';
  path: string;
  filename: string;
  directory: string;
  size: number | null;
  lines: number | null;
  timestamp: number;
  inode: number | null;
  mtime: number | null;
  ctime: number | null;
  processedAt: number;
}

export interface EventFilterConfig {
  ignorePatterns: string[];
  debounceMs: number;
  deduplicateWindow: number;
  maxEventRate: number;
}

export interface EventProcessorConfig {
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  enableDeduplication: boolean;
  enableDebounce: boolean;
  enableBatching: boolean;
}

export interface EventProcessorStats {
  totalReceived: number;
  totalFiltered: number;
  totalProcessed: number;
  totalDelivered: number;
  queueSize: number;
  averageProcessingTime: number;
  lastProcessedAt: number;
}

export type EventProcessor = (event: ProcessedFileEvent) => Promise<void>;
export type EventFilter = (event: RawFileEvent) => boolean;
export type EventTransformer = (event: RawFileEvent) => Promise<ProcessedFileEvent>;

// 2. イベント受信・キューイング (150行程度)
src/events/receivers/EventReceiver.ts
export class EventReceiver {
  private eventQueue: RawFileEvent[] = [];
  private maxQueueSize: number;
  private stats: { received: number; dropped: number } = { received: 0, dropped: 0 };
  private debug: boolean;

  constructor(config: EventProcessorConfig) {
    this.maxQueueSize = config.maxQueueSize || 10000;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  receiveEvent(type: string, path: string, stats?: any): void {
    try {
      const rawEvent: RawFileEvent = {
        type: type as any,
        path: path,
        stats: stats,
        timestamp: Date.now()
      };

      if (this.eventQueue.length >= this.maxQueueSize) {
        // Drop oldest events to prevent memory issues
        const dropped = this.eventQueue.splice(0, Math.floor(this.maxQueueSize * 0.1));
        this.stats.dropped += dropped.length;
        
        if (this.debug) {
          console.warn(`[EventReceiver] Dropped ${dropped.length} events (queue full)`);
        }
      }

      this.eventQueue.push(rawEvent);
      this.stats.received++;

      if (this.debug && this.stats.received % 100 === 0) {
        console.log(`[EventReceiver] Received ${this.stats.received} events, queue: ${this.eventQueue.length}`);
      }
    } catch (error) {
      console.error('[EventReceiver] Failed to receive event:', error);
    }
  }

  dequeueEvents(batchSize: number = 50): RawFileEvent[] {
    if (this.eventQueue.length === 0) {
      return [];
    }

    const batchCount = Math.min(batchSize, this.eventQueue.length);
    const batch = this.eventQueue.splice(0, batchCount);

    if (this.debug && batch.length > 0) {
      console.log(`[EventReceiver] Dequeued ${batch.length} events, remaining: ${this.eventQueue.length}`);
    }

    return batch;
  }

  peekQueue(count: number = 10): RawFileEvent[] {
    return this.eventQueue.slice(0, count);
  }

  getQueueSize(): number {
    return this.eventQueue.length;
  }

  clearQueue(): void {
    const cleared = this.eventQueue.length;
    this.eventQueue = [];
    
    if (this.debug && cleared > 0) {
      console.log(`[EventReceiver] Cleared ${cleared} events from queue`);
    }
  }

  getReceiverStats(): object {
    return {
      ...this.stats,
      queueSize: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize,
      queueUtilization: (this.eventQueue.length / this.maxQueueSize) * 100
    };
  }

  // Memory pressure handling
  handleMemoryPressure(): void {
    if (this.eventQueue.length > this.maxQueueSize * 0.8) {
      const toRemove = Math.floor(this.eventQueue.length * 0.3);
      const removed = this.eventQueue.splice(0, toRemove);
      this.stats.dropped += removed.length;
      
      console.warn(`[EventReceiver] Memory pressure: dropped ${removed.length} events`);
    }
  }

  // Batch retrieval with priority
  dequeuePriorityEvents(batchSize: number = 50): RawFileEvent[] {
    if (this.eventQueue.length === 0) {
      return [];
    }

    // Sort by type priority: delete > modify > create
    const priority = { 'unlink': 3, 'unlinkDir': 3, 'change': 2, 'add': 1, 'addDir': 1 };
    
    const sorted = [...this.eventQueue].sort((a, b) => {
      const priorityA = priority[a.type as keyof typeof priority] || 0;
      const priorityB = priority[b.type as keyof typeof priority] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      return (a.timestamp || 0) - (b.timestamp || 0); // Older first for same priority
    });

    const batch = sorted.slice(0, batchSize);
    
    // Remove selected events from original queue
    for (const event of batch) {
      const index = this.eventQueue.findIndex(e => 
        e.path === event.path && e.type === event.type && e.timestamp === event.timestamp);
      if (index !== -1) {
        this.eventQueue.splice(index, 1);
      }
    }

    return batch;
  }
}

// 3. イベントフィルタリング (130行程度)
src/events/filters/EventFilter.ts
export class EventFilter {
  private config: EventFilterConfig;
  private debounceMap: Map<string, NodeJS.Timeout> = new Map();
  private recentEvents: Map<string, number> = new Map();
  private ignorePatterns: RegExp[];
  private stats: { filtered: number; passed: number } = { filtered: 0, passed: 0 };
  private debug: boolean;

  constructor(config: EventFilterConfig) {
    this.config = config;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    this.ignorePatterns = this.compileIgnorePatterns(config.ignorePatterns);
  }

  private compileIgnorePatterns(patterns: string[]): RegExp[] {
    return patterns.map(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*') // ** -> .*
        .replace(/\*/g, '[^/]*') // * -> [^/]*
        .replace(/\?/g, '.'); // ? -> .
      
      return new RegExp(`^${regexPattern}$`);
    });
  }

  shouldProcessEvent(event: RawFileEvent): boolean {
    try {
      // Check ignore patterns
      if (this.isIgnored(event.path)) {
        this.stats.filtered++;
        return false;
      }

      // Check rate limiting
      if (this.isRateLimited(event)) {
        this.stats.filtered++;
        return false;
      }

      // Check deduplication
      if (this.isDuplicate(event)) {
        this.stats.filtered++;
        return false;
      }

      this.stats.passed++;
      return true;
    } catch (error) {
      console.error('[EventFilter] Filter check failed:', error);
      this.stats.filtered++;
      return false;
    }
  }

  private isIgnored(path: string): boolean {
    const normalizedPath = path.replace(/\\/g, '/'); // Normalize separators
    
    for (const pattern of this.ignorePatterns) {
      if (pattern.test(normalizedPath)) {
        if (this.debug) {
          console.log(`[EventFilter] Ignored: ${path} (pattern: ${pattern.source})`);
        }
        return true;
      }
    }
    
    return false;
  }

  private isRateLimited(event: RawFileEvent): boolean {
    if (!this.config.maxEventRate || this.config.maxEventRate <= 0) {
      return false;
    }

    const now = Date.now();
    const window = 1000; // 1 second window
    const key = `rate:${event.path}`;
    
    const lastEvent = this.recentEvents.get(key) || 0;
    if (now - lastEvent < window / this.config.maxEventRate) {
      if (this.debug) {
        console.log(`[EventFilter] Rate limited: ${event.path}`);
      }
      return true;
    }

    this.recentEvents.set(key, now);
    
    // Cleanup old entries periodically
    if (this.recentEvents.size > 1000) {
      for (const [k, timestamp] of this.recentEvents.entries()) {
        if (now - timestamp > window * 10) {
          this.recentEvents.delete(k);
        }
      }
    }

    return false;
  }

  private isDuplicate(event: RawFileEvent): boolean {
    if (!this.config.enableDeduplication) {
      return false;
    }

    const key = `${event.type}:${event.path}`;
    const now = Date.now();
    
    const lastSeen = this.recentEvents.get(key);
    if (lastSeen && (now - lastSeen) < this.config.deduplicateWindow) {
      if (this.debug) {
        console.log(`[EventFilter] Duplicate: ${event.path} (${event.type})`);
      }
      return true;
    }

    this.recentEvents.set(key, now);
    return false;
  }

  // Debounce handling for rapid changes
  scheduleDebounce(event: RawFileEvent, callback: () => void): void {
    if (!this.config.enableDebounce || this.config.debounceMs <= 0) {
      callback();
      return;
    }

    const key = event.path;
    
    // Clear existing timeout
    const existingTimeout = this.debounceMap.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.debounceMap.delete(key);
      callback();
    }, this.config.debounceMs);

    this.debounceMap.set(key, timeout);

    if (this.debug) {
      console.log(`[EventFilter] Debounced: ${event.path} (${this.config.debounceMs}ms)`);
    }
  }

  updateConfig(newConfig: Partial<EventFilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.ignorePatterns) {
      this.ignorePatterns = this.compileIgnorePatterns(newConfig.ignorePatterns);
    }

    if (this.debug) {
      console.log('[EventFilter] Config updated:', newConfig);
    }
  }

  getFilterStats(): object {
    return {
      ...this.stats,
      debounceActive: this.debounceMap.size,
      recentEventsTracked: this.recentEvents.size,
      filterRate: this.stats.filtered / (this.stats.filtered + this.stats.passed) * 100
    };
  }

  cleanup(): void {
    // Clear all debounce timers
    for (const timeout of this.debounceMap.values()) {
      clearTimeout(timeout);
    }
    this.debounceMap.clear();
    this.recentEvents.clear();

    if (this.debug) {
      console.log('[EventFilter] Cleaned up');
    }
  }
}

// 4. イベント変換・正規化 (120行程度)
src/events/transformers/EventTransformer.ts
export class EventTransformer {
  private debug: boolean;
  private transformStats: { transformed: number; failed: number } = { transformed: 0, failed: 0 };

  constructor() {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async transformEvent(rawEvent: RawFileEvent): Promise<ProcessedFileEvent | null> {
    try {
      const processedEvent = await this.createProcessedEvent(rawEvent);
      this.transformStats.transformed++;
      
      if (this.debug) {
        console.log(`[EventTransformer] Transformed: ${rawEvent.path} -> ${processedEvent.type}`);
      }
      
      return processedEvent;
    } catch (error) {
      console.error(`[EventTransformer] Failed to transform event for ${rawEvent.path}:`, error);
      this.transformStats.failed++;
      return null;
    }
  }

  private async createProcessedEvent(rawEvent: RawFileEvent): Promise<ProcessedFileEvent> {
    const path = require('path');
    const fs = require('fs').promises;

    // Generate unique ID
    const id = this.generateEventId(rawEvent);
    
    // Normalize event type
    const type = this.normalizeEventType(rawEvent.type);
    
    // Extract path components
    const filename = path.basename(rawEvent.path);
    const directory = path.dirname(rawEvent.path);
    
    // Get file metadata (safe)
    const metadata = await this.getFileMetadata(rawEvent.path, rawEvent.stats);
    
    const processedEvent: ProcessedFileEvent = {
      id,
      type,
      path: rawEvent.path,
      filename,
      directory,
      size: metadata.size,
      lines: metadata.lines,
      timestamp: rawEvent.timestamp || Date.now(),
      inode: metadata.inode,
      mtime: metadata.mtime,
      ctime: metadata.ctime,
      processedAt: Date.now()
    };

    return processedEvent;
  }

  private generateEventId(rawEvent: RawFileEvent): string {
    const timestamp = rawEvent.timestamp || Date.now();
    const pathHash = this.simpleHash(rawEvent.path);
    return `${timestamp}-${rawEvent.type}-${pathHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private normalizeEventType(rawType: string): 'Create' | 'Modify' | 'Delete' | 'Move' {
    switch (rawType) {
      case 'add':
      case 'addDir':
        return 'Create';
      case 'change':
        return 'Modify';
      case 'unlink':
      case 'unlinkDir':
        return 'Delete';
      default:
        return 'Modify'; // Default fallback
    }
  }

  private async getFileMetadata(filePath: string, stats?: any): Promise<{
    size: number | null;
    lines: number | null;
    inode: number | null;
    mtime: number | null;
    ctime: number | null;
  }> {
    try {
      const fs = require('fs').promises;
      
      // Use provided stats or fetch them
      const fileStats = stats || await fs.stat(filePath);
      
      const metadata = {
        size: fileStats.size || null,
        inode: fileStats.ino || null,
        mtime: fileStats.mtime ? fileStats.mtime.getTime() : null,
        ctime: fileStats.ctime ? fileStats.ctime.getTime() : null,
        lines: null as number | null
      };

      // Count lines for text files (with size limit)
      if (fileStats.isFile() && fileStats.size > 0 && fileStats.size < 10 * 1024 * 1024) {
        metadata.lines = await this.countLines(filePath);
      }

      return metadata;
    } catch (error) {
      // File may have been deleted or is inaccessible
      return {
        size: null,
        lines: null,
        inode: null,
        mtime: null,
        ctime: null
      };
    }
  }

  private async countLines(filePath: string): Promise<number | null> {
    try {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length;
    } catch (error) {
      // Not a text file or read error
      return null;
    }
  }

  // Batch transformation for performance
  async transformEvents(rawEvents: RawFileEvent[]): Promise<ProcessedFileEvent[]> {
    const transformPromises = rawEvents.map(event => this.transformEvent(event));
    const results = await Promise.allSettled(transformPromises);
    
    const transformed: ProcessedFileEvent[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        transformed.push(result.value);
      }
    }

    if (this.debug) {
      console.log(`[EventTransformer] Batch transformed: ${transformed.length}/${rawEvents.length}`);
    }

    return transformed;
  }

  getTransformStats(): object {
    return {
      ...this.transformStats,
      successRate: this.transformStats.transformed / 
        (this.transformStats.transformed + this.transformStats.failed) * 100
    };
  }

  resetStats(): void {
    this.transformStats = { transformed: 0, failed: 0 };
  }
}

// 5. 統合イベントプロセッサー (160行程度)
src/events/EventProcessor.ts
export class EventProcessor {
  private eventReceiver: EventReceiver;
  private eventFilter: EventFilter;
  private eventTransformer: EventTransformer;
  private processors: EventProcessor[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  private config: EventProcessorConfig;
  private isProcessing: boolean = false;
  private stats: EventProcessorStats;

  constructor(
    filterConfig: EventFilterConfig,
    processorConfig: EventProcessorConfig = {}
  ) {
    this.config = {
      batchSize: 50,
      flushInterval: 1000,
      maxQueueSize: 10000,
      enableDeduplication: true,
      enableDebounce: true,
      enableBatching: true,
      ...processorConfig
    };

    this.eventReceiver = new EventReceiver(this.config);
    this.eventFilter = new EventFilter(filterConfig);
    this.eventTransformer = new EventTransformer();
    
    this.stats = {
      totalReceived: 0,
      totalFiltered: 0,
      totalProcessed: 0,
      totalDelivered: 0,
      queueSize: 0,
      averageProcessingTime: 0,
      lastProcessedAt: 0
    };
  }

  // 既存API完全互換
  receiveEvent(type: string, path: string, stats?: any): void {
    this.eventReceiver.receiveEvent(type, path, stats);
    this.stats.totalReceived++;
    this.stats.queueSize = this.eventReceiver.getQueueSize();
  }

  addProcessor(processor: EventProcessor): void {
    this.processors.push(processor);
  }

  removeProcessor(processor: EventProcessor): void {
    const index = this.processors.indexOf(processor);
    if (index !== -1) {
      this.processors.splice(index, 1);
    }
  }

  startProcessing(): void {
    if (this.processingInterval) {
      return; // Already running
    }

    this.processingInterval = setInterval(async () => {
      await this.processEventBatch();
    }, this.config.flushInterval);

    console.log('[EventProcessor] Started processing');
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('[EventProcessor] Stopped processing');
  }

  private async processEventBatch(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Get batch of raw events
      const rawEvents = this.eventReceiver.dequeueEvents(this.config.batchSize);
      if (rawEvents.length === 0) {
        return;
      }

      // Filter events
      const filteredEvents = rawEvents.filter(event => this.eventFilter.shouldProcessEvent(event));
      this.stats.totalFiltered += (rawEvents.length - filteredEvents.length);

      if (filteredEvents.length === 0) {
        return;
      }

      // Transform events
      const processedEvents = await this.eventTransformer.transformEvents(filteredEvents);
      this.stats.totalProcessed += processedEvents.length;

      // Deliver to processors
      await this.deliverEvents(processedEvents);
      this.stats.totalDelivered += processedEvents.length;

      // Update stats
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime);

    } catch (error) {
      console.error('[EventProcessor] Batch processing failed:', error);
    } finally {
      this.stats.queueSize = this.eventReceiver.getQueueSize();
      this.isProcessing = false;
    }
  }

  private async deliverEvents(events: ProcessedFileEvent[]): Promise<void> {
    if (this.processors.length === 0) {
      return;
    }

    // Deliver to all processors in parallel
    const deliveryPromises = this.processors.map(async processor => {
      for (const event of events) {
        try {
          await processor(event);
        } catch (error) {
          console.error('[EventProcessor] Processor failed for event:', event.id, error);
        }
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  private updateProcessingStats(processingTime: number): void {
    // Update average processing time (exponential moving average)
    if (this.stats.averageProcessingTime === 0) {
      this.stats.averageProcessingTime = processingTime;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * 0.9) + (processingTime * 0.1);
    }

    this.stats.lastProcessedAt = Date.now();
  }

  // Force immediate processing
  async flushEvents(): Promise<void> {
    while (this.eventReceiver.getQueueSize() > 0) {
      await this.processEventBatch();
    }
  }

  // Configuration updates
  updateConfig(newConfig: Partial<EventProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  updateFilterConfig(newConfig: Partial<EventFilterConfig>): void {
    this.eventFilter.updateConfig(newConfig);
  }

  // Status and debugging
  getProcessorStats(): EventProcessorStats {
    return { ...this.stats };
  }

  getDetailedStatus(): object {
    return {
      processor: this.stats,
      receiver: this.eventReceiver.getReceiverStats(),
      filter: this.eventFilter.getFilterStats(),
      transformer: this.eventTransformer.getTransformStats(),
      isProcessing: this.isProcessing,
      processorCount: this.processors.length
    };
  }

  cleanup(): void {
    this.stopProcessing();
    this.eventFilter.cleanup();
    this.eventReceiver.clearQueue();
  }

  // Memory management
  handleMemoryPressure(): void {
    this.eventReceiver.handleMemoryPressure();
    
    // Force flush if queue is large
    if (this.eventReceiver.getQueueSize() > this.config.maxQueueSize * 0.8) {
      setImmediate(() => this.flushEvents());
    }
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 7: event-processor.ts分解 (9-12日)

#### **Day 1**: 型定義・基盤整備
- EventTypes.ts作成・複雑なイベント型定義
- 高性能処理に向けた型最適化
- **予期しない課題**: 型定義パフォーマンス影響 (+0.5日)

#### **Day 2**: イベント受信・キューイング実装
- EventReceiver.ts実装・高性能キュー管理
- メモリプレッシャー対応・優先度処理
- **予期しない課題**: 大量イベントでのメモリ問題 (+1日)

#### **Day 3**: フィルタリングクラス実装
- EventFilter.ts実装・複雑なフィルタリングロジック
- デバウンス・重複排除・レート制限
- **予期しない課題**: フィルタリング性能問題 (+1日)

#### **Day 4**: イベント変換実装
- EventTransformer.ts実装・メタデータ取得最適化
- 非同期変換・バッチ処理最適化
- **予期しない課題**: ファイルI/O競合・性能劣化 (+1日)

#### **Day 5**: 統合プロセッサー実装
- EventProcessor.ts実装・既存API互換確認
- 非同期バッチ処理・エラー回復実装
- **予期しない課題**: 非同期処理の協調問題 (+1.5日)

#### **Day 6-7**: パフォーマンス最適化
- 大量イベント処理の負荷テスト
- メモリ使用量最適化・GC圧力軽減
- **予期しない課題**: 予期しない性能ボトルネック (+2日)

#### **Day 8-9**: 統合テスト・安定性確認
- 長時間大量イベント処理テスト
- 異常系・メモリプレッシャーテスト
- **予期しない課題**: 実環境での予期しない問題 (+1.5日)

#### **Day 10-12**: バッファ・品質確認
- 性能問題への対応
- 複雑な非同期フローのデバッグ
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **パフォーマンス要件の維持困難** (発生確率: 70%)
- **課題**: 分解により処理オーバーヘッド増加、大量イベント処理能力低下
- **対策**: バッチ処理最適化、メモリプール使用、処理パイプライン最適化
- **代替案**: クリティカルパス統合、最適化優先の設計変更

#### 2. **複雑な非同期フローの管理困難** (発生確率: 65%)
- **課題**: イベント処理パイプラインの複雑な相互依存、デッドロック・競合状態
- **対策**: 明確な非同期設計、状態機械パターン、タイムアウト設定
- **代替案**: 同期処理への部分移行

#### 3. **メモリ管理の複雑化** (発生確率: 60%)
- **課題**: 大量イベントでのメモリリーク、OOM、GC圧力
- **対策**: オブジェクトプール、明示的クリーンアップ、メモリ監視
- **代替案**: ストリーミング処理への移行

### 実装上の課題

#### 4. **状態管理の整合性** (発生確率: 55%)
- **課題**: 複数コンポーネント間の状態同期、一貫性保証
- **対策**: 明確な状態オーナーシップ、イベント駆動設計
- **代替案**: 状態の中央管理

#### 5. **エラー処理の複雑化** (発生確率: 50%)
- **課題**: 非同期処理チェーンでのエラー伝播・回復
- **対策**: 統一的なエラーハンドリング、回復戦略
- **代替案**: フェイルファスト設計

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- 非同期型・Promise型の適切な使用確認
- パフォーマンス重視型定義の検証

### 機能品質チェック
- 既存テスト全パス（100%必須）
- 大量イベント処理の性能テスト（10,000 events/sec）
- 長時間稼働での安定性テスト（24時間以上）
- メモリリーク検出テスト

### 性能品質チェック
- イベント処理スループット（±20%以内）
- メモリ使用量確認（ベースライン比較）
- CPU使用率監視
- 応答時間測定（レイテンシ）

## 📈 期待効果

### 開発効率向上
- **フィルタリング修正**: 30-50%効率化（EventFilter独立）
- **変換ロジック修正**: 40-60%効率化（EventTransformer独立）
- **性能問題解析**: 50-70%効率化（問題箇所特定容易）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **性能最適化**: ボトルネック特定・改善容易
- **新機能追加**: 処理ステップ追加容易

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存EventProcessor APIの100%互換性維持
- [ ] パフォーマンス要件維持（±20%以内）
- [ ] メモリ使用量の安定性確認
- [ ] 非同期処理の安定性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- パフォーマンス要件を満たせない問題が3日以上継続
- メモリリーク・OOM問題が解決困難
- 非同期処理の安定性問題が継続

### ロールバック手順
1. 元の event-processor.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. パフォーマンス・メモリ使用量の確認

---

**次のステップ**: ConfigManager.ts完了後実行開始  
**所要時間**: 9-12日（バッファ含む）  
**成功確率**: 55%（最も困難、パフォーマンス要件に注意）