# UI状態管理簡素化計画

**計画ID**: PLAN-20250709-036  
**作成日**: 2025-07-09  
**作成者**: Builder Agent  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🔧 開発プロセス改善  
**優先度**: 🔴 Critical（バグ多発のため）

## 📋 概要

cctop CLIのUI状態管理が過度に複雑化し、バグが頻発している。本計画では、シンプルな要件（3つのフィルタのAND条件）に対して適切な実装に簡素化する。

## 🎯 目的

1. **バグの根絶**: 複雑な状態管理に起因するバグを解消
2. **保守性向上**: シンプルで理解しやすいコードベース
3. **性能維持**: 必要十分な性能を保ちつつ簡素化

## 📊 現状分析

### 本来の要件（FUNC-202仕様）
- **Display mode**: all / unique の選択
- **Event type filter**: 6種類のイベントタイプのON/OFF
- **Keyword filter**: キーワードによる絞り込み（複数キーワードAND検索）
- **表示状態**: waiting/filtering/searching/paused/detail の5状態
- **操作**: ESC（編集破棄）とEnter（編集保持）、Pause/Resume機能

### 現在の問題点

1. **searchBaseEvents**: search mode専用の検索ベースデータ
   - モード切り替え時の不整合の原因
   - unique→all切り替え時にデータが更新されない

2. **isSearchApplied**: ローカル検索/DB検索の切り替えフラグ
   - 2つの検索方式が混在し、条件分岐が複雑

3. **過度な最適化**:
   - メモリキャッシュ（all→unique切り替え時）
   - LRU検索キャッシュ
   - これらが副作用を生んでいる

4. **複雑な状態保存/復元**:
   - savedEventFilters, savedSearchText
   - restorePreviousState()の複雑な条件分岐

## 🏗️ 提案アーキテクチャ

### 基本方針: Keep It Simple

```typescript
// 状態の定義（interface）
interface FilterCondition {
  // 表示モード
  displayMode: 'all' | 'unique';
  
  // イベントタイプフィルタ（Set廃止、フラグクラス化）
  eventTypeFilters: EventTypeFilterFlags;
  
  // 検索パターン（正規表現）
  searchPattern: string;  // 例: "test.*file", "\\.(ts|js)$"
}

// 状態管理クラス（差分フィルタリングとカスケード処理）
class StateManager {
  totalFilterCondition: FilterCondition;      // ルートからの累積条件
  additionalFilterCondition: FilterCondition; // このノードで追加された条件
  previousManager?: StateManager;             // DAGの親ノード
  mode: 'stream_live' | 'event_type_filter' | 'keyword_filter' | 'stream_paused' | 'detail' = 'stream_live';
  events: EventRow[] = [];        // 表示用イベント（時系列順）
  pendingEvents: EventRow[] = []; // 遅延処理用イベント（時系列順）
  
  constructor(additionalFilter: FilterCondition, prevManager?: StateManager) {
    this.additionalFilterCondition = additionalFilter;
    this.previousManager = prevManager;
    // totalFilterConditionは親の累積＋自分の追加分
    this.totalFilterCondition = prevManager 
      ? this.mergeFilterConditions(prevManager.totalFilterCondition, additionalFilter)
      : additionalFilter;
  }
 
  
  // DBまたは親ノードからイベントを取得（再帰的カスケード）
  getEventsFromDB(query: any): EventRow[] {
    let passedEvents: EventRow[];
    
    if (this.previousManager === null) { 
      // ルートノード：DBから直接取得
      passedEvents = this.db.getEvents(query);
    } else {
      // 子ノード：親から取得して追加フィルタを適用
      passedEvents = [];
      const parentEvents = this.previousManager.getEventsFromDB(query);
      parentEvents.forEach(event => {
        if (this.matchesAdditionalFilters(event)) {
          passedEvents.push(event);
        }
      });
    }
    
    // pendingEventsに保存（重複排除してマージソート）
    this.pendingEvents = this.mergeSort(this.pendingEvents, passedEvents);
    
    // 非同期でeventsに移動
    this.scheduleEventProcessing();
    
    return passedEvents;
  }
  
  // 追加条件のみをチェック（差分フィルタリング）
  private matchesAdditionalFilters(event: EventRow): boolean {
    // displayMode: 親がall、追加でuniqueになった場合のみ重複チェック
    if (this.previousManager && 
        this.previousManager.totalFilterCondition.displayMode === 'all' && 
        this.additionalFilterCondition.displayMode === 'unique') {
      if (this.isDuplicate(event)) return false;
    }
    
    // event typeフィルタ: Phase 1では全チェック（差分判定が複雑なため）
    if (!this.matchesEventTypeFilter(event)) {
      return false;
    }
    
    // searchPattern: 追加された正規表現パターンのみチェック
    if (this.additionalFilterCondition.searchPattern) {
      try {
        const regex = new RegExp(this.additionalFilterCondition.searchPattern);
        if (!regex.test(event.file_path)) {
          return false;
        }
      } catch (e) {
        // 無効な正規表現の場合はマッチしないとして扱う
        return false;
      }
    }
    
    return true;
  }
  
  // 重複チェック（unique mode用）
  private isDuplicate(event: EventRow): boolean {
    return this.events.some(e => 
      e.file_path === event.file_path && 
      e.event_type === event.event_type
    );
  }
  
  // イベントタイプフィルタのマッチング
  private matchesEventTypeFilter(event: EventRow): boolean {
    const filters = this.totalFilterCondition.eventTypeFilters;
    switch(event.event_type) {
      case 'find': return filters.isShowFind;
      case 'create': return filters.isShowCreate;
      case 'modify': return filters.isShowModify;
      case 'delete': return filters.isShowDelete;
      case 'move': return filters.isShowMove;
      case 'restore': return filters.isShowRestore;
      default: return false;
    }
  }
  
  // 検索パターンのマッチング（正規表現）
  private matchesSearchPattern(event: EventRow): boolean {
    try {
      const regex = new RegExp(this.totalFilterCondition.searchPattern);
      return regex.test(event.file_path);
    } catch (e) {
      // 無効な正規表現の場合はマッチしないとして扱う
      return false;
    }
  }
  
  // 時系列順を保持しながらマージ（重複排除付き）
  private mergeSort(list1: EventRow[], list2: EventRow[]): EventRow[] {
    const result: EventRow[] = [];
    let i = 0, j = 0;
    
    while (i < list1.length && j < list2.length) {
      if (list1[i].timestamp < list2[j].timestamp) {
        result.push(list1[i++]);
      } else if (list1[i].timestamp > list2[j].timestamp) {
        result.push(list2[j++]);
      } else {
        // 同一タイムスタンプの場合、重複チェック
        if (list1[i].id === list2[j].id) {
          result.push(list1[i++]);
          j++; // 重複をスキップ
        } else {
          result.push(list1[i++]);
          result.push(list2[j++]);
        }
      }
    }
    
    // 残りを追加
    while (i < list1.length) result.push(list1[i++]);
    while (j < list2.length) result.push(list2[j++]);
    
    return result;
  }
  
  // pendingEventsをeventsに非同期で移動
  private scheduleEventProcessing(): void {
    setTimeout(() => {
      this.events = this.mergeSort(this.events, this.pendingEvents);
      this.pendingEvents = [];
    }, 0);
  }
  
  getFilter(): FilterCondition {
    return this.totalFilterCondition;
  }
  
  // より厳しいフィルタでclone（DAGの子ノード作成）
  tightClone(additionalFilter: FilterCondition): StateManager | null {
    // additionalFilterがtotalFilterConditionと整合性があるかチェック
    if (!this.isConsistentFilter(additionalFilter)) {
      return null;
    }
    
    // 新しいStateManagerを作成（previousManagerは現在のインスタンス）
    const cloned = new StateManager(additionalFilter, this);
    cloned.mode = this.mode;
    
    // pendingEventsがあれば処理（lazyに子ノードへ伝播）
    if (this.pendingEvents.length > 0) {
      this.pendingEvents.forEach(event => {
        if (cloned.matchesTightFilters(event)) {
          cloned.pendingEvents.push(event);
        }
      });
      cloned.scheduleEventProcessing();
    }
    
    return cloned;
  }
  
  // additionalFilterがtotalFilterConditionと整合性があるかチェック
  private isConsistentFilter(additionalFilter: FilterCondition): boolean {
    const merged = this.mergeFilterConditions(this.totalFilterCondition, additionalFilter);
    
    // displayMode: 追加でuniqueになるのはOK、allになるのはNG
    if (this.totalFilterCondition.displayMode === 'unique' && merged.displayMode === 'all') {
      return false;
    }
    
    // eventTypeFilters: 親でfalseのものは子でもfalse必須
    const parentFlags = this.totalFilterCondition.eventTypeFilters;
    const mergedFlags = merged.eventTypeFilters;
    if (!parentFlags.isShowFind && mergedFlags.isShowFind) return false;
    if (!parentFlags.isShowCreate && mergedFlags.isShowCreate) return false;
    if (!parentFlags.isShowModify && mergedFlags.isShowModify) return false;
    if (!parentFlags.isShowDelete && mergedFlags.isShowDelete) return false;
    if (!parentFlags.isShowMove && mergedFlags.isShowMove) return false;
    if (!parentFlags.isShowRestore && mergedFlags.isShowRestore) return false;
    
    // searchPattern: パターンの追加は制限なし（正規表現の組み合わせは複雑なため）
    // TODO: 将来的に正規表現の整合性チェックを追加
    
    return true;
  }
  
  // フィルタ条件のマージ
  private mergeFilterConditions(base: FilterCondition, additional: FilterCondition): FilterCondition {
    return {
      displayMode: additional.displayMode === 'unique' ? 'unique' : base.displayMode,
      eventTypeFilters: {
        isShowFind: base.eventTypeFilters.isShowFind && additional.eventTypeFilters.isShowFind,
        isShowCreate: base.eventTypeFilters.isShowCreate && additional.eventTypeFilters.isShowCreate,
        isShowModify: base.eventTypeFilters.isShowModify && additional.eventTypeFilters.isShowModify,
        isShowDelete: base.eventTypeFilters.isShowDelete && additional.eventTypeFilters.isShowDelete,
        isShowMove: base.eventTypeFilters.isShowMove && additional.eventTypeFilters.isShowMove,
        isShowRestore: base.eventTypeFilters.isShowRestore && additional.eventTypeFilters.isShowRestore,
      },
      searchPattern: additional.searchPattern || base.searchPattern
      // 正規表現の組み合わせは複雑なので、単純に新しいものを優先
    };
  }
}
```

### EventTypeFilterFlagsクラス

Set<EventType>を置き換える、より直感的なフラグクラス：

```typescript
class EventTypeFilterFlags {
  isShowFind: boolean = true;
  isShowCreate: boolean = true;
  isShowModify: boolean = true;
  isShowDelete: boolean = true;
  isShowMove: boolean = true;
  isShowRestore: boolean = true;
  
  // フラグ反転メソッド
  flipFindFlag() { this.isShowFind = !this.isShowFind; }
  flipCreateFlag() { this.isShowCreate = !this.isShowCreate; }
  flipModifyFlag() { this.isShowModify = !this.isShowModify; }
  flipDeleteFlag() { this.isShowDelete = !this.isShowDelete; }
  flipMoveFlag() { this.isShowMove = !this.isShowMove; }
  flipRestoreFlag() { this.isShowRestore = !this.isShowRestore; }
  
  // 全リセット
  resetAll() {
    this.isShowFind = true;
    this.isShowCreate = true;
    this.isShowModify = true;
    this.isShowDelete = true;
    this.isShowMove = true;
    this.isShowRestore = true;
  }
  
  // コピー（編集用）
  clone(): EventTypeFilterFlags {
    const copy = new EventTypeFilterFlags();
    copy.isShowFind = this.isShowFind;
    copy.isShowCreate = this.isShowCreate;
    copy.isShowModify = this.isShowModify;
    copy.isShowDelete = this.isShowDelete;
    copy.isShowMove = this.isShowMove;
    copy.isShowRestore = this.isShowRestore;
    return copy;
  }
}
```

### Event Pool 概念

#### 基本定義
**Event Pool** = StateManager.events
- フィルタ適用後のイベントをStateManager内に保持
- ストリーム処理で動的に追加（StateManager.feedEvent()）
- フィルタ条件変更時は新しいStateManagerインスタンスを作成

### フィルタ構造の概念モデル（DAG: Directed Acyclic Graph）

#### 木構造（正確にはDAG）としての状態管理
```
root (all表示, フィルタなし)
├── A (event type filter適用)
│   └── AB (event type + keyword filter)
└── B (keyword filter適用)
    └── AB (keyword + event type filter)
```

- **ノード**: FilterCondition + Event Pool の組み合わせ
- **ルートノード**: all表示 & フィルタなし
- **エッジ**: フィルタの追加（親→子はsubset関係）
- **ESC操作**: 常に親ノード（previousManager）に戻る
- **同一ノードへの複数経路**: A→AB も B→AB も同じ状態

#### StateManager.clone()の役割
- 現在のノードから子ノードへの遷移
- 子ノードは親ノードのsubset（より厳しいフィルタ）のみ
- previousManagerに親ノード全体（StateManager）を保持
- ESC時は親ノードのeventsも含めて完全に復元可能

### データフロー

#### 基本フロー（カスケード処理）
```
DB/Stream → root.getEventsFromDB() → 子ノード → 孫ノード → ... → currentNode
                                    ↓         ↓                    ↓
                              pendingEvents  pendingEvents    pendingEvents
                                    ↓         ↓                    ↓
                              (async)events  (async)events    (async)events
```

#### 主要な特徴
1. **再帰的カスケード**: DBアクセスは常にrootから開始、各ノードで差分フィルタリング
2. **遅延評価**: currentNodeまでは即座に処理、それ以降はpendingEventsとして保持
3. **差分フィルタリング**: 
   - displayMode/keyword: additionalFilterConditionのみチェック（効率的）
   - event type: Phase 1では全チェック（差分判定が複雑なため）
4. **時系列保持**: mergeSortで順序を維持、重複も排除

#### メモリ管理方針
優先順位に基づく削除戦略：
1. 古いイベントから削除（LRU的）
2. 表示範囲から大きく離れたイベントを優先削除
3. root～親ノードは最後まで保持（ESCで戻れるように）

## 📋 実装計画

### Phase 1: 状態管理の簡素化（2時間）

1. **UIState.ts → StateManager.tsへのリファクタリング**
   - FilterCondition interface と StateManager classの分離
   - searchBaseEvents関連の削除
   - isSearchApplied関連の削除
   - 複雑な条件分岐の削除
   - `Set<EventType>`を`EventTypeFilterFlags`クラスに置換
   - modeプロパティでFUNC-202仕様準拠の状態管理

2. **DAGベースの状態遷移メカニズム**
   ```typescript
   // filter/search mode開始時（additionalFilterを準備）
   enterFilterMode(currentManager: StateManager): StateManager {
     // 編集用の空のadditionalFilterを作成
     const editingFilter: FilterCondition = {
       displayMode: currentManager.totalFilterCondition.displayMode,
       eventTypeFilters: new EventTypeFilterFlags(), // 全てtrue
       searchPattern: ''
     };
     
     // 編集用の一時的なStateManager（まだtightCloneしない）
     const editingManager = new StateManager(editingFilter, currentManager);
     editingManager.mode = 'event_type_filter';
     return editingManager;
   }
   
   enterSearchMode(currentManager: StateManager): StateManager {
     // keyword編集用の空のadditionalFilterを作成
     const editingFilter: FilterCondition = {
       displayMode: currentManager.totalFilterCondition.displayMode,
       eventTypeFilters: new EventTypeFilterFlags(),
       searchPattern: ''  // ここに新しい正規表現パターンを追加
     };
     
     const editingManager = new StateManager(editingFilter, currentManager);
     editingManager.mode = 'keyword_filter';
     return editingManager;
   }
   
   // ESC: DAGの親ノードに戻る
   restorePreviousState(currentManager: StateManager): StateManager | null {
     if (currentManager.previousManager) {
       // 親ノード（StateManager）をそのまま返す
       // eventsも含めて完全に復元される
       currentManager.previousManager.mode = 'stream_live';
       return currentManager.previousManager;
     }
     return null;
   }
   
   // Enter: 編集を確定してtightClone実行
   confirmCurrentState(currentManager: StateManager): StateManager | null {
     if (currentManager.previousManager) {
       // 親に対してtightCloneを実行
       const cloned = currentManager.previousManager.tightClone(
         currentManager.additionalFilterCondition
       );
       if (cloned) {
         cloned.mode = 'stream_live';
         return cloned;
       }
     }
     return null;
   }
   ```

### Phase 2: データ取得の統一化（1時間）

1. **UIDataManager.tsの簡素化**
   - refreshData()を単一のシンプルなメソッドに
   - 条件分岐を削除し、常に同じフローで処理
   - キャッシュ機構の削除

2. **データ取得フロー**
   ```typescript
   // ユーザーがスクロールして追加データが必要な時
   async loadMoreEvents(currentManager: StateManager, query: any): Promise<void> {
     // currentNodeでgetEventsFromDBを呼ぶ
     // → 自動的にrootまで遡ってDBアクセス
     // → 各ノードでフィルタリング
     // → pendingEventsに保存
     currentManager.getEventsFromDB(query);
     
     // pendingEventsは非同期でeventsに移動される
   }
   
   // 新しいリアルタイムイベント（chokidar）
   handleNewStreamEvent(rootManager: StateManager, event: EventRow): void {
     // rootから開始してカスケード
     const passedEvents = [event];
     
     // 同じロジックでカスケード処理
     rootManager.feedNewEvents(passedEvents);
   }
   ```

### Phase 3: キー操作の整理（30分）

1. **ESCキーの動作**
   - filter/search mode: restorePreviousState() → 新しいStateManagerで前のフィルタを復元
   - normal mode: resetAllFilters() → 新しいStateManagerでフィルタをリセット

2. **Enterキーの動作**
   - filter/search mode: confirmCurrentState() → previousFilterをクリアした新しいStateManager

3. **モード切り替え（a/u）**
   - 新しいFilterConditionを作成 → 新しいStateManagerを作成 → データ再取得

4. **Pause/Resume（space）**
   - mode: stream_live ↔ stream_paused の切り替え
   - 表示更新のみ停止（FUNC-202仕様準拠）

### Phase 4: テスト・検証（1時間）

1. **動作確認項目**
   - unique → keyword → all切り替えで正常表示
   - ESC/Enterの全パターン（DAGの親子遷移）
   - 各種フィルタの組み合わせ
   - カスケード処理の動作確認
   - pendingEvents → eventsの非同期処理

2. **パフォーマンス確認**
   - 再帰的getEventsFromDBの処理時間
   - mergeSortの効率性
   - メモリ使用量（特に深いノードで）

3. **将来の最適化候補**
   - event typeフィルタの差分チェック実装
   - ビット演算によるevent type filterの高速化
   - メモリ管理の詳細実装（LRU削除戦略など）

---

**承認者署名欄**:  
日付:  
コメント: