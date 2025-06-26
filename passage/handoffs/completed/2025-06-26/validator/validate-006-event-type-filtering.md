# Validator Handoff: イベントタイプフィルタリング機能テスト

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**対象**: Validator Agent  
**機能**: FUNC-020 イベントタイプフィルタリング機能  
**優先度**: 高（Phase 1）

## 📋 テスト概要

イベントタイプ（create/modify/delete/find/move）別のリアルタイムフィルタリング機能の包括的テスト実施。

**目標**: キーボード操作・フィルタライン表示・リアルタイム更新・パフォーマンスの全機能が正常動作することを確認。

## 🎯 テスト要件

### **1. 単体テスト**

#### **EventFilterManagerクラステスト**

**テスト対象**: `src/filter/EventFilterManager.js`

**テストケース**:
```javascript
describe('EventFilterManager', () => {
  let filterManager;
  
  beforeEach(() => {
    filterManager = new EventFilterManager();
  });
  
  describe('初期状態', () => {
    test('全フィルタがデフォルトでON', () => {
      expect(filterManager.isVisible('find')).toBe(true);
      expect(filterManager.isVisible('create')).toBe(true);
      expect(filterManager.isVisible('modify')).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(true);
      expect(filterManager.isVisible('move')).toBe(true);
    });
  });
  
  describe('toggleFilter', () => {
    test('フィルタ状態の切り替え', () => {
      expect(filterManager.isVisible('create')).toBe(true);
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('create')).toBe(false);
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('create')).toBe(true);
    });
    
    test('他のフィルタに影響しない', () => {
      filterManager.toggleFilter('create');
      expect(filterManager.isVisible('modify')).toBe(true);
      expect(filterManager.isVisible('delete')).toBe(true);
    });
  });
  
  describe('イベントリスナー', () => {
    test('filterChanged イベントの発火', (done) => {
      filterManager.on('filterChanged', () => {
        done();
      });
      filterManager.toggleFilter('create');
    });
  });
});
```

#### **FilterStatusRendererテスト**

**テスト対象**: `src/ui/FilterStatusRenderer.js`

**テストケース**:
```javascript
describe('FilterStatusRenderer', () => {
  describe('renderFilterLine', () => {
    test('全フィルタON時の表示', () => {
      const filters = { find: true, create: true, modify: true, delete: true, move: true };
      const result = FilterStatusRenderer.renderFilterLine(filters);
      
      // 緑色のANSIコード(\x1b[32m)が含まれること
      expect(result).toContain('\x1b[32m');
      // 各キーと名前が含まれること
      expect(result).toContain('[f]:Find');
      expect(result).toContain('[c]:Create');
      expect(result).toContain('[m]:Modify');
      expect(result).toContain('[d]:Delete');
      expect(result).toContain('[v]:Move');
    });
    
    test('部分フィルタOFF時の表示', () => {
      const filters = { find: false, create: true, modify: true, delete: false, move: true };
      const result = FilterStatusRenderer.renderFilterLine(filters);
      
      // 黒色のANSIコード(\x1b[30m)が含まれること（非アクティブ）
      expect(result).toContain('\x1b[30m');
      // 緑色のANSIコード(\x1b[32m)が含まれること（アクティブ）
      expect(result).toContain('\x1b[32m');
    });
  });
});
```

### **2. 統合テスト**

#### **キーボードハンドリングテスト**

**テスト対象**: キーボード入力→フィルタ切り替え→画面更新

**テストケース**:
```javascript
describe('Keyboard Filter Integration', () => {
  let filterManager, mockRenderer;
  
  beforeEach(() => {
    filterManager = new EventFilterManager();
    mockRenderer = jest.fn();
  });
  
  test('f キー押下でfindフィルタ切り替え', () => {
    // キーボードイベントシミュレーション
    simulateKeyPress('f');
    
    expect(filterManager.isVisible('find')).toBe(false);
  });
  
  test('c キー押下でcreateフィルタ切り替え', () => {
    simulateKeyPress('c');
    expect(filterManager.isVisible('create')).toBe(false);
  });
  
  test('連続キー押下での正常動作', () => {
    simulateKeyPress('f'); // find OFF
    simulateKeyPress('c'); // create OFF
    simulateKeyPress('f'); // find ON
    
    expect(filterManager.isVisible('find')).toBe(true);
    expect(filterManager.isVisible('create')).toBe(false);
  });
});
```

#### **画面表示統合テスト**

**テスト対象**: フィルタ変更→画面更新→表示確認

**テストケース**:
```javascript
describe('Display Integration', () => {
  test('フィルタ変更時の即座画面更新（動作A）', async () => {
    const events = [
      { event_type: 'create', file_path: 'file1.js', timestamp: 1 },
      { event_type: 'modify', file_path: 'file2.js', timestamp: 2 },
      { event_type: 'delete', file_path: 'file3.js', timestamp: 3 }
    ];
    
    // 初期状態：全イベント表示
    let displayedEvents = getDisplayedEvents();
    expect(displayedEvents).toHaveLength(3);
    
    // createフィルタOFF
    filterManager.toggleFilter('create');
    
    // 即座に画面更新確認
    displayedEvents = getDisplayedEvents();
    expect(displayedEvents).toHaveLength(2);
    expect(displayedEvents.find(e => e.event_type === 'create')).toBeUndefined();
  });
  
  test('フィルタライン表示位置（最下段）', () => {
    const screenOutput = captureScreenOutput();
    const lines = screenOutput.split('\n');
    
    // 最下段にフィルタラインが表示されること
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toContain('[f]:Find');
    expect(lastLine).toContain('[c]:Create');
  });
});
```

### **3. 実機能テスト**

#### **リアルタイムフィルタリングテスト**

**テスト環境**: 実際のファイル監視環境

**テストシナリオ**:

1. **基本フィルタリング動作**
   ```bash
   # テスト準備
   mkdir test-filtering
   cd test-filtering
   cctop
   
   # createイベント生成
   touch new-file.js
   # → createイベントが表示される
   
   # cキー押下（createフィルタOFF）
   # → createイベントが非表示になる
   
   # modifyイベント生成
   echo "content" > new-file.js
   # → modifyイベントは表示される（フィルタON）
   ```

2. **複数フィルタの組み合わせ**
   ```bash
   # fキー押下（findフィルタOFF）
   # cキー押下（createフィルタOFF）
   # → find, createイベントのみ非表示
   
   # ファイル操作
   touch another.js      # 非表示（create）
   echo "test" > test.js # 表示（modify）
   rm old.js            # 表示（delete）
   ```

3. **動作A確認（既存表示の即座更新）**
   ```bash
   # 多数のイベント表示状態を作る
   for i in {1..10}; do touch file$i.js; done
   
   # createフィルタOFF
   # → 既に表示されているcreateイベントも即座に消える
   ```

#### **パフォーマンステスト**

**大量イベント処理テスト**:
```javascript
describe('Performance Tests', () => {
  test('10,000イベント時のフィルタ切り替え性能', async () => {
    // 10,000個のイベント生成
    const events = generateMockEvents(10000);
    eventStore.addEvents(events);
    
    // フィルタ切り替え時間測定
    const startTime = performance.now();
    filterManager.toggleFilter('create');
    const endTime = performance.now();
    
    // 100ms以内での切り替え完了
    expect(endTime - startTime).toBeLessThan(100);
  });
  
  test('フィルタライン描画性能', () => {
    const filters = { find: true, create: false, modify: true, delete: false, move: true };
    
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      FilterStatusRenderer.renderFilterLine(filters);
    }
    const endTime = performance.now();
    
    // 1000回描画が10ms以内
    expect(endTime - startTime).toBeLessThan(10);
  });
});
```

### **4. UI/UX テスト**

#### **視覚的表示確認**

**手動テストケース**:

1. **色分け表示の確認**
   ```
   期待される表示:
   - アクティブ: [緑色f]:白色Find [緑色c]:白色Create...
   - 非アクティブ: [黒色f]:暗灰色Find [緑色c]:白色Create...
   ```

2. **表示位置の確認**
   ```
   画面レイアウト:
   ┌─ Header ─────────────────────────┐
   │ cctop v0.1.0 - /path/to/project │
   ├─ Events ────────────────────────┤
   │ ID   TIME     EVENT   FILE      │
   │ 1234 12:34:56 create  file1.js  │
   ├─ Status ────────────────────────┤
   │ Events: 1,234 | Files: 456      │
   ├─ Filter Line ───────────────────┤
   │ [f]:Find [c]:Create [m]:Modify  │ ← 最下段
   └─────────────────────────────────┘
   ```

3. **レスポンシブ動作**
   ```bash
   # ターミナルサイズ変更時の適切な表示確認
   # 狭い画面でのフィルタライン表示確認
   ```

## 📊 期待される結果

### **正常動作パターン**

#### **1. 全フィルタON時（デフォルト）**
```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
 ↑緑色  ↑緑色    ↑緑色    ↑緑色    ↑緑色
```

#### **2. 部分フィルタOFF時**
```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
 ↑黒色  ↑緑色    ↑黒色    ↑緑色    ↑緑色
（findとmodifyがOFF）
```

#### **3. フィルタ切り替え時のイベント表示**
```
フィルタ前（全表示）:
ID   EVENT   FILE
1    create  a.js
2    modify  b.js
3    delete  c.js

createフィルタOFF後:
ID   EVENT   FILE
2    modify  b.js
3    delete  c.js
（createイベントが即座に非表示）
```

### **エラーハンドリング**

#### **4. 無効なevent_typeの処理**
```javascript
// 未知のイベントタイプが来た場合の適切な処理
test('未知のevent_typeでもエラーにならない', () => {
  const result = filterManager.isVisible('unknown_type');
  expect(result).toBe(false); // デフォルトで非表示
});
```

#### **5. キーコンフリクトの回避**
```javascript
// 既存キー（h=help、q=quit等）との競合なし確認
test('既存キーバインドが正常動作', () => {
  simulateKeyPress('h'); // helpキー
  expect(isHelpDisplayed()).toBe(true);
  
  simulateKeyPress('q'); // quitキー
  expect(isAppExiting()).toBe(true);
});
```

## ⚠️ テスト時の注意事項

### **環境設定**
- テスト用の一時ディレクトリ使用
- 既存設定ファイルへの影響回避
- ANSIカラーコードのターミナル依存性考慮

### **パフォーマンス測定**
- 実際のハードウェア環境での測定実施
- CI環境でのテスト安定性確保
- メモリリークの確認

### **視覚的確認**
- 複数のターミナルソフトでの表示確認
- 色覚多様性への配慮確認
- 高DPI環境での表示確認

## 🎯 テスト完了条件

- [ ] 全ユニットテストのパス（100%カバレッジ）
- [ ] f/c/m/d/vキーによるフィルタ切り替えの確認
- [ ] フィルタライン表示（最下段・色分け）の確認
- [ ] 動作A実装（即座に既存表示更新）の確認
- [ ] パフォーマンス要件クリア（10,000イベント・100ms以内）
- [ ] 既存機能への影響なし確認
- [ ] 実機能テストでの全シナリオ成功
- [ ] UI/UX品質確認（色分け・配置・レスポンシブ）

## 📈 品質保証

### **回帰テスト**
- 既存のキーボードハンドリング機能
- 既存の画面表示・レンダリング機能
- 既存のchokidarイベント処理

### **ユーザビリティテスト**
- 直感性：初回使用時の理解しやすさ
- 効率性：実際の監視作業での有用性
- エラー処理：誤操作時の適切な挙動

---

**このテスト計画により、イベントタイプフィルタリング機能の品質・性能・ユーザビリティを完全に保証します。**