# CG-001: Event Processor実装ガイド

**作成日**: 2025年6月26日 08:00  
**更新日**: 2025年6月27日 18:35  
**作成者**: Architect Agent  
**タイプ**: Code Guide  
**関連仕様**: FUNC-002, FUNC-001

## 📋 概要

chokidarイベントをデータベースイベントに変換し、適切なメタデータを付与するEvent Processorの実装ガイド。

## 🔧 実装コード

### Event Processor基本実装

```javascript
// src/monitors/event-processor.js

const path = require('path');
const fs = require('fs').promises;

class EventProcessor {
  constructor(databaseManager) {
    this.db = databaseManager;
    this.isReady = false; // 初期スキャン完了フラグ
  }

  // 初期スキャン完了の通知
  setReady() {
    this.isReady = true;
    console.log('Initial scan complete');
    this.scanForLostFiles();
  }

  // Event conversion table (FUNC-002 compliant)
  getEventType(chokidarEvent, stats) {
    const eventMapping = {
      'add': () => this.isReady ? 'create' : 'find',
      'change': () => 'modify',
      'unlink': () => 'delete',
      'addDir': () => this.isReady ? 'create' : 'find',
      'unlinkDir': () => 'delete'
    };

    const mapper = eventMapping[chokidarEvent];
    return mapper ? mapper(stats) : 'unknown';
  }

  // メタデータ収集（FUNC-001準拠）
  async collectMetadata(targetPath, stats) {
    const isDirectory = stats?.isDirectory() || false;
    
    return {
      file_size: isDirectory ? 0 : (stats?.size || 0),
      line_count: isDirectory ? 0 : await this.countLines(targetPath),
      block_count: stats?.blocks || null,
      timestamp: Date.now(),
      file_path: path.resolve(targetPath),
      file_name: path.basename(targetPath),
      directory: path.dirname(path.resolve(targetPath)),
      inode: stats?.ino || null,
      is_directory: isDirectory
    };
  }

  // 行数カウント
  async countLines(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content.split('\n').length;
    } catch (error) {
      return 0;
    }
  }

  // Object ID management for proper inheritance
  async getObjectId(filePath, stats, eventType) {
    if (eventType === 'delete') {
      // For delete events: search for existing object_id by file path
      const existing = await this.db.findByPath(filePath);
      return existing?.object_id || null;
    } else if (stats?.ino) {
      // When inode is available: check for refind scenario
      const existing = await this.db.findByInode(stats.ino);
      if (existing && existing.latest_event === 'lost') {
        // Record as refind event
        return { objectId: existing.object_id, isRefind: true };
      }
    }
    // Generate new object_id for truly new files
    return await this.db.createNewObjectId(stats?.ino);
  }

  // Lost files scanning on startup
  async scanForLostFiles() {
    try {
      const liveFiles = await this.db.getLiveFiles(); // deleted = false
      
      for (const file of liveFiles) {
        try {
          await fs.access(file.file_path);
        } catch (error) {
          // File not found - mark as lost
          await this.recordEvent('lost', file.object_id, {
            file_path: file.file_path,
            file_name: file.file_name,
            directory: file.directory,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Failed to scan for lost files:', error);
    }
  }

  // Main event processing
  async processEvent(chokidarEvent, targetPath, stats) {
    try {
      // Determine event type
      const eventType = this.getEventType(chokidarEvent, stats);
      
      // Get or create object ID
      const objectIdResult = await this.getObjectId(targetPath, stats, eventType);
      const isRefind = objectIdResult?.isRefind || false;
      const objectId = objectIdResult?.objectId || objectIdResult;
      
      // Collect metadata
      const metadata = await this.collectMetadata(targetPath, stats);
      
      // Record event with proper type
      const actualEventType = isRefind ? 'refind' : eventType;
      await this.recordEvent(actualEventType, objectId, metadata);
      
    } catch (error) {
      console.error(`Failed to process event for ${targetPath}:`, error);
    }
  }

  // Record event to database
  async recordEvent(eventType, objectId, metadata) {
    // Implementation depends on database manager interface
    await this.db.recordEvent({
      event_type: eventType,
      object_id: objectId,
      ...metadata
    });
  }
}

module.exports = EventProcessor;
```

## 📋 使用方法

### File Monitorとの統合

```javascript
// src/monitors/file-monitor.js

const chokidar = require('chokidar');
const EventProcessor = require('./event-processor');

class FileMonitor {
  constructor(databaseManager, config) {
    this.processor = new EventProcessor(databaseManager);
    this.config = config;
  }

  start() {
    this.watcher = chokidar.watch(this.config.paths, {
      persistent: true,
      ignoreInitial: false,  // 初期スキャンを有効化
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      },
      atomic: true,
      alwaysStat: true      // statsオブジェクトを常に提供
    });

    // Event bindings
    this.watcher
      .on('add', (path, stats) => this.processor.processEvent('add', path, stats))
      .on('change', (path, stats) => this.processor.processEvent('change', path, stats))
      .on('unlink', (path) => this.processor.processEvent('unlink', path))
      .on('addDir', (path, stats) => this.processor.processEvent('addDir', path, stats))
      .on('unlinkDir', (path) => this.processor.processEvent('unlinkDir', path))
      .on('ready', () => this.processor.setReady())
      .on('error', error => console.error('Watcher error:', error));
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}
```

## 🧪 テストのポイント

1. **初期スキャンのテスト**
   - `isReady`フラグの動作確認
   - find/createイベントの区別

2. **Lost/Refindロジック**
   - 起動時のlostファイル検出
   - inode一致時のrefindイベント

3. **メタデータ収集**
   - 6項目すべての正確な記録
   - ディレクトリの場合の処理

## ⚠️ 注意事項

- chokidarの`stats`オブジェクトは必ずしも提供されない
- deleteイベントではstatsが取得できない
- 行数カウントは大きなファイルでパフォーマンスに影響

## 🔗 関連ドキュメント

- [FUNC-002: chokidar-Database統合監視](../functions/FUNC-002-chokidar-database-integration.md)
- [FUNC-001: ファイルライフサイクル追跡](../functions/FUNC-001-file-lifecycle-tracking.md)
- [BP-001: v0.2.0.0実装計画](../blueprints/BP-001-for-version0200-restructered.md)