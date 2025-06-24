# テスト改善計画書 - 2025年6月24日（改訂版）

**作成日**: 2025-06-24  
**作成者**: Builder Agent  
**目的**: REP-088監査結果に基づくテスト品質改善計画  
**基準文書**: PLAN-20250624-001-v0100-implementation.md  
**改訂内容**: 副作用テスト、Data-Driven Testing、契約テストの3手法を統合

## 🎯 改善目的

REP-088監査で発見されたテスト品質問題を系統的に改善し、以下を達成：
1. **仕様書準拠性向上**: PLAN-20250624-001に基づいたテスト
2. **実装詳細からの独立**: メッセージや具体値に依存しないテスト
3. **テスト保守性向上**: テストデータとロジックの分離
4. **副作用の検証**: 期待される副作用と予期しない副作用の検出
5. **コンポーネント間契約の明確化**: インターフェース仕様の文書化と検証

## 📊 改善対象と優先度

| ファイル | 優先度 | 主な問題 | 改善方針 |
|---------|--------|----------|----------|
| startup-verification.test.js | 最高 | 仕様書未定義メッセージへの依存 | 動作確認中心へ変更 |
| feature-2-database.test.js | 高 | ハードコード値(12345) | 実際のテストデータに変更 |
| feature-3-config.test.js | 高 | 設定値の大量ハードコード | 動作確認中心へ変更 |
| feature-1-entry.test.js | 中 | 成功メッセージの詳細依存 | 本質的な動作確認へ |

## 🔧 統合改善アプローチ

### 1. 副作用テスト（Side Effect Testing）

**目的**: 期待される変更と予期しない変更の両方を検証

```javascript
// test/helpers/side-effect-tracker.js
class SideEffectTracker {
  constructor() {
    this.fsSnapshot = null;
    this.processSnapshot = null;
  }
  
  captureState() {
    this.fsSnapshot = this.captureFileSystem();
    this.processSnapshot = this.captureProcessState();
  }
  
  captureFileSystem() {
    const state = new Map();
    const dirs = ['.', os.homedir()];
    
    dirs.forEach(dir => {
      const files = glob.sync(`${dir}/**/*`, { 
        dot: true, 
        ignore: ['node_modules/**', '.git/**']
      });
      files.forEach(file => {
        state.set(file, fs.statSync(file).mtime);
      });
    });
    
    return state;
  }
  
  detectChanges() {
    const current = this.captureFileSystem();
    const changes = {
      created: [],
      modified: [],
      deleted: []
    };
    
    // 新規作成
    for (const [path] of current) {
      if (!this.fsSnapshot.has(path)) {
        changes.created.push(path);
      }
    }
    
    // 削除
    for (const [path] of this.fsSnapshot) {
      if (!current.has(path)) {
        changes.deleted.push(path);
      }
    }
    
    return changes;
  }
}
```

### 2. Data-Driven Testing

**目的**: テストデータとロジックの分離、テストケースの体系化

```javascript
// test/fixtures/test-scenarios.js
export const startupScenarios = [
  {
    name: 'clean start',
    setup: async () => {
      await cleanup();
    },
    input: {
      args: [],
      env: { NODE_ENV: 'test' }
    },
    expectations: {
      exitCode: 0,
      maxDuration: 3000,
      sideEffects: {
        creates: [
          path.join(os.homedir(), '.cctop'),
          path.join(os.homedir(), '.cctop', 'activity.db')
        ],
        notCreates: ['./~', 'events.db']
      }
    }
  },
  {
    name: 'start with existing config',
    setup: async () => {
      await createConfig({ watchPaths: ['./src'] });
    },
    input: {
      args: ['--config', 'test-config.json'],
      env: { NODE_ENV: 'test' }
    },
    expectations: {
      exitCode: 0,
      maxDuration: 1000,  // 既存設定で高速化
      configLoaded: true
    }
  }
];
```

### 3. 契約テスト（Contract Testing）

**目的**: コンポーネント間のインターフェース仕様を明確化・検証

```javascript
// test/contracts/path-handling.contract.js
export const PathHandlingContract = {
  ConfigManager: {
    provides: {
      'database.path': {
        type: 'string',
        format: 'unix-path-with-tilde',
        example: '~/.cctop/activity.db',
        invariants: [
          'Must include database filename',
          'May use ~ for home directory'
        ]
      }
    }
  },
  
  PathResolver: {
    transforms: {
      input: {
        type: 'string',
        format: 'unix-path-with-tilde'
      },
      output: {
        type: 'string',
        format: 'absolute-path',
        invariants: [
          'Must be absolute path',
          'Must not contain ~'
        ]
      }
    }
  },
  
  DatabaseManager: {
    requires: {
      'dbPath': {
        type: 'string',
        format: 'absolute-path',
        validation: (path) => {
          return path.isAbsolute() && !path.includes('~');
        }
      }
    }
  }
};

// 契約検証テスト
describe('Path handling contract', () => {
  test('ConfigManager output meets PathResolver input contract', () => {
    const config = new ConfigManager();
    const dbPath = config.get('database.path');
    
    expect(dbPath).toMatch(/^~/);  // ConfigManagerの契約
    expect(typeof dbPath).toBe('string');
  });
  
  test('PathResolver transforms according to contract', () => {
    const input = '~/.cctop/test.db';
    const output = PathResolver.resolve(input);
    
    expect(path.isAbsolute(output)).toBe(true);
    expect(output).not.toContain('~');
  });
});
```

## 📋 詳細改善計画

### 1. startup-verification.test.js

**統合アプローチ**:
```javascript
// Data-Driven + 副作用テスト + 契約テスト
describe('Startup verification', () => {
  const sideEffectTracker = new SideEffectTracker();
  
  startupScenarios.forEach(scenario => {
    test(`Startup: ${scenario.name}`, async () => {
      // Setup
      await scenario.setup();
      sideEffectTracker.captureState();
      
      // Execute
      const start = Date.now();
      const result = await runCctop(scenario.input.args, scenario.input.env);
      const duration = Date.now() - start;
      
      // Verify behavior (not messages)
      expect(result.exitCode).toBe(scenario.expectations.exitCode);
      expect(duration).toBeLessThan(scenario.expectations.maxDuration);
      
      // Verify side effects
      const changes = sideEffectTracker.detectChanges();
      scenario.expectations.sideEffects.creates.forEach(file => {
        expect(changes.created).toContain(file);
      });
      scenario.expectations.sideEffects.notCreates.forEach(file => {
        expect(changes.created).not.toContain(file);
      });
      
      // Verify contracts
      if (scenario.expectations.configLoaded) {
        const configContract = ConfigContract.startup;
        expect(result).toMatchContract(configContract);
      }
    });
  });
});
```

### 2. feature-2-database.test.js

**統合アプローチ**:
```javascript
// test/fixtures/database.fixtures.js
export const databaseTestData = {
  files: [
    {
      name: 'test-file-1.txt',
      content: 'Hello World',
      expectedStats: {
        size: 11,
        // inode は実行時に取得
      }
    }
  ],
  
  operations: [
    {
      type: 'insert',
      data: { path: '/test/file.txt' },
      expectedId: (id) => id > 0
    }
  ]
};

// テスト本体
describe('Database operations', () => {
  let realInode;
  
  beforeEach(async () => {
    // 実際のファイルを作成してinodeを取得
    const testFile = databaseTestData.files[0];
    fs.writeFileSync(testFile.name, testFile.content);
    realInode = fs.statSync(testFile.name).ino;
  });
  
  test('Should store actual file metadata', async () => {
    const result = await dbManager.insertFileRecord({
      path: testFile.name,
      inode: realInode  // 実際の値を使用
    });
    
    const row = await dbManager.get(result.id);
    expect(row.inode).toBe(realInode);  // ハードコードではない
  });
});
```

### 3. feature-3-config.test.js

**統合アプローチ**:
```javascript
// Data-Driven 設定シナリオ
const configScenarios = [
  {
    name: 'default config',
    input: {},
    verifyBehavior: (config) => {
      // 値ではなく動作を確認
      expect(config.get('display.maxEvents')).toBeGreaterThan(0);
      expect(config.get('display.maxEvents')).toBeLessThan(1000);
    }
  },
  {
    name: 'user override',
    input: { display: { maxEvents: 100 } },
    verifyBehavior: (config) => {
      expect(config.get('display.maxEvents')).toBe(100);
      // デフォルト値が保持されているか
      expect(config.get('monitoring')).toBeDefined();
    }
  }
];

describe('Configuration management', () => {
  configScenarios.forEach(scenario => {
    test(`Config: ${scenario.name}`, () => {
      const config = new ConfigManager(scenario.input);
      scenario.verifyBehavior(config);
      
      // 契約検証
      const configContract = ConfigContract.structure;
      expect(config.toJSON()).toMatchContract(configContract);
    });
  });
});
```

## 🚀 実行計画

### Phase 1: インフラ構築（4時間）
1. **副作用トラッカー実装** (1.5時間)
   - `test/helpers/side-effect-tracker.js`
   - ファイルシステム状態のキャプチャ・比較機能
   
2. **テストフィクスチャ整理** (1時間)
   - `test/fixtures/` ディレクトリ作成
   - シナリオデータの移行
   
3. **契約定義** (1.5時間)
   - `test/contracts/` ディレクトリ作成
   - 主要インターフェースの契約定義

### Phase 2: テスト修正（4時間）
1. **startup-verification.test.js** (1.5時間)
   - メッセージ依存の除去
   - 副作用検証の追加
   
2. **feature-2-database.test.js** (1時間)
   - ハードコード値の除去
   - 実データ使用への変更
   
3. **feature-3-config.test.js** (1時間)
   - 動作確認中心への変更
   - シナリオベーステストの導入
   
4. **feature-1-entry.test.js** (0.5時間)
   - 統合メッセージ依存の除去

### Phase 3: 検証と文書化（2時間）
1. **全テスト実行** (0.5時間)
2. **カバレッジ確認** (0.5時間)
3. **改善結果の文書化** (0.5時間)
4. **今後の保守ガイドライン作成** (0.5時間)

## ✅ 成功基準

1. **副作用検証**
   - リテラルな`~`ディレクトリが作成されないことを保証
   - `events.db`ではなく`activity.db`が作成されることを確認

2. **仕様準拠**
   - PLAN-20250624-001の要求事項のみをテスト
   - 実装詳細（メッセージ等）への依存ゼロ

3. **保守性向上**
   - テストデータとロジックの完全分離
   - 新しいシナリオの追加が容易

4. **契約の明確化**
   - コンポーネント間の期待値が文書化
   - インターフェースの不整合を自動検出

## 📝 注意事項

1. **段階的実装**: 一度にすべて変更せず、1ファイルずつ確実に
2. **後方互換性**: 既存の機能が壊れないことを確認
3. **実行時間**: テスト実行時間が大幅に増加しないよう注意
4. **文書化**: 新しいテストパターンは必ずコメントで説明

---

**次のステップ**: Phase 1のインフラ構築から開始