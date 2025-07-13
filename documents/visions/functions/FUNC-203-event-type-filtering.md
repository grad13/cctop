# FUNC-203: イベントタイプフィルタリング機能

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-000, FUNC-202, FUNC-300, FUNC-301  

## 📊 機能概要

イベントタイプ別のリアルタイムフィルタリング機能。キーボードショートカットによる特定イベントの表示/非表示切り替え。

**ユーザー価値**: 特定イベントタイプへの集中・ノイズ除去・効率的な監視

## 🎯 機能境界

### ✅ **実行する**
- イベントタイプ別フィルタリング（find/create/modify/delete/move/restore）
- フィルタロジックの実装
- FUNC-301への状態変更通知
- FUNC-300からのキー入力コールバック処理

### ❌ **実行しない**
- **キーボード入力の直接処理（FUNC-300の責務）**
- **フィルタ状態の管理・保持（FUNC-301の責務）**
- **表示データの生成・管理（FUNC-301の責務）**
- ファイル名・パス・サイズによるフィルタリング
- 複雑な検索クエリ・正規表現フィルタ

## 📋 必要な仕様

### **FUNC-300連携によるキー処理**

**基本方針**: キーボード入力はFUNC-300が受信し、待機状態時にFUNC-203がフィルタ処理を実行

| キー | イベントタイプ | 説明 | 登録優先度 |
|------|---------------|------|-----------|
| `f` | find | 初期スキャン | 低(10) |
| `c` | create | ファイル作成 | 低(10) |
| `m` | modify | ファイル変更 | 低(10) |
| `d` | delete | ファイル削除 | 低(10) |
| `v` | move | 移動・リネーム | 低(10) |
| `r` | restore | ファイル復元 | 低(10) |

**FUNC-300登録例**:
```javascript
KeyInputManager.register({
  id: 'event-filter-control',
  mode: 'waiting',
  keys: ['f', 'c', 'm', 'd', 'v', 'r'],
  priority: 10,
  callback: (key) => {
    const eventType = FUNC203.getEventTypeFromKey(key);
    FUNC301.toggleEventFilter(eventType); // 状態はFUNC-301で管理
  }
});
```

**注意**: 選択状態（PIL-002）時はこれらのキーは無効化され、選択操作が優先される

### **FUNC-301との連携**

**責務分離**:
- **FUNC-203**: イベントタイプ変換・フィルタロジック
- **FUNC-301**: フィルタ状態管理・操作履歴
- **FUNC-202**: フィルタ状態の視覚的表示

**連携フロー**:
```javascript
// FUNC-203の役割
class EventTypeFilter {
  getEventTypeFromKey(key) {
    const mapping = { 'f': 'find', 'c': 'create', 'm': 'modify', 'd': 'delete', 'v': 'move', 'r': 'restore' };
    return mapping[key];
  }
  
  applyFilter(events, activeFilters) {
    return events.filter(event => activeFilters.includes(event.eventType));
  }
}
```

### **フィルタ状態表示**

FUNC-202の表示に追加される形で、画面最下段に固定表示：

```
Event Timestamp      Elapsed  File Name                           Event    Lines  Blocks  Directory
────────────────────────────────────────────────────
2025-06-25 19:07:51    00:04  FUNC-120-event-type-filte...       modify     197      16  documents/visions/functions
2025-06-25 19:07:33    00:22  FUNC-001-file-lifecycle-t...       create     207      16  documents/visions/functions
────────────────────────────────────────────────────
All Activities  (4/156)
[a] All  [u] Unique  [q] Exit
[f]:Find [c]:Create [m]:Modify [d]:Delete [v]:Move [r]:Restore
```

- **アクティブ時**: キー文字 = 緑色、ラベル = 白色
- **非アクティブ時**: キー文字 = 黒色、ラベル = 暗灰色

### **動作仕様**

1. **デフォルト状態**: 全フィルタON（全イベント表示）
2. **トグル動作**: キー押下で表示/非表示切り替え
3. **即座反映**: フィルタ変更時、既存表示も即座に更新
4. **独立動作**: 各フィルタは独立してON/OFF可能

## 🔗 関連仕様

- **イベント定義**: [FUNC-001: ファイルライフサイクル追跡](./FUNC-001-file-lifecycle-tracking.md)
- **表示システム**: [FUNC-202: View表示統合](./FUNC-202-view-display-integration.md)

---

**核心価値**: キーボード操作による直感的なイベントフィルタリングで、必要な情報のみに集中