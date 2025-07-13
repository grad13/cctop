# FUNC-301: フィルター状態管理機能

**作成日**: 2025年7月7日  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.1.0.0  
**関連仕様**: FUNC-202, FUNC-203, FUNC-208, FUNC-300  

## 📊 機能概要

UI表示における3つのフィルター（unique/all、event filter、keyword filter）の状態管理を行う機能。集合論的アプローチによる操作履歴の管理と、動的データ更新への対応を提供する。

**ユーザー価値**: 
- 一貫したフィルター動作の保証
- 操作履歴による状態の可視化・復元
- リアルタイム更新における状態の継続性

## 🎯 機能境界

### ✅ **実行する**
- フィルター状態（FilterState）の管理
- 操作履歴の保持・適用
- vanilla tableへの操作結果の反映
- 状態の初期化・リセット機能
- 集合論的アプローチによる処理順序制御

### ❌ **実行しない**
- UIコンポーネントの描画（FUNC-202の責務）
- データベースアクセス（FUNC-000の責務）
- キー入力の処理（FUNC-300の責務）

## 📋 必要な仕様

### **FilterState インターフェース**

```typescript
interface FilterState {
  mode: 'all' | 'unique';           // 表示モード（排他的）
  eventFilters: string[];           // イベントタイプ絞り込み（累積的）
  keywordFilter: string;            // キーワード絞り込み（累積的）
  
  // 内部管理用
  vanillaTable: EventRecord[];      // 現在の集合
  lastAppliedAt: Date;              // 最終適用時刻
  operationHistory: FilterOperation[]; // 操作履歴
}

interface FilterOperation {
  type: 'mode' | 'event' | 'keyword';
  operation: 'set' | 'add' | 'remove' | 'clear';
  value: any;
  appliedAt: Date;
}
```

### **集合論的処理フロー**

```
1. vanilla table (DB) → 操作履歴をapply → 表示集合
2. DB更新検知 → 操作履歴を再apply → 差分を画面反映
```

#### **mode別の動作仕様**

**all mode**:
```
全イベント → event filter → keyword filter → 表示
```

**unique mode**:
```
1. 各ファイルの最新イベントを特定（unique処理）
2. その最新イベントがevent filterの条件を満たすかチェック
3. 条件を満たすファイルのみをkeyword filter
4. 最終結果を表示
```

### **処理順序の重要原則**

**unique mode + event filter** の正しい動作:
- ファイルAの最新イベントがDeleteで、event filterでDeleteが除外されている場合
- ファイルAは一切表示されない（CreateやModifyも表示されない）
- 理由: 最新イベント（Delete）がフィルター対象外のため

### **状態管理の詳細仕様**

#### **操作の適用タイミング**
- **リアルタイム更新**: mode切替、event filter切替
- **明示的実行**: keyword filterのDB検索（Enter押下時）
- **自動適用**: vanilla tableの更新（100msポーリング）

#### **vanilla table管理**
- **統合方式**: DB検索結果もvanilla tableに統合
- **容量管理**: 一定件数超過時は古い順に削除
- **更新方式**: 新規追加分のみ処理（全体再計算は避ける）

#### **操作履歴の管理**
```typescript
// 操作例
const operations = [
  { type: 'mode', operation: 'set', value: 'unique', appliedAt: Date },
  { type: 'event', operation: 'add', value: 'Create', appliedAt: Date },
  { type: 'event', operation: 'add', value: 'Modify', appliedAt: Date },
  { type: 'keyword', operation: 'set', value: 'src/', appliedAt: Date }
];
```

### **状態の初期化**

#### **vanilla状態の定義**
```typescript
const VANILLA_STATE: FilterState = {
  mode: 'all',
  eventFilters: [], // 全イベントタイプ許可
  keywordFilter: '',
  vanillaTable: [],
  lastAppliedAt: new Date(),
  operationHistory: []
};
```

#### **初期化のトリガー**
- **normal mode + [Esc]**: 全フィルターをvanilla状態にリセット
- **編集モード + [Esc]**: 編集内容を破棄し、前の状態に復元

## 🔧 実装ガイドライン

### **状態管理クラス**

```typescript
class FilterStateManager {
  private state: FilterState;
  
  constructor() {
    this.state = this.createVanillaState();
  }
  
  // 状態更新
  updateMode(mode: 'all' | 'unique'): void {}
  addEventFilter(eventType: string): void {}
  removeEventFilter(eventType: string): void {}
  setKeywordFilter(keyword: string): void {}
  
  // 操作履歴管理
  applyOperationHistory(): EventRecord[] {}
  addOperation(operation: FilterOperation): void {}
  
  // vanilla table管理
  updateVanillaTable(newEvents: EventRecord[]): void {}
  optimizeVanillaTable(): void {} // 古いデータ削除
  
  // 状態制御
  resetToVanilla(): void {}
  restorePreviousState(): void {}
  
  // 集合生成
  generateDisplaySet(): EventRecord[] {}
}
```

### **処理順序の実装**

```typescript
generateDisplaySet(): EventRecord[] {
  let result = [...this.state.vanillaTable];
  
  if (this.state.mode === 'unique') {
    // 1. 各ファイルの最新イベントを特定
    const latestEvents = this.getLatestEventPerFile(result);
    
    // 2. event filterチェック
    result = latestEvents.filter(event => 
      this.state.eventFilters.length === 0 || 
      this.state.eventFilters.includes(event.eventType)
    );
  } else {
    // all mode: event filter → keyword filter
    result = result.filter(event => 
      this.state.eventFilters.length === 0 || 
      this.state.eventFilters.includes(event.eventType)
    );
  }
  
  // 3. keyword filter適用
  if (this.state.keywordFilter) {
    result = result.filter(event => 
      event.fileName.includes(this.state.keywordFilter) ||
      event.directory.includes(this.state.keywordFilter)
    );
  }
  
  return result;
}
```

### **FUNC-202との連携**

```typescript
// 表示更新の通知
interface FilterStateEvents {
  onStateChange: (newDisplaySet: EventRecord[]) => void;
  onModeChange: (mode: 'all' | 'unique') => void;
  onFilterChange: (activeFilters: string[]) => void;
}
```

## 🧪 テスト要件

### **状態管理テスト**
- 操作履歴の正確な記録・適用
- vanilla状態への正確なリセット
- 前の状態への正確な復元

### **集合論的処理テスト**
- unique mode + event filterの正確な処理順序
- 削除されたファイルの適切な除外
- mode切替時の結果の一貫性

### **動的更新テスト**
- vanilla table更新時の操作履歴再適用
- 新規データの適切な統合
- 古いデータの適切な削除

## 💡 使用シナリオ

### **基本操作フロー**
```
1. ユーザーがall/unique切替 → mode状態更新 → リアルタイム表示更新
2. ユーザーがevent filter切替 → filter状態更新 → リアルタイム表示更新
3. ユーザーがkeyword入力 → [Enter] → DB検索 → vanilla table更新 → 表示更新
4. ユーザーが[Esc] → 状態リセット → vanilla状態に復元
```

### **エラー処理**
```
1. 不正な状態遷移 → 前の有効状態に復元
2. DB検索エラー → エラー表示、状態は維持
3. メモリ不足 → vanilla table最適化実行
```

## 🎯 成功指標

1. **状態の一貫性**: フィルター操作の結果が期待通りの表示を生成
2. **操作の可逆性**: 全ての操作が適切に記録され、復元可能
3. **パフォーマンス**: 状態更新が表示に与える遅延が100ms以内
4. **データ整合性**: vanilla table更新時の表示の連続性

## 🔗 関連仕様

- **表示統合**: [FUNC-202: View表示統合](./FUNC-202-view-display-integration.md)
- **イベントフィルタ**: [FUNC-203: イベントタイプフィルタリング](./FUNC-203-event-type-filtering.md)
- **UIフィルタ統合**: [FUNC-208: UI統合フィルタ](./FUNC-208-ui-filter-integration.md)
- **キー入力管理**: [FUNC-300: キー入力管理システム](./FUNC-300-key-input-manager.md)

---

**核心価値**: 集合論的アプローチによる一貫したフィルター動作と、動的データ更新における状態の継続性を保証する