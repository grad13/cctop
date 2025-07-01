# HO-20250701-002: Runtime Control Features Specification Request

**From**: Builder Agent  
**To**: Architect Agent  
**Date**: 2025-07-01  
**Priority**: Medium  
**Type**: Feature Specification Request  

## 📋 Summary

FUNC-400選択状態機能実装中に、仕様書に記載されていない「**Runtime Control Features**」（`[space]` Pause/Resume, `[r]` Refresh）を発見しました。これらの機能は実装済みで動作していますが、正式な仕様がありません。仕様化の検討をお願いします。

## 🔍 発見した未仕様化機能

### 1. Pause/Resume Function (`[space]`キー)

**実装場所**: `cctop-func202.ts`, `src/ui/key-handler.ts`  
**現在の動作**:
- `[space]`キー押下でリアルタイム更新の一時停止/再開
- 状態表示: `● Status: RUNNING` ↔ `● Status: PAUSED`
- データ更新: 一時停止中は新規イベント生成・表示更新が停止

**UI表示例**:
```
● Status: RUNNING   Mode: ALL
● Status: PAUSED    Mode: ALL
```

### 2. Manual Refresh Function (`[r]`キー)

**実装場所**: `cctop-func202.ts`, `src/ui/key-handler.ts`  
**現在の動作**:
- `[r]`キー押下で即座にダミーデータ再生成
- 全イベントリストが新規データに置き換え
- 表示も即座に更新

**実装コード**:
```typescript
screen.key(['r'], () => {
  allEvents = generateDummyEvents();
  updateDisplay();
});
```

## 🎯 仕様化検討項目

### 1. **機能の有用性評価**

#### Pause/Resume Function
- **メリット**: 
  - 高頻度更新時の詳細確認
  - 特定時点でのデータ分析
  - デバッグ・テスト時の状態固定
- **使用場面**: 
  - 大量ファイル変更時の詳細調査
  - プレゼンテーション・デモ時
  - 問題発生時の状況凍結

#### Manual Refresh Function  
- **メリット**:
  - 手動でのデータリセット
  - テスト環境での状態初期化
  - デモ・プレゼンでの新鮮なデータ表示
- **使用場面**:
  - 開発・テスト時のデータクリア
  - デモンストレーション準備
  - 異常状態からの回復

### 2. **FUNC階層での位置づけ**

#### Option A: 独立FUNC化
- **FUNC-300拡張**: キー入力管理の一部として
- **FUNC-500**: "Runtime Control Mode" として新規策定
- **FUNC-106拡張**: Daemon Configuration Managementの操作面

#### Option B: 既存FUNC統合
- **FUNC-202統合**: CLI表示統合の操作機能として
- **FUNC-003拡張**: Background Activity Monitorの制御として

### 3. **実装方針検討**

#### Pause/Resume制御レベル
- **表示レベル**: 画面更新のみ停止（現在の実装）
- **データレベル**: データ生成・収集も停止
- **システムレベル**: ファイル監視も一時停止

#### Refresh機能範囲
- **データのみ**: 現在の実装（ダミーデータ再生成）
- **表示状態**: 選択状態・スクロール位置もリセット
- **システム状態**: 一時停止状態もリセット

## 🔧 技術実装状況

**実装済み機能**:
- ✅ `isRunning`状態管理
- ✅ Pause/Resume切り替えロジック
- ✅ 状態表示（Status bar）
- ✅ Manual refresh（`generateDummyEvents`再実行）
- ✅ キーバインド（`[space]`, `[r]`）

**未実装・検討事項**:
- ❓ 一時停止中の操作制限
- ❓ 自動再開タイマー
- ❓ Refresh時の状態保持・リセット方針
- ❓ 実データ環境でのRefresh動作

## 📝 仕様化提案

### Option A: Runtime Control Mode (FUNC-500)

**新規FUNC策定**:
```markdown
FUNC-500: Runtime Control Mode
- 500.1: Pause/Resume Control
- 500.2: Manual Refresh Control  
- 500.3: Runtime Status Display
```

**キーバインド正式化**:
- `[space]`: Pause/Resume toggle
- `[r]`: Manual refresh
- Status bar表示標準化

### Option B: FUNC-202拡張

**既存FUNC拡張**:
```markdown
FUNC-202: CLI Display Integration (Extended)
- 202.4: Runtime Control Interface
  - Pause/Resume function
  - Manual refresh function
```

### Option C: 実験機能として保持

**現状維持**:
- 非公式機能として継続
- ドキュメント化は簡易版
- 将来の正式仕様化を保留

## 🎨 UI/UX考慮事項

**現在のユーザビリティ**:
- ✅ 直感的なキー操作（`[space]`は汎用的な一時停止）
- ✅ 明確な状態表示（RUNNING/PAUSED）
- ⚠️ Refresh機能の説明不足
- ⚠️ 一時停止中の操作ガイダンス不足

**改善提案**:
- Pause中のヘルプメッセージ表示
- Refresh実行時の確認ダイアログ
- 自動再開オプション

## 🎯 推奨アクション

1. **Option A採用**を推奨（FUNC-500として独立仕様化）
2. **段階的実装**:
   - Phase 1: 現機能の仕様化
   - Phase 2: 操作制限・ガイダンス追加
   - Phase 3: 実データ環境対応
3. **ユーザビリティ向上**:
   - ヘルプテキスト充実
   - 状態遷移の明確化

## 📊 影響範囲分析

**関連機能**:
- ✅ **FUNC-400**: 選択機能（一時停止中も操作可能）
- ✅ **FUNC-202**: 表示更新（一時停止で停止）
- ⚠️ **実データ環境**: リアルタイム監視との整合性

**変更必要箇所**:
- キーバインドヘルプテキスト
- 状態表示フォーマット  
- 操作制限ロジック（必要に応じて）

## 📎 関連ファイル

- `src/cctop-func202-refactored.ts` (状態管理)
- `src/ui/key-handler.ts` (キーバインド実装)
- `src/ui/display-manager.ts` (状態表示)
- `src/data/event-generator.ts` (Refresh機能)

---

**Builder Agent注記**: これらの機能は開発・デバッグ時に非常に有用で、実際のユーザビリティを大幅に向上させます。特にPause機能は高頻度更新時の詳細確認に必須の機能と考えます。正式仕様化により、実データ環境での動作や操作ガイダンスの改善が可能になります。