/**
 * Random Data Generator for CCTOP UI Demo
 * Generates realistic file event data for testing
 */

import { EventRow } from '../types/event-row';

export class RandomDataGenerator {
  private eventTypes = ['find', 'create', 'modify', 'delete', 'move', 'restore'];
  private fileExtensions = ['.ts', '.js', '.json', '.md', '.txt', '.css', '.html', '.py', '.java', '.cpp'];
  private directories = [
    'src', 'test', 'docs', 'config', 'utils', 'components', 'pages', 'api', 'styles', 'assets',
    'src/components', 'src/utils', 'src/pages', 'test/unit', 'test/integration', 'docs/api',
    'config/webpack', 'styles/components', 'assets/images', 'assets/fonts'
  ];
  private baseFilenames = [
    'index', 'app', 'main', 'config', 'utils', 'helper', 'component', 'service', 'controller',
    'model', 'view', 'router', 'middleware', 'validator', 'transformer', 'repository',
    'package', 'README', 'CHANGELOG', 'LICENSE', 'test', 'spec', 'setup', 'build'
  ];
  private japaneseFiles = [
    'API設計書', '仕様書', 'メインスタイル', 'ユーティリティ', 'テスト', 'ドキュメント',
    '設定ファイル', 'ヘルパー', 'バリデーター', 'テストファイル', 'コンポーネント'
  ];
  
  private eventCounter = 1;
  private startTime = Date.now();

  generateEvents(count: number): EventRow[] {
    const events: EventRow[] = [];
    
    for (let i = 0; i < count; i++) {
      events.push(this.generateSingleEvent());
    }
    
    // Sort by timestamp descending (newest first)
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateSingleEvent(): EventRow {
    const now = Date.now();
    const randomTime = now - Math.random() * 300000; // Within last 5 minutes
    const timestamp = new Date(randomTime).toISOString();
    
    const filename = this.generateFilename();
    const directory = this.getRandomElement(this.directories);
    const eventType = this.getRandomElement(this.eventTypes);
    
    // Generate realistic file metrics
    const size = this.generateFileSize(eventType);
    const lines = this.generateLineCount(size, filename);
    const blocks = Math.ceil(size / 4096); // 4KB blocks
    const inode = Math.floor(Math.random() * 1000000) + 100000;
    const elapsed_ms = now - randomTime;

    return {
      id: this.eventCounter++,
      timestamp,
      filename,
      directory,
      event_type: eventType,
      size,
      lines,
      blocks,
      inode,
      elapsed_ms
    };
  }

  private generateFilename(): string {
    const useJapanese = Math.random() < 0.3; // 30% Japanese filenames
    
    if (useJapanese) {
      const baseName = this.getRandomElement(this.japaneseFiles);
      const extension = this.getRandomElement(this.fileExtensions);
      return `${baseName}${extension}`;
    } else {
      const baseName = this.getRandomElement(this.baseFilenames);
      const extension = this.getRandomElement(this.fileExtensions);
      
      // Sometimes add suffix
      if (Math.random() < 0.4) {
        const suffix = Math.random() < 0.5 ? 
          `.${Math.floor(Math.random() * 10)}` : 
          `.${this.getRandomElement(['test', 'spec', 'config', 'min', 'prod'])}`;
        return `${baseName}${suffix}${extension}`;
      }
      
      return `${baseName}${extension}`;
    }
  }

  private generateFileSize(eventType: string): number {
    // Different file sizes based on event type
    switch (eventType) {
      case 'create':
        return Math.floor(Math.random() * 5000) + 100; // Small new files
      case 'delete':
        return Math.floor(Math.random() * 50000) + 500; // Various sizes
      case 'modify':
        return Math.floor(Math.random() * 20000) + 200; // Modified files
      case 'move':
        return Math.floor(Math.random() * 30000) + 1000; // Existing files
      case 'find':
        return Math.floor(Math.random() * 100000) + 50; // Discovery
      case 'restore':
        return Math.floor(Math.random() * 15000) + 800; // Restored files
      default:
        return Math.floor(Math.random() * 10000) + 100;
    }
  }

  private generateLineCount(size: number, filename: string): number {
    // Estimate lines based on file size and type
    const extension = filename.split('.').pop() || '';
    
    let avgCharsPerLine = 50; // Default
    
    switch (extension) {
      case 'ts':
      case 'js':
        avgCharsPerLine = 60;
        break;
      case 'json':
        avgCharsPerLine = 30;
        break;
      case 'md':
        avgCharsPerLine = 80;
        break;
      case 'css':
        avgCharsPerLine = 40;
        break;
      case 'html':
        avgCharsPerLine = 70;
        break;
    }
    
    const estimatedLines = Math.floor(size / avgCharsPerLine);
    // Add some variance
    return Math.max(1, estimatedLines + Math.floor(Math.random() * 20) - 10);
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate continuous stream of new events
  generateNewEvent(): EventRow {
    return this.generateSingleEvent();
  }

  // Reset counter for fresh data
  reset(): void {
    this.eventCounter = 1;
    this.startTime = Date.now();
  }
}