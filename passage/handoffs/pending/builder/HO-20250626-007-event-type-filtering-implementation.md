# Handoff: FUNC-020 イベントタイプフィルタリング機能実装依頼

**From**: Validator  
**To**: Builder  
**Date**: 2025-06-26 16:15 JST  
**Priority**: High  
**Type**: Feature Implementation - FUNC-020 イベントタイプフィルタリング機能  

## 📋 実装依頼背景

### ✅ validate-006調査結果
- **Architectからの依頼**: イベントタイプフィルタリング機能の包括的テスト実施
- **Validator調査**: **BP-001でモックテストのみ存在、実装は未完了**
- **確認済み**: `test/integration/bp001/event-filtering.test.js`にテストコードあり
- **不足**: EventFilterManager、FilterStatusRenderer等の実装が存在しない

### 🚨 実装の必要性
**リアルタイムイベントフィルタリング**:
- f/c/m/d/vキーによるフィルタ切り替え
- 最下段フィルタライン表示（色分け）
- 既存表示の即座更新（動作A）
- 大量イベント処理でのパフォーマンス確保

## 🎯 実装要件

### 1. EventFilterManagerクラス実装

**ファイル**: `src/filter/EventFilterManager.js`

**必要な機能**:
```javascript
class EventFilterManager extends EventEmitter {
  constructor() {
    this.filters = {
      find: true,    // fキー
      create: true,  // cキー
      modify: true,  // mキー
      delete: true,  // dキー
      move: true     // vキー
    };
  }
  
  toggleFilter(eventType) {
    // フィルタ状態切り替え
    // filterChanged イベント発火
  }
  
  isVisible(eventType) {
    // イベント表示可否判定
  }
  
  getFilterState() {
    // 現在のフィルタ状態取得
  }
}
```

### 2. FilterStatusRendererクラス実装

**ファイル**: `src/ui/FilterStatusRenderer.js`

**必要な機能**:
```javascript
class FilterStatusRenderer {
  static renderFilterLine(filters) {
    // フィルタライン描画
    // [f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
    // アクティブ: 緑色、非アクティブ: 黒色
  }
}
```

### 3. キーボードハンドリング統合

**修正対象**: `src/ui/cli-display.js`または新規ファイル

**必要な機能**:
- f/c/m/d/vキー押下時のフィルタ切り替え
- 既存キー（h=help、q=quit）との競合回避
- フィルタ変更時の画面即座更新

### 4. 表示統合

**修正対象**: 画面レンダリング関連ファイル

**要件**:
- 最下段でのフィルタライン表示
- フィルタ変更時の既存イベント即座更新（動作A）
- レスポンシブ対応（ターミナルサイズ変更）

## 📊 期待される表示

### フィルタライン表示例

#### 全フィルタON時（デフォルト）
```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
 ↑緑色  ↑緑色    ↑緑色    ↑緑色    ↑緑色
```

#### 部分フィルタOFF時
```
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move
 ↑黒色  ↑緑色    ↑黒色    ↑緑色    ↑緑色
（findとmodifyがOFF）
```

### フィルタ切り替え動作

#### フィルタ前（全表示）
```
ID   EVENT   FILE
1    create  a.js
2    modify  b.js
3    delete  c.js
```

#### createフィルタOFF後（動作A：即座更新）
```
ID   EVENT   FILE
2    modify  b.js
3    delete  c.js
（createイベントが即座に非表示）
```

## 🔧 技術仕様

### キーボード処理
```javascript
process.stdin.on('keypress', (str, key) => {
  switch(key.name) {
    case 'f':
      filterManager.toggleFilter('find');
      break;
    case 'c':
      filterManager.toggleFilter('create');
      break;
    // ... 他のキー
  }
});
```

### ANSI色分け
```javascript
const colors = {
  active: '\x1b[32m',    // 緑色
  inactive: '\x1b[30m',  // 黒色
  reset: '\x1b[0m'
};
```

### パフォーマンス要件
- **10,000イベント時のフィルタ切り替え**: 100ms以内
- **フィルタライン描画**: 1000回描画が10ms以内
- **メモリ使用量**: 追加50MB以内

## 🚨 重要な設計原則

### 動作A実装（既存表示の即座更新）
- フィルタ変更時に既に表示されているイベントも即座に更新
- 新規イベントだけでなく、過去イベントの表示・非表示切り替え
- スムーズな視覚体験の提供

### 既存機能との統合
- 現在のキーボードハンドリング機能を破壊しない
- 既存の画面表示・レンダリング機能との協調
- chokidarイベント処理への影響なし

### ユーザビリティ
- 直感的なキーバインド（f=find、c=create等）
- 明確な視覚フィードバック（色分け）
- 誤操作時の適切な挙動

## 📁 実装構成

### 新規作成ファイル
1. `src/filter/EventFilterManager.js` - フィルタ管理
2. `src/ui/FilterStatusRenderer.js` - フィルタライン描画
3. `test/unit/filter/event-filter-manager.test.js` - 単体テスト
4. `test/unit/ui/filter-status-renderer.test.js` - 単体テスト

### 修正対象ファイル
1. `src/ui/cli-display.js` - キーボード処理・画面表示統合
2. `src/index.js` - フィルタマネージャー初期化
3. 画面レンダリング関連ファイル - フィルタライン表示統合

### 統合テスト拡張
1. BP-001実装テストの実機能化
2. パフォーマンステスト追加
3. UI/UXテスト追加

## ⚠️ 実装上の注意事項

### パフォーマンス
- イベントフィルタリングの高速化
- 大量イベント時のメモリ効率
- UI更新頻度の最適化

### 互換性
- 既存キーボードショートカット維持
- 複数ターミナルでの表示確認
- 色覚多様性への配慮

### エラーハンドリング
- 無効なevent_typeの適切な処理
- フィルタ状態の整合性保証
- UI更新失敗時のフォールバック

## 🎯 実装完了条件

- [ ] EventFilterManagerクラス実装完了
- [ ] FilterStatusRenderer実装完了
- [ ] キーボードハンドリング統合完了
- [ ] フィルタライン表示統合完了
- [ ] 動作A実装（既存表示即座更新）完了
- [ ] 単体テスト実装完了
- [ ] パフォーマンス要件クリア確認
- [ ] 既存機能への影響なし確認

## 📋 Validator側対応予定

**実装完了後のValidator作業**:
1. validate-006 包括的テスト実行
2. f/c/m/d/vキーによるフィルタ切り替え確認
3. フィルタライン表示（色分け・配置）確認
4. 動作A実装（即座更新）確認
5. パフォーマンステスト（10,000イベント・100ms以内）
6. 実機能テスト（複数シナリオ）
7. UI/UX品質確認
8. 回帰テスト（既存機能への影響なし）

## 🔗 関連リソース

**既存テストコード**: `test/integration/bp001/event-filtering.test.js`
- フィルタリング動作の期待値参考
- キーボードハンドリング仕様
- フィルタ状態管理方法

**設計仕様**: Architectによるvalidate-006 handoff
- 詳細な技術仕様
- UI配置・色分け要件
- パフォーマンス基準

---

**緊急度**: 高 - Phase 1機能の完成  
**推定作業時間**: 6-8時間  
**技術難易度**: 中～高（UI統合・パフォーマンス）