# InteractiveFeatures.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-007  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: High  
**Phase**: Phase 2 - 中成功率ファイル（70%成功見込み）  
**対象ファイル**: `src/ui/interactive/InteractiveFeatures.ts` (442行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-400/401/402/403統合、インタラクティブ機能の中央協調
- **責務**: コンポーネント管理、機能統合、キー入力協調、表示制御
- **依存関係**: KeyInputManager、SelectionManager、DetailInspectionController等
- **TypeScript状況**: require()混在、型定義の統一が必要

### 現在の責務（詳細分析済み）
1. **コンポーネント初期化** (~100行): 各インタラクティブコンポーネントの作成・設定
2. **機能協調制御** (~120行): キー入力、選択、詳細表示の協調
3. **イベント管理** (~80行): コンポーネント間のイベント伝播・処理
4. **状態管理** (~80行): インタラクティブモード、選択状態の管理
5. **表示統合** (~60行): 各コンポーネントの表示統合・レンダリング

### 分解の容易さ評価
- ✅ **既存コンポーネント分離**: 各機能が独立したクラスとして存在
- ✅ **明確な責務境界**: ファクトリー・協調・イベント管理が分離可能
- ⚠️ **中程度の課題**: require()とimportの混在、型定義の不統一
- ⚠️ **潜在的課題**: コンポーネント間の複雑な相互依存関係

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. コンポーネント型定義・基盤 (80行程度)
src/ui/interactive/types/ComponentTypes.ts
export interface InteractiveComponents {
  keyInputManager: IKeyInputManager;
  selectionManager: ISelectionManager;
  detailController: IDetailController;
  aggregateDisplay: IAggregateDisplay;
  historyDisplay: IHistoryDisplay;
}

export interface FileItem {
  name: string;
  path: string;
  lastEvent: string;
  timestamp: number;
}

export interface IKeyInputManager {
  setMode(mode: KeyInputMode): void;
  handleKeyInput(key: string): Promise<void>;
  getCurrentMode(): KeyInputMode;
}

export interface ISelectionManager {
  selectFile(file: FileItem): void;
  getSelectedFile(): FileItem | null;
  clearSelection(): void;
}

export interface IDetailController {
  activateDetailMode(file: FileItem): Promise<boolean>;
  deactivateDetailMode(): void;
  isActive(): boolean;
  render(): string | null;
}

export interface IAggregateDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
}

export interface IHistoryDisplay {
  initialize(filePath: string): Promise<void>;
  render(): string | null;
}

export type InteractiveMode = 'normal' | 'detail' | 'aggregate' | 'history';
export type KeyInputMode = 'NORMAL' | 'DETAIL';

export interface InteractiveConfig {
  debug?: boolean;
  enableDetailMode?: boolean;
  enableAggregateDisplay?: boolean;
  enableHistoryDisplay?: boolean;
}

// 2. コンポーネントファクトリー (100行程度)
src/ui/interactive/factories/ComponentFactory.ts
// TypeScript完全移行対応: require()の排除
import { KeyInputManager } from '../../interactive/key-input-manager.js';
import { SelectionManager } from './SelectionManager.js';
import { DetailInspectionController } from './DetailInspectionController.js';
import { AggregateDisplayRenderer } from './AggregateDisplayRenderer.js';
import { HistoryDisplayRenderer } from './HistoryDisplayRenderer.js';

export class ComponentFactory {
  private databaseManager: any;
  private displayRenderer: any;
  private cliDisplay: any;
  private debug: boolean;

  constructor(
    databaseManager: any,
    displayRenderer: any = null,
    cliDisplay: any = null
  ) {
    this.databaseManager = databaseManager;
    this.displayRenderer = displayRenderer;
    this.cliDisplay = cliDisplay;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
  }

  createKeyInputManager(): IKeyInputManager {
    const manager = new KeyInputManager();
    
    if (this.debug) {
      console.log('[ComponentFactory] KeyInputManager created');
    }
    
    return manager;
  }

  createSelectionManager(): ISelectionManager {
    const manager = new SelectionManager();
    
    if (this.debug) {
      console.log('[ComponentFactory] SelectionManager created');
    }
    
    return manager;
  }

  createDetailController(
    aggregateDisplay: IAggregateDisplay,
    historyDisplay: IHistoryDisplay,
    keyInputManager: IKeyInputManager
  ): IDetailController {
    const controller = new DetailInspectionController(
      aggregateDisplay,
      historyDisplay,
      keyInputManager
    );
    
    if (this.debug) {
      console.log('[ComponentFactory] DetailInspectionController created');
    }
    
    return controller;
  }

  createAggregateDisplay(): IAggregateDisplay {
    const display = new AggregateDisplayRenderer(this.databaseManager);
    
    if (this.debug) {
      console.log('[ComponentFactory] AggregateDisplayRenderer created');
    }
    
    return display;
  }

  createHistoryDisplay(): IHistoryDisplay {
    const display = new HistoryDisplayRenderer(this.databaseManager);
    
    if (this.debug) {
      console.log('[ComponentFactory] HistoryDisplayRenderer created');
    }
    
    return display;
  }

  createAllComponents(): InteractiveComponents {
    // Create displays first (dependencies)
    const aggregateDisplay = this.createAggregateDisplay();
    const historyDisplay = this.createHistoryDisplay();
    const keyInputManager = this.createKeyInputManager();
    
    // Create managers
    const selectionManager = this.createSelectionManager();
    const detailController = this.createDetailController(
      aggregateDisplay,
      historyDisplay,
      keyInputManager
    );

    if (this.debug) {
      console.log('[ComponentFactory] All components created successfully');
    }

    return {
      keyInputManager,
      selectionManager,
      detailController,
      aggregateDisplay,
      historyDisplay
    };
  }

  // Error recovery
  validateComponents(components: InteractiveComponents): boolean {
    const required = ['keyInputManager', 'selectionManager', 'detailController'];
    
    for (const component of required) {
      if (!components[component as keyof InteractiveComponents]) {
        console.error(`[ComponentFactory] Missing required component: ${component}`);
        return false;
      }
    }
    
    return true;
  }
}

// 3. 機能協調コントローラー (120行程度)
src/ui/interactive/coordinators/FeatureCoordinator.ts
export class FeatureCoordinator {
  private components: InteractiveComponents;
  private currentMode: InteractiveMode = 'normal';
  private debug: boolean;

  constructor(components: InteractiveComponents) {
    this.components = components;
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    this.initializeComponents();
  }

  private initializeComponents(): void {
    try {
      // Set initial key input mode
      this.components.keyInputManager.setMode('NORMAL');
      
      if (this.debug) {
        console.log('[FeatureCoordinator] Components initialized');
      }
    } catch (error) {
      console.error('[FeatureCoordinator] Initialization failed:', error);
    }
  }

  async coordinateInteraction(event: string, data?: any): Promise<void> {
    try {
      switch (event) {
        case 'fileSelected':
          await this.handleFileSelection(data);
          break;
        case 'detailModeRequested':
          await this.handleDetailModeRequest(data);
          break;
        case 'detailModeExit':
          await this.handleDetailModeExit();
          break;
        case 'keyInput':
          await this.handleKeyInput(data);
          break;
        default:
          if (this.debug) {
            console.log(`[FeatureCoordinator] Unknown event: ${event}`);
          }
      }
    } catch (error) {
      console.error(`[FeatureCoordinator] Event handling failed for ${event}:`, error);
    }
  }

  async handleFileSelection(file: FileItem): Promise<void> {
    if (!file) {
      console.warn('[FeatureCoordinator] Invalid file for selection');
      return;
    }

    // Update selection
    this.components.selectionManager.selectFile(file);
    
    if (this.debug) {
      console.log('[FeatureCoordinator] File selected:', file.name);
    }
  }

  async handleDetailModeRequest(file?: FileItem): Promise<void> {
    const targetFile = file || this.components.selectionManager.getSelectedFile();
    
    if (!targetFile) {
      console.warn('[FeatureCoordinator] No file selected for detail mode');
      return;
    }

    try {
      const success = await this.components.detailController.activateDetailMode(targetFile);
      
      if (success) {
        this.currentMode = 'detail';
        this.components.keyInputManager.setMode('DETAIL');
        
        if (this.debug) {
          console.log('[FeatureCoordinator] Detail mode activated for:', targetFile.name);
        }
      } else {
        console.warn('[FeatureCoordinator] Detail mode activation failed');
      }
    } catch (error) {
      console.error('[FeatureCoordinator] Detail mode activation error:', error);
    }
  }

  async handleDetailModeExit(): Promise<void> {
    try {
      this.components.detailController.deactivateDetailMode();
      this.currentMode = 'normal';
      this.components.keyInputManager.setMode('NORMAL');
      
      if (this.debug) {
        console.log('[FeatureCoordinator] Detail mode deactivated');
      }
    } catch (error) {
      console.error('[FeatureCoordinator] Detail mode exit error:', error);
    }
  }

  async handleKeyInput(key: string): Promise<void> {
    try {
      // Delegate to current mode's key handler
      if (this.currentMode === 'detail') {
        await this.components.detailController.handleKeyInput?.(key);
      } else {
        await this.components.keyInputManager.handleKeyInput(key);
      }
    } catch (error) {
      console.error('[FeatureCoordinator] Key input handling failed:', error);
    }
  }

  handleModeSwitch(mode: InteractiveMode): void {
    const previousMode = this.currentMode;
    this.currentMode = mode;
    
    // Update key input mode accordingly
    const keyMode = mode === 'detail' ? 'DETAIL' : 'NORMAL';
    this.components.keyInputManager.setMode(keyMode);
    
    if (this.debug) {
      console.log(`[FeatureCoordinator] Mode switched: ${previousMode} -> ${mode}`);
    }
  }

  getCurrentMode(): InteractiveMode {
    return this.currentMode;
  }

  // Status and debugging
  getCoordinatorStatus(): object {
    return {
      currentMode: this.currentMode,
      detailModeActive: this.components.detailController.isActive(),
      selectedFile: this.components.selectionManager.getSelectedFile()?.name || null
    };
  }
}

// 4. イベント管理 (80行程度)
src/ui/interactive/events/InteractiveEventManager.ts
import { EventEmitter } from 'events';

export class InteractiveEventManager extends EventEmitter {
  private featureCoordinator: FeatureCoordinator | null = null;
  private debug: boolean;

  constructor() {
    super();
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Prevent memory leaks
    this.setMaxListeners(20);
  }

  setFeatureCoordinator(coordinator: FeatureCoordinator): void {
    this.featureCoordinator = coordinator;
  }

  async delegateKeyEvent(key: string): Promise<void> {
    try {
      if (this.featureCoordinator) {
        await this.featureCoordinator.coordinateInteraction('keyInput', key);
      }
      
      // Also emit for other listeners
      this.emit('keyInput', key);
      
      if (this.debug) {
        console.log('[InteractiveEventManager] Key event delegated:', key);
      }
    } catch (error) {
      console.error('[InteractiveEventManager] Key event delegation failed:', error);
    }
  }

  async delegateSelectionEvent(item: FileItem): Promise<void> {
    try {
      if (this.featureCoordinator) {
        await this.featureCoordinator.coordinateInteraction('fileSelected', item);
      }
      
      // Also emit for other listeners
      this.emit('fileSelected', item);
      
      if (this.debug) {
        console.log('[InteractiveEventManager] Selection event delegated:', item.name);
      }
    } catch (error) {
      console.error('[InteractiveEventManager] Selection event delegation failed:', error);
    }
  }

  async handleFeatureToggle(feature: string): Promise<void> {
    try {
      switch (feature) {
        case 'detail':
          if (this.featureCoordinator) {
            await this.featureCoordinator.coordinateInteraction('detailModeRequested');
          }
          break;
        case 'exit-detail':
          if (this.featureCoordinator) {
            await this.featureCoordinator.coordinateInteraction('detailModeExit');
          }
          break;
        default:
          if (this.debug) {
            console.log(`[InteractiveEventManager] Unknown feature toggle: ${feature}`);
          }
      }
      
      this.emit('featureToggle', feature);
    } catch (error) {
      console.error('[InteractiveEventManager] Feature toggle failed:', error);
    }
  }

  // Event forwarding convenience methods
  forwardKeyInput(key: string): void {
    setImmediate(() => this.delegateKeyEvent(key));
  }

  forwardSelection(item: FileItem): void {
    setImmediate(() => this.delegateSelectionEvent(item));
  }

  // Cleanup
  cleanup(): void {
    this.removeAllListeners();
    this.featureCoordinator = null;
    
    if (this.debug) {
      console.log('[InteractiveEventManager] Cleaned up');
    }
  }

  // Status
  getEventStatus(): object {
    return {
      hasCoordinator: !!this.featureCoordinator,
      listenerCount: this.listenerCount('keyInput') + this.listenerCount('fileSelected'),
      maxListeners: this.getMaxListeners()
    };
  }
}

// 5. 統合ファサード (60行程度)
src/ui/interactive/InteractiveFeatures.ts
export class InteractiveFeatures {
  private componentFactory: ComponentFactory;
  private featureCoordinator: FeatureCoordinator;
  private eventManager: InteractiveEventManager;
  private components: InteractiveComponents;
  private debug: boolean;

  constructor(
    databaseManager: any,
    displayRenderer: any = null,
    cliDisplay: any = null
  ) {
    this.debug = process.env.CCTOP_VERBOSE === 'true';
    
    // Initialize factory and create components
    this.componentFactory = new ComponentFactory(
      databaseManager,
      displayRenderer,
      cliDisplay
    );
    
    this.components = this.componentFactory.createAllComponents();
    
    // Validate components
    if (!this.componentFactory.validateComponents(this.components)) {
      throw new Error('[InteractiveFeatures] Component validation failed');
    }
    
    // Initialize coordinators
    this.featureCoordinator = new FeatureCoordinator(this.components);
    this.eventManager = new InteractiveEventManager();
    
    // Connect event manager to coordinator
    this.eventManager.setFeatureCoordinator(this.featureCoordinator);
    
    if (this.debug) {
      console.log('[InteractiveFeatures] Initialized successfully');
    }
  }

  // 既存API完全互換
  async handleKeyInput(key: string): Promise<void> {
    await this.eventManager.delegateKeyEvent(key);
  }

  async selectFile(file: FileItem): Promise<void> {
    await this.eventManager.delegateSelectionEvent(file);
  }

  async activateDetailMode(file?: FileItem): Promise<boolean> {
    try {
      await this.featureCoordinator.coordinateInteraction(
        'detailModeRequested',
        file
      );
      return this.featureCoordinator.getCurrentMode() === 'detail';
    } catch (error) {
      console.error('[InteractiveFeatures] Detail mode activation failed:', error);
      return false;
    }
  }

  deactivateDetailMode(): void {
    this.featureCoordinator.coordinateInteraction('detailModeExit');
  }

  isDetailModeActive(): boolean {
    return this.featureCoordinator.getCurrentMode() === 'detail';
  }

  // その他既存メソッドも同様に委譲...
  
  cleanup(): void {
    this.eventManager.cleanup();
  }

  // 新規: 統合ステータス
  getFeatureStatus(): object {
    return {
      coordinator: this.featureCoordinator.getCoordinatorStatus(),
      events: this.eventManager.getEventStatus(),
      components: Object.keys(this.components)
    };
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 4: InteractiveFeatures.ts分解 (6-8日)

#### **Day 1**: 型定義・基盤整備
- ComponentTypes.ts作成・既存interface統合
- require()からimportへの完全移行計画
- **予期しない課題**: 型定義の互換性問題 (+0.5日)

#### **Day 2**: コンポーネントファクトリー実装
- ComponentFactory.ts実装・require()排除
- 依存性注入の最適化
- **予期しない課題**: モジュール読み込みの問題 (+0.5日)

#### **Day 3**: 機能協調コントローラー実装
- FeatureCoordinator.ts実装・テスト
- 複雑な相互作用の管理
- **予期しない課題**: コンポーネント間の競合状態 (+1日)

#### **Day 4**: イベント管理クラス実装
- InteractiveEventManager.ts実装・テスト
- EventEmitter継承・メモリリーク対策
- **予期しない課題**: イベント伝播の複雑化 (+0.5日)

#### **Day 5**: 統合ファサード実装
- InteractiveFeatures.ts実装・既存API互換確認
- 全コンポーネント統合テスト
- **予期しない課題**: 初期化順序の問題 (+0.5日)

#### **Day 6**: 統合テスト・動作確認
- インタラクティブ機能の統合テスト
- キー入力・選択・詳細表示の連携確認
- **予期しない課題**: 実際の操作での微妙な動作差異 (+1日)

#### **Day 7-8**: バッファ・品質確認
- TypeScript完全移行の確認
- 性能・安定性テスト
- ドキュメント更新

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **require()からimportの移行困難** (発生確率: 45%)
- **課題**: 既存require()のTypeScript互換性問題
- **対策**: 段階的移行、型定義ファイル作成
- **代替案**: 一部require()の維持（互換性優先）

#### 2. **コンポーネント間の複雑な依存関係** (発生確率: 40%)
- **課題**: 循環依存・初期化順序の問題
- **対策**: 依存性の明確化、遅延初期化
- **代替案**: 依存性注入フレームワーク導入

#### 3. **イベント伝播の複雑化** (発生確率: 35%)
- **課題**: EventEmitter使用による予期しない副作用
- **対策**: 明確なイベント設計、リスナー管理
- **代替案**: シンプルなコールバック方式

### 実装上の課題

#### 4. **型定義の不整合** (発生確率: 30%)
- **課題**: 既存コンポーネントとの型互換性
- **対策**: 段階的型定義統一、型アサーション使用
- **代替案**: any型の限定的使用

#### 5. **動作の微妙な差異** (発生確率: 25%)
- **課題**: リファクタリング後の操作感の変化
- **対策**: 詳細な動作テスト、フィードバック収集
- **代替案**: 互換モードの提供

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- require()完全排除確認
- strict mode準拠確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- インタラクティブ機能の手動テスト
- キー入力応答の正確性確認
- コンポーネント間連携の安定性確認

### 性能品質チェック
- キー入力応答時間（±10%以内）
- メモリ使用量確認（EventEmitterリーク検出）
- 初期化時間測定

## 📈 期待効果

### 開発効率向上
- **新機能追加**: 40-60%効率化（明確なコンポーネント境界）
- **イベント処理修正**: 50-70%効率化（EventManager独立）
- **TypeScript活用**: 30-50%効率化（型安全性向上）

### 保守性向上
- **単体テスト**: 各コンポーネントの独立テスト可能
- **機能拡張**: 新しいインタラクティブ機能追加容易
- **デバッグ**: 問題箇所の特定時間短縮

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] require()完全排除（TypeScript移行完了）
- [ ] 既存InteractiveFeatures APIの100%互換性維持
- [ ] インタラクティブ機能の動作確認
- [ ] EventEmitter使用の安定性確認
- [ ] 既存テストスイート全パス
- [ ] 新規単体テスト80%カバレッジ達成

## 🔄 ロールバック計画

### ロールバック条件
- require()移行に伴う重大な互換性問題
- コンポーネント間の依存関係問題が解決困難
- インタラクティブ機能の動作に重大な差異

### ロールバック手順
1. 元の InteractiveFeatures.ts に戻す
2. require()の復元
3. 新規作成ファイルの削除
4. インタラクティブ機能の動作確認

---

**次のステップ**: status-display.ts完了後実行開始  
**所要時間**: 6-8日（バッファ含む）  
**成功確率**: 70%（require()移行に注意が必要）