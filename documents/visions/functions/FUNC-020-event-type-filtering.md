# FUNC-020: イベントタイプフィルタリング機能

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**カテゴリ**: UI Enhancement  
**Phase**: 1 (高優先機能)  
**ステータス**: Draft

## 📊 機能概要

イベントタイプ（create/modify/delete/find）別のリアルタイムフィルタリング機能。キーボード操作（c, m, d, f）による表示切り替え。

**ユーザー価値**: 特定イベントタイプへの集中・ノイズ除去・効率的な監視・直感的な操作

## 🎯 機能境界

### ✅ **実行する**
- イベントタイプ別フィルタリング（create/modify/delete/find）
- キーボードショートカット（c, m, d, f）による切り替え
- フィルタ状態の視覚的表示・リアルタイム反映
- フィルタ状態の永続化（セッション中）

### ❌ **実行しない**
- ファイル名・パス・サイズによるフィルタリング
- 複雑な検索クエリ・正規表現フィルタ
- フィルタ状態のファイル保存（config.jsonへの永続化）

## 📋 必要な仕様

### **イベントタイプ定義（BP-000準拠）**

```javascript
const EVENT_TYPES = {
  find: { key: 'f', name: 'Find', description: 'Initial file discovery' },
  create: { key: 'c', name: 'Create', description: 'File creation' },
  modify: { key: 'm', name: 'Modify', description: 'File modification' },
  delete: { key: 'd', name: 'Delete', description: 'File deletion' },
  move: { key: 'v', name: 'Move', description: 'File move/rename' }  // 注：'m'と重複回避で'v'
};
```

### **フィルタ状態管理**

#### **基本データ構造**
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
}
```

### **実装アプローチ（versions/product-v01最適実装準拠）**

#### **1. キーボードハンドリング**
```javascript
// 既存のキーボード処理に統合
const keyMappings = {
  'f': () => filterManager.toggleFilter('find'),
  'c': () => filterManager.toggleFilter('create'),
  'm': () => filterManager.toggleFilter('modify'),
  'd': () => filterManager.toggleFilter('delete'),
  'v': () => filterManager.toggleFilter('move')
};
```

#### **2. リアルタイムフィルタリング**
```javascript
// イベント表示前のフィルタ適用
function shouldDisplayEvent(event) {
  const eventType = event.event_type || event.type;
  return filterManager.isVisible(eventType);
}

// ストリーム表示での適用
events.filter(shouldDisplayEvent).forEach(displayEvent);
```

### **UI表示設計**

#### **フィルタライン表示（採用）**
```
cctop v0.1.0 - /path/to/project
────────────────────────────────────────────────────────────────────
ID    TIME     EVENT   FILE                              SIZE    LINES
1234  12:34:56 create  src/components/Button.js          1.2KB     45
1235  12:34:57 modify  src/app.js                        5.4KB    123
────────────────────────────────────────────────────────────────────
Events: 1,234 | Files: 456 | Monitoring: Active
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
```

**フィルタ状態表示**:
- **アクティブ時**: `[f]` = 緑色、`:Find` = 白色（通常表示）
- **非アクティブ時**: `[f]` = 黒色、`:Find` = 暗灰色（視認性低下）

### **実装優先順位（段階的実装）**

#### **Phase 1: 基本フィルタリング**
- EventFilterManagerクラス実装
- 基本的なキーボード処理統合
- シンプルなステータス表示

#### **Phase 2: UI改善**
- 視覚的フィルタ状態表示
- ヘルプテキスト統合
- アニメーション・トランジション

#### **Phase 3: 高度機能**
- フィルタ組み合わせ・一括操作
- ショートカットキーのカスタマイズ

## 🔧 技術的実装詳細

### **1. 既存コード統合方針**

#### **現在のイベント表示処理への統合**
```javascript
// 現在: 全イベントを表示
events.forEach(event => displayEvent(event));

// 変更後: フィルタ適用
events
  .filter(event => filterManager.isVisible(event.event_type))
  .forEach(event => displayEvent(event));
```

#### **キーボード処理への統合**
```javascript
// 既存のキーボードハンドラーに追加
process.stdin.on('keypress', (str, key) => {
  if (['f', 'c', 'm', 'd', 'v'].includes(key.name)) {
    handleFilterToggle(key.name);
    return;
  }
  // 既存のキー処理継続
});
```

### **2. パフォーマンス考慮**

#### **イベントタイプ別キャッシュ（product-v01実装参考）**
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
    const type = event.event_type;
    this.caches[type].push(event);
  }
  
  getFilteredEvents(filters) {
    return Object.keys(filters)
      .filter(type => filters[type])
      .flatMap(type => this.caches[type]);
  }
}
```

### **3. フィルタライン描画実装**

#### **ANSIカラーコード実装**
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

#### **表示統合実装**
```javascript
function renderScreen(events, filters, stats) {
  const header = renderHeader();
  const separator = '─'.repeat(process.stdout.columns);
  const eventList = renderEventList(events.filter(e => filters[e.event_type]));
  const statusLine = renderStatusLine(stats);
  const filterLine = FilterStatusRenderer.renderFilterLine(filters);
  
  console.clear();
  console.log([header, separator, eventList, separator, statusLine, filterLine].join('\n'));
}
```

### **4. 状態同期・リアクティブ更新**

#### **フィルタ変更時の即座反映（動作A実装）**
```javascript
filterManager.on('filterChanged', () => {
  // 即座に既存表示も更新（動作A）
  const currentEvents = eventStore.getAllEvents();
  const filteredEvents = currentEvents.filter(e => filterManager.isVisible(e.event_type));
  
  // 画面全体を再描画（既存イベントも含む）
  renderScreen(filteredEvents, filterManager.getFilters(), stats);
});
```

## 🧪 テスト要件

### **基本機能テスト**
- [ ] フィルタ切り替え（各キー: f, c, m, d, v）
- [ ] フィルタ状態の正確な反映（即座に既存表示更新）
- [ ] 複数フィルタの組み合わせ動作
- [ ] デフォルト状態（全フィルタON）の確認

### **UI表示テスト**
- [ ] フィルタライン表示（最下段固定）
- [ ] 色分け表示（アクティブ=緑/白、非アクティブ=黒/暗灰）
- [ ] リアルタイム表示更新（動作A: 即座に既存表示も更新）

### **パフォーマンステスト**
- [ ] 大量イベント時のフィルタリング性能
- [ ] フィルタ切り替え時の応答性
- [ ] メモリ使用量（キャッシュ効率）

## 💭 議論ポイント・UI設計相談

### **✅ 1. フィルタ状態の表示方法（決定済み）**

**採用**: フィルタライン表示
```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
```

- **アクティブ**: キー文字（f,c,m,d,v）= 緑色、ラベル = 白色
- **非アクティブ**: キー文字 = 黒色、ラベル = 暗灰色
- **配置**: 画面最下段に固定表示

### **✅ 2. キーアサイン（確定済み）**

**採用**: 
- `f` = find, `c` = create, `m` = modify, `d` = delete, `v` = move
- **将来拡張**: `/` = 汎用filter（重複回避・検索風インターフェース）

### **✅ 3. デフォルト状態（確定済み）**

**採用**: 全フィルタON（全表示）
- ユーザーがコマンド（f, c, m, d, v）を確実に視認できる
- 必要に応じて非表示にする方式

### **✅ 4. 一括操作（確定済み）**

**採用**: 一括操作なし
- シンプル重視、個別キーのみで十分

### **✅ 5. 将来的な機能連携（確定済み）**

#### **選択モード（フォーカスモード）との連携**
- **動作**: 選択モード状態でもevent type filterはグローバルに動作
- **例**: modifyフィルタOFF → 全てのmodifyイベントが非表示（選択ファイル限定ではない）

#### **検索機能との組み合わせ（将来実装）**
- **動作**: 検索条件 + event type filter の組み合わせ適用
- **例**: 検索「.js」+ modify filterのみON → .jsファイルのmodifyイベントのみ表示
- **将来キー**: `/` = 汎用filter（検索風インターフェース）

#### **詳細モードとの連携**
- **動作**: 詳細モードではevent type filterは不要（個別ファイル詳細のため）

### **✅ 6. 実装方針の決定事項**

#### **表示更新方式**
- **動作A採用**: フィルタ切り替え時、既存表示も即座に更新
- **例**: createフィルタOFF → 既に表示中のcreateイベント行も即座に消える

#### **空リスト表示**
- **簡潔方針**: 全フィルタOFFで表示なしでも特別メッセージ不要
- **理由**: ユーザーには自明、シンプル重視

## 🎯 成功指標

1. **直感性**: キー操作→即座フィルタ反映（100ms以内）
2. **視認性**: フィルタ状態が一目で分かる表示（色分け明確）
3. **性能**: 10,000イベント表示でもスムーズな切り替え
4. **実用性**: 実際の開発作業での監視効率向上

---

**このFunction仕様は、versions/product-v01の優秀な実装を参考に、ユーザーとの詳細な議論により最適化された、実装準備完了の機能仕様です。**