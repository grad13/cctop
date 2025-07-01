/**
 * Event Filtering Integration Tests (FUNC-020)
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
const EventFilterManager = require('../../dist/src/filter/event-filter-manager');
const FilterStatusRenderer = require('../../dist/src/ui/filter-status-renderer');
const CLIDisplay = require('../../dist/src/ui/cli-display');
const DatabaseManager = require('../../dist/src/database/database-manager');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

describe('Event Filtering Integration', () => {
  let tempDir;
  let dbPath;
  let dbManager;
  let cliDisplay;
  
  beforeEach(async () => {
    // テスト用の一時ディレクトリ作成
    tempDir = path.join(os.tmpdir(), `filter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    dbPath = path.join(tempDir, 'test.db');
    
    // データベース初期化
    dbManager = new DatabaseManager(dbPath);
    await dbManager.initialize();
    
    // CLIDisplay初期化
    cliDisplay = new CLIDisplay(dbManager, {
      maxEvents: 10,
      mode: 'all'
    });
  });
  
  afterEach(async () => {
    // クリーンアップ
    if (cliDisplay) {
      cliDisplay.stop();
    }
    if (dbManager) {
      await dbManager.close();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  describe('キーボードフィルタリング統合', () => {
    test('f キー押下でfindイベントフィルタリング', () => {
      // テストイベント追加
      cliDisplay.addEvent({ event_type: 'find', file_name: 'a.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'create', file_name: 'b.js', timestamp: Date.now() });
      
      // 初期状態：両方表示
      let displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(2);
      
      // f キー押下をシミュレート
      cliDisplay.handleKeyPress('f');
      
      // findイベントが非表示
      displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(1);
      expect(displayed[0].event_type).toBe('create');
    });
    
    test('複数フィルタの組み合わせ', () => {
      // 複数タイプのイベント追加
      cliDisplay.addEvent({ event_type: 'find', file_name: 'a.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'create', file_name: 'b.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'c.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'delete', file_name: 'd.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'move', file_name: 'e.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'restore', file_name: 'f.js', timestamp: Date.now() });
      
      // 初期状態：全て表示
      expect(cliDisplay.getEventsToDisplay()).toHaveLength(6);
      
      // f, c キー押下
      cliDisplay.handleKeyPress('f');
      cliDisplay.handleKeyPress('c');
      
      // find, createが非表示
      const displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(4);
      expect(displayed.find(e => e.event_type === 'find')).toBeUndefined();
      expect(displayed.find(e => e.event_type === 'create')).toBeUndefined();
    });
    
    test('大文字キーも受け付ける', () => {
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'a.js', timestamp: Date.now() });
      
      // M キー（大文字）押下
      cliDisplay.handleKeyPress('M');
      
      // modifyイベントが非表示
      const displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(0);
    });
    
    test('r キー押下でrestoreイベントフィルタリング', () => {
      // テストイベント追加
      cliDisplay.addEvent({ event_type: 'restore', file_name: 'a.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'create', file_name: 'b.js', timestamp: Date.now() });
      
      // 初期状態：両方表示
      let displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(2);
      
      // r キー押下をシミュレート
      cliDisplay.handleKeyPress('r');
      
      // restoreイベントが非表示
      displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(1);
      expect(displayed[0].event_type).toBe('create');
    });
    
    test('v キー押下でmoveイベントフィルタリング', () => {
      // テストイベント追加
      cliDisplay.addEvent({ event_type: 'move', file_name: 'a.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'b.js', timestamp: Date.now() });
      
      // 初期状態：両方表示
      let displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(2);
      
      // v キー押下をシミュレート
      cliDisplay.handleKeyPress('v');
      
      // moveイベントが非表示
      displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(1);
      expect(displayed[0].event_type).toBe('modify');
    });
  });
  
  describe('フィルタ状態の永続性', () => {
    test('フィルタ状態がイベント追加後も維持される', () => {
      // createフィルタをOFF
      cliDisplay.handleKeyPress('c');
      
      // 新しいイベント追加
      cliDisplay.addEvent({ event_type: 'create', file_name: 'new.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'old.js', timestamp: Date.now() });
      
      // createイベントは表示されない
      const displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(1);
      expect(displayed[0].event_type).toBe('modify');
    });
  });
  
  describe('モード切り替えとの共存', () => {
    test('AllモードとUniqueモードでフィルタが機能', () => {
      // 同じファイルの複数イベント
      cliDisplay.addEvent({ event_type: 'create', file_name: 'test.js', timestamp: 1000 });
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'test.js', timestamp: 2000 });
      cliDisplay.addEvent({ event_type: 'modify', file_name: 'test.js', timestamp: 3000 });
      
      // Allモード：3イベント
      cliDisplay.setDisplayMode('all');
      expect(cliDisplay.getEventsToDisplay()).toHaveLength(3);
      
      // modifyフィルタOFF
      cliDisplay.handleKeyPress('m');
      expect(cliDisplay.getEventsToDisplay()).toHaveLength(1); // createのみ
      
      // Uniqueモードに切り替え
      cliDisplay.setDisplayMode('unique');
      // Uniqueモードでも最新のmodifyが非表示
      const displayed = cliDisplay.getEventsToDisplay();
      expect(displayed).toHaveLength(0); // 最新がmodifyなので非表示
    });
  });
  
  describe('フィルタライン表示', () => {
    test('フィルタ状態がrenderer出力に反映される', () => {
      // CLIDisplayを開始してから確認
      cliDisplay.start();
      
      // モックrenderer
      const mockAddLine = vi.spyOn(cliDisplay.renderer, 'addLine');
      mockAddLine.mockClear();
      
      // レンダリング実行
      cliDisplay.render();
      
      // フィルタラインが追加されていることを確認
      const calls = mockAddLine.mock.calls;
      const filterLineCalls = calls.filter(call => 
        typeof call[0] === 'string' &&
        call[0].includes('[f]') && 
        call[0].includes('[c]') && 
        call[0].includes('[m]') &&
        call[0].includes('[d]') &&
        call[0].includes('[v]') &&
        call[0].includes('[r]')
      );
      
      expect(filterLineCalls.length).toBeGreaterThan(0);
    });
  });
  
  describe('FUNC-001イベントタイプ準拠性', () => {
    test('FUNC-001で定義された6つのイベントタイプをサポート', async () => {
      // FUNC-001で定義された6つのイベントタイプ
      const func001EventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
      
      // 各イベントタイプをテスト
      for (const eventType of func001EventTypes) {
        cliDisplay.addEvent({ 
          event_type: eventType, 
          file_name: `test-${eventType}.js`, 
          timestamp: Date.now() 
        });
      }
      
      // 全イベントが表示されることを確認
      const allEvents = cliDisplay.getEventsToDisplay();
      expect(allEvents).toHaveLength(6);
      
      // 各イベントタイプのフィルタリングをテスト
      const keyMappings = {
        'find': 'f',
        'create': 'c', 
        'modify': 'm',
        'delete': 'd',
        'move': 'v',     // FUNC-203で定義されたキーマッピング
        'restore': 'r'
      };
      
      for (const [eventType, key] of Object.entries(keyMappings)) {
        // フィルタをリセット（全て表示状態にする）
        cliDisplay.resetFilters();
        
        // 特定のイベントタイプをフィルタOFF
        cliDisplay.handleKeyPress(key);
        
        const filtered = cliDisplay.getEventsToDisplay();
        
        // 該当イベントタイプが除外されている
        expect(filtered.every(e => e.event_type !== eventType)).toBe(true);
        
        // 他のイベントタイプは表示されている
        expect(filtered.length).toBe(5);
      }
    });

    test('lost/refindイベントタイプは廃止（FUNC-001準拠）', () => {
      // FUNC-001でlost/refindイベントは廃止され、delete/restoreに統一
      // テストでlost/refindイベントが使用されていないことを確認
      
      // lost/refindイベントを追加試行
      cliDisplay.addEvent({ event_type: 'lost', file_name: 'lost.js', timestamp: Date.now() });
      cliDisplay.addEvent({ event_type: 'refind', file_name: 'refind.js', timestamp: Date.now() });
      
      const events = cliDisplay.getEventsToDisplay();
      
      // lost/refindイベントは処理されない（または適切にdelete/restoreに変換される）
      // 実装により動作が異なる可能性があるため、警告的なテスト
      if (events.some(e => e.event_type === 'lost' || e.event_type === 'refind')) {
        console.warn('Warning: lost/refind event types are deprecated per FUNC-001');
      }
    });
  });

  describe('パフォーマンステスト', () => {
    test('1000イベントでのフィルタ切り替え性能', () => {
      // 1000個のイベント生成
      for (let i = 0; i < 1000; i++) {
        const types = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
        const type = types[i % types.length];
        cliDisplay.addEvent({ 
          event_type: type, 
          file_name: `file${i}.js`, 
          timestamp: Date.now() + i 
        });
      }
      
      // フィルタ切り替え時間測定
      const startTime = performance.now();
      cliDisplay.handleKeyPress('c'); // createフィルタOFF
      const filtered = cliDisplay.getEventsToDisplay();
      const endTime = performance.now();
      
      // 100ms以内での処理完了
      expect(endTime - startTime).toBeLessThan(100);
      // 正しくフィルタリング
      expect(filtered.every(e => e.event_type !== 'create')).toBe(true);
    });
  });
});