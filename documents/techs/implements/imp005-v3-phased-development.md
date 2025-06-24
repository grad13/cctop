# Surveillance v3 開発ロードマップ - 実動作駆動開発（RDD）

**Document ID**: surveillance-v3-development-roadmap  
**Date**: 2025-06-22  
**Author**: Inspector Agent  
**Status**: Active  
**Last Updated**: 2025-06-22 20:45  
**Purpose**: version-02の教訓を踏まえた、実動作駆動開発（RDD）による段階的機能実装計画

## 概要

version-02での失敗（テスト成功率100%でも起動しない）から学んだ教訓を活かし、**実動作駆動開発（Running-Driven Development: RDD）**の方法論に基づいて、実動作を確認しながら段階的に機能を追加していく開発計画。

## 実動作駆動開発（RDD）の理念

### 従来のTDDの限界
- **テスト成功 ≠ 実動作保証**: version-02で652テスト全成功も実環境で起動せず
- **モックの罠**: モックオブジェクトが実装と乖離し、虚偽の安心感を生む
- **統合の盲点**: 個別コンポーネントは動作しても、統合時に破綻

### RDDの中核原則
1. **実行可能性最優先**: 「npm start」で即座に動作することが全ての前提
2. **日次動作確認**: 毎日必ず実環境で動作確認し、動かない変更は即座にロールバック
3. **段階的統合**: 新機能は必ず動作中のシステムに統合し、動作確認後にのみ次へ進む
4. **実ユーザー視点**: 開発者の都合ではなく、実際の使用者の体験を重視

## 開発原則（RDD準拠）

1. **動くものを維持する** - 各段階で必ず実環境動作を確認
2. **段階的な複雑性** - シンプルから始めて徐々に機能追加
3. **継続的な品質向上** - cacheとtestは全段階で改善
4. **実動作優先** - テストよりも「npm start」での動作確認を優先

## ✅ Phase 1: 基本表示機能 + 初回スキャン（完了）

### 🎯 目標（達成済み）
chokidarを使用したリアルタイムファイル監視と組み込み初回スキャン機能の活用

### ✅ 主な実装成果
- **FileMonitor**: chokidarベースのファイル監視（src/monitors/file-monitor.js）
- **初回スキャン**: ignoreInitial: false活用による既存ファイル検出
- **統計収集**: ファイル数・ディレクトリ数の自動カウント
- **設定システム**: ConfigManagerによる階層的設定管理
- **テスト**: 手動8/8 + 単体15/15 = 100%成功

### ✅ 実装済み機能
- **✅ 初回スキャン**: chokidarの`ignoreInitial: false`により既存ファイルを自動検出
- **✅ 統計収集**: スキャン中にファイル数・ディレクトリ数をカウント
- **✅ 完了通知**: `ready`イベントでスキャン完了と統計を表示
- **✅ リアルタイム監視**: ファイル追加・変更・削除・ディレクトリ操作の検出
- **✅ 設定システム**: ConfigManagerとdefaults.jsによる階層的設定管理
- **✅ デバウンス**: awaitWriteFinishによる連続変更の制御

### ✅ 完了したディレクトリ構成（d000仕様準拠）
```
cctop/
├── bin/
│   └── cctop                    # ✅ 実装済み
├── src/
│   ├── monitors/                # ✅ watchers/ から移行完了
│   │   └── file-monitor.js      # ✅ file-watcher.js からリネーム完了
│   └── config/                  # ✅ 実装済み
│       ├── config-manager.js
│       └── defaults.js
├── test/
│   ├── manual/                  # ✅ 手動テスト実装済み
│   │   └── test-basic-functionality.js
│   └── unit/                    # ✅ 単体テスト実装済み
│       ├── monitors/file-monitor.test.js
│       └── config/config-manager.test.js
├── package.json                 # ✅ Jest設定済み
├── jest.config.js              # ✅ テスト設定済み
└── .gitignore                  # ✅ 設定済み
```

### ✅ 品質検証完了
- **✅ 実動作確認**: `npm start`で正常起動確認済み
- **✅ 手動テスト**: 8/8テストケース全成功
- **✅ 単体テスト**: 15/15テストケース全成功
- **✅ ファイル操作**: 追加・変更・削除の検出確認済み
- **✅ 統計表示**: 初回スキャン完了時の統計情報表示確認済み

### ✅ 完了日: 2025-06-22
- **実装時間**: 約4時間
- **テスト成功率**: 100% (手動8/8 + 単体15/15)
- **実動作確認**: ✅ 動作確認済み
- **Git commit**: e48c094 (ロールバックポイント作成済み)

## Phase 1.5: スキャン機能拡張（オプション）

### 目標
Phase 1の基本スキャンを拡張し、より詳細な情報を提供

### 拡張内容
```javascript
// Phase 1の基本実装に追加する拡張機能
class EnhancedScanner {
  constructor() {
    this.extensions = new Map();
    this.totalSize = 0;
    this.startTime = Date.now();
  }
  
  async collectStats(path, stats) {
    // ファイルサイズ集計
    this.totalSize += stats.size;
    
    // 拡張子別カウント
    const ext = path.extname(path);
    this.extensions.set(ext, (this.extensions.get(ext) || 0) + 1);
    
    // スキャン進捗表示（オプション）
    if (this.showProgress) {
      process.stdout.write(`\rScanning... ${this.stats.files} files`);
    }
  }
}
```

### 考慮事項
- 詳細統計の必要性を評価してから実装
- パフォーマンスへの影響を最小限に
- 表示オプションの追加

## 🎯 Phase 2: データ・プレゼンテーション分離アーキテクチャ（計画中）

### 目標
version-02の教訓を活かし、データ収集と表示を分離してテスタビリティを向上

### アーキテクチャ設計
**Event Emitterパターンによる分離**
```
FileMonitor (chokidar events)
    ↓
EventCollector (data processing)
    ↓ (structured events)
ConsolePresenter (display logic)
    ↓
Console Output
```

### 実装予定コンポーネント
- **EventCollector**: データ処理専用（src/data/event-collector.js）
- **ConsolePresenter**: 表示専用（src/presentation/console-presenter.js）
- **EventFormatter**: フォーマット専用（src/presentation/formatters/）

### 期待される効果
- **テスタビリティ向上**: データ処理と表示を独立してテスト可能
- **保守性向上**: 表示変更時にデータ処理への影響なし
- **拡張性確保**: 将来のWeb UI実装が容易

### 検証項目
- [ ] データレイヤーの独立テスト
- [ ] プレゼンテーションレイヤーの独立テスト
- [ ] 既存機能との互換性確認
- [ ] パフォーマンス影響の測定

**詳細**: `p006-phase1-detailed-plan.md` のPhase 2セクション参照

## Phase 3: Move/Rename検出（計画）

### 目標
ファイルの移動・リネームを正確に検出

### 実装内容
```javascript
class MoveDetector {
  detectMove(unlinkEvent, addEvent) {
    // inode比較
    // タイミング判定
    // 内容ハッシュ比較
    return isMoved;
  }
}
```

### 技術的課題
- chokidarはmoveイベントを提供しない
- unlink → addのペアを検出する必要
- 誤検出の防止

### 検証項目
- [ ] 単純なmv操作の検出
- [ ] ディレクトリ間移動の検出
- [ ] 大量ファイル移動時の精度

## Phase 4: Unique表示 & 詳細画面（1週間）

### 目標
重複イベントの集約とファイル詳細情報表示

### 実装内容
- **Uniqueモード**: 同一ファイルの複数イベントを1つに集約
- **詳細画面**: ファイル選択時の詳細情報表示
  - ファイルパス、サイズ、更新時刻
  - 最近のイベント履歴
  - 統計情報

### UI設計
```
[Stream Mode]              [Unique Mode]
file1 - added             file1 (3 events)
file1 - changed    →      file2 (1 event)
file1 - changed           file3 (2 events)
file2 - added
```

## Phase 5: Filter機能（1週間）

### 目標
イベントタイプとファイル名によるフィルタリング

### 実装内容
```javascript
class EventFilter {
  constructor() {
    this.filters = {
      eventTypes: new Set(['add', 'change', 'unlink']),
      namePattern: null
    };
  }
  
  maskEventType(type) {
    this.filters.eventTypes.delete(type);
  }
  
  filterByName(pattern) {
    this.filters.namePattern = new RegExp(pattern);
  }
}
```

### フィルタ種類
- **イベントタイプマスク**: 特定イベントを非表示
- **ファイル名フィルタ**: 正規表現による絞り込み
- **パスフィルタ**: 特定ディレクトリのみ表示

## Phase 6: Stats機能（2週間）

### 目標
ファイル活動の統計情報計算と表示

### 実装内容
```javascript
class StatsCalculator {
  calculate(events) {
    return {
      totalEvents: events.length,
      eventsPerFile: this.groupByFile(events),
      hotFiles: this.getTopActive(events, 10),
      eventDistribution: this.getDistribution(events)
    };
  }
}
```

### 統計項目
- イベント総数
- ファイル別イベント数
- 最も活発なファイルTop10
- 時間帯別分布
- イベントタイプ別分布

### ソート機能
- イベント数順
- 最終更新時刻順
- ファイルサイズ順
- アルファベット順

## 継続的強化項目

### Cache強化（全Phase）

**Phase 1-2**: 基本メモリキャッシュ
```javascript
class SimpleCache {
  constructor(ttl = 300) {
    this.cache = new Map();
    this.ttl = ttl;
  }
}
```

**Phase 3-4**: LRUキャッシュ導入
- サイズ制限
- 自動削除
- ヒット率測定

**Phase 4-5**: 永続化キャッシュ
- SQLite統合
- 起動時高速化
- キャッシュ戦略最適化

### Test強化（全Phase） - RDD方式

**RDDにおけるテストの位置づけ**
- **主役は実動作確認**: テストは補助的役割
- **E2Eテスト重視**: 実際の使用シナリオをテスト
- **モック最小化**: 可能な限り実装を使用

**各Phaseでの必須確認**
1. **実動作確認** - 毎日実行（最重要）
   ```bash
   # 実際に起動して動作確認
   npm start
   # 実際にファイルを作成・編集して反応確認
   touch test.txt && echo "test" >> test.txt && rm test.txt
   ```

2. **E2Eテスト** - 実使用シナリオ
   ```javascript
   test('Real user scenario', async () => {
     // 実際のシステムを起動
     const process = spawn('npm', ['start']);
     // 実際のファイル操作
     await fs.writeFile('test.txt', 'content');
     // 実際の出力確認
     const output = await waitForOutput(process);
     expect(output).toContain('File added: test.txt');
   });
   ```

3. **統合テスト** - 機能追加ごと
   ```javascript
   test('New feature integrates with existing system', async () => {
     const system = await createRealSystem(); // モック最小限
     await system.start();
     // 実際の動作確認
   });
   ```

4. **パフォーマンステスト** - 週次
   - 実環境での起動時間
   - 実使用時のメモリ使用量
   - 実負荷でのCPU使用率

**テスト指標のRDD進化**
- Phase 1: 実動作確認中心（実動作80%, E2E15%, 単体5%）
- Phase 3: 実用性重視（実動作50%, E2E30%, 統合15%, 単体5%）
- Phase 6: バランス型（実動作30%, E2E30%, 統合25%, 単体15%）

## リスク管理

### 技術的リスク
1. **chokidarの制限事項**
   - プラットフォーム依存の挙動
   - 大量ファイルでのパフォーマンス
   - moveイベントの非サポート

2. **スケーラビリティ**
   - 10万ファイル以上での動作
   - リアルタイム性の維持
   - メモリ使用量の増大

### 対策
- 早期プロトタイプでの検証
- 代替ライブラリの調査（node-watch等）
- 段階的な最適化

## 成功指標

### 定量的指標
- 起動時間: < 1秒（1万ファイル環境）
- メモリ使用量: < 200MB（通常使用時）
- CPU使用率: < 5%（アイドル時）
- イベント検出遅延: < 100ms

### 定性的指標
- 直感的なUI
- 安定した動作
- 有用な統計情報
- 拡張しやすい設計

## RDD実践ガイドライン

### 日次ルーチン
1. **朝**: `npm start`で昨日の作業が動作することを確認
2. **作業中**: 変更のたびに`npm start`で動作確認
3. **夕方**: 本日の変更が統合された状態で動作確認
4. **コミット前**: 必ず実動作確認してからコミット

### 動作しない場合の対応
1. **即座にロールバック**: 動かない変更は議論の余地なく戻す
2. **原因究明**: なぜ動かなかったかを分析
3. **小さく再実装**: より小さな単位で再度実装
4. **動作確認後に進む**: 動くことを確認してから次へ

### RDDの効果測定
- **動作可能日数**: 連続して`npm start`が成功した日数
- **ロールバック率**: 動作しないためロールバックした回数
- **実ユーザーフィードバック**: 実際に使用した人からの評価

## まとめ

このロードマップは、version-02の教訓「テストだけでは品質は保証されない」を踏まえ、**実動作駆動開発（RDD）**を中心とした段階的開発を行う。各Phaseで動くものを作り、それを基に次のPhaseに進むことで、常に動作するシステムを維持しながら機能を追加していく。

**RDD最重要原則**: 
- **動かないものは価値がない**
- **毎日`npm start`を実行し、実際に使えることを確認する**
- **テストが通っても動かなければ意味がない**
- **実ユーザーが使えて初めて価値がある**

version-03はこのRDD原則に基づき、確実に動作するcctopを段階的に構築していく。