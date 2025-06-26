# CCTop テスト戦略・品質保証仕様

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: 機能実装と同時にテストを作成し、品質を保証するための戦略

## 🎯 テスト基本原則

### 必須ルール
1. **機能実装をしたら絶対testを作成する**
2. **testは作ったらちゃんと適用する**
3. **testを通ったら仕様書を更新**

### テスト駆動開発（TDD）のアプローチ
```
仕様策定
  ↓
テストケース設計
  ↓
テスト作成（Red）
  ↓
実装（Green）
  ↓
リファクタリング（Refactor）
  ↓
仕様書更新
```

## 📊 テストレベルと責務

### 1. ユニットテスト（Unit Tests）
**対象**: 個別モジュール・関数
**ディレクトリ**: `test/unit/`
**カバレッジ目標**: 80%以上

#### テスト対象例
```javascript
// src/analyzers/statistics-analyzer.js
class StatisticsAnalyzer {
  calculateEventStats(events) { /* ... */ }
  aggregateByPeriod(events, period) { /* ... */ }
}

// test/unit/analyzers/statistics-analyzer.test.js
describe('StatisticsAnalyzer', () => {
  describe('calculateEventStats', () => {
    it('should calculate correct statistics for events', () => {
      // テストケース
    });
  });
});
```

### 2. 統合テスト（Integration Tests）
**対象**: モジュール間連携
**ディレクトリ**: `test/integration/`
**カバレッジ目標**: 重要フロー100%

#### テスト対象例
- ファイル監視 → DB保存 → 表示更新
- 検索入力 → フィルタリング → 表示更新
- 設定読み込み → 適用 → 動作確認

### 3. E2Eテスト（End-to-End Tests）
**対象**: 実際の使用シナリオ
**ディレクトリ**: `test/e2e/`
**カバレッジ目標**: 主要ユースケース100%

#### テストシナリオ例
```javascript
// test/e2e/basic-workflow.test.js
describe('Basic Workflow', () => {
  it('should monitor file changes and display them', async () => {
    // 1. cctop起動
    // 2. テストファイル作成
    // 3. 表示確認
    // 4. ファイル編集
    // 5. 更新確認
  });
});
```

## 🧪 テスト構造

### ディレクトリ構成
```
test/
├── unit/                    # ユニットテスト
│   ├── analyzers/           # analyzers/*のテスト
│   ├── monitors/            # monitors/*のテスト
│   ├── database/            # database/*のテスト
│   └── cli/                 # cli/*のテスト
├── integration/             # 統合テスト
│   ├── file-monitoring.test.js
│   ├── database-ops.test.js
│   └── cli-interface.test.js
├── e2e/                     # E2Eテスト
│   ├── basic-workflow.test.js
│   ├── search-feature.test.js
│   └── performance.test.js
├── fixtures/                # テスト用データ
│   ├── sample-files/
│   ├── sample-events.json
│   └── sample-config.json
└── helpers/                 # テストヘルパー
    ├── test-db.js           # テスト用DB管理
    ├── mock-fs.js           # ファイルシステムモック
    └── cli-helper.js        # CLI操作ヘルパー
```

## 🔧 テスト実装ガイドライン

### 1. テストファイル命名規則
```
{対象ファイル名}.test.js
例: statistics-analyzer.test.js
```

### 2. テスト構造テンプレート
```javascript
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { TargetClass } = require('../src/path/to/module');

describe('TargetClass', () => {
  let instance;
  
  beforeEach(() => {
    // セットアップ
    instance = new TargetClass();
  });
  
  afterEach(() => {
    // クリーンアップ
  });
  
  describe('methodName', () => {
    it('should do something correctly', () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = instance.methodName(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
    
    it('should handle edge cases', () => {
      // エッジケースのテスト
    });
    
    it('should throw error for invalid input', () => {
      // エラーケースのテスト
    });
  });
});
```

### 3. モックとスタブ
```javascript
// データベースモック
jest.mock('../src/database/database-manager', () => ({
  DatabaseManager: jest.fn().mockImplementation(() => ({
    getLatestEvents: jest.fn().mockResolvedValue([/* mock data */]),
    insertEvent: jest.fn().mockResolvedValue({ id: 1 })
  }))
}));

// ファイルシステムモック
const mockFs = require('mock-fs');
beforeEach(() => {
  mockFs({
    '/test/files': {
      'sample.js': 'console.log("test");',
      'data.json': '{"key": "value"}'
    }
  });
});
```

## 📋 テストチェックリスト

詳細なチェックリストは [t000-checklist.md](./t000-checklist.md) を参照してください。

### 機能実装時の必須テスト
- **正常系**: 期待される入力での動作
- **異常系**: 不正な入力でのエラー処理
- **境界値**: 最小値・最大値・空データ
- **パフォーマンス**: 大量データでの動作
- **並行性**: 同時実行時の動作

## 🚀 テスト実行

### コマンド
```bash
# 全テスト実行
npm test

# ユニットテストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# E2Eテストのみ
npm run test:e2e

# カバレッジ付き
npm run test:coverage

# ウォッチモード（開発時）
npm run test:watch
```

### CI/CD統合
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## 📊 品質メトリクス

### 必須達成基準
- **テストカバレッジ**: 80%以上
- **全テスト成功**: 100%
- **パフォーマンステスト**: 基準値以内

### 継続的改善
- テスト実行時間の短縮
- フレーキーテストの削減
- テストの保守性向上

## 🔄 テストと仕様書の同期

### 仕様書更新フロー
1. **テスト作成**: 仕様に基づいてテストを書く
2. **実装**: テストが通るように実装
3. **動作確認**: 実際の動作を確認
4. **仕様書更新**: 実装の詳細を仕様書に反映

### 更新対象
- 実装で明らかになった詳細仕様
- エッジケースの扱い
- パフォーマンス特性
- 制限事項

---

**注記**: この戦略により、実装とテストが常に同期し、仕様書も最新の状態を保つことができます。品質を犠牲にしない開発を実現します。