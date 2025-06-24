---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: 畳語ファイル名修正, Task仕様更新v0.3, task-data-model.md task.md リネーム, vision-data-model.md vision.md リネーム, 長押し完了機能追加, H008仮説違反反省, 複数日タスク扱い明確化

---

# 畳語ファイル名修正とTask仕様更新

**作成日時**: 2025年6月13日 01:15

## 実施内容

### 1. 畳語ファイル名の修正
**問題**: `specifications/data/task-data-model.md` と `vision-data-model.md` が畳語になっていた
**対応**: 
- `task-data-model.md` → `task.md` にリネーム
- `vision-data-model.md` → `vision.md` にリネーム

### 2. 参照の更新
以下のファイルで参照を更新完了：
- `/documents/LEGACY_STATUS.md`
- `/documents/techs/roadmaps/quick-switch/README.md`
- `/documents/techs/specifications/README.md`
- `/documents/GUIDELINES.md`

### 3. Task仕様書の更新（v0.3）
**追加内容**:
1. **長押し完了機能**: 左側のタスクタブを長押しで即座に完了
2. **ID生成の明確化**: ユニークな整数であれば実装任意（Date.now()、インクリメンタル等）
3. **複数日タスクの扱い**: 日をまたいで継続可能、同じタスクIDで累積時間を記録

## 反省点

**H008仮説違反**: 再度、畳語によるファイル名を作成してしまった
- 原因: ディレクトリ名との組み合わせで畳語になることを見逃し
- 対策: ファイル作成時の命名チェックリストの厳格な適用

## 次のアクション

Vision-Task統合ロードマップに基づいて、既存実装との互換性確認を進める。