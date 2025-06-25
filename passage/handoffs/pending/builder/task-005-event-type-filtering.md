# Builder Handoff: イベントタイプフィルタリング機能実装

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**対象**: Builder Agent  
**機能**: FUNC-020 イベントタイプフィルタリング機能  
**優先度**: 高（Phase 1）

## 📋 作業概要

イベントタイプ（create/modify/delete/find/move）別のリアルタイムフィルタリング機能の実装。キーボード操作（f, c, m, d, v）による表示切り替え。

**目標**: 特定イベントタイプへの集中・ノイズ除去・効率的な監視・直感的な操作の実現。

## 🎯 実装要件

### **1. EventFilterManagerクラス実装**

#### **実装場所**: `src/filter/` または既存のUIシステム

#### **基本クラス構造**:
```javascript
class EventFilterManager {
  constructor() {
    // デフォルト: 全フィルタON（ユーザーがコマンドを確実に視認）
    this.filters = {
      find: true,     // f キー
      create: true,   // c キー
      modify: true,   // m キー
      delete: true,   // d キー
      move: true      // v キー
    };
    this.listeners = [];
  }
  
  toggleFilter(eventType) {
    this.filters[eventType] = !this.filters[eventType];
    this.notifyListeners();
  }
  
  isVisible(eventType) {
    return this.filters[eventType] === true;
  }
  
  getFilters() {
    return { ...this.filters };
  }
  
  // EventEmitterパターン
  on(event, callback) {
    if (event === 'filterChanged') {
      this.listeners.push(callback);
    }
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => callback());
  }
}
```

### **2. キーボードハンドリング統合**

#### **既存キーボード処理への統合**
```javascript
// 既存のキーボードハンドラーに追加
const keyMappings = {
  'f': () => filterManager.toggleFilter('find'),
  'c': () => filterManager.toggleFilter('create'),
  'm': () => filterManager.toggleFilter('modify'),
  'd': () => filterManager.toggleFilter('delete'),
  'v': () => filterManager.toggleFilter('move')
};

process.stdin.on('keypress', (str, key) => {
  if (keyMappings[key.name]) {
    keyMappings[key.name]();
    return;
  }
  // 既存のキー処理継続
});
```

#### **実装上の注意**
- 既存のキーバインド（h=help、q=quit等）との競合回避
- 大文字・小文字の区別なし（f/F両方で同じ動作）

### **3. フィルタライン描画システム**

#### **FilterStatusRendererクラス実装**
```javascript
class FilterStatusRenderer {
  static renderFilterLine(filters) {
    const filterItems = [
      { key: 'f', name: 'Find', active: filters.find },
      { key: 'c', name: 'Create', active: filters.create },
      { key: 'm', name: 'Modify', active: filters.modify },
      { key: 'd', name: 'Delete', active: filters.delete },
      { key: 'v', name: 'Move', active: filters.move }
    ];
    
    const rendered = filterItems.map(item => {
      const keyColor = item.active ? '\x1b[32m' : '\x1b[30m'; // 緑 or 黒
      const textColor = item.active ? '\x1b[37m' : '\x1b[90m'; // 白 or 暗灰色
      const reset = '\x1b[0m';
      
      return `[${keyColor}${item.key}${reset}]:${textColor}${item.name}${reset}`;
    });
    
    return rendered.join(' ');
  }
}
```

### **4. 画面表示統合**

#### **画面レンダリング統合実装**
```javascript
function renderScreen(events, filters, stats) {
  const header = renderHeader();
  const separator = '─'.repeat(process.stdout.columns);
  
  // フィルタリング適用（動作A: 即座に既存表示も更新）
  const filteredEvents = events.filter(event => filters[event.event_type]);
  const eventList = renderEventList(filteredEvents);
  
  const statusLine = renderStatusLine(stats);
  const filterLine = FilterStatusRenderer.renderFilterLine(filters);
  
  // 画面クリア・再描画
  console.clear();
  console.log([
    header,
    separator,
    eventList,
    separator,
    statusLine,
    filterLine
  ].join('\n'));
}
```

#### **レイアウト配置**
- **フィルタライン**: 画面最下段に固定配置
- **ステータスライン**: フィルタライン直上
- **イベントリスト**: 中央メイン表示エリア

## 🔧 技術的実装詳細

### **Phase 1: 基本フィルタリング機能**

#### **1. 既存イベント表示処理への統合**
```javascript
// 現在のイベント表示ロジック
function displayEvents(events) {
  // 変更前: 全イベントを表示
  // events.forEach(event => displayEvent(event));
  
  // 変更後: フィルタ適用
  const filteredEvents = events.filter(event => 
    filterManager.isVisible(event.event_type)
  );
  filteredEvents.forEach(event => displayEvent(event));
}
```

#### **2. リアルタイム更新システム**
```javascript
// フィルタ変更時の即座反映
filterManager.on('filterChanged', () => {
  // 現在のイベントストア取得
  const currentEvents = eventStore.getAllEvents();
  
  // フィルタ適用して画面全体再描画
  renderScreen(currentEvents, filterManager.getFilters(), stats);
});
```

#### **3. event_type正規化**
```javascript
// イベントタイプの正規化（DB schema準拠）
function normalizeEventType(event) {
  // BP-000のschema.jsに合わせて正規化
  const typeMapping = {
    'find': 'find',
    'create': 'create', 
    'modify': 'modify',
    'delete': 'delete',
    'move': 'move'
  };
  
  return typeMapping[event.event_type] || event.event_type;
}
```

### **Phase 2: パフォーマンス最適化**

#### **4. イベントタイプ別キャッシュ（versions/product-v01参考）**
```javascript
class EventTypeCacheManager {
  constructor() {
    this.caches = {
      find: [],
      create: [],
      modify: [],
      delete: [],
      move: []
    };
  }
  
  addEvent(event) {
    const type = normalizeEventType(event);
    if (this.caches[type]) {
      this.caches[type].push(event);
    }
  }
  
  getFilteredEvents(filters) {
    return Object.keys(filters)
      .filter(type => filters[type])
      .flatMap(type => this.caches[type] || []);
  }
  
  clearCache(eventType = null) {
    if (eventType) {
      this.caches[eventType] = [];
    } else {
      Object.keys(this.caches).forEach(type => {
        this.caches[type] = [];
      });
    }
  }
}
```

## 🔗 既存システムとの統合

### **1. chokidarイベント処理との統合**
```javascript
// chokidarイベント受信時の処理
chokidar.watch(watchPath).on('all', (eventType, filePath) => {
  const event = {
    event_type: normalizeEventType({ event_type: eventType }),
    file_path: filePath,
    timestamp: Date.now()
  };
  
  // イベントストアに追加
  eventStore.addEvent(event);
  
  // フィルタチェック→表示更新
  if (filterManager.isVisible(event.event_type)) {
    updateDisplay();
  }
});
```

### **2. データベース統合**
```javascript
// DB保存・取得時のフィルタ対応
async function getEventsWithFilter(filters) {
  const activeTypes = Object.keys(filters).filter(type => filters[type]);
  const typeConditions = activeTypes.map(type => `event_type = ?`).join(' OR ');
  
  const query = `
    SELECT * FROM events 
    WHERE ${typeConditions}
    ORDER BY timestamp DESC 
    LIMIT 1000
  `;
  
  return await db.all(query, activeTypes);
}
```

## 🧪 テスト要件

### **単体テスト**
- [ ] `EventFilterManager.toggleFilter()` 各eventType動作
- [ ] `FilterStatusRenderer.renderFilterLine()` 色分け表示
- [ ] キーボードハンドリング（f, c, m, d, v）
- [ ] デフォルト状態（全フィルタON）の確認

### **統合テスト**
- [ ] キー押下→フィルタ切り替え→画面更新の全体フロー
- [ ] 複数フィルタの組み合わせ動作
- [ ] 大量イベント時の性能確認（10,000イベント）

### **実装テスト**
- [ ] 既存キーバインドとの競合なし確認
- [ ] フィルタライン表示位置（最下段固定）
- [ ] 色分け表示（アクティブ=緑/白、非アクティブ=黒/暗灰）

## 📁 影響するファイル

### **新規作成**
- `src/filter/EventFilterManager.js`
- `src/ui/FilterStatusRenderer.js`
- `test/filter/EventFilterManager.test.js`

### **変更対象**
- キーボードハンドリング処理
- メインレンダリングループ
- イベント表示ロジック

### **統合対象**
- chokidarイベント処理
- データベースクエリ処理
- UI表示システム

## ⚠️ 重要な実装注意事項

### **1. 既存システムへの影響最小化**
- 既存のキーバインド・UI レイアウトを壊さない
- 段階的統合（フィルタ機能→表示更新→キーハンドリング）

### **2. パフォーマンス考慮**
- フィルタ切り替え時の応答性（100ms以内）
- 大量イベント時のメモリ効率
- 画面更新頻度の最適化

### **3. versions/product-v01実装の活用**
- EventTypeCacheManagerパターンの採用
- 二重バッファリング（FUNC-018）との連携
- キーボードハンドリングシステムの参考

## 🎯 完了条件

- [ ] FUNC-020仕様の完全実装
- [ ] f/c/m/d/vキーによるフィルタ切り替え動作
- [ ] フィルタライン表示（最下段・色分け）
- [ ] 動作A実装（即座に既存表示更新）
- [ ] 全テストケースのパス
- [ ] 既存機能への影響なし確認
- [ ] パフォーマンス要件クリア（10,000イベント対応）

---

**このHandoffにより、直感的で高性能なeventフィルタ機能が実装され、cctopの監視効率が大幅に向上します。**