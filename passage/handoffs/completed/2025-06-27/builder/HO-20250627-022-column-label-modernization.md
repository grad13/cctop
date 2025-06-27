# Builder Handoff: Column Label Modernization (Modified → Event Timestamp)

**作成日**: 2025-06-27 22:35 JST  
**作成者**: Architect Agent  
**依頼先**: Builder Agent  
**優先度**: Medium  
**推定工期**: 2-3時間  

## 📋 依頼概要

**目的**: 列ラベル「Modified」を「Event Timestamp」に変更し、意味的混乱を解消する

**背景**: 
- 現在「Modified」（最左列）と「modify」（Event列）で同じ「修正」を意味する英単語が重複使用
- ユーザーから「気持ち悪い」との指摘あり
- 実際の意味は「イベント発生時刻」なので「Event Timestamp」が適切

## 🎯 修正対象

### **仕様書修正完了済み**（Validator Agent実施）
以下7ファイルで「Modified」→「Event Timestamp」修正済み：
- FUNC-202/203/204/205/207
- BP-000/001

### **実装修正依頼**

#### **1. コード内の列ラベル表示**
`src/` 配下で「Modified」文字列を「Event Timestamp」に置換：

**対象ファイル候補**:
- Display関連クラス（CLI表示）
- Renderer関連クラス（テーブルヘッダー）
- Formatter関連クラス（列幅計算コメント等）

**検索方法**:
```bash
rg "Modified" cctop/src/
```

#### **2. FUNC-207色設定対応**
`current-theme.json`および関連コードで：
- `"modified_time"` → `"event_timestamp"`
- ColorManager.jsでの該当プロパティ名変更

#### **3. 幅計算コメント更新**
FUNC-204実装で使用されている可能性：
```javascript
// Modified(19) + Elapsed(10) + ...
↓
// Event Timestamp(19) + Elapsed(10) + ...
```

## 🔧 技術要件

### **置換精度**
- **完全一致**: 「Modified」文字列のみ（部分文字列での誤置換回避）
- **文脈確認**: ファイル変更時刻・イベント発生時刻の文脈のみ対象
- **幅維持**: 表示幅19文字は維持（Event Timestampも19文字）

### **テスト保証**
- 既存テストが期待値「Modified」を使用している場合は更新
- 表示確認テストでの正しい列ラベル検証
- 色設定テストでの正しいプロパティ名検証

## 📊 影響範囲分析

### **破壊的変更なし**
- 列幅・配置・データ内容は不変
- 機能的動作に影響なし
- 視覚的改善のみ

### **ユーザー影響**
- 列名が直感的に改善
- 既存操作方法は完全に同じ
- config.jsonの色設定プロパティ名変更（次回テーマ適用時に反映）

## ✅ 完了基準

### **Phase 1: コード修正**
- [ ] src/内「Modified」文字列の完全置換
- [ ] FUNC-207色設定プロパティ名変更
- [ ] 幅計算コメントの更新

### **Phase 2: 検証**
- [ ] 表示確認（列ラベルが「Event Timestamp」表示）
- [ ] 色設定動作確認（event_timestampプロパティ反映）
- [ ] 既存機能の無影響確認

### **Phase 3: テスト更新**
- [ ] 期待値「Modified」→「Event Timestamp」更新
- [ ] 表示テストの成功確認
- [ ] 色設定テストの成功確認

## 🚨 注意事項

### **慎重な置換実行**
- ファイル変更時刻関連の文脈でのみ置換
- システムの「modified」（変更フラグ等）は対象外
- Git commitメッセージ等の履歴情報は対象外

### **後方互換性考慮**
- 既存の`.cctop/current-theme.json`でmodified_timeプロパティが存在する場合の処理
- ColorManagerでの適切なフォールバック実装

## 🎯 期待効果

- **意味的明確性**: Event Timestamp vs Event の区別明確化
- **ユーザビリティ**: 直感的な列名による理解促進  
- **一貫性**: 仕様書と実装の完全統一

---

**核心価値**: 小さな改善による大きなユーザビリティ向上