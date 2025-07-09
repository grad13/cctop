/**
 * ESCOperationManager - HO-20250707-002仕様準拠
 * 2つの異なるESC動作を管理（編集破棄 vs 全クリア）
 */

export interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];
  keywordFilter: string;
}

/**
 * ESCOperationManager
 * 
 * 核心機能:
 * 1. 編集モード vs 通常モードの管理
 * 2. 編集モード中のESC: 編集結果破棄・元状態復元
 * 3. 通常モード中のESC: 全フィルタクリア
 * 4. previousState保存・復元機能
 */
export class ESCOperationManager {
  private currentState: FilterState;
  private previousState: FilterState | null = null;
  private currentMode: 'normal' | 'editing' = 'normal';

  constructor(initialState?: FilterState) {
    this.currentState = initialState || this.getDefaultState();
  }

  /**
   * デフォルト状態取得
   */
  private getDefaultState(): FilterState {
    return {
      mode: 'all',
      eventFilters: ['Create', 'Modify', 'Delete', 'Move', 'Find', 'Restore'],
      keywordFilter: ''
    };
  }

  /**
   * 編集モードに入る
   * previousStateを保存し、編集前の状態を記録
   */
  enterEditingMode(field: 'eventFilter' | 'keywordFilter'): void {
    this.previousState = { ...this.currentState };
    this.currentMode = 'editing';
  }

  /**
   * 状態更新
   */
  updateState(updates: Partial<FilterState>): void {
    this.currentState = { ...this.currentState, ...updates };
  }

  /**
   * ESC操作実行 - HO-20250707-002核心仕様
   * 
   * 動作パターン:
   * 1. 編集モード中: 編集結果を破棄し、元の状態に復元
   * 2. 通常モード中: 全フィルタをデフォルト状態にクリア
   */
  executeEscape(): FilterState {
    if (this.currentMode === 'editing') {
      // ESC in edit mode: Discard edit results and restore previous state
      if (this.previousState) {
        this.currentState = { ...this.previousState };
        this.previousState = null;
      }
      this.currentMode = 'normal';
    } else {
      // ESC in normal mode: Clear all edits
      this.currentState = this.getDefaultState();
    }
    
    return { ...this.currentState };
  }

  /**
   * 現在の状態取得
   */
  getCurrentState(): FilterState {
    return { ...this.currentState };
  }

  /**
   * 現在のモード取得
   */
  getCurrentMode(): string {
    return this.currentMode;
  }

  /**
   * 編集モード確認
   */
  isEditing(): boolean {
    return this.currentMode === 'editing';
  }

  /**
   * 編集モード終了（確定）
   * ESCとは異なり、編集内容を保存して通常モードに戻る
   */
  confirmEdit(): FilterState {
    this.currentMode = 'normal';
    this.previousState = null;
    return { ...this.currentState };
  }

  /**
   * 外部からの状態同期
   * FilterStateManagerとの統合時に使用
   */
  syncState(newState: FilterState): void {
    this.currentState = { ...newState };
  }

  /**
   * previousState確認（デバッグ用）
   */
  hasPreviousState(): boolean {
    return this.previousState !== null;
  }
}