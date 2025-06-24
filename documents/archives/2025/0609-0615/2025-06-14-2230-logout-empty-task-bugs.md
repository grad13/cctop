---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: ログアウトエラー修正, 空タスク表示バグ解決, BUG-20250614-010 BUG-20250614-011, VisionStore nullエラー, TimeBox空文字フィルタリング, autosaveタイマー停止, v0.3.0リリース, 40個console.log削除

---

# ログアウトエラー・空タスク表示バグ修正 - 2025年6月14日 22:30

## 1. 空タスク表示バグ (BUG-20250614-010)

### 問題
TimeBoxに空文字タスクが表示される問題。Visionには保存するがTimeBoxでは非表示にすべき。

### ユーザー要件
> 「空文字はvisionのtaskとして扱っていいです ただしtimeboxには載せない」

### 実装内容
VisionStore読み込み時にフィルタリング追加:

```javascript
// timebox-core.js - loadTasksFromTaskGrid()
const tasks = visionTasks
  .filter(task => {
    // TimeBox表示用: 空文字タスクを除外（Visionには保持）
    if (!task || !task.content || task.content.trim() === '') {
      return false;
    }
    return true;
  })
```

## 2. ログアウト時VisionStore nullエラー (BUG-20250614-011)

### エラー内容
```
Uncaught TypeError: i is null
    saveToAutosave https://orbital-q.sakura.ne.jp/assets/landing-C3DLWL-D.js:449
```

### 根本原因
1. ログアウト処理で`visionStore.currentVision = null`を設定
2. その後、`saveToAutosave()`がnullの状態で実行
3. `JSON.parse(JSON.stringify(null))`でエラー

### 修正内容

#### app.js - saveToAutosave()
```javascript
saveToAutosave() {
  // currentVisionがnullの場合は何もしない
  if (!this.currentVision) {
    return;
  }
  // ... 既存の処理
}
```

#### account.html - ログアウト処理改善
```javascript
// autosaveタイマーを停止
if (window.parent.visionStore.autosaveTimer) {
  clearInterval(window.parent.visionStore.autosaveTimer);
  window.parent.visionStore.autosaveTimer = null;
}

// currentVisionをクリアしてから新規Visionを作成
window.parent.visionStore.currentVision = null;
window.parent.visionStore.createNewVision();
```

## 3. v0.3.0リリース作業

### デバッグログクリーンアップ
- 約40個のconsole.log削除
- パフォーマンス向上を確認
- console.error/warnの場所リストをユーザーに提供

### Git tag作成
```bash
git tag -a v0.3.0 -m "Major bug fixes and improvements..."
git push origin v0.3.0
```

## 関連ファイル
- `src/frontend/app.js`
- `src/frontend/islands/timebox/js/timebox-core.js`
- `src/frontend/islands/account/account.html`
- `documents/bugs/active/logout-visionstore-null-error-2025-06-14.md`
- `documents/bugs/active/timebox-empty-task-display-visionstore-2025-06-14.md`