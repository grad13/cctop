---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（統合移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/bugs/archive/
- 検索キーワード: バグアーカイブ管理, 解決済みバグファイル保存, Builder Agent管理, 9件アーカイブ済み, Critical High Medium重要度分類, active archive構造導入, 学習資料活用, 知識継承

---

# Bugs Archive

**目的**: 解決済みバグファイルのアーカイブ保存  
**管理者**: Coder Agent  
**作成日**: 2025年6月14日  
**更新日**: 2025年6月14日（active/archive構造導入）

## 📋 アーカイブ方針

### 移動対象
- **解決済みバグ**: ステータスが「解決済み」のバグファイル
- **時期**: 解決完了後、即座にアーカイブ
- **目的**: `documents/bugs/active/`の整理・可視性向上、知識蓄積

### 移動基準
1. **解決完了**: 修正・テスト・検証がすべて完了
2. **即座移動**: 解決後、時間を置かずにアーカイブ
3. **目的**: active/は常に現在の問題のみ、archive/は学習資料

### 移動手順（Coder Agent権限）
```bash
# 解決済みバグをアーカイブに移動
mv documents/bugs/active/[解決済みバグファイル].md documents/bugs/archive/

# 例
mv documents/bugs/active/timebox-pause-timer-fix-2025-05-14.md documents/bugs/archive/
```

## 📁 ファイル構成

### 2025年6月14日アーカイブ（8件）
**重要度別・カテゴリ別分類**:

#### Critical解決済みバグ
- `taskgrid-timebox-sync-failure-2025-06-14.md` - TaskGrid↔TimeBox同期失敗（D003包括調査で解決）
- `taskgrid-save-load-row-deletion-2025-06-14.md` - Save/Load時の行削除（責任分離で解決）
- `timebox-reload-data-loss-2025-06-14.md` - リロード時データ損失（初期化改善で解決）

#### High重要度バグ
- `taskgrid-input-focus-conflict-2025-06-14.md` - TaskGrid入力フォーカス競合（Quick Switch調整で解決）
- `timebox-empty-task-display-2025-06-14.md` - 空タスク表示問題（多重フィルタリングで解決）
- `timebox-empty-task-still-displayed-2025-06-14.md` - 空タスク継続表示（シンプルフィルタで解決）
- `timebox-task-list-time-reset-on-pause.md` - pause時時間リセット（pause/stop概念分離で解決）

#### Medium重要度バグ
- `timebox-dom-null-error-2025-06-14.md` - DOM nullエラー（null safety追加で解決）
- `timebox-performance-slow-2025-06-14.md` - パフォーマンス低下（大量ログ削除で解決）

### 命名規則維持
- アーカイブ後も元のファイル名を維持
- `[機能名]-[問題概要]-[日付].md`形式

### 内容保持
- バグ記録の内容は完全保持
- 解決プロセス・学習事項すべて保存
- 将来の参考資料として活用可能

## 🔍 アーカイブファイルの活用

### 参照目的
- **類似バグ対応**: 過去の解決方法を参考
- **パターン分析**: バグの傾向・原因パターン把握
- **予防策検討**: 同種バグの再発防止
- **知識継承**: 新しいCoder Agentへの知識継承

### アクセス権限
- **Coder Agent**: 読み取り・移動・整理権限
- **他Agent**: 読み取り専用（必要に応じて）

## ⚠️ 注意事項

### 削除禁止
- アーカイブファイルは削除せず永続保存
- 学習資料・参考事例として価値あり

### 品質維持
- 移動前にバグ記録の完全性を確認
- 解決内容・学習事項が適切に記載されていることを確認

### 整理頻度
- 月1回程度の定期整理を推奨
- `documents/bugs/`が混雑した際の随時整理

---

**管理責任**: Coder Agent  
**参照権限**: 全Agent（読み取り専用）  
**更新権限**: Coder Agent専用