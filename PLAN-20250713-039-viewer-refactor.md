# PLAN-20250713-039: Viewer Refactoring Implementation

**作成日**: 2025-07-13  
**作成者**: Builder Agent  
**対象**: viewer全体のリファクタリング・アーキテクチャ改善  
**worktree**: feature-07-13-viewer-refactor  

## 🎯 目的・背景

### 背景
- ViewConfig統合・EventTable/EventRowクラス基盤が完成済み
- 一方でデバッグコード残留・廃止クラス存在・依存関係複雑化等の技術的負債が蓄積
- EventTable関係のコードが「怪しい」状態でリファクタリングが必要

### 目的
1. **技術的負債の解消**: デバッグコード・廃止クラスの完全削除
2. **アーキテクチャの明確化**: 責務分離・依存関係の整理
3. **パフォーマンス向上**: レンダリング効率化・状態管理最適化
4. **保守性向上**: テスト統合・型定義整理

## 🔍 現状分析結果

### EventTable関係の問題点
```typescript
// 問題1: デバッグコード残留
// EventRow.ts:187-188
const fs = require('fs');
fs.appendFileSync('.cctop/logs/render-debug.log', `EventRow render: mutedDirectory="${directory}", result="${result}"\n`);

// UILayoutManager.ts:153-157
const fs = require('fs');
fs.appendFileSync('.cctop/logs/screen-debug.log', `Screen children count: ${this.screen.children.length}\n`);
```

```typescript
// 問題2: 廃止クラス
// RowRenderer.ts:22-23
// DEPRECATED: This method is no longer used. EventRow class handles rendering directly.
return `DEPRECATED: RowRenderer.renderRow() - Use EventRow.render() instead`;
```

```typescript
// 問題3: レガシー互換性
// blessed-frameless-ui-simple.ts (単なるre-export)
export { BlessedFramelessUISimple, UIFramelessConfigSimple } from './BlessedFramelessUI';
```

### アーキテクチャ問題
1. **責務不明確**: UILayoutManagerがEventTable内部詳細（getColumnHeader()等）を直接操作
2. **状態管理重複**: UIState、UIDataManager、EventTableで状態を重複管理
3. **密結合**: EventTable→EventRow→ViewConfig、UILayoutManager→EventTable等

### ファイル構成問題
1. **テスト重複**: modules/view/tests/とtests/cli/に同じEventTableテスト
2. **型定義散在**: event-row型定義が複数箇所に分散

## 🚀 リファクタリング計画

### Phase 1: コードクリーンアップ（Priority: High）
#### 1.1 デバッグコード削除
- [ ] EventRow.ts: fs.appendFileSync削除（187-188行）
- [ ] UILayoutManager.ts: fs.appendFileSync削除（153-157行）
- [ ] 他のデバッグログ残留確認・削除

#### 1.2 廃止クラス・ファイル削除
- [ ] RowRenderer.ts: 完全削除（DEPRECATEDクラス）
- [ ] blessed-frameless-ui-simple.ts: BlessedFramelessUI.tsに統合
- [ ] 関連import文の修正

#### 1.3 レガシー参照削除
- [ ] COLUMN_CONFIGSへの残存参照確認・削除
- [ ] 不要な互換性コード削除

### Phase 2: アーキテクチャ改善（Priority: Medium）
#### 2.1 責務分離
```typescript
// Before: UILayoutManagerがEventTable詳細を知っている
this.headerPanel.setContent(this.buildHeaderContent());
header += this.eventTable.getColumnHeader();

// After: EventTableが自身のヘッダー管理
interface EventTableViewport {
  updateHeader(): void;
  updateContent(): void;
  getViewportInfo(): ViewportInfo;
}
```

#### 2.2 状態管理統合
```typescript
// Before: 複数クラスでの状態重複
UIState: selectedIndex, events, viewportStart
UIDataManager: currentOffset, events, totalLoaded
EventTable: rows, rowOrder, selectedId

// After: 単一責任での状態管理
EventTableState: レンダリング状態のみ
UIViewportState: 表示状態のみ  
UIDataState: データ状態のみ
```

#### 2.3 依存関係の明確化
```typescript
// 新しい依存関係（単方向）
UILayoutManager → EventTableViewport (interface)
EventTable → EventTableState
UIDataManager → UIDataState
```

### Phase 3: パフォーマンス最適化（Priority: Medium）
#### 3.1 レンダリング効率化
- [ ] EventTable全体での差分レンダリング強化
- [ ] 不要なscreen.render()呼び出し削減
- [ ] EventRowキャッシュ戦略改善

#### 3.2 メモリ使用量最適化
- [ ] EventRowインスタンス管理改善
- [ ] 不要なevent dataのコピー削減

### Phase 4: テスト・ビルド改善（Priority: Low）
#### 4.1 テスト統合
- [ ] 重複EventTableテストの統合
- [ ] テストカバレッジ向上
- [ ] パフォーマンステスト追加

#### 4.2 型定義整理
- [ ] event-row型定義の統合
- [ ] EventTable関連型の明確化

## 📊 実装順序

### Step 1: 即座実行（デバッグコード削除）
```bash
# 緊急性: High - プロダクションに不要なデバッグコードが残存
1. EventRow.ts fs.appendFileSync削除
2. UILayoutManager.ts fs.appendFileSync削除
3. git commit "clean: remove debug logging code"
```

### Step 2: 廃止クラス削除
```bash
# 影響範囲確認後削除
1. RowRenderer.ts削除
2. blessed-frameless-ui-simple.ts統合
3. import修正・ビルド確認
4. git commit "refactor: remove deprecated classes"
```

### Step 3: アーキテクチャ改善
```bash
# 段階的リファクタリング
1. インターフェース定義
2. 責務分離実装
3. 状態管理統合
4. git commit "refactor: improve viewer architecture"
```

### Step 4: 最適化・テスト
```bash
# パフォーマンス・品質向上
1. レンダリング最適化
2. テスト統合
3. git commit "optimize: viewer performance improvements"
```

## 🧪 テスト戦略

### Phase 1テスト
- [ ] デバッグコード削除後の基本動作確認
- [ ] 廃止クラス削除後のビルド・実行確認

### Phase 2テスト
- [ ] アーキテクチャ変更後の機能回帰テスト
- [ ] 新しい責務分離の動作確認

### Phase 3テスト
- [ ] パフォーマンス改善の効果測定
- [ ] メモリ使用量テスト

## 📈 成功指標

### 品質指標
- [ ] デバッグコード 0行
- [ ] DEPRECATEDクラス 0個
- [ ] ESLint warning 0件

### パフォーマンス指標
- [ ] レンダリング時間 10%改善
- [ ] メモリ使用量 5%削減

### 保守性指標
- [ ] EventTable関連ファイル数 20%削減
- [ ] 依存関係の単方向化 100%達成

## 🚀 実装開始

**最初のタスク**: デバッグコード削除（即座実行）
**期待完了時間**: Phase 1-2で 2時間、全体で 1日

**次のステップ**: 「デバッグコード削除から開始する」でよろしいですか？