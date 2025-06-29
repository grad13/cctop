# status-display.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-006  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: High  
**Phase**: Phase 2 - 中成功率ファイル（75%成功見込み）  
**対象ファイル**: `src/display/status-display.ts` (423行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-205 Status Area準拠、ステータス表示・メッセージ管理
- **責務**: メッセージ管理、スクロール制御、統計表示、タイマー管理
- **依存関係**: DatabaseManager、chalk、string-width
- **TypeScript状況**: interface定義済み、型安全実装済み

### 現在の責務（詳細分析済み）
1. **メッセージ管理** (~120行): 追加、更新、優先度制御、表示行選択
2. **スクロール制御** (~100行): 位置計算、方向制御、一時停止機能
3. **統計表示** (~80行): データベース統計取得、定期更新
4. **タイマー・ライフサイクル** (~70行): 更新間隔、クリーンアップ
5. **レンダリング統合** (~50行): 表示行生成、幅調整、色適用

### 分解の容易さ評価
- ✅ **interface定義済み**: StatusMessage、ScrollState等の型完備
- ✅ **責務分離可能**: メッセージ・スクロール・統計が比較的独立
- ⚠️ **中程度の課題**: スクロール状態とメッセージ管理の密結合
- ⚠️ **潜在的課題**: タイマー管理の複雑性、非同期統計取得

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. メッセージ型定義・基盤 (50行程度)
src/display/types/MessageTypes.ts
export interface StatusMessage {
  text: string;
  prefix: string;
  color: string;
  type: string;
  priority: number;
  timestamp: number;
  scrollPosition: number;
  scrollDirection: number; // 1 for forward, -1 for backward
  scrollPause: number;
}

export interface ScrollState {
  position: number;
  direction: number;
  pause: number;
}

export interface MessagePriorities {
  error: number;
  warning: number;
  progress: number;
  info: number;
  stats: number;
}

export type MessageType = 'error' | 'warning' | 'progress' | 'info' | 'stats';
export type ScrollDirection = 1 | -1;

export interface StatusDisplayConfig {
  maxLines?: number;
  enabled?: boolean;
  scrollSpeed?: number;
  updateInterval?: number;
}

export interface StatusDisplayStatus {
  enabled: boolean;
  messageCount: number;
  maxLines: number;
  terminalWidth: number;
}

// 2. メッセージ管理 (120行程度)
src/display/managers/MessageManager.ts
export class MessageManager {
  private messages: StatusMessage[] = [];
  private maxLines: number;
  private priorities: MessagePriorities;

  constructor(config: StatusDisplayConfig = {}) {
    this.maxLines = config.maxLines || 3;
    this.priorities = {
      'error': 1,    // !! messages - highest priority
      'warning': 1,  // !! messages - highest priority  
      'progress': 2, // >> messages - normal priority
      'info': 2,     // >> messages - normal priority
      'stats': 3     // >> messages - lower priority
    };
  }

  addMessage(text: string, type: MessageType = 'info'): void {
    const priority = this.priorities[type] || 2;
    const prefix = (type === 'error' || type === 'warning') ? '!!' : '>>';
    const color = (type === 'error' || type === 'warning') ? 'red' : 'white';

    const message: StatusMessage = {
      text,
      prefix,
      color,
      type,
      priority,
      timestamp: Date.now(),
      scrollPosition: 0,
      scrollDirection: 1,
      scrollPause: 0
    };

    // Insert at top, maintaining priority order
    this.insertMessageByPriority(message);
    this.trimMessages();
  }

  updateMessage(oldText: string, newText: string, type: MessageType = 'info'): void {
    const index = this.messages.findIndex(msg => msg.text === oldText);
    if (index !== -1) {
      // Update existing message
      this.messages[index].text = newText;
      this.messages[index].type = type;
      this.messages[index].timestamp = Date.now();
    } else {
      // Add new message if not found
      this.addMessage(newText, type);
    }
  }

  getDisplayMessages(maxLines: number = this.maxLines): StatusMessage[] {
    return this.messages.slice(0, maxLines);
  }

  clearMessages(): void {
    this.messages = [];
  }

  getMessageCount(): number {
    return this.messages.length;
  }

  // 内部ヘルパー
  private insertMessageByPriority(message: StatusMessage): void {
    let insertIndex = 0;
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i].priority > message.priority) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    this.messages.splice(insertIndex, 0, message);
  }

  private trimMessages(): void {
    if (this.messages.length > this.maxLines * 2) {
      this.messages = this.messages.slice(0, this.maxLines * 2);
    }
  }

  // デバッグ支援
  getMessageSummary(): object {
    return {
      total: this.messages.length,
      byType: this.messages.reduce((acc, msg) => {
        acc[msg.type] = (acc[msg.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// 3. スクロール制御 (100行程度)
src/display/controllers/ScrollController.ts
export class ScrollController {
  private scrollStates: Map<string, ScrollState> = new Map();
  private scrollSpeed: number;
  private terminalWidth: number;
  private scrollInterval: NodeJS.Timeout | null = null;

  constructor(config: StatusDisplayConfig = {}) {
    this.scrollSpeed = config.scrollSpeed || 200;
    this.terminalWidth = process.stdout.columns || 80;
  }

  startScrolling(): void {
    if (this.scrollInterval) {
      return; // Already running
    }

    this.scrollInterval = setInterval(() => {
      this.updateAllScrollPositions();
    }, this.scrollSpeed);
  }

  stopScrolling(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  updateScrollPosition(messageId: string): void {
    const state = this.scrollStates.get(messageId);
    if (!state) {
      this.scrollStates.set(messageId, {
        position: 0,
        direction: 1,
        pause: 0
      });
      return;
    }

    if (state.pause > 0) {
      state.pause--;
      return;
    }

    state.position += state.direction;

    // Reverse direction at boundaries
    if (state.position <= 0) {
      state.direction = 1;
      state.pause = 10; // Pause at start
    } else if (state.position >= this.getMaxScrollPosition(messageId)) {
      state.direction = -1;
      state.pause = 10; // Pause at end
    }
  }

  calculateScrolledText(message: StatusMessage): string {
    const messageId = this.generateMessageId(message);
    const state = this.scrollStates.get(messageId);
    
    if (!state) {
      return this.truncateText(message.text, this.terminalWidth - 10);
    }

    const availableWidth = this.terminalWidth - message.prefix.length - 3;
    
    if (message.text.length <= availableWidth) {
      return message.text; // No scrolling needed
    }

    // Calculate scrolled substring
    const start = Math.max(0, state.position);
    const end = Math.min(message.text.length, start + availableWidth);
    
    return message.text.substring(start, end);
  }

  updateTerminalWidth(width: number): void {
    this.terminalWidth = width;
    // Reset scroll positions for new width
    this.scrollStates.clear();
  }

  cleanup(): void {
    this.stopScrolling();
    this.scrollStates.clear();
  }

  // 内部ヘルパー
  private updateAllScrollPositions(): void {
    for (const [messageId, state] of this.scrollStates.entries()) {
      this.updateScrollPosition(messageId);
    }
  }

  private getMaxScrollPosition(messageId: string): number {
    // Calculate based on message length and available width
    const availableWidth = this.terminalWidth - 10; // Conservative estimate
    const messageLength = messageId.length; // Simplified
    return Math.max(0, messageLength - availableWidth);
  }

  private generateMessageId(message: StatusMessage): string {
    return `${message.type}-${message.timestamp}`;
  }

  private truncateText(text: string, maxWidth: number): string {
    if (text.length <= maxWidth) {
      return text;
    }
    return text.substring(0, maxWidth - 3) + '...';
  }

  // デバッグ支援
  getScrollStatus(): object {
    return {
      active: !!this.scrollInterval,
      trackedMessages: this.scrollStates.size,
      terminalWidth: this.terminalWidth
    };
  }
}

// 4. 統計表示プロバイダー (80行程度)
src/display/providers/StatisticsProvider.ts
export class StatisticsProvider {
  private databaseManager: any; // DatabaseManager type
  private updateInterval: number;
  private statisticsTimer: NodeJS.Timeout | null = null;
  private messageManager: MessageManager | null = null;

  constructor(
    databaseManager: any,
    config: StatusDisplayConfig = {}
  ) {
    this.databaseManager = databaseManager;
    this.updateInterval = config.updateInterval || 5000;
  }

  setMessageManager(messageManager: MessageManager): void {
    this.messageManager = messageManager;
  }

  startPeriodicUpdates(): void {
    if (this.statisticsTimer) {
      return; // Already running
    }

    // Initial update
    this.updateStatistics();

    // Start periodic updates
    this.statisticsTimer = setInterval(() => {
      this.updateStatistics();
    }, this.updateInterval);
  }

  stopPeriodicUpdates(): void {
    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
  }

  async generateStatisticsMessage(): Promise<string | null> {
    try {
      if (!this.databaseManager?.isConnected()) {
        return null;
      }

      const stats = await this.databaseManager.getStats();
      if (!stats) {
        return null;
      }

      const message = `Files: ${stats.activeFiles}/${stats.totalFiles} | ` +
                     `Events: ${stats.totalEvents} | ` +
                     `DB: ${this.databaseManager.dbPath || 'unknown'}`;

      return message;
    } catch (error) {
      console.error('[StatisticsProvider] Failed to generate statistics:', error);
      return null;
    }
  }

  private async updateStatistics(): Promise<void> {
    try {
      const statsMessage = await this.generateStatisticsMessage();
      if (statsMessage && this.messageManager) {
        this.messageManager.updateMessage(
          'Statistics updated', // Old message pattern
          statsMessage,
          'stats'
        );
      }
    } catch (error) {
      console.error('[StatisticsProvider] Statistics update failed:', error);
    }
  }

  cleanup(): void {
    this.stopPeriodicUpdates();
  }

  // デバッグ支援
  getProviderStatus(): object {
    return {
      active: !!this.statisticsTimer,
      updateInterval: this.updateInterval,
      databaseConnected: this.databaseManager?.isConnected() || false
    };
  }
}

// 5. 統合表示コントローラー (70行程度)
src/display/StatusDisplay.ts
export class StatusDisplay {
  private messageManager: MessageManager;
  private scrollController: ScrollController;
  private statisticsProvider: StatisticsProvider;
  private config: StatusDisplayConfig;
  private enabled: boolean;

  constructor(
    databaseManager?: any, // DatabaseManager (optional for backward compatibility)
    config: StatusDisplayConfig = {}
  ) {
    this.config = config;
    this.enabled = config.enabled !== false;

    // Initialize components
    this.messageManager = new MessageManager(config);
    this.scrollController = new ScrollController(config);
    this.statisticsProvider = new StatisticsProvider(databaseManager || null, config);

    // Connect components
    this.statisticsProvider.setMessageManager(this.messageManager);

    // Start services if enabled
    if (this.enabled) {
      this.scrollController.startScrolling();
      if (databaseManager) {
        this.statisticsProvider.startPeriodicUpdates();
      }
    }
  }

  // 既存API完全互換
  addMessage(text: string, type: string = 'info'): void {
    if (!this.enabled) return;
    this.messageManager.addMessage(text, type as MessageType);
  }

  updateMessage(oldText: string, newText: string, type: string = 'info'): void {
    if (!this.enabled) return;
    this.messageManager.updateMessage(oldText, newText, type as MessageType);
  }

  getDisplayLines(): string[] {
    if (!this.enabled) return [];

    const messages = this.messageManager.getDisplayMessages();
    return messages.map(message => {
      const scrolledText = this.scrollController.calculateScrolledText(message);
      const coloredText = message.color === 'red' ? 
        `\x1b[31m${message.prefix} ${scrolledText}\x1b[0m` :
        `${message.prefix} ${scrolledText}`;
      
      return coloredText;
    });
  }

  getStatus(): StatusDisplayStatus {
    return {
      enabled: this.enabled,
      messageCount: this.messageManager.getMessageCount(),
      maxLines: this.config.maxLines || 3,
      terminalWidth: process.stdout.columns || 80
    };
  }

  destroy(): void {
    this.scrollController.cleanup();
    this.statisticsProvider.cleanup();
    this.messageManager.clearMessages();
  }

  // 新規: 統合ステータス取得
  getIntegratedStatus(): object {
    return {
      display: this.getStatus(),
      messages: this.messageManager.getMessageSummary(),
      scroll: this.scrollController.getScrollStatus(),
      statistics: this.statisticsProvider.getProviderStatus()
    };
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 3: status-display.ts分解 (6-8日)

#### **Day 1**: 型定義・基盤整備
- MessageTypes.ts作成・既存型定義の統合
- 新規型定義の追加（MessageType、ScrollDirection等）
- **予期しない課題**: 型継承の複雑化 (+0.5日)

#### **Day 2**: メッセージ管理クラス実装
- MessageManager.ts実装・テスト
- 優先度制御・挿入ロジック実装
- **予期しない課題**: 優先度ロジックの複雑化 (+0.5日)

#### **Day 3**: スクロール制御クラス実装
- ScrollController.ts実装・テスト
- タイマー管理・位置計算実装
- **予期しない課題**: タイマー競合状態 (+1日)

#### **Day 4**: 統計プロバイダー実装
- StatisticsProvider.ts実装・テスト
- 非同期統計取得・エラーハンドリング
- **予期しない課題**: データベース接続の不安定性 (+0.5日)

#### **Day 5**: 統合表示コントローラー実装
- StatusDisplay.ts実装・既存API互換確認
- コンポーネント間の連携テスト
- **予期しない課題**: コンポーネント初期化順序問題 (+0.5日)

#### **Day 6**: 統合テスト・品質確認
- 全機能統合テスト・タイマー安定性確認
- スクロール動作の視覚確認
- **予期しない課題**: 視覚的な動作差異 (+1日)

#### **Day 7-8**: バッファ・ドキュメント化
- 品質問題への対応
- 性能最適化・メモリリーク確認
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **タイマー管理の複雑化** (発生確率: 50%)
- **課題**: 複数タイマーの競合状態・メモリリーク
- **対策**: タイマーライフサイクルの明確化、cleanup強化
- **代替案**: タイマー統合管理クラスの追加

#### 2. **スクロール状態管理の複雑化** (発生確率: 40%)
- **課題**: メッセージ追加・削除時の状態整合性
- **対策**: 状態リセット機能、自動クリーンアップ
- **代替案**: スクロール機能の簡略化

#### 3. **非同期統計取得の不安定性** (発生確率: 35%)
- **課題**: データベース接続失敗時の処理
- **対策**: リトライ機構、フォールバック値
- **代替案**: 統計更新の一時停止機能

### 実装上の課題

#### 4. **コンポーネント初期化順序** (発生確率: 30%)
- **課題**: 依存関係のある初期化処理の順序問題
- **対策**: 段階的初期化、準備完了確認
- **代替案**: 遅延初期化パターン

#### 5. **視覚的動作の差異** (発生確率: 25%)
- **課題**: スクロール・色表示の微妙な変化
- **対策**: 詳細なビジュアル回帰テスト
- **代替案**: 設定可能な互換モード

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- タイマー型の適切な使用確認
- 非同期処理の型安全性確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- タイマー動作の長時間安定性テスト
- スクロール動作の視覚確認
- 統計更新の正確性確認

### 性能品質チェック
- スクロール処理のCPU使用率（±10%以内）
- メモリ使用量確認（リーク検出）
- 統計更新の応答時間測定

## 📈 期待効果

### 開発効率向上
- **メッセージ機能追加**: 50-70%効率化（MessageManager独立）
- **スクロールデバッグ**: 60-80%効率化（ScrollController独立）
- **統計表示修正**: 40-60%効率化（StatisticsProvider独立）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **タイマー問題**: 問題箇所の特定容易
- **拡張性**: 新しいメッセージタイプ・表示機能追加容易

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存StatusDisplay APIの100%互換性維持
- [ ] タイマー動作の安定性確認（メモリリークなし）
- [ ] スクロール動作の視覚的確認
- [ ] 統計更新の正確性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- タイマー関連の安定性問題が2日以上継続
- スクロール動作の視覚的問題が解決困難
- 統計更新の正確性に問題

### ロールバック手順
1. 元の status-display.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. タイマー・スクロール動作の確認

---

**次のステップ**: Phase 1完了後実行開始  
**所要時間**: 6-8日（バッファ含む）  
**成功確率**: 75%（中程度、タイマー管理に注意）