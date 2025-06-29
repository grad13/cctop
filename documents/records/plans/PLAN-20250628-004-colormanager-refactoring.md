# ColorManager.ts リファクタリング詳細計画

**作成日**: 2025-06-28  
**計画番号**: PLAN-20250628-004  
**関連**: PLAN-20250628-003（TypeScript移行後リファクタリング総合計画）  
**優先度**: High  
**Phase**: Phase 1 - 高成功率ファイル（90%成功見込み）  
**対象ファイル**: `src/color/ColorManager.ts` (420行)

## 📋 現状分析

### ファイル概要
- **機能**: FUNC-207 Display Color Customization準拠
- **責務**: テーマ読み込み、色適用、ANSI変換、chalk統合
- **依存関係**: chalk、fs、path のみ（シンプル）
- **TypeScript状況**: interface完備済み、型安全実装済み

### 現在の責務（詳細分析済み）
1. **テーマファイル操作** (~120行): 読み込み、保存、リスト作成
2. **色変換処理** (~100行): ANSI変換、RGB処理、マッピング
3. **色適用ロジック** (~80行): テーブル色、イベント色、ステータス色
4. **設定管理** (~80行): 現在テーマ管理、パス管理
5. **初期化・統合** (~40行): コンストラクタ、設定読み込み

### 分解の容易さ評価
- ✅ **依存関係少**: chalk、fs、pathのみで外部依存シンプル
- ✅ **明確な境界**: ファイル操作・変換・適用が独立
- ✅ **型定義完備**: 既存interface活用可能
- ⚠️ **潜在的課題**: テーマファイル不正時のエラーハンドリング

## 🎯 分解設計

### 分解後の構造（5ファイル）

```typescript
// 1. テーマ型定義・基盤 (80行程度)
src/color/types/ThemeTypes.ts
export interface ColorTheme {
  name: string;
  description?: string;
  lastUpdated?: string;
  version?: string;
  colors: ThemeColors;
}

export interface ThemeInfo {
  name: string;
  description: string;
  version: string;
  lastUpdated: string;
}

export interface ThemeColors {
  table?: TableColors;
  status_bar?: StatusBarColors;
  general_keys?: KeyColors;
  event_filters?: FilterColors;
  message_area?: MessageColors;
}

export type EventTypeColor = 'find' | 'create' | 'modify' | 'delete' | 'move' | 'restore';
export type StatusType = 'label' | 'count' | 'separator';
export type TableElementType = 'column_headers' | 'row' | 'event_timestamp';

// 2. テーマファイル操作 (120行程度)
src/color/loaders/ThemeLoader.ts
export class ThemeLoader {
  private themesDir: string;
  private currentThemeFile: string;

  constructor(configPath: string) {
    this.themesDir = path.join(configPath, 'themes');
    this.currentThemeFile = path.join(configPath, 'current-theme.json');
  }

  async loadTheme(name: string): Promise<ColorTheme>;
  async saveTheme(theme: ColorTheme): Promise<void>;
  async listAvailableThemes(): Promise<ThemeInfo[]>;
  async getCurrentTheme(): Promise<ColorTheme | null>;
  async setCurrentTheme(name: string): Promise<void>;
  
  // エラーハンドリング強化
  private validateThemeStructure(theme: any): boolean;
  private handleThemeLoadError(name: string, error: Error): ColorTheme;
}

// 3. 色変換・ANSI処理 (100行程度)
src/color/converters/ColorConverter.ts
export class ColorConverter {
  private colorMap: Map<string, string>;

  constructor() {
    this.colorMap = this.initializeColorMap();
  }

  convertToANSI(color: string): string;
  parseRGBHex(hex: string): chalk.Chalk;
  parseColorValue(value: string): chalk.Chalk;
  
  private initializeColorMap(): Map<string, string>;
  private isValidHexColor(color: string): boolean;
  private isValidANSIColor(color: string): boolean;
  
  // RGB・ANSI・Named Color の統一変換
  private handleRGBColor(color: string): chalk.Chalk;
  private handleNamedColor(color: string): chalk.Chalk;
}

// 4. 色適用・chalk統合 (80行程度)
src/color/appliers/ColorApplier.ts
export class ColorApplier {
  constructor(
    private colorConverter: ColorConverter,
    private currentTheme: ColorTheme | null
  ) {}

  // テーブル系色適用
  applyTableColors(text: string, elementType: TableElementType): string;
  applyEventTypeColor(text: string, eventType: EventTypeColor): string;
  
  // ステータス系色適用
  applyStatusColor(text: string, statusType: StatusType): string;
  applyGeneralKeyColor(text: string, active: boolean): string;
  applyFilterKeyColor(text: string, active: boolean): string;
  
  // メッセージ系色適用
  applyMessageColor(text: string, messageType: string): string;
  
  // 内部ヘルパー
  private getColorFromTheme(path: string): string | undefined;
  private applyChalkColor(text: string, color: string): string;
}

// 5. 統合ファサード (40行程度)
src/color/ColorManager.ts
export class ColorManager {
  private themeLoader: ThemeLoader;
  private colorConverter: ColorConverter;
  private colorApplier: ColorApplier;
  private currentTheme: ColorTheme | null = null;

  constructor(configPath: string = '.cctop') {
    this.themeLoader = new ThemeLoader(configPath);
    this.colorConverter = new ColorConverter();
    this.colorApplier = new ColorApplier(this.colorConverter, null);
    
    // 初期テーマ読み込み（非同期）
    this.loadCurrentTheme();
  }

  // 既存API完全互換
  applyTableColors(text: string, type: string): string {
    return this.colorApplier.applyTableColors(text, type as TableElementType);
  }

  applyEventTypeColor(text: string, eventType: EventTypeColor): string {
    return this.colorApplier.applyEventTypeColor(text, eventType);
  }

  // その他既存メソッドも同様に委譲
  
  private async loadCurrentTheme(): Promise<void> {
    try {
      this.currentTheme = await this.themeLoader.getCurrentTheme();
      this.colorApplier = new ColorApplier(this.colorConverter, this.currentTheme);
    } catch (error) {
      console.warn('[ColorManager] Failed to load theme, using defaults');
    }
  }
}
```

## 📅 実装スケジュール（余裕バッファ含む）

### Week 1: ColorManager.ts分解 (5-7日)

#### **Day 1**: 型定義・基盤整備
- ThemeTypes.ts作成・既存型定義の統合
- 型の厳密化・Union Types活用
- **予期しない課題**: 既存型定義との互換性問題 (+0.5日)

#### **Day 2**: ThemeLoader実装・テスト
- ファイル操作ロジック分離
- エラーハンドリング強化
- **予期しない課題**: テーマファイル形式の不整合 (+0.5日)

#### **Day 3**: ColorConverter実装・テスト
- ANSI・RGB・Named Colorの統一変換
- チョーク統合ロジック分離
- **予期しない課題**: 特殊色形式への対応 (+0.5日)

#### **Day 4**: ColorApplier実装・テスト
- 色適用ロジック分離
- テーマベースの動的色変換
- **予期しない課題**: パフォーマンス問題 (+0.5日)

#### **Day 5**: ファサード作成・統合テスト
- 既存API完全互換ファサード
- 全機能統合テスト実施
- **予期しない課題**: 微妙な挙動差異の調整 (+1日)

#### **Day 6-7**: 品質確認・ドキュメント化
- tsc --noEmit、similarity-ts実行
- 既存テスト全パス確認
- 性能ベンチマーク比較
- **バッファ**: 品質問題への対応

## ⚠️ 想定される課題と対策

### 技術的課題

#### 1. **テーマファイル互換性** (発生確率: 30%)
- **課題**: 既存テーマファイルの形式不整合
- **対策**: 段階的マイグレーション機能実装
- **代替案**: デフォルトテーマへのフォールバック

#### 2. **性能劣化** (発生確率: 20%)  
- **課題**: クラス間の呼び出しオーバーヘッド
- **対策**: ホットパスの特定・最適化
- **代替案**: 重要なパスのインライン化

#### 3. **型定義の複雑化** (発生確率: 25%)
- **課題**: Union Typesが複雑になりすぎる
- **対策**: 段階的な型定義、型ガードの活用
- **代替案**: any型の限定的使用許可

### 実装上の課題

#### 4. **エラーハンドリングの一貫性** (発生確率: 40%)
- **課題**: 各クラスでのエラー処理方針統一
- **対策**: 共通のErrorクラス定義・統一パターン
- **代替案**: try-catch の簡易実装

#### 5. **依存性注入の複雑化** (発生確率: 15%)
- **課題**: コンストラクタの引数が多くなる
- **対策**: Factory Patternの導入
- **代替案**: Singleton的な実装

## 🔍 品質保証計画

### TypeScript品質チェック
- `tsc --noEmit` 完全パス
- `similarity-ts` 重複ゼロ確認  
- strict mode 準拠確認

### 機能品質チェック
- 既存テスト全パス（100%必須）
- 新規単体テスト作成（各クラス80%カバレッジ目標）
- 統合テスト実施（ColorManager経由の全機能）

### 性能品質チェック
- 色適用処理のベンチマーク（±5%以内）
- メモリ使用量確認（±10%以内）
- 起動時間測定（テーマ読み込み含む）

## 📈 期待効果

### 開発効率向上
- **テーマ開発**: 30-50%効率化（ThemeLoader単独テスト可能）
- **色ロジック修正**: 40-60%効率化（ColorConverter独立）
- **新色形式追加**: 50-70%効率化（明確な追加箇所）

### 保守性向上
- **単体テスト**: 各責務の独立テスト可能
- **拡張性**: 新しい色形式・テーマ機能の追加容易
- **デバッグ**: 問題箇所の特定時間短縮

## ✅ 完了条件

- [ ] 5つの新クラス全てがTypeScript strict mode準拠
- [ ] 既存ColorManager APIの100%互換性維持
- [ ] 既存テストスイート全パス
- [ ] 性能劣化5%以内
- [ ] 新規単体テスト80%カバレッジ達成
- [ ] ドキュメント更新完了

## 🔄 ロールバック計画

### ロールバック条件
- 既存テスト失敗が2日以上継続
- 性能劣化10%以上
- 予期しない重大なバグ発見

### ロールバック手順
1. 元の ColorManager.ts に戻す
2. 新規作成ファイルの削除
3. import文の復元
4. テスト実行・動作確認

---

**次のステップ**: ユーザー承認後、Phase 1実行開始  
**所要時間**: 5-7日（バッファ含む）  
**成功確率**: 90%（最も高い成功率）