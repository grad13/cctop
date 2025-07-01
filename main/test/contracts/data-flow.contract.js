/**
 * データフローに関する契約定義
 * chokidar → EventProcessor → DatabaseManager の流れ
 */

const DataFlowContract = {
  /**
   * Chokidarからのイベント契約
   */
  ChokidarEvents: {
    provides: {
      'add': {
        description: 'ファイル追加イベント',
        payload: {
          path: { type: 'string', required: true },
          stats: { 
            type: 'object', 
            required: true,
            properties: {
              size: { type: 'number' },
              mtime: { type: 'Date' },
              ino: { type: 'number' },
              blocks: { type: 'number', optional: true }
            }
          }
        },
        timing: 'Emitted on file creation or initial scan'
      },
      
      'change': {
        description: 'ファイル変更イベント',
        payload: {
          path: { type: 'string', required: true },
          stats: { type: 'object', required: true }
        },
        timing: 'Emitted on file modification'
      },
      
      'unlink': {
        description: 'ファイル削除イベント',
        payload: {
          path: { type: 'string', required: true }
        },
        timing: 'Emitted on file deletion'
      },
      
      'ready': {
        description: '初期スキャン完了',
        payload: null,
        timing: 'Emitted once after initial scan'
      }
    }
  },
  
  /**
   * EventProcessorの変換契約
   */
  EventProcessor: {
    transforms: {
      'chokidar-to-internal': {
        description: 'chokidarイベントを内部イベント形式に変換',
        input: {
          eventType: { 
            type: 'string', 
            enum: ['add', 'change', 'unlink', 'addDir', 'unlinkDir'] 
          },
          path: { type: 'string' },
          stats: { type: 'object', optional: true },
          isReady: { type: 'boolean', description: '初期スキャン完了フラグ' }
        },
        output: {
          event_type: { 
            type: 'string', 
            enum: ['find', 'create', 'modify', 'delete'],
            rules: [
              'add + !isReady → find',
              'add + isReady → create',
              'change → modify',
              'unlink → delete',
              'addDir + !isReady → skip',
              'addDir + isReady → create',
              'unlinkDir → delete'
            ]
          },
          file_path: { type: 'string', format: 'absolute' },
          file_name: { type: 'string' },
          directory: { type: 'string', format: 'absolute' },
          timestamp: { type: 'number', format: 'unix-timestamp-ms' },
          file_size: { type: 'number', optional: true },
          line_count: { type: 'number', optional: true },
          block_count: { type: 'number', optional: true },
          inode: { type: 'number', optional: true }
        }
      }
    },
    
    ensures: {
      'metadata-collection': {
        description: 'ファイルメタデータの収集',
        rules: [
          'line_count is calculated for text files',
          'file_size is taken from stats',
          'block_count is taken from stats if available',
          'inode is taken from stats for object tracking'
        ]
      },
      
      'event-ordering': {
        description: 'イベントの順序保証',
        rules: [
          'Events are processed in order received',
          'Timestamps reflect actual event time',
          'No events are dropped or duplicated'
        ]
      }
    }
  },
  
  /**
   * DatabaseManagerのデータ永続化契約
   */
  DatabaseManager: {
    requires: {
      'event-record': {
        timestamp: { type: 'number', required: true },
        event_type: { type: 'string', required: true },
        file_path: { type: 'string', required: true },
        file_name: { type: 'string', required: true },
        directory: { type: 'string', required: true },
        file_size: { type: 'number', optional: true },
        line_count: { type: 'number', optional: true },
        block_count: { type: 'number', optional: true },
        inode: { type: 'number', optional: true }
      }
    },
    
    ensures: {
      'data-integrity': {
        rules: [
          'All required fields are stored',
          'Event types are mapped to event_types table',
          'Object fingerprints are created/reused based on inode',
          'Previous event links are maintained for same file',
          'Transactions ensure atomicity'
        ]
      },
      
      'query-capability': {
        supports: [
          'Get all events for a file path',
          'Get latest event for each file (UNIQUE mode)',
          'Get events in time order (ALL mode)',
          'Filter by event type',
          'Get file statistics'
        ]
      }
    }
  },
  
  /**
   * エンドツーエンドのデータフロー契約
   */
  EndToEndFlow: {
    scenario: 'File modification',
    flow: [
      {
        step: 1,
        component: 'FileSystem',
        action: 'User modifies file.txt'
      },
      {
        step: 2,
        component: 'Chokidar',
        action: 'Detects change, emits event with stats'
      },
      {
        step: 3,
        component: 'EventProcessor',
        action: 'Transforms to modify event, collects metadata'
      },
      {
        step: 4,
        component: 'DatabaseManager',
        action: 'Stores event with all metadata'
      },
      {
        step: 5,
        component: 'CLIDisplay',
        action: 'Queries and displays updated information'
      }
    ],
    
    invariants: [
      'No data loss between components',
      'Timestamps remain consistent',
      'File path never changes during flow',
      'Metadata accuracy is preserved'
    ]
  }
};

/**
 * イベント変換の実装例（契約準拠）
 */
function transformChokidarEvent(eventType, filePath, stats, isReady) {
  const contract = DataFlowContract.EventProcessor.transforms['chokidar-to-internal'];
  
  // 契約に基づくイベントタイプ変換
  let internalEventType;
  switch (eventType) {
    case 'add':
      internalEventType = isReady ? 'create' : 'find';
      break;
    case 'change':
      internalEventType = 'modify';
      break;
    case 'unlink':
    case 'unlinkDir':
      internalEventType = 'delete';
      break;
    case 'addDir':
      if (!isReady) return null; // 初期スキャン中のディレクトリはスキップ
      internalEventType = 'create';
      break;
    default:
      throw new Error(`Unknown event type: ${eventType}`);
  }
  
  const path = require('path');
  
  return {
    event_type: internalEventType,
    file_path: path.resolve(filePath),
    file_name: path.basename(filePath),
    directory: path.dirname(path.resolve(filePath)),
    timestamp: Date.now(),
    file_size: stats?.size,
    line_count: undefined, // 別途計算が必要
    block_count: stats?.blocks,
    inode: stats?.ino
  };
}

module.exports = {
  DataFlowContract,
  transformChokidarEvent
};