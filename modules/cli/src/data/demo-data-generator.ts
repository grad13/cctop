/**
 * Demo Data Generator with Japanese file names
 */

import { EventRow } from '../types/event-row';

export class DemoDataGenerator {
  private eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
  
  private fileNames = [
    // English files
    'index.ts', 'app.js', 'config.json', 'README.md', 'package.json',
    'component.tsx', 'utils.js', 'style.css', 'main.py', 'test.spec.js',
    // Japanese files
    'API設計書.md', '仕様書.txt', 'メインスタイル.css', 'ユーティリティ.ts',
    'テストファイル.spec.js', 'ドキュメント.md', '開発ガイド.pdf',
    '新機能実装.tsx', 'バグ修正.js', 'リファクタリング.ts',
    // Mixed
    'user_管理画面.tsx', 'config_設定.json', 'test_テスト.js'
  ];
  
  private directories = [
    'src/', 'test/', 'docs/', 'lib/', 'config/', 'assets/',
    'src/components/', 'src/utils/', 'test/unit/', 'docs/api/',
    'ドキュメント/', '設計書/', 'テスト/', 'ソース/'
  ];
  
  private eventId = 1;

  generateEvents(count: number): EventRow[] {
    const events: EventRow[] = [];
    
    for (let i = 0; i < count; i++) {
      events.push(this.generateSingleEvent());
    }
    
    return events.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  generateSingleEvent(): EventRow {
    const now = Date.now();
    const randomTime = now - Math.random() * 300000; // Within 5 minutes
    
    return {
      id: this.eventId++,
      timestamp: new Date(randomTime).toISOString(),
      filename: this.randomChoice(this.fileNames),
      directory: this.randomChoice(this.directories),
      event_type: this.randomChoice(this.eventTypes),
      size: Math.floor(Math.random() * 50000) + 100,
      lines: Math.floor(Math.random() * 1000) + 10,
      blocks: Math.floor(Math.random() * 100) + 1,
      inode: Math.floor(Math.random() * 1000000) + 100000,
      elapsed_ms: 0
    };
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
}