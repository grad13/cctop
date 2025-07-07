# HO-20250707-001 UI Filter Specification

**作成日**: 2025年7月7日  
**送信者**: Runner  
**受信者**: Architect  
**優先度**: High  
**カテゴリ**: 機能仕様整理

---

## 🎯 背景・目的

### 問題
- unique/all, event filter, keyword filterの3つの機能の関係性が不明確
- 処理順序の問題によりバグが発生（削除されたファイルの表示問題）
- 仕様書の欠落によりテスト作成が困難

### 目的
- 3つのフィルター機能の仕様を明確に定義
- 処理順序と期待動作を文書化
- 今後の開発・テスト作成の指針とする

---

## 🔍 UI Filter機能の現状分析

### Vanilla状態（フィルター適用前）
```
データベースから全イベントを時系列降順で取得
SELECT * FROM events ORDER BY timestamp DESC
```

### 1. Display Mode (all/unique)
**All Mode**:
- 全イベントを時系列で表示
- 同一ファイルの複数イベントがそのまま表示される

**Unique Mode**:
- 各ファイルの最新イベントのみ表示
- GROUP BY file_idで最新のevent_idを取得

### 2. Event Filter (イベントタイプ絞り込み)
**対象イベント**:
- Create, Modify, Delete, Move, Find, Restore

**動作**:
- チェックされたイベントタイプのみ表示
- WHERE event_type IN (...) による絞り込み

### 3. Keyword Filter (ファイル名・パス絞り込み)
**対象フィールド**:
- file_name (ファイル名)
- directory (ディレクトリパス)

**動作**:
- 部分一致による絞り込み
- WHERE (file_name LIKE '%keyword%' OR directory LIKE '%keyword%')

---

## 🎯 確定した仕様定義

### Unique Mode の正式定義
**「uniqueは最新のを表示する機能」**

### 正しい処理順序
**Pattern: Unique First → Filter Check**
1. **Unique処理**: 各ファイルの最新イベントを特定
2. **Filter Check**: その最新イベントがevent filterの条件を満たすかチェック
3. **表示判定**: 条件を満たすファイルのみ表示

### 具体的な動作例
**ケース**: ファイルA (Create → Modify → Delete) + Delete除外
- **手順1**: 各ファイルの最新イベント特定 → ファイルAの最新 = Delete
- **手順2**: Delete eventがevent filter対象外かチェック → 対象外
- **結果**: **ファイルA全体が非表示**（CreateもModifyも表示されない）

### 集合論的アプローチ
- **Table**: 現在時点の集合を表現
- **操作**: all/unique, event filter, keyword filterにより集合が変化
- **表示**: 最終的な集合がCLI表示される

---

## 📊 詳細仕様（確定事項）

### 1. データ状態管理
**状態保持**:
- **メモリ管理**: 操作履歴をメモリで保持
- **操作履歴**: FilterState形式で管理

```typescript
interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];
  keywordFilter: string;
}
```

**更新フロー**:
1. vanilla tableの集合が更新される
2. 操作履歴をapply
3. 新要素があるなら画面に反映

### 2. Keyword Filter詳細仕様
**実行タイミング**:
- **リアルタイム更新ではない**
- **[Enter]押下時**にDB検索を実行
- 検索結果はvanilla tableの集合に統合

**データ管理**:
- DB検索結果をvanilla tableに結合
- 一定件数超過時は古い順に削除

### 3. 動的データ読み込み
**トリガー条件**:
- 画面内にrowがfillされていない場合
- 選択rowがtable最下部になる場合
- 100msポーリング
- 「end of dataが表示されない」状態での上記条件

**処理**:
- 操作履歴を再度apply
- 結果を画面に反映

### 4. 操作制御・ESCキー
**編集モード中の[ESC]**:
- event filter/keyword filter入力モードで[ESC]
- **編集結果を破棄**し、元の状態に戻す

**Normal Mode中の[ESC]**:
- **全てのeditをclear**
- 初期化状態: **all mode + no filters**

### 5. 適用タイミング
**基本原則**: リアルタイム更新
**例外**: keyword searchのDB検索のみ[Enter]時

### 6. 状態の可視化
**Display Mode**:
- all/unique: **選択中を赤色**などで表示

**Event Filter**:
- 現在の表示内容で確認可能（専用表示不要）

**Keyword Filter**:
- 最上部に表示済み（既存設計）

### 7. 画面更新制御
**フィルター適用時**:
- DBに新規追加されたeventがfilter条件に合致しない場合
- **画面更新しない**（tableで保持のみ）

### 8. 重要な仕様確認事項
**処理順序の非依存性**:
- event filterとkeyword filterは **AND条件で無矛盾**
- unique処理と組み合わせても **順序非依存**
- 「ファイルごとに最新のeventを表示する」定義により簡略化可能

**実装の自由度**:
- **データ量制限**: 1GB程度のメモリ使用で十分
- **エラーハンドリング**: .cctopディレクトリに適当に出力
- **UI実装詳細**: Runner判断で適切に実装
- **end of data表示**: 「該当データがない場合に表示」で十分

**セッション・パフォーマンス**:
- **セッション永続化**: 概念が不明確のため対応不要
- **処理時間**: 通常は問題にならないレベル
- **100msポーリング**: 今回決定する必要なし

---

## 🎯 Architect への依頼事項

### 1. 処理順序の仕様策定
以下の処理順序について、正式な仕様を策定してください：

```
Option A: Filter First (推奨)
1. Keyword Filter (対象データを絞り込み)
2. Event Filter (イベントタイプ絞り込み)
3. Display Mode (all/unique適用)

Option B: Display Mode First
1. Keyword Filter 
2. Display Mode (all/unique適用)
3. Event Filter (最終結果に対してフィルター)
```

### 2. 各組み合わせの期待動作
以下のシナリオについて、期待される動作を定義してください：

**シナリオ1**: Unique + Delete Filter除外
- 削除されたファイルは表示されない（推奨）
- または、削除されたファイルの削除前最新イベントを表示

**シナリオ2**: Keyword + Unique + Event Filter
- 3つのフィルターが同時適用された場合の処理順序

**シナリオ3**: Event Filterで全イベント除外
- 空の結果セットを返す動作

### 3. エッジケースの定義
- 削除されたファイルの扱い
- 検索キーワードがない場合の動作
- フィルター条件に該当するデータがない場合

---

## 📊 技術的詳細

### 現在の実装状況
- **場所**: `database-adapter-func000.ts`
- **修正内容**: CTEを使用したFilter First方式に変更済み
- **テスト状況**: 既存テストの期待値が古い動作基準

### 影響範囲
- UI表示ロジック
- データベースクエリ
- 既存テスト（期待値更新が必要）

---

## 🔄 Next Actions

### Architect作業
1. **機能仕様書作成**: 3つのフィルター機能の正式仕様
2. **処理順序決定**: 推奨される処理順序の決定
3. **エッジケース定義**: 各シナリオの期待動作

### Runner作業（実装待ち）
1. **テスト更新**: 新仕様に基づくテスト期待値更新
2. **実装調整**: 必要に応じて処理順序の調整
3. **動作検証**: 各シナリオの動作確認

---

## 📋 参考情報

### 関連ファイル
- `modules/cli/src/database/database-adapter-func000.ts` (実装)
- `modules/cli/test/database/filter-processing-order.test.ts` (新規テスト)

### 関連コミット
- `63359db`: unique mode filter processing order修正

### 現在のWorktree
- `07-04-search-db-refactor`: 当該修正を実装済み

---

**Runner**: 仕様策定後、実装・テストの整備を進めます。よろしくお願いします。