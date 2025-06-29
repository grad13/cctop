# REP-0157: TypeScript移行による機能破壊問題調査レポート

**作成日**: 2025-06-29  
**作成者**: Builder  
**ステータス**: 活動中  
**カテゴリ**: 問題分析・根本原因調査  

## 概要

TypeScript移行作業（aggregate-display.js以外の3ファイル）実施後に発生した2つの重大な問題について調査・分析を行った。

## 発生した問題

### 1. 詳細モード遷移不可問題
- **症状**: Enterキーを押しても詳細モード（FUNC-402/403）に遷移しない
- **影響**: インタラクティブ機能の主要機能が使用不可能

### 2. DatabaseManager.isConnectedエラー
- **症状**: 起動後一定時間（約4秒）でUnhandled Rejectionエラーが発生
- **エラー**: `TypeError: databaseManager.isConnected is not a function`
- **発生箇所**: StatusDisplay.generateStatistics

## 調査結果

### 1. 詳細モード問題の原因

#### 根本原因
InteractiveFeaturesとSelectionManagerの連携が不完全

#### 詳細分析
1. **SelectionManager** (src/interactive/selection-manager.ts)
   - confirmSelectionメソッドは正しく実装されている
   - 選択したファイル情報を適切に返している

2. **KeyInputManager** (src/interactive/key-input-manager.ts)
   - handleSelectionConfirmメソッドはSelectionManagerのconfirmSelectionを呼び出している
   - しかし、その結果を使ってInteractiveFeaturesのonSelectionConfirmedコールバックを呼び出していない

3. **InteractiveFeatures** (src/ui/interactive/InteractiveFeatures.ts)
   - onSelectionConfirmedコールバックを設定している
   - しかし、KeyInputManagerから呼ばれることがない

#### 問題の連鎖
```
User Press Enter
  ↓
KeyInputManager.handleSelectionConfirm()
  ↓
SelectionManager.confirmSelection() // 正常に動作
  ↓
❌ InteractiveFeatures.onSelectionConfirmed() // 呼ばれない
  ↓
詳細モードに遷移しない
```

### 2. isConnectedエラーの原因

#### 根本原因
DatabaseManagerクラスにisConnectedメソッドが存在しない

#### 詳細分析
1. **StatusDisplay** (src/display/status-display.ts:230)
   ```typescript
   if (!databaseManager.isConnected()) {
     stats.status = 'Disconnected';
   }
   ```

2. **DatabaseManager** (src/database/database-manager.ts)
   - isConnectedメソッドが実装されていない
   - TypeScript移行前は実行時エラーが隠れていた可能性

## TypeScript移行の影響分析

### なぜこの問題が発生したか

1. **段階的移行の落とし穴**
   - 一部のファイルをTypeScript化する際、インターフェースの不整合が発生
   - JavaScriptでは実行時まで型エラーが検出されない

2. **暗黙的な依存関係**
   - SelectionManager（interactive/）とSelectionManager（ui/interactive/）の2つが存在
   - 相互の連携が複雑で、一部の連携が欠落

3. **メソッド存在チェックの欠如**
   - JavaScriptでは存在しないメソッドを呼んでも即座にはエラーにならない
   - TypeScript化により、これらの問題が顕在化

## 推奨される修正方針

### 1. isConnectedメソッドの追加
```typescript
// DatabaseManager.tsに追加
isConnected(): boolean {
  return this.db !== null && this.isInitialized;
}
```

### 2. KeyInputManagerの修正
InteractiveFeaturesへの参照を追加し、適切にコールバックを呼び出す

### 3. 統合テストの必要性
- TypeScript化は段階的ではなく、関連するモジュール群を一括で行うべき
- 各段階で主要機能（特に詳細モード）の動作確認を必須とする

## 教訓

1. **TypeScript移行は慎重に**
   - 相互依存するモジュールは同時に移行
   - 各段階で必ず動作確認

2. **暗黙的なインターフェースの明文化**
   - TypeScript化により、暗黙的な契約が破綻する
   - 事前にインターフェースを明確化する必要がある

3. **aggregate-display.jsを最後にした理由**
   - 過去の経験から、このファイルのTypeScript化で詳細モードが壊れることを認識
   - しかし、真の原因は他のモジュール間の連携にあった

## 次のアクション

1. DatabaseManagerにisConnectedメソッドを追加
2. KeyInputManagerとInteractiveFeaturesの連携を修正
3. 詳細モードの動作確認
4. 全体的な統合テストの実施

---

**キーワード**: TypeScript移行, 詳細モード, InteractiveFeatures, SelectionManager, DatabaseManager, isConnected, 機能破壊, 統合問題