# CCTop キャッシュ戦略仕様

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: パフォーマンス向上のためのキャッシュ戦略と、Sort/Filter対応の設計

## 🎯 キャッシュ設計方針

### 基本戦略
- **イベントタイプ別キャッシュ**: create/modify/move/delete/scanごとに独立管理
- **非同期バックグラウンドロード**: UIをブロックしない先読み
- **最小保証**: 各タイプで最低displayLimit件を確保
- **メモリ効率**: 最大キャッシュサイズの制限

### previous-v01からの継承
- EventTypeCacheManagerの基本設計を踏襲
- バックグラウンド初期化による高速起動
- 重複排除ロジック

## 📊 キャッシュ構造

### データ構造
```javascript
class CacheManager {
  constructor(dbManager, config) {
    this.dbManager = dbManager;
    this.displayLimit = config.displayLimit || 10;
    this.maxCacheSize = Math.max(this.displayLimit * 5, 500);
    
    // イベントタイプ別キャッシュ
    this.eventCaches = {
      scan: { items: [], loading: false, hasMore: true, lastOffset: 0 },
      create: { items: [], loading: false, hasMore: true, lastOffset: 0 },
      modify: { items: [], loading: false, hasMore: true, lastOffset: 0 },
      move: { items: [], loading: false, hasMore: true, lastOffset: 0 },
      delete: { items: [], loading: false, hasMore: true, lastOffset: 0 }
    };
    
    // 統計キャッシュ（Sort対応）
    this.statsCache = {
      byEvents: { items: [], loading: false, lastUpdated: null },
      byChanges: { items: [], loading: false, lastUpdated: null },
      byRecent: { items: [], loading: false, lastUpdated: null }
    };
    
    // 検索結果キャッシュ（Filter対応）
    this.searchCache = new Map(); // key: searchQuery, value: results
    this.searchCacheLimit = 100; // 最大100クエリ保持
  }
}
```

### キャッシュアイテム構造
```javascript
// イベントキャッシュアイテム
{
  id: 12345,
  timestamp: '2025-06-21 10:00:00',
  file_name: 'example.js',
  directory: 'src/',
  event_type: 'modify',
  line_count: 125,
  block_count: 8,
  object_id: 67890
}

// 統計キャッシュアイテム
{
  object_id: 67890,
  file_path: 'src/example.js',
  total_events: 45,
  total_modifications: 38,
  total_line_changes: 1234,
  last_event_time: '2025-06-21 10:00:00'
}
```

## 🔄 キャッシュ更新戦略

### 1. イベントキャッシュ更新
```javascript
// 新規イベント発生時
onNewEvent(event) {
  // 1. 該当タイプのキャッシュ先頭に追加
  const cache = this.eventCaches[event.type];
  cache.items.unshift(event);
  
  // 2. サイズ制限チェック
  if (cache.items.length > this.maxCacheSize) {
    cache.items = cache.items.slice(0, this.maxCacheSize);
  }
  
  // 3. 統計キャッシュの無効化
  this.invalidateStatsCache();
}
```

### 2. バックグラウンドロード
```javascript
async ensureMinimumCache(eventType) {
  const cache = this.eventCaches[eventType];
  
  // 既に十分なデータがある場合はスキップ
  if (cache.items.length >= this.displayLimit || cache.loading) {
    return;
  }
  
  // 非同期でロード開始
  this.startBackgroundLoad(eventType);
}

startBackgroundLoad(eventType) {
  // デバウンス処理（50ms）
  clearTimeout(this.loadTimers[eventType]);
  this.loadTimers[eventType] = setTimeout(() => {
    this.loadEventTypeAsync(eventType);
  }, 50);
}
```

## 🔍 Sort対応

### ソート可能な項目
1. **更新頻度順**: total_events
2. **変更量順**: total_line_changes
3. **最終更新順**: last_event_time
4. **ファイル名順**: file_path

### 統計キャッシュ戦略
```javascript
async getStatsSorted(sortBy = 'events', limit = 20) {
  const cacheKey = `by${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`;
  const cache = this.statsCache[cacheKey];
  
  // キャッシュが有効な場合（5分以内）
  if (cache.items.length > 0 && 
      Date.now() - cache.lastUpdated < 5 * 60 * 1000) {
    return cache.items.slice(0, limit);
  }
  
  // キャッシュ更新
  return this.updateStatsCache(sortBy, limit);
}

async updateStatsCache(sortBy, limit) {
  const cache = this.statsCache[`by${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`];
  cache.loading = true;
  
  try {
    // DBから統計取得（ソート済み）
    const stats = await this.dbManager.getObjectStatsSorted(sortBy, limit * 2);
    cache.items = stats;
    cache.lastUpdated = Date.now();
    return stats.slice(0, limit);
  } finally {
    cache.loading = false;
  }
}
```

## 🔍 Filter対応

### フィルタ種類
1. **イベントタイプフィルタ**: 既存の仕組みで対応
2. **パス検索フィルタ**: 検索キャッシュで対応
3. **時間範囲フィルタ**: 部分キャッシュで対応

### 検索キャッシュ戦略
```javascript
async searchFiles(query) {
  // キャッシュチェック
  if (this.searchCache.has(query)) {
    return this.searchCache.get(query);
  }
  
  // 全イベントから検索（キャッシュ済みデータ優先）
  const results = this.searchInCache(query);
  
  // 不足分はDBから取得
  if (results.length < this.displayLimit) {
    const dbResults = await this.dbManager.searchFiles(query, this.displayLimit);
    results.push(...dbResults);
  }
  
  // キャッシュに保存（LRU）
  this.updateSearchCache(query, results);
  return results;
}

searchInCache(query) {
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  // 全イベントキャッシュを検索
  Object.values(this.eventCaches).forEach(cache => {
    cache.items.forEach(item => {
      const fullPath = `${item.directory}${item.file_name}`.toLowerCase();
      if (fullPath.includes(lowerQuery)) {
        results.push(item);
      }
    });
  });
  
  // 時系列ソート
  return results.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
}
```

### LRU実装
```javascript
updateSearchCache(query, results) {
  // 既存エントリを削除（LRU更新）
  this.searchCache.delete(query);
  
  // 新規追加
  this.searchCache.set(query, results);
  
  // サイズ制限
  if (this.searchCache.size > this.searchCacheLimit) {
    const firstKey = this.searchCache.keys().next().value;
    this.searchCache.delete(firstKey);
  }
}
```

## ⚡ パフォーマンス最適化

### メモリ使用量
- **イベントキャッシュ**: 各タイプ最大500件 × 5タイプ = 2,500件
- **統計キャッシュ**: 各ソート最大100件 × 3種類 = 300件
- **検索キャッシュ**: 最大100クエリ × 平均20件 = 2,000件
- **推定メモリ**: 約5-10MB

### キャッシュヒット率向上
1. **プリロード**: 起動時に主要データを先読み
2. **予測ロード**: ユーザー操作パターンから次の操作を予測
3. **部分更新**: 全体再取得を避け、差分のみ更新

### 無効化戦略
```javascript
// イベント発生時の無効化
invalidateOnNewEvent(event) {
  // 統計キャッシュは無効化（再計算必要）
  Object.values(this.statsCache).forEach(cache => {
    cache.items = [];
    cache.lastUpdated = null;
  });
  
  // 検索キャッシュは部分無効化
  this.searchCache.forEach((results, query) => {
    // 該当ファイルを含む検索結果のみ無効化
    if (this.shouldInvalidateSearch(query, event)) {
      this.searchCache.delete(query);
    }
  });
}
```

## 🔧 実装ガイドライン

### キャッシュマネージャーの責務
1. **データ取得の抽象化**: DBアクセスをキャッシュ経由に統一
2. **一貫性の保証**: キャッシュとDBの整合性維持
3. **メモリ管理**: 使用量の監視と制限

### 使用例
```javascript
// StreamDisplayでの使用
class StreamDisplay {
  constructor(dbManager, config) {
    this.cacheManager = new CacheManager(dbManager, config);
  }
  
  async displayLatest() {
    // キャッシュ経由でデータ取得
    const activities = await this.cacheManager.getFilteredEvents(
      this.eventFilters,
      this.displayLimit
    );
    
    this.render(activities);
  }
  
  async displaySorted(sortBy) {
    // 統計キャッシュから取得
    const stats = await this.cacheManager.getStatsSorted(
      sortBy,
      this.displayLimit
    );
    
    this.renderStats(stats);
  }
}
```

## 📊 測定指標

### キャッシュ効果測定
- **ヒット率**: キャッシュから返せた割合
- **レスポンス時間**: キャッシュあり/なしの比較
- **メモリ使用量**: 実際の使用量監視

### ログ出力
```javascript
// 開発環境でのキャッシュ状態ログ
if (process.env.NODE_ENV === 'development') {
  console.log('[Cache] Hit rate:', this.getHitRate());
  console.log('[Cache] Memory usage:', this.getMemoryUsage());
  console.log('[Cache] Status:', this.getCacheStatus());
}
```

---

**注記**: この仕様はprevious-v01のEventTypeCacheManagerを基に、Sort/Filter機能に対応できるよう拡張したものです。メモリ効率とレスポンス性のバランスを重視した設計となっています。