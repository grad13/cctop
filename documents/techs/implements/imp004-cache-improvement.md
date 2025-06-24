# CCTop Cache System Improvement Plan

**作成日**: 2025-06-22  
**作成者**: Inspector Agent  
**目的**: previous-v01の優秀なcache技術をcctopに導入する段階的改善計画  
**基盤**: cache-technology-analysis-report.mdの調査結果

## ⚡ cctopの技術的優位性

### chokidarによる正確なイベントタイミング
**previous-v01との重要な違い**:
- **previous-v01**: DB insert時のevent time（アプリケーション処理後の不正確な時刻）
- **cctop**: chokidarによるリアルタイムファイルシステムイベント（OS直接の正確な時刻）

### 優位性の活用方針
```javascript
// cctopの正確なタイムスタンプを最大限活用
const event = {
  timestamp: chokidarEvent.timestamp,  // ←ファイルシステム直接の正確な時刻
  eventType: chokidarEvent.type,
  filePath: chokidarEvent.path
  // previous-v01のようなDB処理遅延による時刻ずれなし
};
```

### Cache設計での活用
- **高精度な時間順序**: chokidarの正確なタイムスタンプによる確実な順序保証
- **リアルタイム性**: ファイルシステムイベント直接取得による遅延最小化
- **データ整合性**: OSレベルの正確な時刻による信頼性の高いcache

**重要**: この技術的優位性は絶対に保持し、cache改善においても最大限活用する

## 🎯 改善目標

### パフォーマンス目標
- **応答時間**: 現在の同期処理 → **50ms以下の非同期応答**
- **Cache hit率**: 現在の推定85% → **95%以上**
- **メモリ効率**: 適切な容量制限とLRU管理の導入
- **UI応答性**: 非ブロッキングなバックグラウンド処理

### ユーザーエクスペリエンス目標
- **即座のフィルタリング応答**（a/u/s/c/m/v/dキー）
- **スムーズな画面更新**（画面のちらつき削減）
- **大量データでの安定動作**（1000件以上のイベント）

## 📋 3段階実装プラン

### Phase A: 基本インメモリCache（期間：1週間）
**優先度：最高** - 即座の効果が期待できる基本機能

#### A1. EventTypeCacheManager基本実装
**ファイル**: `src/cache/managers/event-type-cache-manager.js`  
**技術基盤**: chokidarの正確なタイムスタンプを活用

```javascript
class EventTypeCacheManager {
  constructor(eventManager, displayLimit = 10) {
    this.eventManager = eventManager;
    this.displayLimit = displayLimit;
    this.maxCacheSize = 500; // previous-v01実績値
    
    // イベントタイプ別cache
    this.caches = {
      create: { items: [], loading: false, hasMore: true },
      modify: { items: [], loading: false, hasMore: true },
      delete: { items: [], loading: false, hasMore: true },
      move: { items: [], loading: false, hasMore: true },
      scan: { items: [], loading: false, hasMore: true }
    };
  }

  // 即座の応答（cache優先、chokidarの正確なタイムスタンプ活用）
  async getFilteredEvents(eventTypes, limit = this.displayLimit) {
    // cache確認 → 即座応答 → バックグラウンド補充
    // chokidarの正確な時刻順序でcache管理
  }
}
```

#### A2. DisplayManagerとの統合
**変更ファイル**: `src/cli/display-manager.js`

```javascript
// 既存のeventManager.getLatestEvents()呼び出しを
// cacheManager.getFilteredEvents()に変更
```

#### A3. 基本的な重複排除
- **chokidarタイムスタンプ** + ファイルパス + イベントタイプによる重複検出
- previous-v01より高精度：OSレベルの正確な時刻による信頼性の高い重複排除

#### 期待効果
- **フィルタリング応答**: 現在の数百ms → 10ms以下
- **メモリ使用量**: 制御された範囲内（最大500件）
- **基本的なUX改善**: キー操作の即座反映

### Phase B: 非同期バックグラウンド処理（期間：2週間）
**優先度：高** - UI応答性の劇的改善

#### B1. 50msデバウンス機能
**previous-v01の優秀な技術を移植**

```javascript
startBackgroundLoad(eventTypes) {
  // 連続リクエストの統合
  if (this.loadingTimer) {
    clearTimeout(this.loadingTimer);
  }
  
  this.loadingTimer = setTimeout(() => {
    this.loadEventsAsync(eventTypes);
  }, 50); // 50ms後に実行
}
```

#### B2. 適応的バッチサイズ
```javascript
// 必要分の2倍を取得（previous-v01実績）
const needed = Math.max(this.displayLimit - cache.items.length, this.displayLimit);
const loadSize = Math.min(needed * 2, 100); // 一度に最大100件
```

#### B3. バックグラウンド補充システム
- cache不足の検出
- 非同期でのデータ補充
- UI非ブロッキングな処理

#### 期待効果
- **UIブロック時間**: 現在の数百ms → **0ms**（完全非ブロッキング）
- **データ可用性**: 常に十分なcacheデータを確保
- **応答性**: previous-v01レベルの優れたUX

### Phase C: 統計Cache・永続化（期間：3週間）
**優先度：中** - 長期的な安定性とパフォーマンス

#### C1. 統計情報Cache
**ファイル**: `src/cli/cache/statistics-cache-manager.js`

```javascript
class StatisticsCacheManager {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5分間のTTL
  }

  // getTopActiveObjects等の統計関数をcache化
  async getTopActiveObjectsWithCache(limit = 10) {
    // TTL付きcache確認 → DB取得 → cache更新
  }
}
```

#### C2. JSONファイルCache（オプション）
previous-v01の技術を参考に大量統計データの事前計算

```javascript
// config/cache/statistics.json
{
  "lastUpdated": "2025-06-22T12:00:00Z",
  "topActiveObjects": [...],
  "eventTypeCounts": {...},
  "dailyStatistics": {...}
}
```

#### C3. Cache永続化（長期目標）
- 起動時のcache復旧
- アプリケーション再起動時の高速化

#### 期待効果
- **統計情報取得**: 現在の数十ms → **1ms以下**
- **起動時間**: cache復旧による高速化
- **大規模データ対応**: 安定した動作保証

## 🏗️ 実装アーキテクチャ

### ディレクトリ構造
```
src/
├── cache/                        # 新規追加（横断的関心事）
│   ├── managers/                 # キャッシュマネージャー
│   │   ├── event-type-cache-manager.js    # Phase A
│   │   ├── statistics-cache-manager.js    # Phase C
│   │   └── database-cache-manager.js      # 将来
│   ├── strategies/               # キャッシュ戦略
│   │   ├── lru-strategy.js       # LRU戦略
│   │   └── ttl-strategy.js       # TTL戦略
│   └── metrics/                  # メトリクス
│       └── cache-metrics.js      # パフォーマンス測定
├── cli/
│   ├── display-manager.js        # 修正
│   └── ...
```

### データフロー設計
```
┌─────────────────────────────────────────────────────────────┐
│ User Input (a/u/s/c/m/v/d)                                 │
├─────────────────────────────────────────────────────────────┤
│ DisplayManager                                              │
│ ├─ cacheManager.getFilteredEvents() ← 即座応答             │
│ └─ backgroundLoad() ← 50msデバウンス                        │
├─────────────────────────────────────────────────────────────┤
│ EventTypeCacheManager                                       │
│ ├─ メモリcache確認 → 即座返却                              │
│ ├─ バックグラウンド補充 → 非同期DB取得                     │
│ └─ LRU管理 → 古いデータ削除                               │
├─────────────────────────────────────────────────────────────┤
│ EventManager (既存)                                         │
│ └─ SQLite取得 → DB cache活用                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 実装順序と依存関係

### Phase A依存関係
```
1. EventTypeCacheManager実装 (独立)
2. DisplayManager統合 (1に依存)
3. 基本テスト作成 (1,2に依存)
```

### Phase B依存関係
```
1. デバウンス機能 (Phase A完了後)
2. バックグラウンド処理 (1に依存)
3. 統合テスト (1,2に依存)
```

### Phase C依存関係
```
1. 統計Cache (Phase B完了後、独立実装可能)
2. JSONファイルCache (1と並行可能)
3. 永続化Cache (1,2完了後)
```

## 🧪 テスト戦略

### Phase A テスト
```javascript
// test/unit/cli/cache/event-type-cache-manager.test.js
describe('EventTypeCacheManager', () => {
  test('基本的なイベント取得', async () => {
    // cache miss → DB取得 → cache保存
  });
  
  test('フィルタリング機能', async () => {
    // イベントタイプ別フィルタリング
  });
  
  test('容量制限', async () => {
    // maxCacheSize超過時の削除
  });
});
```

### Phase B テスト
```javascript
describe('デバウンス機能', () => {
  test('50ms以内の連続リクエスト統合', async () => {
    // 複数リクエスト → 1回のDB取得
  });
  
  test('バックグラウンド処理の非ブロッキング', async () => {
    // UI応答性の確認
  });
});
```

### 統合テスト
```javascript
// test/integration/cache-integration.test.js
describe('Cache統合テスト', () => {
  test('フィルタ切り替え時の応答性', async () => {
    // a/u/s/c/m/v/dキーの連続操作
  });
  
  test('大量データでの安定性', async () => {
    // 1000件以上のイベントでのテスト
  });
});
```

## 📈 成功指標・KPI

### Phase A成功指標
- [ ] フィルタリング応答時間 < 10ms
- [ ] cache hit率 > 80%
- [ ] メモリ使用量 < 50MB（500件cache時）
- [ ] 既存機能の互換性 100%

### Phase B成功指標  
- [ ] UI応答時間 < 50ms（previous-v01レベル）
- [ ] バックグラウンド処理による0msブロック
- [ ] cache hit率 > 90%
- [ ] 大量データ（1000件）での安定動作

### Phase C成功指標
- [ ] 統計情報取得 < 1ms
- [ ] 起動時間 < 2秒（cache復旧込み）
- [ ] cache hit率 > 95%
- [ ] メモリ効率の最適化

## 🔄 段階的リリース戦略

### Phase A リリース
- 基本cache機能の本格運用
- 効果測定・フィードバック収集
- 問題点の洗い出し

### Phase B リリース
- 非同期処理の安定性確認
- UX改善効果の定量評価
- パフォーマンスベンチマーク

### Phase C リリース
- 長期安定性の確認
- 大規模データでの運用実績
- 最終的な最適化

## ⚠️ リスク管理

### 技術リスク
- **メモリリーク**: 定期的なcache清掃とモニタリング
- **データ整合性**: cache無効化タイミングの慎重な管理
- **パフォーマンス劣化**: 適切なcacheサイズとTTL設定

### 互換性リスク
- **既存API変更**: 段階的移行でリスク最小化
- **テストケース網羅**: 既存機能の回帰テスト強化

### 運用リスク
- **デバッグ困難性**: cache状態の可視化機能
- **設定複雑化**: 合理的なデフォルト値設定

## 🚀 実装開始準備

### Phase A開始前チェックリスト
- [ ] 現在のcache仕様完全理解
- [ ] previous-v01技術の詳細分析完了
- [ ] テスト戦略確定
- [ ] ディレクトリ構造設計完了
- [ ] 実装スケジュール合意

### 必要リソース
- **開発期間**: Phase A（1週間）+ Phase B（2週間）+ Phase C（3週間）
- **テスト工数**: 各Phase完了時の十分なテスト時間
- **レビュー**: 各Phase完了時のコードレビューと効果測定

---

**結論**: previous-v01の優秀なcache技術を段階的にcctopに導入することで、**劇的なパフォーマンス改善と優れたUX**を実現できる。Phase Aから開始して、確実な効果を確認しながら段階的に拡張していく。

---

**次のアクション**: Phase A実装開始の承認とEventTypeCacheManager基本設計の詳細化