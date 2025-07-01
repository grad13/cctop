/**
 * システム初期化に関する契約定義
 * 各コンポーネントの初期化順序と依存関係
 */

const InitializationContract = {
  /**
   * 初期化順序の契約
   */
  InitializationOrder: {
    sequence: [
      {
        order: 1,
        component: 'ConfigManager',
        dependencies: [],
        ensures: [
          'Configuration is loaded from appropriate source',
          'All config values are validated',
          'Defaults are applied for missing values'
        ],
        errorHandling: 'Fatal - cannot proceed without config'
      },
      
      {
        order: 2,
        component: 'PathResolver',
        dependencies: ['ConfigManager'],
        ensures: [
          'All paths with ~ are expanded',
          'Relative paths are resolved',
          'Directory creation attempted for required paths'
        ],
        errorHandling: 'Fatal - cannot proceed without valid paths'
      },
      
      {
        order: 3,
        component: 'DatabaseManager',
        dependencies: ['ConfigManager', 'PathResolver'],
        ensures: [
          'Database file is created/opened',
          'Schema is created/migrated',
          'Event types are initialized',
          'Connection is ready for queries'
        ],
        errorHandling: 'Fatal - core functionality requires database'
      },
      
      {
        order: 4,
        component: 'EventProcessor',
        dependencies: ['DatabaseManager'],
        ensures: [
          'Event queue is initialized',
          'Database connection is verified',
          'Ready to process events'
        ],
        errorHandling: 'Fatal - cannot process without event handler'
      },
      
      {
        order: 5,
        component: 'FileMonitor',
        dependencies: ['ConfigManager', 'EventProcessor'],
        ensures: [
          'Chokidar watcher is created',
          'Watch paths are registered',
          'Event listeners are attached',
          'Initial scan begins if configured'
        ],
        errorHandling: 'Graceful - warn but continue if some paths fail'
      },
      
      {
        order: 6,
        component: 'CLIDisplay',
        dependencies: ['DatabaseManager'],
        ensures: [
          'Terminal is configured',
          'Keyboard handlers are registered',
          'Initial display is rendered',
          'Refresh timer is started'
        ],
        errorHandling: 'Graceful - fallback to simple output'
      }
    ]
  },
  
  /**
   * コンポーネント間の初期化契約
   */
  ComponentContracts: {
    ConfigManager: {
      initialization: {
        inputs: {
          commandLineArgs: { type: 'array', optional: true },
          environment: { type: 'object', optional: true }
        },
        outputs: {
          config: {
            type: 'object',
            required: ['monitoring', 'database', 'display'],
            schema: {
              monitoring: {
                watchPaths: 'string[]',
                excludePatterns: 'string[]',
                debounceMs: 'number',
                maxDepth: 'number'
              },
              database: {
                path: 'string',
                mode: 'string'
              },
              display: {
                maxLines: 'number',
                refreshRateMs: 'number'
              }
            }
          }
        }
      }
    },
    
    DatabaseManager: {
      initialization: {
        inputs: {
          dbPath: { 
            type: 'string', 
            format: 'absolute-path',
            example: '/Users/username/.cctop/activity.db'
          }
        },
        sideEffects: [
          'Creates parent directory if not exists',
          'Creates database file if not exists',
          'Runs schema migrations',
          'Populates event_types table'
        ],
        outputs: {
          connection: { type: 'object', methods: ['query', 'prepare', 'close'] },
          isReady: { type: 'boolean' }
        }
      }
    },
    
    FileMonitor: {
      initialization: {
        inputs: {
          config: {
            paths: 'string[]',
            ignored: 'string[]',
            options: {
              persistent: 'boolean',
              ignoreInitial: 'boolean',
              awaitWriteFinish: 'object'
            }
          },
          eventHandler: { type: 'function' }
        },
        outputs: {
          watcher: { type: 'object', methods: ['on', 'add', 'close'] },
          isWatching: { type: 'boolean' }
        }
      }
    }
  },
  
  /**
   * 起動時の副作用契約
   */
  StartupSideEffects: {
    expectedFileSystemChanges: [
      {
        path: '~/.cctop',
        action: 'create-if-not-exists',
        type: 'directory'
      },
      {
        path: '~/.cctop/activity.db',
        action: 'create-if-not-exists',
        type: 'file',
        note: 'NOT events.db - must be activity.db per spec'
      },
      {
        path: '~/.cctop/config.json',
        action: 'create-if-not-exists',
        type: 'file',
        condition: 'Only if user config does not exist'
      }
    ],
    
    unexpectedChanges: [
      {
        path: './~',
        reason: 'Literal tilde directory should never be created'
      },
      {
        path: './events.db',
        reason: 'Database should be in ~/.cctop/activity.db'
      },
      {
        path: './activity.db',
        reason: 'Database should be in ~/.cctop/, not current directory'
      },
      {
        path: './.cctop',
        reason: 'Config directory should be in home, not current directory'
      }
    ]
  },
  
  /**
   * エラーリカバリー契約
   */
  ErrorRecovery: {
    scenarios: [
      {
        error: 'Database corruption',
        detection: 'SQLite returns SQLITE_CORRUPT',
        recovery: [
          'Rename corrupted file with timestamp',
          'Create new database',
          'Log warning to user',
          'Continue with fresh database'
        ]
      },
      {
        error: 'Config file invalid JSON',
        detection: 'JSON.parse throws',
        recovery: [
          'Log warning with parse error',
          'Use default configuration',
          'Suggest fix to user',
          'Continue with defaults'
        ]
      },
      {
        error: 'Watch path not accessible',
        detection: 'EACCES or ENOENT on watch',
        recovery: [
          'Log warning for specific path',
          'Skip that path',
          'Continue watching other paths',
          'Update display to show warning'
        ]
      }
    ]
  }
};

/**
 * 初期化順序の検証
 */
function validateInitializationOrder(components) {
  const order = InitializationContract.InitializationOrder.sequence;
  const initialized = new Set();
  
  for (const step of order) {
    // 依存関係の確認
    for (const dep of step.dependencies) {
      if (!initialized.has(dep)) {
        return {
          valid: false,
          error: `${step.component} requires ${dep} to be initialized first`
        };
      }
    }
    initialized.add(step.component);
  }
  
  return { valid: true };
}

module.exports = {
  InitializationContract,
  validateInitializationOrder
};