# Builder Handoff: Interactive Features Implementation (v0.2.3.0)

**作成日**: 2025年6月28日 00:48 JST  
**作成者**: Validator Agent  
**依頼先**: Builder Agent  
**優先度**: High  
**対象バージョン**: v0.2.3.0  
**推定工期**: 12-16時間  

## 📋 実装要求

### **実装対象**: FUNC-400/401/402/403 インタラクティブ機能群
**テスト完備状況**: 28テスト全成功（Mock環境）- 実装待ち状態  
**品質基準**: Pure Specification-Based Testing準拠・事前品質保証完了

## 🎯 **4機能統合システム実装**

### **FUNC-400: Interactive Selection Mode**
```javascript
/**
 * Interactive Selection Manager
 * Handles keyboard-driven file selection interface
 */
class SelectionManager {
  constructor(keyInputManager, displayRenderer) {
    this.state = {
      mode: 'waiting',           // 'waiting' | 'selecting'
      currentIndex: -1,          // Selected item index
      selectedFile: null,        // Selected file name
      fileList: []              // Available files
    };
  }

  // State transition: waiting → selecting
  async enterSelectionMode() {
    this.state.mode = 'selecting';
    this.state.currentIndex = 0;
    this.updateDisplay();
  }

  // Navigation: ↑↓ keys
  async navigate(direction) {
    if (this.state.mode !== 'selecting') return;
    
    if (direction === 'up') {
      this.state.currentIndex = Math.max(this.state.currentIndex - 1, 0);
    } else if (direction === 'down') {
      this.state.currentIndex = Math.min(
        this.state.currentIndex + 1, 
        this.state.fileList.length - 1
      );
    }
    
    this.state.selectedFile = this.state.fileList[this.state.currentIndex];
    this.updateDisplay();
  }

  // Selection confirmation: Enter key
  async confirmSelection() {
    if (this.state.mode !== 'selecting') return;
    
    const selectedFile = this.state.selectedFile;
    this.exitSelectionMode();
    
    // Transition to FUNC-401
    return selectedFile;
  }

  // Selection cancellation: ESC key
  async exitSelectionMode() {
    this.state.mode = 'waiting';
    this.state.currentIndex = -1;
    this.state.selectedFile = null;
    this.updateDisplay();
  }
}
```

**実装要件**:
- ✅ **FUNC-300統合**: キーハンドラー登録・キー受信処理
- ✅ **視覚制御**: 選択行背景色変更（FUNC-207連携）
- ✅ **応答時間**: キー入力→表示更新 < 100ms
- ✅ **状態管理**: waiting/selectingモード管理

### **FUNC-401: Detailed Inspection Mode**
```javascript
/**
 * Detailed Inspection Mode Controller
 * Coordinates FUNC-402 and FUNC-403 modules
 */
class DetailInspectionController {
  constructor(aggregateDisplay, historyDisplay, keyInputManager) {
    this.aggregateDisplay = aggregateDisplay;  // FUNC-402
    this.historyDisplay = historyDisplay;      // FUNC-403
    this.keyInputManager = keyInputManager;
    this.active = false;
    this.selectedFile = null;
  }

  // Mode activation from FUNC-400
  async activateDetailMode(selectedFile) {
    this.active = true;
    this.selectedFile = selectedFile;
    
    // Initialize both modules
    await this.aggregateDisplay.initialize(selectedFile);
    await this.historyDisplay.initialize(selectedFile);
    
    // Register keys for detail mode
    this.keyInputManager.setMode('detail');
    this.render();
  }

  // Key distribution to modules
  async handleKeyInput(key) {
    if (!this.active) return;
    
    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
        // Forward to FUNC-403 for history navigation
        await this.historyDisplay.navigate(key);
        break;
      case 'Escape':
      case 'q':
        await this.exitDetailMode();
        break;
    }
  }

  // Mode termination
  async exitDetailMode() {
    this.active = false;
    this.selectedFile = null;
    
    // Cleanup modules
    this.aggregateDisplay.cleanup();
    this.historyDisplay.cleanup();
    
    // Return to FUNC-400 waiting mode
    this.keyInputManager.setMode('waiting');
  }
}
```

**実装要件**:
- ✅ **モジュール統合**: FUNC-402/403の適切な制御
- ✅ **キー分散**: ナビゲーションキーのFUNC-403転送
- ✅ **画面制御**: 上段・下段の統合表示管理

### **FUNC-402: Aggregate Display Module**
```javascript
/**
 * Aggregate Display Renderer
 * Displays file statistics in upper section
 */
class AggregateDisplayRenderer {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.fileData = null;
  }

  async initialize(selectedFile) {
    const fileId = await this.databaseManager.ensureFile(selectedFile);
    this.fileData = await this.databaseManager.getAggregateStats(fileId);
  }

  render() {
    if (!this.fileData) return '';
    
    return [
      '┌─ File Details ─────────────────────────────┐',
      `│ FileID: ${this.fileData.file_id}  inode: ${this.fileData.inode}                 │`,
      '│                                            │',
      `│ Created:     ${this.formatTimestamp(this.fileData.first_event_timestamp)}              │`,
      `│ Last Update: ${this.formatTimestamp(this.fileData.last_event_timestamp)}              │`,
      '│                                            │',
      '│ Number of Events                           │',
      `│ Create=${this.fileData.total_creates}  Delete=${this.fileData.total_deletes}   Modify=${this.fileData.total_modifies}            │`,
      `│ Move=${this.fileData.total_moves}   Restore=${this.fileData.total_restores}  Total=${this.fileData.total_events}             │`,
      '│                                            │',
      '│ Metric Statistics                          │',
      '│       Byte  Line Block  Date               │',
      `│ First  ${this.fileData.first_size}   ${this.fileData.first_lines}   ${this.fileData.first_blocks}  ${this.formatTimestamp(this.fileData.first_event_timestamp)}  │`,
      `│ Last   ${this.fileData.last_size}   ${this.fileData.last_lines}   ${this.fileData.last_blocks}  ${this.formatTimestamp(this.fileData.last_event_timestamp)}  │`,
      `│ Max    ${this.fileData.max_size}   ${this.fileData.max_lines}   ${this.fileData.max_blocks}         -          │`,
      `│ Avg    ${Math.round(this.fileData.total_size/this.fileData.total_events)}   ${Math.round(this.fileData.total_lines/this.fileData.total_events)}   ${Math.round(this.fileData.total_blocks/this.fileData.total_events)}         -          │`,
      '├─ (FUNC-403 境界) ───────────────────────────┤'
    ].join('\n');
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
  }
}
```

**実装要件**:
- ✅ **データ取得**: aggregatesテーブルからの統計データ取得
- ✅ **表示フォーマット**: 80文字幅レイアウト準拠
- ✅ **色適用**: FUNC-207テーマ統合（yellow/white/gray）

### **FUNC-403: History Display Module**
```javascript
/**
 * History Display Renderer
 * Displays event history in lower section with navigation
 */
class HistoryDisplayRenderer {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
    this.historyData = [];
    this.focusIndex = 0;
    this.currentPage = 0;
    this.entriesPerPage = 20;
  }

  async initialize(selectedFile) {
    const fileId = await this.databaseManager.ensureFile(selectedFile);
    await this.loadHistory(fileId);
  }

  async loadHistory(fileId) {
    // SQL from FUNC-403 specification
    const query = `
      SELECT 
        e.timestamp,
        et.name as event_type,
        m.line_count,
        m.block_count,
        e.id
      FROM events e
      JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN measurements m ON e.id = m.event_id
      WHERE e.file_id = ?
      ORDER BY e.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const offset = this.currentPage * this.entriesPerPage;
    this.historyData = await this.databaseManager.all(query, [fileId, this.entriesPerPage, offset]);
  }

  async navigate(direction) {
    if (direction === 'ArrowUp') {
      this.focusIndex = Math.max(this.focusIndex - 1, 0);
    } else if (direction === 'ArrowDown') {
      this.focusIndex = Math.min(this.focusIndex + 1, this.historyData.length - 1);
    }
  }

  render() {
    const lines = [
      '├─ Event History (Latest 50) ────────────┤',
      '│ Event Timestamp     Event       Lines Blocks │'
    ];

    this.historyData.forEach((entry, index) => {
      const timestamp = this.formatTimestamp(entry.timestamp);
      const eventType = entry.event_type.padEnd(8);
      const lines_str = String(entry.line_count || '').padStart(6);
      const blocks_str = String(entry.block_count || '').padStart(6);
      
      const line = `│ ${timestamp} ${eventType} ${lines_str} ${blocks_str} │`;
      
      // Apply focus highlighting
      if (index === this.focusIndex) {
        lines.push(`│ ${this.applyFocusStyle(line.slice(2, -2))} │`);
      } else {
        lines.push(line);
      }
    });

    lines.push('│                                           │');
    lines.push(`│ [↑↓] Move  [ESC] Back  [q] Quit  [${this.focusIndex + 1}/${this.historyData.length}]  │`);
    lines.push('└───────────────────────────────────────────┘');

    return lines.join('\n');
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
  }

  applyFocusStyle(text) {
    // Apply focus background (white bg, black text)
    return `\x1b[47m\x1b[30m${text}\x1b[0m`;
  }
}
```

**実装要件**:
- ✅ **履歴取得**: eventsテーブルからの時系列データ取得
- ✅ **ナビゲーション**: フォーカス移動・境界処理
- ✅ **ページング**: 20件/ページでの効率的表示
- ✅ **フォーカス表示**: 選択行の背景色変更

## 🔧 **統合実装要件**

### **FUNC-300 Key Input Manager統合**
```javascript
// Key distribution logic
const keyHandlers = {
  'waiting': {
    'ArrowUp': () => selectionManager.enterSelectionMode(),
    'ArrowDown': () => selectionManager.enterSelectionMode()
  },
  'selecting': {
    'ArrowUp': () => selectionManager.navigate('up'),
    'ArrowDown': () => selectionManager.navigate('down'),
    'Enter': () => detailController.activateDetailMode(selectionManager.confirmSelection()),
    'Escape': () => selectionManager.exitSelectionMode()
  },
  'detail': {
    'ArrowUp': () => detailController.handleKeyInput('ArrowUp'),
    'ArrowDown': () => detailController.handleKeyInput('ArrowDown'),
    'Escape': () => detailController.handleKeyInput('Escape'),
    'q': () => detailController.handleKeyInput('q')
  }
};
```

### **Performance Requirements**
- ✅ **応答時間**: キー入力→画面更新 100ms以内
- ✅ **メモリ使用**: 通常使用時 50MB以内
- ✅ **CPU使用**: アイドル時 5%以内、操作時 20%以内
- ✅ **大量データ**: 1000+ファイル、10000+イベントでの効率動作

## 📊 **Implementation Strategy**

### **Phase 1: Foundation (4時間)**
1. **FUNC-300統合**: キー入力管理システム実装
2. **基本UI**: 選択・表示・ナビゲーション基盤
3. **状態管理**: モード遷移・状態追跡

### **Phase 2: Core Functions (6時間)**
1. **FUNC-400**: 選択モード完全実装
2. **FUNC-401**: 詳細モード制御実装
3. **基本統合**: 選択→詳細遷移実現

### **Phase 3: Display Modules (4時間)**
1. **FUNC-402**: 集計表示モジュール実装
2. **FUNC-403**: 履歴表示モジュール実装
3. **レイアウト**: 上段・下段統合表示

### **Phase 4: Integration & Testing (2時間)**
1. **統合テスト**: 4機能連携動作確認
2. **Performance調整**: 応答時間・メモリ最適化
3. **品質確認**: 28テスト実行・修正

## 📋 **Success Criteria**

### **Functional Success**
- ✅ `npm test test/integration/interactive-features-validation.test.js` → 28/28成功
- ✅ 実環境での選択・詳細・ナビゲーション完全動作
- ✅ キー入力応答性・視覚フィードバック適切動作

### **Performance Success**
- ✅ 応答時間100ms以内達成
- ✅ メモリ使用量50MB以内維持
- ✅ 大量データでの安定動作

### **Integration Success**
- ✅ 既存FUNC-202表示との適切な連携
- ✅ FUNC-207色テーマとの統合動作
- ✅ 全モード遷移の滑らかな動作

## ⚠️ **Critical Dependencies**

### **Required APIs**
- **DatabaseManager**: `ensureFile()`, `getAggregateStats()`, `all()` (HO-20250628-002と連携)
- **FUNC-300**: キー入力管理システム（存在確認要）
- **FUNC-207**: 色テーマシステム（統合要）

### **Implementation Files**
- `src/ui/interactive/` - 新規ディレクトリ作成推奨
- `src/ui/interactive/SelectionManager.js`
- `src/ui/interactive/DetailInspectionController.js`
- `src/ui/interactive/AggregateDisplayRenderer.js`
- `src/ui/interactive/HistoryDisplayRenderer.js`

---

**Priority**: HIGH - v0.2.3.0主要機能実装  
**Impact**: インタラクティブ機能による大幅なユーザビリティ向上  
**Quality**: 28テスト事前品質保証済み・実装後即座品質確認可能