# DetailInspectionController.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-005  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: High  
**Phase**: Phase 1 - 高成功率ファイル（85%成功見込み）  
**対象ファイル**: `src/ui/interactive/DetailInspectionController.ts` (399行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-401 Detailed Inspection Mode Controller準拠
- **責務**: FUNC-402とFUNC-403モジュール協調、インタラクティブ制御
- **依存関係**: KeyInputManager、AggregateDisplay、HistoryDisplay
- **TypeScript状況**: interface定義済み、依存性注入パターン使用済み

### 現在の責務（詳細分析済み）
1. **状態管理** (~80行): active状態、selectedFile管理、モード切替
2. **表示制御コーディネート** (~120行): aggregate・history表示の協調
3. **キー入力処理** (~80行): ナビゲーション、モード切替、終了処理
4. **レンダリング統合** (~80行): 2つの表示モジュール統合レンダリング
5. **初期化・クリーンアップ** (~40行): コンポーネント初期化、リソース解放

### 分解の容易さ評価
- ✅ **interface定義済み**: 既存の明確なinterface活用可能
- ✅ **依存性注入済み**: DI パターン既に実装済み
- ✅ **責務分離準備済み**: コンポーネント間の境界が比較的明確
- ⚠️ **潜在的課題**: 非同期表示更新の協調、状態整合性管理

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. 制御インターフェース定義 (60行程度)
src/ui/interactive/interfaces/ControllerInterfaces.ts
// 既存interfaceの拡張・統合
export interface IAggregateDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  cleanup?(): void;
}

export interface IHistoryDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
  navigate?(key: string): Promise<void>;
  cleanup?(): void;
}

export interface IRenderController {
  setDetailModeActive?(active: boolean): void;
  isDetailMode?(): boolean;
  render?(): void;
  cliDisplay?: {
    refreshInterval?: NodeJS.Timeout | null;
    updateDisplay(): void;
  };
}

export interface ISelectedFile {
  name?: string;
  path?: string;
  lastEvent?: string;
  timestamp?: number;
  [key: string]: any;
}

// 新規追加: 状態管理インターフェース
export interface IDetailModeState {
  activate(file: ISelectedFile): void;
  deactivate(): void;
  isActive(): boolean;
  getSelectedFile(): ISelectedFile | null;
}

export interface IDisplayCoordinator {
  coordinateDisplays(file: ISelectedFile): Promise<void>;
  handleKeyNavigation(key: string): Promise<void>;
  cleanupDisplays(): void;
}

// 2. 状態管理 (80行程度)
src/ui/interactive/state/DetailModeState.ts
export class DetailModeState implements IDetailModeState {
  private active: boolean = false;
  private selectedFile: ISelectedFile | null = null;
  private debug: boolean;

  constructor() {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  activate(file: ISelectedFile): void {
    this.selectedFile = file;
    this.active = true;
    
    if (this.debug) {
      console.log('[DetailModeState] Activated for:', file.name || file.path);
    }
  }

  deactivate(): void {
    this.selectedFile = null;
    this.active = false;
    
    if (this.debug) {
      console.log('[DetailModeState] Deactivated');
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getSelectedFile(): ISelectedFile | null {
    return this.selectedFile;
  }

  // 状態検証・デバッグ支援
  validateState(): boolean {
    if (this.active && !this.selectedFile) {
      console.warn('[DetailModeState] Invalid state: active but no selected file');
      return false;
    }
    return true;
  }

  getStateInfo(): object {
    return {
      active: this.active,
      hasSelectedFile: !!this.selectedFile,
      selectedPath: this.selectedFile?.path || null
    };
  }
}

// 3. 表示制御コーディネーター (120行程度)
src/ui/interactive/coordinators/DisplayCoordinator.ts
export class DisplayCoordinator implements IDisplayCoordinator {
  private aggregateDisplay: IAggregateDisplay;
  private historyDisplay: IHistoryDisplay;
  private debug: boolean;

  constructor(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay
  ) {
    this.aggregateDisplay = aggregateDisplay;
    this.historyDisplay = historyDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  async coordinateDisplays(file: ISelectedFile): Promise<void> {
    if (!file?.path) {
      throw new Error('[DisplayCoordinator] Invalid file object');
    }

    try {
      // 並列初期化（効率化）
      await Promise.all([
        this.aggregateDisplay.initialize(file.path),
        this.historyDisplay.initialize(file.path)
      ]);

      if (this.debug) {
        console.log('[DisplayCoordinator] Displays coordinated for:', file.path);
      }
    } catch (error) {
      console.error('[DisplayCoordinator] Failed to coordinate displays:', error);
      throw error;
    }
  }

  async handleKeyNavigation(key: string): Promise<void> {
    try {
      // History display navigation support
      if (this.historyDisplay.navigate) {
        await this.historyDisplay.navigate(key);
      }

      if (this.debug) {
        console.log('[DisplayCoordinator] Key navigation handled:', key);
      }
    } catch (error) {
      console.error('[DisplayCoordinator] Key navigation failed:', error);
      // Navigation error should not be fatal
    }
  }

  cleanupDisplays(): void {
    try {
      if (this.aggregateDisplay.cleanup) {
        this.aggregateDisplay.cleanup();
      }
      if (this.historyDisplay.cleanup) {
        this.historyDisplay.cleanup();
      }

      if (this.debug) {
        console.log('[DisplayCoordinator] Displays cleaned up');
      }
    } catch (error) {
      console.error('[DisplayCoordinator] Cleanup failed:', error);
    }
  }

  // 追加: 表示準備状況確認
  async isReadyForDisplay(): Promise<boolean> {
    try {
      // Both displays should be able to render
      const aggregateReady = this.aggregateDisplay.render() !== null;
      const historyReady = this.historyDisplay.render() !== null;
      
      return aggregateReady && historyReady;
    } catch (error) {
      console.error('[DisplayCoordinator] Ready check failed:', error);
      return false;
    }
  }
}

// 4. レンダリング統合 (80行程度)
src/ui/interactive/renderers/DetailRenderer.ts
export class DetailRenderer {
  private aggregateDisplay: IAggregateDisplay;
  private historyDisplay: IHistoryDisplay;
  private debug: boolean;

  constructor(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay
  ) {
    this.aggregateDisplay = aggregateDisplay;
    this.historyDisplay = historyDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  renderDetailMode(): string | null {
    try {
      const aggregateSection = this.renderAggregateSection();
      const historySection = this.renderHistorySection();

      if (!aggregateSection && !historySection) {
        return null;
      }

      // Combine sections with proper spacing
      const sections = [aggregateSection, historySection]
        .filter(section => section !== null)
        .join('\n\n');

      return sections || null;
    } catch (error) {
      console.error('[DetailRenderer] Render failed:', error);
      return null;
    }
  }

  renderAggregateSection(): string | null {
    try {
      const content = this.aggregateDisplay.render();
      
      if (!content) {
        return null;
      }

      // Add section header
      return `=== Aggregate Statistics ===\n${content}`;
    } catch (error) {
      console.error('[DetailRenderer] Aggregate render failed:', error);
      return null;
    }
  }

  renderHistorySection(): string | null {
    try {
      const content = this.historyDisplay.render();
      
      if (!content) {
        return null;
      }

      // Add section header  
      return `=== Event History ===\n${content}`;
    } catch (error) {
      console.error('[DetailRenderer] History render failed:', error);
      return null;
    }
  }

  // 追加: レンダリング状況デバッグ
  getRenderStatus(): object {
    return {
      aggregateReady: this.aggregateDisplay.render() !== null,
      historyReady: this.historyDisplay.render() !== null,
      canRender: this.renderDetailMode() !== null
    };
  }
}

// 5. 統合コントローラー (60行程度)  
src/ui/interactive/DetailInspectionController.ts
export class DetailInspectionController {
  private displayCoordinator: IDisplayCoordinator;
  private detailState: IDetailModeState;
  private detailRenderer: DetailRenderer;
  private keyInputManager: any; // KeyInputManager type
  private renderController: IRenderController | null = null;

  constructor(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay,
    keyInputManager: any // KeyInputManager
  ) {
    // 依存性注入: 新しいクラス群の初期化
    this.displayCoordinator = new DisplayCoordinator(aggregateDisplay, historyDisplay);
    this.detailState = new DetailModeState();
    this.detailRenderer = new DetailRenderer(aggregateDisplay, historyDisplay);
    this.keyInputManager = keyInputManager;
  }

  // 既存API完全互換
  async activateDetailMode(file: ISelectedFile): Promise<boolean> {
    try {
      // 状態変更
      this.detailState.activate(file);
      
      // 表示協調
      await this.displayCoordinator.coordinateDisplays(file);
      
      // レンダーコントローラー通知
      if (this.renderController?.setDetailModeActive) {
        this.renderController.setDetailModeActive(true);
      }

      return true;
    } catch (error) {
      console.error('[DetailInspectionController] Activation failed:', error);
      this.detailState.deactivate();
      return false;
    }
  }

  deactivateDetailMode(): void {
    this.detailState.deactivate();
    this.displayCoordinator.cleanupDisplays();
    
    if (this.renderController?.setDetailModeActive) {
      this.renderController.setDetailModeActive(false);
    }
  }

  isActive(): boolean {
    return this.detailState.isActive();
  }

  render(): string | null {
    if (!this.detailState.isActive()) {
      return null;
    }
    
    return this.detailRenderer.renderDetailMode();
  }

  async handleKeyInput(key: string): Promise<void> {
    if (this.detailState.isActive()) {
      await this.displayCoordinator.handleKeyNavigation(key);
    }
  }

  // その他既存メソッドも同様に委譲...
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 2: DetailInspectionController.ts分解 (5-7日)

#### **Day 1**: インターフェース定義・統合
- ControllerInterfaces.ts作成・既存interface統合
- 新規interface追加（状態管理・協調機能）
- **予期しない課題**: interface間の型整合性問題 (+0.5日)

#### **Day 2**: 状態管理クラス実装
- DetailModeState.ts実装・テスト
- 状態検証・デバッグ機能追加
- **予期しない課題**: 状態管理の複雑化 (+0.5日)

#### **Day 3**: 表示協調クラス実装
- DisplayCoordinator.ts実装・テスト
- 非同期表示初期化・並列処理最適化
- **予期しない課題**: 非同期処理の競合状態 (+0.5日)

#### **Day 4**: レンダリング統合クラス実装
- DetailRenderer.ts実装・テスト
- セクション分離・ヘッダー追加
- **予期しない課題**: レンダリング結果の微妙な差異 (+0.5日)

#### **Day 5**: 統合コントローラー作成・統合テスト
- 既存API完全互換ファサード実装
- 全機能統合テスト実施
- **予期しない課題**: 依存性注入の複雑化 (+1日)

#### **Day 6-7**: 品質確認・ドキュメント化
- 非同期処理の安定性確認
- 既存テスト全パス確認
- エラーハンドリング強化
- **バッファ**: 非同期関連の問題対応

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **非同期処理の競合状態** (発生確率: 40%)
- **課題**: 表示初期化中の状態変更・競合
- **対策**: Promise.all活用、状態ロック機構
- **代替案**: 逐次処理への変更

#### 2. **状態整合性の複雑化** (発生確率: 30%)
- **課題**: 複数クラス間の状態同期問題
- **対策**: 明確な状態オーナーシップ定義
- **代替案**: 状態管理ライブラリ導入検討

#### 3. **interface継承の複雑化** (発生確率: 25%)
- **課題**: 既存interfaceとの互換性維持
- **対策**: 段階的interface拡張
- **代替案**: 新規interface作成・移行

### 実装上の課題

#### 4. **エラーハンドリングの一貫性** (発生確率: 35%)
- **課題**: 非同期エラーの適切な伝播
- **対策**: 統一的なエラーハンドリングパターン
- **代替案**: try-catch の簡易実装

#### 5. **デバッグの困難化** (発生確率: 20%)
- **課題**: クラス分離によるデバッグ複雑化
- **対策**: 各クラスにデバッグ支援機能追加
- **代替案**: 統合ログ機能の実装

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス（非同期型も含む）
- interface継承の整合性確認
- Promise型の適切な使用確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- 非同期処理の安定性テスト
- 状態変更の整合性テスト
- エラー時の適切な復旧確認

### 性能品質チェック
- 表示切替速度のベンチマーク（±5%以内）
- 非同期初期化時間測定
- メモリリーク確認（長時間動作）

## 📈 期待効果

### 開発効率向上
- **状態デバッグ**: 40-60%効率化（DetailModeState独立テスト）
- **表示ロジック修正**: 50-70%効率化（協調・レンダリング分離）
- **新機能追加**: 30-50%効率化（明確な追加箇所）

### 保守性向上
- **単体テスト**: 各責務の独立テスト可能
- **非同期デバッグ**: 問題箇所の特定容易
- **拡張性**: 新しい表示モード追加容易

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存DetailInspectionController APIの100%互換性維持
- [ ] 非同期処理の安定性確認（競合状態なし）
- [ ] 既存テストスイート全パス
- [ ] 状態管理の整合性確認
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- 非同期処理の安定性問題が2日以上継続
- 状態整合性の問題が解決困難
- 既存テスト失敗が継続

### ロールバック手順
1. 元の DetailInspectionController.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. 非同期処理・状態管理の動作確認

---

**次のステップ**: ColorManager.ts完了後実行開始  
**所要時間**: 5-7日（バッファ含む）  
**成功確率**: 85%（高い成功率、ColorManager実績活用）