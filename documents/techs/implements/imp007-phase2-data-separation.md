# Phase 2 詳細実装計画: データ・ビュー分離

**Document ID**: phase2-data-view-separation  
**Date**: 2025-06-22  
**Author**: Inspector Agent  
**Status**: Ready for Implementation  
**Purpose**: cctop v3.0.0 Phase 2 - データレイヤーとビューレイヤーの分離による保守性・テスタビリティ向上

## 📋 Phase 2 概要

### 背景
- **version-02の教訓**: データ処理と表示が密結合→テストが困難
- **Phase 1の成果**: 基本的なファイル監視機能は動作確認済み
- **Phase 2の目標**: アーキテクチャ改善によるテスタビリティと保守性の向上

### スコープ
- ✅ Event Emitterパターンによるデータ・ビュー分離
- ✅ 独立テスト可能なアーキテクチャ
- ✅ 既存機能の完全互換性維持
- ✅ 将来の拡張（JSON出力、Web UI等）への基盤
- ❌ 新機能追加（Move検出等）→ Phase 3以降
- ❌ パフォーマンス最適化 → Phase 4以降

## 🏗️ アーキテクチャ設計

### データフロー図
```
[FileMonitor] ---> [EventCollector] ---> [DataRepository] ---> [SQLite DB]
     |                    |                      |
  chokidar            データ処理            データ永続化
   events            構造化イベント          履歴・統計
                           |
                           v
                    [ConsoleView] ---> [Console]
                           |
                       表示処理
                      フォーマット
```

### レイヤー責務
1. **FileMonitor**: ファイルシステム監視（既存・変更なし）
2. **EventCollector**: データ処理・統計収集・イベント構造化
3. **DataRepository**: データ永続化・DB操作の抽象化
4. **ConsoleView**: 表示制御・フォーマット・出力
5. **EventFormatter**: フォーマットロジック・設定駆動表示

## 📁 ディレクトリ構成変更

### 現在の構成（Phase 1）
```
src/
├── monitors/
│   └── file-monitor.js
└── config/
    ├── config-manager.js
    └── defaults.js
```

### Phase 2後の構成
```
src/
├── monitors/
│   └── file-monitor.js          # 変更なし
├── data/                        # 新規追加
│   ├── event-collector.js       # データ処理レイヤー
│   ├── data-repository.js       # DB操作抽象化
│   └── data-stats.js           # 統計データ管理
├── views/                       # 新規追加
│   ├── console-view.js          # 表示制御
│   └── formatters/             
│       └── event-formatter.js   # フォーマット処理
├── database/                    # 新規追加
│   ├── sqlite-manager.js        # SQLite接続管理
│   └── schema.sql              # DBスキーマ定義
├── config/
│   ├── config-manager.js
│   └── defaults.js
└── main.js                     # 新規: エントリポイント統合
```

## 🔧 実装詳細

### 1. EventCollector（データレイヤー）

**責務**: 
- FileMonitorからのrawイベント受信
- データ処理・統計収集
- 構造化イベントの生成・配信

**主要メソッド**:
```javascript
class EventCollector extends EventEmitter {
  constructor(fileMonitor, dataStats) {
    // FileMonitorとDataStatsを注入
  }
  
  setupEventHandlers() {
    // FileMonitorからのイベント受信設定
  }
  
  processFileAdd(path) {
    // ファイル追加データ処理
    // 統計更新
    // 構造化イベント生成
  }
  
  processFileChange(path) {
    // ファイル変更データ処理
  }
  
  processFileRemove(path) {
    // ファイル削除データ処理
  }
  
  getStats() {
    // 現在の統計情報を返す
  }
}
```

**出力イベント形式**:
```javascript
{
  type: 'file-add' | 'file-change' | 'file-remove' | 'dir-add' | 'ready',
  path: '/absolute/path/to/file',
  relativePath: 'relative/path/to/file',
  timestamp: 1703123456789,
  stats: {
    files: 123,
    directories: 45,
    totalEvents: 67,
    startTime: 1703123400000
  },
  metadata: {
    // イベント固有の追加情報
  }
}
```

### 2. ConsoleView（ビューレイヤー）

**責務**:
- EventCollectorからの構造化イベント受信
- 表示制御・フィルタリング
- フォーマッターとの連携

**主要メソッド**:
```javascript
class ConsoleView {
  constructor(eventCollector, formatter, config) {
    // 依存関係注入
  }
  
  setupEventHandlers() {
    // EventCollectorからのイベント受信設定
  }
  
  handleDataEvent(eventData) {
    // フィルタリング判定
    // フォーマット依頼
    // 出力実行
  }
  
  shouldDisplay(eventData) {
    // 表示判定ロジック（設定ベース）
  }
  
  displayEvent(formattedOutput) {
    // 実際の画面出力
  }
}
```

### 3. EventFormatter（フォーマットレイヤー）

**責務**:
- 構造化イベントの表示フォーマット
- 設定に基づく表示制御
- 拡張可能なフォーマット機能

**主要メソッド**:
```javascript
class EventFormatter {
  constructor(config) {
    // 表示設定の読み込み
  }
  
  formatFileAdd(eventData) {
    // ファイル追加の表示フォーマット
  }
  
  formatFileChange(eventData) {
    // ファイル変更の表示フォーマット
  }
  
  formatFileRemove(eventData) {
    // ファイル削除の表示フォーマット
  }
  
  formatReady(eventData) {
    // 初回スキャン完了の表示フォーマット
  }
  
  formatTimestamp(timestamp) {
    // タイムスタンプフォーマット
  }
  
  formatPath(path, relativePath) {
    // パス表示フォーマット
  }
}
```

### 4. DataStats（統計管理）

**責務**:
- ファイル・ディレクトリ数の管理
- イベント統計の収集
- パフォーマンス指標の計算

**主要メソッド**:
```javascript
class DataStats {
  constructor() {
    // 統計データ初期化
  }
  
  incrementFiles() {
    // ファイル数増加
  }
  
  incrementDirectories() {
    // ディレクトリ数増加
  }
  
  incrementEvents() {
    // イベント数増加
  }
  
  getCurrentStats() {
    // 現在の統計情報を返す
  }
  
  getUptime() {
    // 稼働時間計算
  }
  
  reset() {
    // 統計リセット
  }
}
```

### 5. main.js（統合エントリポイント）

**責務**:
- 全コンポーネントの初期化・組み立て
- 依存関係の解決
- エラーハンドリング

**主要機能**:
```javascript
async function initializeCCTop() {
  // 1. 設定読み込み
  // 2. コンポーネント初期化
  // 3. 依存関係の組み立て
  // 4. イベントハンドラ設定
  // 5. 監視開始
}

function setupGracefulShutdown() {
  // Ctrl+C時の適切な終了処理
}
```

## 🚀 実装手順（RDD方式）

### ステップ1: DataStats実装（30分）
1. **src/data/data-stats.js作成**
   - 基本的な統計カウンター
   - 単純なgetter/setterメソッド
2. **テスト作成・実行**
   - test/unit/data/data-stats.test.js
   - 基本機能の動作確認

### ステップ2: EventCollector実装（60分）
1. **src/data/event-collector.js作成**
   - EventEmitterを継承
   - FileMonitorからのイベント受信
   - 構造化イベント生成
2. **統合テスト**
   - FileMonitorとの結合確認
   - イベントフロー検証

### ステップ3: EventFormatter実装（45分）
1. **src/views/formatters/event-formatter.js作成**
   - 現在の表示ロジックを移植
   - 設定ベースのフォーマット
2. **単体テスト**
   - フォーマット結果の検証
   - 設定変更の影響確認

### ステップ4: ConsoleView実装（45分）
1. **src/views/console-view.js作成**
   - EventCollectorからのイベント受信
   - フォーマッターとの連携
2. **統合テスト**
   - 完全なデータフロー確認

### ステップ5: main.js統合（30分）
1. **src/main.js作成**
   - 全コンポーネントの組み立て
   - bin/cctopからの移行
2. **E2Eテスト**
   - 既存機能の完全互換確認
   - npm startでの動作確認

### ステップ6: bin/cctop更新（15分）
1. **bin/cctop更新**
   - main.jsを呼び出すように変更
2. **最終動作確認**
   - Phase 1との動作比較
   - パフォーマンス影響確認

## 🧪 テスト戦略

### 1. 単体テスト（各コンポーネント独立）

**DataStats**:
```javascript
describe('DataStats', () => {
  test('ファイル数の増減が正確に記録される', () => {
    const stats = new DataStats();
    stats.incrementFiles();
    expect(stats.getCurrentStats().files).toBe(1);
  });
});
```

**EventCollector**:
```javascript
describe('EventCollector', () => {
  test('FileMonitorのaddイベントを構造化イベントに変換する', () => {
    const mockFileMonitor = new EventEmitter();
    const collector = new EventCollector(mockFileMonitor, mockDataStats);
    
    const dataEventSpy = jest.fn();
    collector.on('data:file-added', dataEventSpy);
    
    mockFileMonitor.emit('add', '/test/file.txt');
    
    expect(dataEventSpy).toHaveBeenCalledWith({
      type: 'file-add',
      path: '/test/file.txt',
      relativePath: expect.any(String),
      timestamp: expect.any(Number),
      stats: expect.any(Object)
    });
  });
});
```

**EventFormatter**:
```javascript
describe('EventFormatter', () => {
  test('ファイル追加イベントが正しくフォーマットされる', () => {
    const formatter = new EventFormatter(mockConfig);
    const eventData = {
      type: 'file-add',
      path: '/test/file.txt',
      relativePath: 'file.txt',
      timestamp: 1703123456789
    };
    
    const result = formatter.formatFileAdd(eventData);
    expect(result).toContain('📄 File added: file.txt');
  });
});
```

**ConsoleView**:
```javascript
describe('ConsoleView', () => {
  test('構造化イベントが正しく表示される', () => {
    const mockEventCollector = new EventEmitter();
    const mockFormatter = { formatFileAdd: jest.fn().mockReturnValue('formatted') };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const view = new ConsoleView(mockEventCollector, mockFormatter, mockConfig);
    
    mockEventCollector.emit('data:file-added', mockEventData);
    
    expect(mockFormatter.formatFileAdd).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('formatted');
  });
});
```

### 2. 統合テスト（コンポーネント連携）

**完全フロー**:
```javascript
describe('Data Flow Integration', () => {
  test('FileMonitor → EventCollector → ConsoleView の完全フロー', async () => {
    // 実際のコンポーネントを使用した統合テスト
    const system = await createTestSystem();
    const outputSpy = jest.spyOn(console, 'log').mockImplementation();
    
    await system.start();
    await simulateFileAdd('/test/file.txt');
    
    expect(outputSpy).toHaveBeenCalledWith(
      expect.stringContaining('File added: file.txt')
    );
  });
});
```

### 3. E2Eテスト（実動作確認）

**既存機能互換性**:
```javascript
describe('Phase 2 Compatibility', () => {
  test('Phase 1と同じ出力が得られる', async () => {
    // Phase 1の出力と比較
    const phase2Output = await runPhase2();
    const expectedPatterns = [
      /Initial scan complete/,
      /File added:/,
      /Files: \d+/,
      /Directories: \d+/
    ];
    
    expectedPatterns.forEach(pattern => {
      expect(phase2Output).toMatch(pattern);
    });
  });
});
```

## 📊 成功指標

### 機能面
- [ ] Phase 1と同一の出力内容
- [ ] npm startで正常起動
- [ ] 全てのファイル操作の正常検出
- [ ] 統計情報の正確な表示

### アーキテクチャ面
- [ ] データレイヤーの独立テスト可能
- [ ] ビューレイヤーの独立テスト可能
- [ ] コンポーネント間の疎結合確認
- [ ] 拡張性の向上（新しいView追加の容易性）

### 品質面
- [ ] 単体テスト成功率: 100%
- [ ] 統合テスト成功率: 100%
- [ ] E2Eテスト成功率: 100%
- [ ] パフォーマンス劣化: <5%

## 🔄 移行戦略

### 段階的移行
1. **新コンポーネント実装**: 既存コードに影響なし
2. **統合テスト**: 新アーキテクチャの動作確認
3. **main.js切り替え**: 一気にアーキテクチャ変更
4. **動作確認**: Phase 1との互換性確認
5. **完了**: 旧コードの削除（必要に応じて）

### ロールバック計画
- **問題発生時**: bin/cctopを旧実装に戻すだけで即座にロールバック
- **Git commit**: 各ステップでcommitしてロールバックポイント作成
- **テスト失敗時**: そのステップを修正してから次へ進む

## 🎯 Phase 3への準備

### 拡張ポイントの確保
- **新しいView**: JSON出力、ファイル出力等
- **新しいイベントタイプ**: Move/Rename検出等
- **フィルタリング**: EventCollector内でのフィルタ機能
- **統計強化**: より詳細な統計情報

### アーキテクチャの利点
- **Move検出**: EventCollectorで実装、表示は既存Viewで対応
- **複数出力**: 複数Viewの同時使用が可能
- **カスタマイズ**: Formatterの差し替えで表示カスタマイズ

## 🔧 実装時の注意点

### RDD準拠
- **各ステップで動作確認**: 必ずnpm startで実際の動作を確認
- **小さく実装**: 一度に全てを実装せず、段階的に
- **テスト駆動**: テストを先に書いてから実装

### パフォーマンス
- **イベント転送コスト**: EventEmitter使用による軽微なオーバーヘッド
- **メモリ使用量**: 構造化イベント生成による増加（最小限）
- **測定**: 実装前後でパフォーマンス比較

### 既存互換性
- **出力フォーマット**: Phase 1と完全に同一にする
- **設定**: 既存の設定ファイルとの互換性維持
- **CLI引数**: 既存の引数処理との互換性維持

---

**Note**: この計画はRDD方針に基づき、実動作確認を最優先として段階的に実装します。各ステップで必ず動作確認を行い、問題があれば即座にロールバックして修正します。