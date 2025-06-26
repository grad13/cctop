# PLAN-20250626-003: CLI Display リファクタリング計画

**作成日**: 2025年6月26日  
**作成者**: Builder Agent  
**ステータス**: Approved  
**対象**: cli-display.js (613行) の分割リファクタリング  
**優先度**: Medium  

## 📊 現状分析

### 問題点
- **cli-display.js**: 613行、約25メソッド
- **責任範囲の混在**: 表示制御、イベント管理、フォーマット処理、キーボード操作、レンダリング
- **Single Responsibility Principle違反**: 複数の責任が一つのクラスに集約
- **保守性の低下**: 変更時の影響範囲が広い
- **テスト困難**: 巨大なクラスのため単体テストが困難

### 現在のメソッド構成
```
- constructor, start, stop (ライフサイクル)
- addEvent, loadInitialEvents, getEventsToDisplay (イベント管理)
- render, buildHeader, buildEvents, buildFooter (レンダリング)
- formatEventLine, formatTimestamp, formatElapsed, formatDirectory, formatEventType, formatNumber (フォーマット)
- calculateDynamicWidth, truncateDirectoryPathWithWidth (レイアウト)
- setupKeyboardHandlers, handleKeyPress, setDisplayMode, handleExit (入力処理)
- addStatusMessage, updateStatusMessage, getStats (その他)
```

## 🎯 分割戦略（Single Responsibility Principle）

### 1. **EventDisplayManager** (`src/ui/event-display-manager.js`)
**責任**: イベントデータの管理とフィルタリング  
**抽出メソッド**:
- `addEvent()`, `loadInitialEvents()`, `getEventsToDisplay()`
- `events[]`, `uniqueEvents Map`の管理
- `displayMode`の切り替え処理

**期待行数**: 約100行

### 2. **EventFormatter** (`src/ui/formatters/event-formatter.js`)
**責任**: イベント行のフォーマット処理  
**抽出メソッド**:
- `formatEventLine()`, `formatTimestamp()`, `formatElapsed()`
- `formatDirectory()`, `formatEventType()`, `formatNumber()`
- `truncateDirectoryPathWithWidth()`

**期待行数**: 約120行

### 3. **LayoutManager** (`src/ui/layout/layout-manager.js`)
**責任**: 画面レイアウトと幅計算  
**抽出メソッド**:
- `calculateDynamicWidth()`, `setupResizeHandler()`
- `widthConfig`の管理
- レスポンシブ対応

**期待行数**: 約80行

### 4. **RenderController** (`src/ui/render/render-controller.js`)
**責任**: 画面描画の制御  
**抽出メソッド**:
- `buildHeader()`, `buildEvents()`, `buildFooter()`
- `render()`, `updateDisplay()`
- BufferedRendererとの統合

**期待行数**: 約100行

### 5. **InputHandler** (`src/ui/input/input-handler.js`)
**責任**: キーボード入力処理  
**抽出メソッド**:
- `setupKeyboardHandlers()`, `handleKeyPress()`
- `handleExit()`, `setDisplayMode()`

**期待行数**: 約90行

### 6. **CLIDisplay** (メインクラス - 大幅簡素化)
**責任**: 全体の調整とライフサイクル管理  
**残存メソッド**:
- `start()`, `stop()`, `constructor`
- 各マネージャーの統合
- 公開API

**期待行数**: 約150行

## 📋 実装順序とマイルストーン

### Phase 1: 独立性の高いクラスから開始
1. **EventFormatter** → 最も独立性が高い、純粋関数的
2. **LayoutManager** → シンプルな計算ロジック

### Phase 2: データ管理と描画制御
3. **EventDisplayManager** → データ管理の分離
4. **RenderController** → 描画制御の分離

### Phase 3: 入力処理と統合
5. **InputHandler** → 入力処理の分離
6. **CLIDisplay** → 最終統合とリファクタリング完了

## 🎯 期待される利点

### 開発効率向上
- **可読性向上**: 各ファイル100-150行程度で理解しやすい
- **責任明確化**: 単一責任によるコードの明確化
- **並行開発**: 独立したクラスによる並行作業可能

### 品質向上
- **テスト容易性**: 単一責任での効果的な単体テスト
- **保守性向上**: 変更影響範囲の限定
- **デバッグ容易性**: 問題箇所の特定が容易

### 再利用性
- **フォーマッター**: 他のUI要素での独立利用可能
- **レイアウト**: レスポンシブ機能の他画面での活用
- **入力処理**: キーボードハンドリングの再利用

## 🔄 移行戦略

### 後方互換性保証
- 既存のCLIDisplay公開APIは変更なし
- 外部からの使用方法は現状維持
- 内部実装のみリファクタリング

### テスト戦略
- 各新クラスの単体テスト作成
- 統合テストによる動作保証
- 既存テストの実行継続

### リスク軽減
- 段階的実装による影響範囲限定
- 各フェーズでの動作確認
- ロールバック可能な実装順序

## 📅 想定スケジュール

- **Phase 1**: EventFormatter, LayoutManager (1-2日)
- **Phase 2**: EventDisplayManager, RenderController (2-3日)  
- **Phase 3**: InputHandler, CLIDisplay統合 (2日)
- **テスト・調整**: 全体テストと微調整 (1日)

**合計**: 約1週間での完了を想定

## ✅ 完了条件

1. 全6クラスの実装完了
2. 既存機能の100%動作保証
3. 各クラスの単体テスト作成
4. コードレビューとドキュメント更新
5. パフォーマンス劣化なし

---

**承認状況**: ✅ 承認済み  
**次のアクション**: EventFormatter実装開始