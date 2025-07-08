# HO-20250707-002 Filter Integration Implementation

**作成日**: 2025年7月7日 23:10  
**送信者**: Architect  
**受信者**: Runner (runner-07-04-search-db-refactor)  
**優先度**: High  
**カテゴリ**: 仕様実装・フィルタ統合  

---

## 📊 背景・目的

conversation-20250707.logでの詳細議論を踏まえ、**FilterState管理によるUI統合フィルタ機能**の実装を依頼します。集合論的アプローチによる一貫したフィルタ動作を実現し、現在の処理順序問題を根本解決します。

## 🎯 実装対象FUNC仕様

### 主要仕様
- **FUNC-301**: Filter State Management（新規実装）
- **FUNC-203**: Event Type Filtering（既存修正）
- **FUNC-208**: UI Filter Integration（新規実装）
- **FUNC-202**: CLI Display Integration（フィルタ連携修正）

### 参照仕様
- **FUNC-300**: Key Input Manager（キー入力連携）
- **FUNC-206**: Progressive Loading（動的データ読み込み）

## 📋 実装要件詳細

### 1. **FilterState管理システム実装（FUNC-301準拠）**

**目標**: 操作履歴による集合論的フィルタ状態管理

```typescript
interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];  // ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore']
  keywordFilter: string;
}

class FilterStateManager {
  private state: FilterState;
  private vanillaTable: EventData[];
  
  // 操作履歴の適用
  applyFilters(newEvents?: EventData[]): EventData[] {
    // 1. vanilla tableを更新（新規イベント追加）
    // 2. 現在のFilterStateを適用
    // 3. 結果セットを返す
  }
  
  // 状態更新
  updateMode(mode: 'all' | 'unique'): void;
  toggleEventFilter(eventType: string): void;
  updateKeywordFilter(keyword: string): void;
  
  // 状態リセット
  resetFilters(): void; // ESC時の全クリア
}
```

**重要ポイント**:
- vanilla tableに新規イベント追加 → 操作履歴を再適用 → 差分を画面反映
- メモリベースの状態管理、DBクエリの最小化
- 一定件数超過時の古いイベント削除

### 2. **処理順序の確定実装（重要）**

**conversation-20250707.logで確定した正しい順序**:

```
Pattern: Unique First → Filter Check
1. 各ファイルの最新イベントを特定（unique処理）
2. その最新イベントがevent filterの条件を満たすかチェック
3. 条件を満たすファイルのみ表示
```

**具体例**:
```
ファイルA: Create → Modify → Delete (最新)
event filter: Delete除外
結果: ファイルA全体が非表示（CreateもModifyも表示されない）
```

**実装上の注意**:
- 現在の実装（event filter → unique）は**間違い**
- 修正必要：unique処理でファイル毎の最新特定 → filter条件チェック

### 3. **動的データ読み込みトリガー実装**

**トリガー条件**（以下のいずれかを満たし、かつ"end of data"が表示されていない場合）:
1. **画面内rowが不足**: 表示可能行数に対してrowが不足している
2. **下端選択**: 選択rowがtable最下部になった
3. **100msポーリング**: 定期的なDB更新確認

**ロード戦略**:
- 初回100件取得
- 最大1000件まで段階的取得
- vanilla table容量管理（一定件数超過時は古い順に削除）

**FUNC-301との連携フロー**:
```typescript
onDataLoad(newEvents: EventData[]) {
  // 1. FUNC-301のvanilla tableに統合
  filterStateManager.updateVanillaTable(newEvents);
  
  // 2. 操作履歴を再適用
  const filteredData = filterStateManager.applyFilters();
  
  // 3. 画面に反映
  displayManager.updateDisplay(filteredData);
  
  // 4. 容量管理
  if (filterStateManager.getVanillaTableSize() > MAX_EVENTS) {
    filterStateManager.optimizeVanillaTable();
  }
}
```

### 4. **キーワード検索のDB検索実装**

**仕様**:
- **実行タイミング**: リアルタイム更新ではない、**[Enter]押下時**にDB検索を実行
- **データ管理**: 検索結果はvanilla tableの集合に統合
- **容量管理**: 一定件数超過時は古い順に削除

**実装フロー**:
```typescript
onKeywordSearchEnter(keyword: string) {
  // 1. DB検索実行
  const searchResults = await database.searchByKeyword(keyword);
  
  // 2. vanilla tableに統合
  filterStateManager.addToVanillaTable(searchResults);
  
  // 3. keyword filterをFilterStateに設定
  filterStateManager.updateKeywordFilter(keyword);
  
  // 4. フィルタ再適用・画面更新
  const filteredData = filterStateManager.applyFilters();
  displayManager.updateDisplay(filteredData);
}
```

### 5. **ESC操作の実装**

**2つの異なる動作**:

#### **編集モード中の[ESC]**:
- event filter/keyword filter入力モードで[ESC]
- **編集結果を破棄**し、元の状態に戻す

#### **Normal Mode中の[ESC]**:
- **全てのeditをclear**
- 初期化状態: **all mode + no filters**

```typescript
onEscapeKey(currentMode: string) {
  if (currentMode === 'editing') {
    // 編集破棄：前の状態に戻す
    filterStateManager.restorePreviousState();
  } else {
    // 全クリア：初期状態に戻す
    filterStateManager.resetFilters(); // all mode + no filters
  }
  
  // 画面更新
  const filteredData = filterStateManager.applyFilters();
  displayManager.updateDisplay(filteredData);
}
```

### 6. **適用タイミングの実装**

**基本原則**: リアルタイム更新  
**例外**: keyword searchのDB検索のみ[Enter]時

```typescript
// event filterの即座反映
onEventFilterToggle(eventType: string) {
  filterStateManager.toggleEventFilter(eventType);
  const filteredData = filterStateManager.applyFilters();
  displayManager.updateDisplay(filteredData); // 即座更新
}

// all/unique切り替えの即座反映
onModeToggle(mode: 'all' | 'unique') {
  filterStateManager.updateMode(mode);
  const filteredData = filterStateManager.applyFilters();
  displayManager.updateDisplay(filteredData); // 即座更新
}
```

### 7. **状態の可視化実装**

**Display Mode可視化**:
- all/unique: **選択中を赤色**などで表示

**Event Filter**:
- 現在の表示内容で確認可能（専用表示不要）

**Keyword Filter**:
- 最上部に表示済み（既存設計）

## 🔧 技術実装指針

### **アーキテクチャ設計**
```
[ユーザー操作]
    ↓
[FUNC-300: Key Input Manager]
    ↓
[FUNC-301: Filter State Manager] ← 中核
    ↓
[FUNC-202: CLI Display Integration]
    ↓
[画面表示]
```

### **データフロー**
```
[DB New Events] → [vanilla table] → [FilterState.applyFilters()] → [Display Set] → [CLI Rendering]
                        ↑
[Keyword DB Search] ──┘
```

### **ファイル構成（推奨）**
```
modules/cli/src/
├── filters/
│   ├── FilterStateManager.ts      # FUNC-301実装
│   ├── EventTypeFilter.ts         # FUNC-203実装
│   ├── KeywordFilter.ts           # keyword検索機能
│   └── UIFilterIntegration.ts     # FUNC-208実装
├── display/
│   └── DisplayManager.ts          # FUNC-202修正
└── input/
    └── KeyInputManager.ts         # FUNC-300連携
```

## 📊 期待される成果

### **機能的成果**
1. **一貫したフィルタ動作**: 削除されたファイルの適切な扱い
2. **リアルタイム応答性**: 操作の即座反映（keyword searchを除く）
3. **効率的データ管理**: vanilla table + 操作履歴による最適化
4. **直感的操作**: ESC操作による段階的リセット

### **技術的成果**
1. **処理順序問題の根本解決**: unique first → filter check パターン
2. **状態管理の一元化**: FilterStateによる統合管理
3. **拡張可能アーキテクチャ**: 新しいフィルタの追加容易性
4. **パフォーマンス最適化**: DBクエリ頻度の最小化

## 🧪 テスト要件

### **処理順序テスト**（最重要）
```typescript
describe('Filter Processing Order', () => {
  it('should exclude deleted files when delete events are filtered', async () => {
    // データ: ファイルA (Create → Modify → Delete)
    // 条件: Delete除外
    // 期待: ファイルA全体が非表示
    
    const result = await filterStateManager.applyFilters();
    expect(result.find(r => r.file_id === 'A')).toBeUndefined();
  });
});
```

### **状態管理テスト**
- FilterState更新の正確性
- 操作履歴の再適用
- vanilla table容量管理

### **統合テスト**
- FUNC-300との連携
- 動的データ読み込み
- ESC操作の動作

## 📝 参照文書

### **仕様書**
- `documents/visions/functions/FUNC-301-filter-state-management.md`
- `documents/visions/functions/FUNC-203-event-type-filtering.md`
- `documents/visions/functions/FUNC-208-ui-filter-integration.md`
- `documents/visions/functions/FUNC-202-cli-display-integration.md`

### **設計文書**
- `documents/visions/blueprints/BP-M2-filter-daemon-cli-architecture.md`
- `documents/visions/blueprints/BP-1-func-dependency-diagram.md`

### **重要ログ**
- `passage/externals/inputs/logs/conversation-20250707.log` ← **必読**

## ⚠️ 重要な注意事項

### **絶対に守るべき仕様**
1. **処理順序**: unique処理 → event filter順序の厳守
2. **削除ファイル扱い**: 最新がfilter対象外なら全体非表示
3. **適用タイミング**: keyword search以外はリアルタイム更新
4. **ESC動作**: 編集破棄 vs 全クリアの使い分け

### **パフォーマンス考慮**
- vanilla tableの効率的管理
- 操作履歴の軽量な再適用
- 不要なDBクエリの回避

### **拡張性確保**
- 新しいフィルタタイプの追加容易性
- FilterStateの拡張可能性
- テスタビリティの確保

---

**実装完了の条件**: 上記全要件の実装 + テスト通過 + conversation-20250707.logの仕様完全準拠

**質問・疑問点**: 不明点があればArchitectへ即座にfeedback