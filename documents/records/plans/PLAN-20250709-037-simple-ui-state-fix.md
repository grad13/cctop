# シンプルUI状態管理修正計画

**計画ID**: PLAN-20250709-037  
**作成日**: 2025-07-09  
**作成者**: Builder Agent  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🔧 開発プロセス改善  
**優先度**: 🔴 Critical（バグ修正）

## 📋 概要

ESCキーバグと複雑な状態管理によるバグ多発を解決するため、最小限の変更でUI状態管理をシンプル化する。

## 🎯 目的

1. **ESCキーバグの修正**: normal modeでESCを押した際の表示不具合を解消
2. **状態管理の簡素化**: searchBaseEvents等の複雑な仕組みを削除
3. **保守性向上**: 理解しやすいコードで将来のバグを防ぐ

## 📊 現状分析

### 根本的な問題
- `searchBaseEvents`: モード別の検索データ管理が複雑
- `isSearchApplied`: ローカル/DB検索の切り替えフラグが不要に複雑
- `restorePreviousState()`: 条件分岐が多すぎる

### 本来の要件（シンプル）
- 3つのフィルタのAND検索: display mode × event type × keyword
- ESC: 編集をキャンセル
- Enter: 編集を確定

## 🏗️ 提案実装

### Phase 1: UIState.tsの簡素化（1時間）

```typescript
// シンプルな状態管理
class UIState {
  // 現在の状態
  displayMode: 'all' | 'unique' = 'all';
  eventTypeFilters = new EventTypeFilterFlags();
  searchPattern: string = '';  // 正規表現パターン
  displayState: 'stream_live' | 'event_type_filter' | 'keyword_filter' | 'stream_paused' | 'detail' = 'stream_live';
  
  // 編集時の一時保存（ESC用）
  private savedState?: {
    displayMode: 'all' | 'unique';
    eventTypeFilters: EventTypeFilterFlags;
    searchPattern: string;
  };
  
  // 現在のイベントデータ（フィルタ適用後）
  events: EventRow[] = [];
  
  // フィルタ編集開始
  startEditing(mode: 'event_type_filter' | 'keyword_filter'): void {
    this.savedState = {
      displayMode: this.displayMode,
      eventTypeFilters: this.eventTypeFilters.clone(),
      searchPattern: this.searchPattern
    };
    this.displayState = mode;
  }
  
  // ESC: 保存した状態に戻す
  cancelEditing(): void {
    if (this.savedState) {
      this.displayMode = this.savedState.displayMode;
      this.eventTypeFilters = this.savedState.eventTypeFilters;
      this.searchPattern = this.savedState.searchPattern;
      this.savedState = undefined;
    }
    this.displayState = 'stream_live';
  }
  
  // Enter: 現在の状態を確定
  confirmEditing(): void {
    this.savedState = undefined;
    this.displayState = 'stream_live';
  }
  
  // 全フィルタをリセット
  resetAllFilters(): void {
    this.displayMode = 'all';
    this.eventTypeFilters.resetAll();
    this.searchPattern = '';
  }
}
```

### Phase 2: データ取得の統一（30分）

```typescript
// UIDataManager.tsの簡素化
class UIDataManager {
  async refreshData(): Promise<void> {
    // 1. DBから取得（display modeに応じて）
    const allEvents = await this.db.getEvents(this.uiState.displayMode);
    
    // 2. フィルタ適用（単純なAND条件）
    const filtered = allEvents.filter(event => {
      // Event typeフィルタ
      if (!this.matchesEventTypeFilter(event)) return false;
      
      // 正規表現フィルタ
      if (this.uiState.searchPattern && !this.matchesPattern(event)) return false;
      
      return true;
    });
    
    // 3. 結果を設定
    this.uiState.events = filtered;
  }
  
  private matchesPattern(event: EventRow): boolean {
    try {
      const regex = new RegExp(this.uiState.searchPattern);
      return regex.test(event.file_path);
    } catch {
      return false;  // 無効な正規表現
    }
  }
}
```

### Phase 3: キー操作の修正（30分）

```typescript
// UIKeyHandler.tsの修正
class UIKeyHandler {
  setupKeyBindings(): void {
    // ESCキー
    this.screen.key(['escape'], () => {
      const state = this.uiState.displayState;
      
      if (state === 'event_type_filter' || state === 'keyword_filter') {
        // 編集モード: キャンセル
        this.uiState.cancelEditing();
        this.dataManager.refreshData();
      } else if (state === 'stream_live') {
        // 通常モード: 全フィルタリセット
        this.uiState.resetAllFilters();
        this.dataManager.refreshData();
      }
    });
    
    // Enterキー
    this.screen.key(['enter'], () => {
      const state = this.uiState.displayState;
      
      if (state === 'event_type_filter' || state === 'keyword_filter') {
        // 編集モード: 確定
        this.uiState.confirmEditing();
        this.dataManager.refreshData();
      }
    });
  }
}
```

## 📋 実装計画

### 削除対象
1. `searchBaseEvents` 関連のすべてのコード
2. `isSearchApplied` フラグと関連ロジック
3. `clearSearchBaseEvents()` メソッド
4. 複雑な条件分岐

### 追加・修正対象
1. シンプルな`savedState`による一時保存
2. 統一された`refreshData()`メソッド
3. 明確なキー操作ハンドリング

## 🚨 リスクと対策

### リスク
- パフォーマンス: 毎回全データをフィルタリング
- 正規表現: 無効なパターンでのエラー

### 対策
- 必要に応じてdebounce追加
- try-catchで正規表現エラーをハンドリング

## 📊 成功基準

1. ESCキーバグが解消される
2. コード行数が50%以上削減される
3. 新たなバグが発生しない

## 🔄 段階的実行

1. **Phase 1**: UIState.tsのリファクタリング
2. **Phase 2**: UIDataManager.tsの簡素化
3. **Phase 3**: UIKeyHandler.tsの修正
4. **Phase 4**: テスト実行・動作確認

各Phaseは独立して実行可能で、問題があれば即座にロールバック可能。

---

**承認者署名欄**:  
日付:  
コメント: