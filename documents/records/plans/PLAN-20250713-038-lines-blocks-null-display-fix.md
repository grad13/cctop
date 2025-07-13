# PLAN-20250713-038: Lines/Blocks NULL値表示改善計画

**作成日**: 2025年7月13日  
**作成者**: Builder Agent  
**カテゴリ**: 🔧 開発プロセス改善  
**ステータス**: 実行完了 ✅

## 📋 概要

Lines/Blocksカラムでnull値が存在する場合、現在は"0"として表示されているが、ユーザーからの要求により"-"表示に変更する計画。

## 🎯 目的・背景

### 現在の問題
- null値が0として表示され、実際の0値と区別できない
- ユーザビリティの低下（特にバイナリファイルやサポート外ファイル）

### 改善後の期待効果
- null値とゼロ値の明確な区別
- より直感的なUI表示
- データの状態をユーザーが正確に把握可能

## 🔍 技術調査結果

### 現在のデータフロー
1. **Daemon側**: `MeasurementCalculator.ts`でnull値生成
   - エラー時、サポート外ファイル時に`blockCount: null`
2. **Database側**: `EventQueryAdapter.ts`でCOALESCE変換
   - `COALESCE(m.line_count, 0) as lines`
   - `COALESCE(m.block_count, 0) as blocks`
3. **View側**: `EventRow.ts`で0変換
   - `(this.data.lines || 0).toString()`
   - `(this.data.blocks || 0).toString()`

### 問題の根本原因
Database層でCOALESCEによりnull→0変換が行われ、View層でnull値の判定が不可能。

## 📐 実装計画

### Phase 1: Database層修正
**対象ファイル**: `/modules/view/src/database/EventQueryAdapter.ts`

**変更内容**:
```typescript
// 修正前
COALESCE(m.line_count, 0) as lines,
COALESCE(m.block_count, 0) as blocks,

// 修正後  
m.line_count as lines,
m.block_count as blocks,
```

### Phase 2: View層表示ロジック修正
**対象ファイル**: `/modules/view/src/ui/components/EventTable/EventRow.ts`

**変更内容**:
```typescript
// 修正前
const lines = (this.data.lines || 0).toString();
const blocks = (this.data.blocks || 0).toString();

// 修正後
const lines = this.data.lines === null || this.data.lines === undefined ? '-' : this.data.lines.toString();
const blocks = this.data.blocks === null || this.data.blocks === undefined ? '-' : this.data.blocks.toString();
```

### Phase 3: テスト・検証
1. **ビルド確認**: 型エラーの有無確認
2. **表示確認**: null値が"-"として表示されることを確認
3. **数値確認**: 実際の0値が"0"として表示されることを確認

## 🚨 リスク分析

### 技術的リスク
- **Low**: 表示ロジックのみの変更、データ構造に影響なし
- **型安全性**: TypeScriptによる型チェックで安全性確保

### 互換性リスク
- **None**: 既存APIや外部インターフェースに影響なし
- **データ整合性**: DatabaseのNULL値をそのまま利用

### ユーザー影響
- **Positive**: より直感的な表示
- **学習コスト**: 極めて低い（"-"は一般的な表記）

## ⏱️ 実行スケジュール

**総所要時間**: 約15分

1. **Phase 1 (5分)**: Database層修正・ビルド確認
2. **Phase 2 (5分)**: View層表示ロジック修正・ビルド確認  
3. **Phase 3 (5分)**: 動作確認・テスト

## ✅ 完了条件

- [ ] EventQueryAdapter.tsのCOALESCE削除完了
- [ ] EventRow.tsの表示ロジック修正完了
- [ ] ビルドエラーなし
- [ ] null値が"-"として表示される
- [ ] 数値の0が"0"として表示される
- [ ] git commit完了

## 🔄 ロールバック計画

変更が限定的なため、git revertで即座に復旧可能。

**ロールバック手順**:
1. `git revert <commit-hash>`
2. `npm run build`で確認

## 📝 備考

- ViewConfigとの統合実装完了後の小規模改善
- 将来的にはフォーマッター関数への統合も検討可能
- ユーザー設定による表示文字列のカスタマイズ可能性も将来検討

---

**実行承認**: ユーザー承認後、Builder Agentが実行