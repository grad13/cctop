/**
 * Event Processor (r002準拠)
 * 機能5: chokidar→DB統合によるイベント処理
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class EventProcessor extends EventEmitter {
  constructor(databaseManager) {
    super();
    this.db = databaseManager;
    this.isInitialScanMode = true;
    
    console.log('⚡ EventProcessor initialized');
  }

  /**
   * ファイル監視からのイベント処理
   */
  async processFileEvent(event) {
    try {
      // r002準拠のイベントタイプマッピング
      const eventType = this.mapEventType(event.type);
      if (!eventType) {
        console.log(`⏭️ Skipping event: ${event.type} for ${path.basename(event.path)}`);
        return null; // 明示的にnullを返す
      }

      // メタデータ収集
      const metadata = await this.collectMetadata(event.path, event.stats);
      
      // データベースに記録
      const eventRecord = await this.recordEvent(eventType, event.path, metadata);
      
      // console.log(`💾 ${eventType}: ${path.basename(event.path)} → DB (ID: ${eventRecord.id})`);
      
      // 統計更新
      await this.updateStatistics(eventRecord);
      
      // 処理結果オブジェクト
      const result = {
        original: event,
        recorded: {
          ...eventRecord,
          event_type: eventType  // CLIDisplay用にevent_type文字列を追加
        },
        eventType
      };
      
      // 処理完了イベント発行（setImmediate で次のティックで実行）
      setImmediate(() => {
        this.emit('eventProcessed', result);
      });
      
      // 戻り値としても結果を返す（同期的な確認のため）
      return result;
      
    } catch (error) {
      console.error('❌ Event processing failed:', error);
      const errorResult = { event, error };
      setImmediate(() => {
        this.emit('processingError', errorResult);
      });
      throw error; // エラーを再スローして呼び出し元に伝播
    }
  }

  /**
   * 初期スキャン完了の処理
   */
  onInitialScanComplete() {
    this.isInitialScanMode = false;
    console.log('🔄 Initial scan complete - switching to real-time mode');
    this.emit('scanComplete');
  }

  /**
   * r002準拠のイベントタイプマッピング
   */
  mapEventType(chokidarEvent) {
    const eventMapping = {
      'scan': 'scan',     // 初期スキャン中のファイル発見
      'create': 'create', // リアルタイム監視中の新規作成
      'modify': 'modify', // ファイル変更
      'delete': 'delete', // ファイル削除
      'move': 'move'      // ファイル移動（将来実装）
    };
    
    return eventMapping[chokidarEvent] || null;
  }

  /**
   * メタデータ収集（r002準拠）
   */
  async collectMetadata(filePath, stats) {
    const metadata = {
      file_path: path.resolve(filePath),
      file_name: path.basename(filePath),
      directory: path.dirname(path.resolve(filePath)),
      timestamp: Date.now()
    };

    if (stats) {
      metadata.file_size = stats.size || 0;
      metadata.inode = stats.ino || null;
      
      // 行数カウント（テキストファイルのみ）
      if (this.isTextFile(filePath)) {
        try {
          metadata.line_count = await this.countLines(filePath);
        } catch (error) {
          metadata.line_count = null;
        }
      } else {
        metadata.line_count = null;
      }
      
      // ブロック数（利用可能な場合）
      metadata.block_count = stats.blocks || null;
    } else {
      // 削除されたファイルの場合
      metadata.file_size = null;
      metadata.line_count = null;
      metadata.block_count = null;
      metadata.inode = null;
    }

    return metadata;
  }

  /**
   * データベースにイベント記録
   */
  async recordEvent(eventType, filePath, metadata) {
    // イベントタイプIDを取得
    const eventTypeId = await this.db.getEventTypeId(eventType);
    if (!eventTypeId) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    // オブジェクトフィンガープリント管理
    let objectId;
    if (metadata.inode) {
      objectId = await this.db.getOrCreateObjectId(metadata.inode);
    } else {
      // inodeが利用できない場合（削除ファイルなど）
      objectId = await this.db.getOrCreateObjectId(null, filePath);
    }

    // イベント記録
    const eventRecord = await this.db.insertEvent({
      timestamp: metadata.timestamp,
      event_type_id: eventTypeId,
      object_id: objectId,
      file_path: metadata.file_path,
      file_name: metadata.file_name,
      directory: metadata.directory,
      file_size: metadata.file_size,
      line_count: metadata.line_count,
      block_count: metadata.block_count,
      previous_event_id: null, // 将来実装
      source_path: null        // 将来実装（moveイベント用）
    });

    return eventRecord;
  }

  /**
   * 統計情報更新
   */
  async updateStatistics(eventRecord) {
    try {
      await this.db.updateObjectStatistics(eventRecord.object_id, {
        current_file_size: eventRecord.file_size,
        current_line_count: eventRecord.line_count,
        current_block_count: eventRecord.block_count,
        last_updated: Date.now()
      });
    } catch (error) {
      console.error('⚠️ Statistics update failed:', error);
    }
  }

  /**
   * テキストファイル判定
   */
  isTextFile(filePath) {
    const textExtensions = [
      '.txt', '.md', '.js', '.json', '.html', '.css', '.scss', '.sass',
      '.ts', '.tsx', '.jsx', '.vue', '.php', '.py', '.rb', '.go',
      '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt',
      '.rs', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      '.xml', '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf',
      '.log', '.sql', '.r', '.R', '.m', '.tex', '.bib'
    ];
    
    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  /**
   * ファイルの行数カウント
   */
  async countLines(filePath) {
    return new Promise((resolve, reject) => {
      let lineCount = 0;
      let isFirstLine = true;
      
      const stream = fs.createReadStream(filePath, { 
        encoding: 'utf8',
        highWaterMark: 16 * 1024 // 16KB chunks
      });
      
      stream.on('data', (chunk) => {
        // 改行をカウント
        const lines = chunk.split('\n');
        lineCount += lines.length - 1;
        
        // 最初のチャンクで空でなければ1行はある
        if (isFirstLine && chunk.length > 0) {
          lineCount += 1;
          isFirstLine = false;
        }
      });
      
      stream.on('end', () => {
        // 空ファイルの場合は0行
        resolve(isFirstLine ? 0 : lineCount);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 現在の処理統計取得
   */
  getStats() {
    return {
      isInitialScanMode: this.isInitialScanMode,
      processedEvents: this.listenerCount('eventProcessed'),
      errors: this.listenerCount('processingError')
    };
  }
}

module.exports = EventProcessor;