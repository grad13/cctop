/**
 * BP-001 Event Type Filtering Test
 * FUNC-023準拠: イベントタイプフィルタリング機能
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { EventEmitter } = require('events');
const ConfigManager = require('../../../src/config/config-manager');
const EventProcessor = require('../../../src/monitors/event-processor');
const DatabaseManager = require('../../../src/database/database-manager');

// フィルタリング機能付きEventProcessorモック
class FilterableEventProcessor extends EventProcessor {
  constructor(dbManager, filterConfig = {}) {
    super(dbManager);
    this.filters = {
      find: filterConfig.find !== false,
      create: filterConfig.create !== false,
      modify: filterConfig.modify !== false,
      delete: filterConfig.delete !== false,
      move: filterConfig.move !== false,
      restore: filterConfig.restore !== false
    };
  }
  
  // フィルタ切り替えメソッド
  toggleFilter(eventType) {
    if (this.filters.hasOwnProperty(eventType)) {
      this.filters[eventType] = !this.filters[eventType];
      return this.filters[eventType];
    }
    return null;
  }
  
  // フィルタ状態取得
  getFilterState() {
    return { ...this.filters };
  }
  
  // フィルタリング付きイベント処理
  processFileEvent(event) {
    // イベントタイプからフィルタキーを決定
    const filterKey = event.type === 'add' && event.stats.isFirstScan ? 'find' : 
                     event.type === 'add' ? 'create' :
                     event.type === 'change' ? 'modify' :
                     event.type === 'unlink' ? 'delete' :
                     event.type === 'addDir' || event.type === 'unlinkDir' ? event.type :
                     'modify';
    
    // フィルタがOFFの場合はスキップ
    if (!this.filters[filterKey]) {
      return null;
    }
    
    // 通常の処理を実行
    return super.processFileEvent(event);
  }
}

// キーボードハンドラーモック
class KeyboardHandler extends EventEmitter {
  constructor(eventProcessor) {
    super();
    this.eventProcessor = eventProcessor;
    this.keyBindings = {
      'f': 'find',
      'c': 'create',
      'm': 'modify',
      'd': 'delete',
      'v': 'move',
      'r': 'restore'
    };
  }
  
  handleKey(key) {
    const eventType = this.keyBindings[key];
    if (eventType) {
      const newState = this.eventProcessor.toggleFilter(eventType);
      this.emit('filterToggled', { type: eventType, active: newState });
      return true;
    }
    return false;
  }
}

describe('BP-001: Event Type Filtering (FUNC-023)', () => {
  let testDir;
  let dbManager;
  let eventProcessor;
  let keyboardHandler;
  let dbPath;

  beforeEach(async () => {
    // テスト用一時ディレクトリ
    testDir = path.join(os.tmpdir(), `bp001-filtering-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // テスト用データベース
    dbPath = path.join(testDir, 'test-activity.db');
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();

    // フィルタリング可能なEvent Processor
    eventProcessor = new FilterableEventProcessor(dbManager);
    
    // キーボードハンドラー
    keyboardHandler = new KeyboardHandler(eventProcessor);
  });

  afterEach(async () => {
    if (dbManager) {
      dbManager.close();
    }
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should initialize with all filters enabled by default', () => {
    const filterState = eventProcessor.getFilterState();
    expect(filterState).toEqual({
      find: true,
      create: true,
      modify: true,
      delete: true,
      move: true,
      restore: true
    });
  });

  test('should toggle individual event type filters', () => {
    // modifyフィルタをOFF
    expect(eventProcessor.toggleFilter('modify')).toBe(false);
    expect(eventProcessor.getFilterState().modify).toBe(false);
    
    // modifyフィルタを再度ON
    expect(eventProcessor.toggleFilter('modify')).toBe(true);
    expect(eventProcessor.getFilterState().modify).toBe(true);
  });

  test('should respond to keyboard shortcuts', () => {
    const toggleSpy = vi.fn();
    keyboardHandler.on('filterToggled', toggleSpy);
    
    // 'm'キーでmodifyフィルタ切り替え
    keyboardHandler.handleKey('m');
    expect(toggleSpy).toHaveBeenCalledWith({ type: 'modify', active: false });
    
    // 'c'キーでcreateフィルタ切り替え
    keyboardHandler.handleKey('c');
    expect(toggleSpy).toHaveBeenCalledWith({ type: 'create', active: false });
    
    // 無効なキー
    expect(keyboardHandler.handleKey('z')).toBe(false);
  });

  test('should filter out events when filter is disabled', () => {
    // modifyフィルタをOFF
    eventProcessor.toggleFilter('modify');
    
    // modifyイベントを処理（フィルタされるはず）
    const modifyEvent = {
      type: 'change',
      path: '/test/file.txt',
      stats: { size: 100, isFirstScan: false }
    };
    
    const result = eventProcessor.processFileEvent(modifyEvent);
    expect(result).toBeNull();
    
    // createイベントは通過するはず
    const createEvent = {
      type: 'add',
      path: '/test/newfile.txt',
      stats: { size: 50, isFirstScan: false }
    };
    
    const createResult = eventProcessor.processFileEvent(createEvent);
    expect(createResult).not.toBeNull();
  });

  test('should respect config-based filter initialization', () => {
    // 特定のフィルタをOFFで初期化
    const customProcessor = new FilterableEventProcessor(dbManager, {
      modify: false,
      delete: false
    });
    
    const filterState = customProcessor.getFilterState();
    expect(filterState.modify).toBe(false);
    expect(filterState.delete).toBe(false);
    expect(filterState.create).toBe(true);
  });

  test('should allow multiple filters to be disabled simultaneously', () => {
    // 複数のフィルタをOFF
    eventProcessor.toggleFilter('find');
    eventProcessor.toggleFilter('modify');
    eventProcessor.toggleFilter('delete');
    
    const filterState = eventProcessor.getFilterState();
    expect(filterState.find).toBe(false);
    expect(filterState.modify).toBe(false);
    expect(filterState.delete).toBe(false);
    expect(filterState.create).toBe(true);
    expect(filterState.move).toBe(true);
    expect(filterState.restore).toBe(true);
  });

  test('should maintain filter state across multiple operations', () => {
    // フィルタ状態の永続性確認
    const initialState = eventProcessor.getFilterState();
    
    // いくつかのフィルタを変更
    eventProcessor.toggleFilter('create');
    eventProcessor.toggleFilter('modify');
    
    // 中間状態確認
    const midState = eventProcessor.getFilterState();
    expect(midState.create).toBe(false);
    expect(midState.modify).toBe(false);
    
    // さらに変更
    eventProcessor.toggleFilter('create'); // 再度ON
    eventProcessor.toggleFilter('delete');
    
    // 最終状態確認
    const finalState = eventProcessor.getFilterState();
    expect(finalState.create).toBe(true);
    expect(finalState.modify).toBe(false);
    expect(finalState.delete).toBe(false);
  });

  test('should handle rapid filter toggles', () => {
    // 高速トグルテスト
    const toggleCount = 10;
    for (let i = 0; i < toggleCount; i++) {
      eventProcessor.toggleFilter('modify');
    }
    
    // 偶数回トグルなので元の状態に戻るはず
    const finalState = eventProcessor.getFilterState();
    expect(finalState.modify).toBe(true);
  });
});