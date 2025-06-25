# REP-0099: Lost/Refind Event Design Rationale

**作成日**: 2025-06-25  
**作成者**: Builder Agent  
**カテゴリ**: 設計決定記録  
**関連**: BP-000, HO-20250625-001, HO-20250625-002

## 概要

lost/refindイベントタイプの導入理由と設計思想を記録する。

## 背景

### 問題1: 起動時の状態不明問題

cctopは常時起動しているとは限らない。停止中に発生したファイル操作は記録できない。

**シナリオ**:
```
時刻T1: cctop監視中 - file.txt作成 (object_id: 1, inode: 12345)
時刻T2: cctop停止
時刻T3: ユーザーがfile.txt削除（cctopは認識不可）
時刻T4: cctop起動 - DBには存在するが実ファイルは無い
```

**従来の問題点**:
- T4時点で「削除された」ことを記録できない
- ファイルの完全なライフサイクルが追跡不可能
- 「監視外削除」と「監視中削除」の区別がつかない

### 問題2: Delete Event Object_ID継承問題

deleteイベント発生時の技術的制約：
- ファイルが既に削除されているためinode取得不可
- inodeが無いとobject_fingerprintテーブルから既存object_id検索不可
- 結果：新規object_id生成 → ファイル履歴の断絶

## Lost/Refindの解決策

### Lost Event（喪失検出）

**定義**: 起動時スキャンで「DBに存在するが実体が無い」ファイルを検出

**実装**:
```javascript
async scanForLostFiles() {
  const liveFiles = await db.getLiveFiles(); // deleted = false
  for (const file of liveFiles) {
    if (!fs.existsSync(file.file_path)) {
      // 監視外で削除されたと推定
      await recordEvent('lost', file.object_id, ...);
    }
  }
}
```

**効果**:
1. 監視外削除の明示的記録
2. ファイル状態の完全性確保
3. 後続のrefind検出を可能に

### Refind Event（再発見）

**定義**: lostまたはdeleteされたファイルと同一性を持つファイルの再出現

**実装ロジック**:
```javascript
// create/findイベント時
const existing = await db.findByInode(stats.ino);
if (existing && existing.latest_event === 'lost') {
  // 同じinodeで復活 = 同一ファイルの可能性が高い
  return recordEvent('refind', existing.object_id, ...);
}
```

**統一化の決定**:
- lost → refind
- delete → refind（将来的にはrestoreと区別する可能性）
- 理由：イベントタイプの増加を抑制しつつ、メタデータで区別可能

## 設計上の利点

### 1. 完全なファイルライフサイクル追跡

```
create → modify → lost → refind → modify → delete → refind
```

すべての状態遷移が記録され、ファイルの「歴史」が途切れない。

### 2. Object_ID継承の改善

- lostイベント：既知のobject_idを保持
- refindイベント：同じobject_idで継続
- deleteイベント：パスベースでobject_id検索（lost/refind実装の副次効果）

### 3. ユーザー体験の向上

- UI表示：lost（暗い赤）、refind（明るい黄）で視覚的に識別
- 「このファイルは監視外で削除された」ことが明確
- ファイル復活のタイミングが可視化

## 実装上の課題と今後

### Inode再利用問題

- 長期運用でinode再利用による誤検出の可能性
- HO-20250625-002でArchitectに設計判断を依頼済み

### Event Typeの統一

- 現在：refindで統一（lost/delete両方からの復活）
- 将来：必要に応じてrestore等に分離可能
- メタデータにprevious_event_typeを保持する案も検討

## 結論

lost/refindイベントは、cctopが「部分的な監視ツール」から「完全なファイルライフサイクル追跡ツール」へ進化するための重要な機能追加である。監視していない期間の出来事を推測・記録することで、ユーザーにより完全な情報を提供できる。

## 参考資料

- BP-000: 基本仕様におけるイベントタイプ定義
- integrity-005.test.js: object_id継承テストケース
- Unix filesystem semantics: inode lifecycle documentation