# CCTOP CLI Test Suite - FUNC-105 Integration

FUNC-105準拠のCCTOP CLIモジュールテストスイート（vitest使用）

## 概要

このテストスイートはFUNC-105統合を含むCCTOP CLIの品質保証を目的として以下をテストします：

- **FUNC-105設定管理**: ローカル設定・初期化機能の自動化
- **データベース統合**: FUNC-105準拠の.cctop/data/activity.db
- **CLI自動初期化**: 起動時の設定確認・作成
- **Python統合**: FUNC-105構造でのダミーデータ生成
- **UI コンポーネント**: blessed ベースのターミナルUI
- **ユーティリティ関数**: ヘルパー関数と型定義

## FUNC-105統合テスト実行方法

### 基本フロー
```bash
# 1. FUNC-105準拠でPythonダミーデータ生成
python3 scripts/dummy_data_generator.py --files 30 --days 5
# → .cctop/data/activity.db が自動作成される

# 2. CLI起動（FUNC-105自動初期化テスト）
npm run build
npm run demo:ui
# → 起動時に.cctop設定を自動確認・初期化、activity.dbから読み込み

# 3. ユニットテスト実行
npm test
```

### ライブモード（動的データ生成）
```bash
# 継続的なイベント生成（q/Ctrl+Cで停止）
python3 scripts/dummy_data_generator.py --live-mode

# カスタム間隔でライブモード
python3 scripts/dummy_data_generator.py --live-mode --live-interval 1.5

# 初期データ + ライブモード
python3 scripts/dummy_data_generator.py --files 10 --days 2 --live-mode
```

### FUNC-105テストの詳細

#### 1. Python側FUNC-105実装
```bash
# FUNC-105ディレクトリ構造自動作成
python3 scripts/dummy_data_generator.py
```

作成される構造:
```
.cctop/
├── config/         # 設定ファイル
├── themes/         # テーマファイル  
├── data/          # データベースファイル
│   └── activity.db # FUNC-105標準DBファイル
├── logs/          # ログファイル
├── runtime/       # ランタイムファイル
└── temp/          # 一時ファイル
```

#### 2. CLI側FUNC-105自動初期化
```typescript
// 起動時の自動チェック・初期化
const initializer = new LocalSetupInitializer();
if (!initializer.isInitialized()) {
  console.log('FUNC-105: Initializing .cctop configuration...');
  const result = await initializer.initialize();
}

// FUNC-105準拠のDB接続
const dbPath = path.resolve(process.cwd(), '.cctop', 'data', 'activity.db');
const db = new DatabaseAdapter(dbPath);
```

## テスト実行方法

### 基本コマンド

```bash
# 全テスト実行
npm test

# 監視モード（開発時）
npm run test:watch

# 特定のテストファイル実行
npm test -- test/config/
npm test -- test/types/
npm test -- test/utils/

# カバレッジ付きテスト実行
npm run test:coverage
```

### 個別テスト実行

```bash
# 設定関連のみ
npm test -- test/config/cli-config.test.ts
npm test -- test/config/config-loader.test.ts
npm test -- test/config/local-setup-initializer.test.ts

# データ関連のみ
npm test -- test/data/demo-data-generator.test.ts

# ユーティリティのみ
npm test -- test/utils/format-helpers.test.ts

# 型定義のみ
npm test -- test/types/event-row.test.ts
```

## テスト構造

### ディレクトリ構成

```
test/
├── README.md                    # このファイル
├── config/                      # FUNC-105設定管理テスト（40 tests）
│   ├── cli-config.test.ts       # CLI設定のテスト (6 tests)
│   ├── config-loader.test.ts    # 設定ローダーのテスト (17 tests)
│   └── local-setup-initializer.test.ts  # FUNC-105実装テスト (17 tests)
├── data/                        # データ関連テスト（9 tests）
│   └── demo-data-generator.test.ts  # デモデータ生成テスト (9 tests)
├── fixtures/                    # テストフィクスチャ
│   ├── README.md               # フィクスチャ文書
│   ├── create-test-db.ts       # テストDB作成
│   └── demo-python-dummy-data.ts  # Python統合デモ（FUNC-105対応）
├── scripts/                     # テスト自動化スクリプト
│   └── full_integration_test.sh # 完全統合テスト
├── types/                       # 型定義テスト（5 tests）
│   └── event-row.test.ts        # EventRow型のテスト (5 tests)
├── utils/                       # ユーティリティテスト（14 tests）
│   └── format-helpers.test.ts   # フォーマットヘルパーテスト (14 tests)
└── python-integration-test.md   # Python統合テスト文書
```

**全68テスト** - FUNC-105統合込みで全て合格

## テストカテゴリ

### 1. **FUNC-105設定管理テスト** (`test/config/`)

**自動初期化システム**:
- ✅ `.cctop/` ディレクトリ自動作成
- ✅ FUNC-105準拠の7ディレクトリ作成
- ✅ 3層設定アーキテクチャ（shared/daemon/cli）
- ✅ テーマファイル自動生成（default.json、high-contrast.json）
- ✅ .gitignore自動生成
- ✅ 既存設定の保護機能
- ✅ dry-run・force機能

```typescript
// FUNC-105テスト例
describe('LocalSetupInitializer FUNC-105', () => {
  it('should create complete .cctop structure', async () => {
    const result = await initializer.initialize({ targetDirectory: testDir });
    expect(result.created).toBe(true);
    
    // FUNC-105準拠の全ディレクトリ確認
    const expectedDirs = ['config', 'themes', 'data', 'logs', 'runtime', 'temp'];
    expectedDirs.forEach(dir => {
      expect(fs.existsSync(path.join(testDir, '.cctop', dir))).toBe(true);
    });
  });
});
```

### 2. **FUNC-105データ統合テスト** (`test/data/`)

**Python-Node.js統合**:
- ✅ FUNC-105準拠のディレクトリ作成
- ✅ activity.db正しい配置確認
- ✅ CLIからの自動読み込み
- ✅ データ整合性検証

**ダミーデータ生成**:
- ランダムイベント生成
- メトリクス計算
- データベース互換性

### 3. **型定義テスト** (`test/types/`)

**TypeScript型の整合性**:
- EventRow インターフェース
- 必須フィールド検証
- オプショナルフィールド

### 4. **ユーティリティテスト** (`test/utils/`)

**ヘルパー関数**:
- 文字列フォーマット
- 日時処理
- ファイルサイズ変換
- East Asian Width: FUNC-200 compliance tests

## FUNC-105統合テスト手順

### 完全統合テスト
```bash
# 1. 環境クリーンアップ
rm -rf .cctop

# 2. FUNC-105準拠でPythonデータ生成
python3 scripts/dummy_data_generator.py --files 20 --days 3

# 3. 生成された構造確認
ls -la .cctop/
ls -la .cctop/data/

# 4. CLI統合テスト
npm run build
npm run demo:ui

# 5. ユニットテスト実行
npm test
```

### Python統合テスト詳細
```bash
# FUNC-105統合テスト手順書
cat test/python-integration-test.md

# FUNC-105準拠の自動統合テスト
python3 scripts/dummy_data_generator.py
npm run demo:ui
# → CLIが自動的に.cctop設定を確認し、activity.dbを読み込む

# リアルタイム統合テスト
python3 scripts/dummy_data_generator.py --live-mode &
npm run demo:ui
# → CLIでリアルタイムに追加されるイベントを確認
```

### 自動化テストスクリプト

```bash
# 完全統合テストを自動実行
./test/scripts/full_integration_test.sh

# または手動でフル統合テスト
python3 scripts/dummy_data_generator.py --files 10 --days 1
npm run demo:python-data
```

## FUNC-105統合テスト項目

1. **Python FUNC-105構造作成**: .cctop/ディレクトリ自動生成
2. **FUNC-000準拠データ生成**: activity.dbへのSQLiteデータ生成  
3. **CLI FUNC-105自動初期化**: 起動時の.cctop設定確認・作成
4. **3層設定アーキテクチャ**: shared/daemon/cli設定の動作確認
5. **テーマシステム**: default/high-contrast テーマの読み込み
6. **データベース統合**: activity.dbからの自動データ読み込み
7. **UI統合**: blessed UIでの表示・操作確認
8. **リアルタイムデータ**: ライブモードでの動的イベント生成・表示
9. **エラーハンドリング**: 設定ファイル破損・権限エラー対応

## テスト実装パターン

### 設定ファイルテスト

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Configuration Tests', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cctop-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should handle configuration properly', async () => {
    // テスト実装
  });
});
```

### モック使用パターン

```typescript
import { vi } from 'vitest';

it('should handle errors gracefully', async () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // エラー発生処理
  
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('Expected warning message')
  );
  
  consoleSpy.mockRestore();
});
```

## テスト設定

### vitest Configuration
- **Framework**: vitest (modern, fast testing)
- **TypeScript**: Full TypeScript support
- **Mocking**: Comprehensive mocking capabilities
- **Parallel**: Tests run in parallel for speed

### Mock Strategy
- **External Dependencies**: SQLite3, blessed, file system operations
- **Isolation**: Each test suite runs independently
- **Cleanup**: Automatic cleanup of test artifacts

## データベーステスト

### FUNC-105 Database Integration
- **Standard Path**: `.cctop/data/activity.db` (FUNC-105 compliant)
- **Auto-creation**: Directory structure created by Python script
- **CLI Detection**: Automatic detection and loading by CLI

### Database Test Patterns
1. **Schema Validation**: Ensure tables and indexes are created correctly
2. **Data Integrity**: Verify foreign key constraints and data consistency
3. **Query Performance**: Basic performance tests for key queries
4. **Edge Cases**: Test empty databases, large datasets, corrupted data
5. **FUNC-105 Compliance**: Verify proper directory structure and file locations

## デバッグ支援

### よくある問題と解決法

#### 1. **FUNC-105ディレクトリ権限エラー**
```
Error: EACCES: permission denied, mkdir '.cctop'
```
**解決法**: カレントディレクトリの書き込み権限確認

#### 2. **activity.db作成失敗**
```
Error: SQLITE_CANTOPEN: unable to open database file
```
**解決法**: .cctop/data/ディレクトリの存在確認

#### 3. **CLI設定読み込み失敗**  
```
Error: Configuration file not found
```
**解決法**: FUNC-105初期化の実行確認

#### 4. **SQLite Lock**: Ensure test databases are properly closed
#### 5. **Async Issues**: Verify proper async/await usage
#### 6. **Mock Conflicts**: Ensure mocks don't interfere with each other

### デバッグモード
```bash
# Enable debug output
DEBUG=1 npm test

# Run single test with debug
npm test -- --run specific-test.test.ts --verbose

# 並列実行無効（デバッグ時）
npm test -- --no-parallel
```

### FUNC-105デバッグコマンド
```bash
# FUNC-105構造確認
find .cctop -type f -name "*.json" | head -10

# activity.db確認
ls -la .cctop/data/
sqlite3 .cctop/data/activity.db ".tables"

# CLI設定確認
node -e "
const { ConfigLoader } = require('./dist/config/config-loader.js');
const loader = new ConfigLoader();
loader.loadConfiguration().then(console.log).catch(console.error);
"
```

### 一時ファイル確認

テスト失敗時、一時ディレクトリを確認：

```typescript
afterEach(() => {
  if (process.env.DEBUG_TESTS) {
    console.log('Test directory preserved at:', testDir);
    return; // Skip cleanup for debugging
  }
  // Normal cleanup
});
```

実行時:
```bash
DEBUG_TESTS=1 npm test -- test/config/local-setup-initializer.test.ts
```

## FUNC-105データ管理

### FUNC-105 Compliant Data Flow
1. **Python Generator**: Creates `.cctop/data/activity.db` with realistic data
2. **CLI Startup**: Auto-detects and loads from FUNC-105 location
3. **Configuration**: Uses FUNC-105 3-layer config system
4. **Display**: Shows data from production-like database structure

### Fixture Data
- **Static Fixtures**: Pre-defined test data in `fixtures/`
- **Dynamic Generation**: Runtime test data generation with FUNC-105 paths
- **Cleanup**: Automatic cleanup after test completion

### Python Integration
- **Schema Compatibility**: Python generator creates FUNC-000 compliant data
- **Data Realism**: Time-based activity patterns, realistic file types
- **FUNC-105 Structure**: Automatically creates proper directory layout
- **Performance**: Optimized for test scenarios (smaller datasets)

### テストデータベース管理

```typescript
// FUNC-105準拠のDBパス
const func105DbPath = path.join(process.cwd(), '.cctop', 'data', 'activity.db');

// FUNC-105ディレクトリ構造自動作成
const pythonResult = execSync(
  `python3 scripts/dummy_data_generator.py --files 10`
  // デフォルトで .cctop/data/activity.db に作成
);

// CLI起動時のFUNC-105自動初期化テスト
const cli = new BlessedFramelessUISimple(db);
await cli.start(); // 自動的に.cctop設定を確認・作成
```

## CI/CD統合

### GitHub Actions FUNC-105統合
```yaml
name: FUNC-105 Integration Test
on: [push, pull_request]
jobs:
  func105-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js & Python
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          npm install
          pip install -r scripts/requirements.txt
      
      - name: FUNC-105 Integration Test
        run: |
          # Python FUNC-105構造作成
          python3 scripts/dummy_data_generator.py --files 10 --days 1
          
          # CLI FUNC-105テスト
          npm run build
          timeout 5s npm run demo:ui || true
          
          # ユニットテスト
          npm test
          
          # 構造検証
          test -d .cctop/config
          test -f .cctop/data/activity.db
```

### Test Reporting
- **JUnit**: XML output for CI systems
- **Coverage**: HTML and text coverage reports
- **Performance**: Benchmark test results

## テスト拡張

### 新しいテスト追加
1. Follow existing file naming patterns (`*.test.ts`)
2. Use FUNC-105 compliant paths (`.cctop/data/activity.db`)
3. Include both positive and negative test cases
4. Add appropriate mocks for external dependencies

### Test Guidelines
- **Arrange-Act-Assert**: Structure tests clearly
- **Independence**: Each test should run independently
- **FUNC-105 Compliance**: Use standard paths and structures
- **Speed**: Keep tests fast and focused
- **Readability**: Write tests as documentation

### Mock拡張

```typescript
// カスタムモック作成
vi.mock('../../src/external-dependency', () => ({
  ExternalClass: vi.fn().mockImplementation(() => ({
    method: vi.fn().mockResolvedValue('mocked result')
  }))
}));
```

## 現在のテスト統計

- **Total Tests**: 68
- **Configuration Tests**: 40 (includes FUNC-105 initialization)
- **Data Tests**: 9 (includes FUNC-105 database tests)
- **Utility Tests**: 14
- **Type Tests**: 5
- **Success Rate**: 100%
- **FUNC-105 Integration**: Full compliance with auto-initialization

All tests pass consistently and provide comprehensive coverage of the CLI module functionality with full FUNC-105 integration.

## FUNC-105ベストプラクティス

1. **構造の一貫性**: 常にFUNC-105準拠のパス使用
2. **自動初期化**: CLI起動時の設定確認を必ず実装
3. **エラーハンドリング**: 設定ファイル破損・権限エラーの適切な処理
4. **テストの独立性**: 各テストで.cctopディレクトリを個別管理
5. **現実的なテストデータ**: Pythonツールで生成したFUNC-105準拠データ使用
6. **統合テストの定期実行**: Python-Node.js FUNC-105統合フローの継続検証

---

**関連ドキュメント**:
- `test/python-integration-test.md` - Python FUNC-105統合テスト手順書
- `scripts/README.md` - Python FUNC-105対応ダミーデータ生成ツール
- `src/config/local-setup-initializer.ts` - FUNC-105実装
- `src/demo/demo-ui.ts` - FUNC-105統合デモ