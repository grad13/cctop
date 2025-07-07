# FUNC-210: UI Filter統合機能

**作成日**: 2025年7月7日  
**更新日**: 2025年7月7日  
**作成者**: Architect Agent  
**Version**: 1.0.0.0  
**関連仕様**: FUNC-000, FUNC-202, FUNC-203, FUNC-300  

## 📊 機能概要

3つのフィルター機能（Display Mode、Event Filter、Keyword Filter）を統合し、一貫した処理順序と期待動作を提供するUI Filter統合機能。

**ユーザー価値**:
- 直感的で予測可能なフィルター動作
- 複数フィルターの組み合わせによる柔軟な表示制御
- 開発・テストにおける明確な動作基準

## 🎯 機能境界

### ✅ **実行する**
- 3つのフィルター機能の統合処理
- 処理順序の標準化
- 期待動作の明確化
- エッジケース動作の定義

### ❌ **実行しない**
- 各フィルター機能の個別実装（FUNC-202, FUNC-203, FUNC-300の責務）
- データベースアクセス（FUNC-000の責務）
- UIレンダリング（FUNC-201の責務）

## 📋 必要な仕様

### **3つのフィルター機能**

#### **1. Display Mode (all/unique)**
- **All Mode**: 全イベントを時系列で表示
- **Unique Mode**: 各ファイルの最新イベントのみ表示
- **制御**: `[a]` All, `[u]` Unique キー

#### **2. Event Filter (イベントタイプ絞り込み)**
- **対象**: find, create, modify, delete, move, restore
- **動作**: チェックされたイベントタイプのみ表示
- **制御**: `[f]` `[c]` `[m]` `[d]` `[v]` `[r]` キー

#### **3. Keyword Filter (ファイル名・パス絞り込み)**
- **対象**: file_name, directory フィールド
- **動作**: 部分一致による絞り込み
- **制御**: `[Enter]` キーでDB検索実行

### **処理順序仕様（Filter First方式）**

**標準処理順序**:
1. **Keyword Filter**: 対象データを絞り込み
2. **Display Mode**: all/unique適用
3. **Event Filter**: 最終結果に対してフィルター

**実装方針**:
- **unique mode**: CTE使用の段階的処理
- **all mode**: WHERE句による並列処理
- **パフォーマンス**: データベースレベルで絞り込み効率化

### **期待動作定義**

#### **Pattern 1: Unique Mode + Event Filter**

**ケース1-1: 削除されたファイル（Delete除外）**
```
Data: FileA [Create→Modify→Delete]
Filter: ['create', 'modify'] (delete除外)
Result: FileA非表示
Reason: 最新イベント(Delete)が除外対象
```

**ケース1-2: 生存ファイル（Modify除外）**
```
Data: FileB [Create→Modify]
Filter: ['create', 'delete'] (modify除外)
Result: FileB非表示
Reason: 最新イベント(Modify)が除外対象
```

**ケース1-3: 混合状態**
```
Data: FileA [Create→Delete], FileB [Create→Modify]
Filter: ['create'] (modify,delete除外)
Result: FileA,FileB両方非表示
Reason: 両ファイルとも最新イベントが除外対象
```

#### **Pattern 2: All Mode + Event Filter**

**ケース2-1: 部分表示**
```
Data: FileA [Create→Modify→Delete]
Filter: ['create', 'modify'] (delete除外)
Result: FileA [Create, Modify]のみ表示
Reason: 各イベントが個別に評価される
```

#### **Pattern 3: Keyword + Unique + Event Filter**

**ケース3-1: 段階的絞り込み**
```
Data: test.txt [Create→Delete], other.txt [Create→Modify]
Keyword: 'test'
Filter: ['create'] (delete除外)
Result: test.txt非表示
Reason: 1.keyword一致→test.txt選択 2.unique処理→Delete 3.filter除外
```

### **エッジケース定義**

#### **Edge 1: 空の結果セット**
```
Scenario: 全イベントタイプ除外 filters=[]
Result: 空配列 []
Display: "No events match current filters"
```

#### **Edge 2: Delete専用ファイル**
```
Data: FileC [Delete]のみ
Filter: ['create', 'modify'] (delete除外)
Result: FileC非表示
Reason: 唯一のイベントが除外対象
```

#### **Edge 3: キーワード無し**
```
Keyword: '' (空文字列)
Behavior: 全ファイル対象
SQL: WHERE句にキーワード条件を含めない
```

### **状態管理仕様**

#### **フィルター状態**
```typescript
interface FilterState {
  mode: 'all' | 'unique';
  eventFilters: string[];
  keywordFilter: string;
}
```

#### **適用タイミング**
- **リアルタイム**: Event Filter、Display Mode切り替え
- **手動実行**: Keyword Filter（[Enter]キー）

#### **表示更新制御**
- **即座更新**: フィルター変更時、既存表示も即座に反映
- **条件外データ**: 画面更新せずメモリ保持のみ

### **データベース実装**

#### **SQL実装パターン**

**Unique Mode (CTE使用)**:
```sql
WITH latest_events AS (
  SELECT 
    e.*,
    ROW_NUMBER() OVER (PARTITION BY e.file_id ORDER BY e.timestamp DESC) as rn
  FROM events e
  WHERE (e.file_name LIKE ? OR e.directory LIKE ?)
)
SELECT 
  le.id,
  le.timestamp,
  le.file_name as filename,
  le.directory,
  et.name as event_type,
  COALESCE(m.file_size, 0) as size,
  COALESCE(m.line_count, 0) as lines,
  COALESCE(m.block_count, 0) as blocks,
  COALESCE(m.inode, 0) as inode,
  0 as elapsed_ms
FROM latest_events le
JOIN event_types et ON le.event_type_id = et.id
LEFT JOIN measurements m ON le.id = m.event_id
WHERE 
  le.rn = 1
  AND et.name IN (${filterConditions})
ORDER BY le.timestamp DESC 
LIMIT ? OFFSET ?
```

**All Mode (WHERE句使用)**:
```sql
SELECT 
  e.id,
  e.timestamp,
  e.file_name as filename,
  e.directory,
  et.name as event_type,
  COALESCE(m.file_size, 0) as size,
  COALESCE(m.line_count, 0) as lines,
  COALESCE(m.block_count, 0) as blocks,
  COALESCE(m.inode, 0) as inode,
  0 as elapsed_ms
FROM events e
JOIN event_types et ON e.event_type_id = et.id
LEFT JOIN measurements m ON e.id = m.event_id
WHERE 
  (e.file_name LIKE ? OR e.directory LIKE ?)
  AND et.name IN (${filterConditions})
ORDER BY e.timestamp DESC 
LIMIT ? OFFSET ?
```

### **テスト仕様**

#### **必須テストケース**
1. **Unique + Delete除外**: 削除されたファイルが非表示になること
2. **All + Delete除外**: 削除イベントのみが除外されること
3. **Keyword + Unique + Event**: 段階的フィルタリングが正しく動作すること
4. **空の結果セット**: 条件に合致するデータがない場合の動作
5. **Delete専用ファイル**: Delete eventのみのファイルの動作
6. **処理順序**: Filter First方式の動作確認

#### **パフォーマンステスト**
- **大量データ**: 10,000件のイベントに対する処理時間
- **複合フィルター**: 3つのフィルター同時適用時のパフォーマンス

## 🔗 関連仕様

- **データベース**: [FUNC-000: File Event Database](./FUNC-000-file-event-database.md)
- **表示システム**: [FUNC-202: CLI表示統合](./FUNC-202-cli-display-integration.md)
- **イベントフィルタ**: [FUNC-203: イベントタイプフィルタリング](./FUNC-203-event-type-filtering.md)
- **キー入力**: [FUNC-300: キー入力管理](./FUNC-300-key-input-manager.md)

## 🎯 実装ガイドライン

### **開発優先度**
1. **High**: 処理順序の統一（Filter First方式）
2. **High**: Unique Mode + Event Filter の動作確認
3. **Medium**: エッジケース動作の実装
4. **Low**: パフォーマンス最適化

### **品質保証**
- **TDD**: テストファースト開発
- **動作検証**: 各シナリオの手動確認
- **回帰テスト**: 既存機能への影響確認

---

**核心価値**: 予測可能で直感的なフィルター動作により、効率的な情報表示を実現