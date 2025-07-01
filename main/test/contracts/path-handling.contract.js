/**
 * パス処理に関する契約定義
 * ConfigManager、PathResolver、DatabaseManager間のインターフェース仕様
 */

const path = require('path');

const PathHandlingContract = {
  /**
   * ConfigManagerの契約
   * 設定ファイルからパス情報を提供する
   */
  ConfigManager: {
    provides: {
      'database.path': {
        type: 'string',
        format: 'unix-path-with-tilde',
        example: '~/.cctop/activity.db',
        invariants: [
          'Must include database filename',
          'May use ~ for home directory',
          'Must end with .db extension'
        ],
        validation: (value) => {
          return typeof value === 'string' &&
                 value.includes('.db') &&
                 (value.startsWith('~/') || path.isAbsolute(value));
        }
      },
      
      'monitoring.watchPaths': {
        type: 'array',
        itemType: 'string',
        format: 'relative-or-absolute-path',
        example: ['.', './src', '/absolute/path'],
        invariants: [
          'Must be non-empty array',
          'Each item must be valid path string',
          'May contain relative or absolute paths'
        ],
        validation: (value) => {
          return Array.isArray(value) &&
                 value.length > 0 &&
                 value.every(p => typeof p === 'string' && p.length > 0);
        }
      }
    }
  },
  
  /**
   * PathResolverの契約（仮想的なコンポーネント）
   * パスの正規化と展開を担当
   */
  PathResolver: {
    transforms: {
      'tilde-expansion': {
        input: {
          type: 'string',
          format: 'unix-path-with-tilde',
          example: '~/.cctop/activity.db'
        },
        output: {
          type: 'string',
          format: 'absolute-path',
          example: '/Users/username/.cctop/activity.db',
          invariants: [
            'Must be absolute path',
            'Must not contain ~',
            'Must preserve filename and extensions'
          ]
        },
        implementation: (inputPath) => {
          if (inputPath.startsWith('~/')) {
            const os = require('os');
            return path.join(os.homedir(), inputPath.slice(2));
          }
          return inputPath;
        }
      },
      
      'relative-to-absolute': {
        input: {
          type: 'string',
          format: 'relative-path',
          example: './src'
        },
        output: {
          type: 'string',
          format: 'absolute-path',
          invariants: [
            'Must be absolute path',
            'Must resolve from current working directory'
          ]
        },
        implementation: (inputPath, basePath = process.cwd()) => {
          return path.resolve(basePath, inputPath);
        }
      }
    }
  },
  
  /**
   * DatabaseManagerの契約
   * データベースファイルパスを受け取って初期化
   */
  DatabaseManager: {
    requires: {
      'dbPath': {
        type: 'string',
        format: 'absolute-path',
        invariants: [
          'Must be absolute path',
          'Must not contain ~',
          'Parent directory must be writable',
          'Must end with .db extension'
        ],
        validation: (dbPath) => {
          return path.isAbsolute(dbPath) &&
                 !dbPath.includes('~') &&
                 dbPath.endsWith('.db');
        },
        preConditions: [
          'Parent directory exists or can be created',
          'User has write permissions'
        ]
      }
    },
    
    ensures: {
      'initialization': {
        postConditions: [
          'Database file is created if not exists',
          'Database connection is established',
          'Schema is created/migrated',
          'File permissions are set correctly'
        ],
        errorHandling: [
          'If parent directory cannot be created, throw clear error',
          'If permissions denied, throw with suggested fix',
          'If database corrupted, attempt recovery or throw'
        ]
      }
    }
  },
  
  /**
   * FileMonitorの契約
   * 監視パスを受け取ってchokidarを初期化
   */
  FileMonitor: {
    requires: {
      'watchPaths': {
        type: 'array',
        itemType: 'string',
        format: 'absolute-or-relative-path',
        invariants: [
          'Must be non-empty array',
          'Paths must exist or be creatable',
          'Must have read permissions'
        ],
        validation: (paths) => {
          return Array.isArray(paths) && paths.length > 0;
        }
      },
      
      'excludePatterns': {
        type: 'array',
        itemType: 'string',
        format: 'glob-pattern',
        example: ['**/node_modules/**', '**/.git/**'],
        invariants: [
          'Must be valid glob patterns',
          'May be empty array'
        ]
      }
    },
    
    ensures: {
      'watching': {
        postConditions: [
          'Chokidar watcher is initialized',
          'Initial scan is performed if configured',
          'Events are emitted for file changes',
          'Excluded patterns are respected'
        ]
      }
    }
  }
};

/**
 * 契約検証ヘルパー関数
 */
function validateContract(component, field, value) {
  const contract = PathHandlingContract[component];
  if (!contract) {
    throw new Error(`Unknown component: ${component}`);
  }
  
  const spec = contract.provides?.[field] || contract.requires?.[field];
  if (!spec) {
    throw new Error(`Unknown field ${field} for component ${component}`);
  }
  
  if (spec.validation) {
    return spec.validation(value);
  }
  
  return true;
}

/**
 * 変換契約の実行
 */
function executeTransform(component, transformName, input, ...args) {
  const transform = PathHandlingContract[component]?.transforms?.[transformName];
  if (!transform) {
    throw new Error(`Unknown transform ${transformName} for component ${component}`);
  }
  
  if (transform.implementation) {
    return transform.implementation(input, ...args);
  }
  
  throw new Error(`Transform ${transformName} has no implementation`);
}

module.exports = {
  PathHandlingContract,
  validateContract,
  executeTransform
};