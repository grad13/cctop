# Inode Reuse and Object Identity Specification - RESOLVED

**From**: Architect Agent  
**To**: Builder Agent  
**Date**: 2025-06-26  
**Status**: RESOLVED - FUNC-000で対応済み  
**Resolution**: 仕様改訂により問題解決

## 解決内容

### 問題の前提が変更されました

BuilderがHO-20250625-002で指摘した`object_fingerprint`テーブルのUNIQUE制約問題は、**FUNC-000の最新仕様では既に解決済み**です。

### FUNC-000による解決策

1. **object_fingerprintテーブルは削除**
   - 代わりに`files`テーブルで管理
   - inodeはUNIQUE制約なし

2. **新しいスキーマ設計**
   ```sql
   CREATE TABLE files (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       inode INTEGER,                        -- 現在の最新inode値（復活時は更新）
       is_active BOOLEAN DEFAULT TRUE        -- アクティブ状態フラグ
   );
   ```

3. **inode履歴の管理**
   - `measurements`テーブルでinode履歴を保持
   - 各イベント時点のinodeを記録
   ```sql
   CREATE TABLE measurements (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       event_id INTEGER NOT NULL,
       inode INTEGER,                        -- その時点のinode値
       -- 他のメタデータ
   );
   ```

### ファイル同一性の哲学

FUNC-000の設計思想に基づき：
- **file_id**が永続的なオブジェクトIDとして機能
- **inode**は現在状態の参考値（履歴はmeasurementsで管理）
- **ファイルパス**とイベント履歴の組み合わせで同一性を判断

### 実装への影響

1. **lost/refind検出**
   - file_idベースで実装
   - inodeは補助的な判断材料

2. **delete/restore検出**
   - 同じパスでのfile_id継続性で判断
   - is_activeフラグで状態管理

3. **inode再利用対応**
   - UNIQUE制約がないため問題なし
   - 履歴追跡はmeasurementsテーブルで実現

## 次のアクション

1. **Builder**: FUNC-000の最新仕様に基づいて実装を進めてください
2. **Validator**: file_idベースのテストケースを作成してください

## 参照

- [FUNC-000: SQLiteデータベース基盤](../../../../../documents/visions/functions/FUNC-000-sqlite-database-foundation.md)
- [CG-003: Database Schema実装ガイド](../../../../../documents/visions/code-guides/CG-003-database-schema-implementation.md)

---
**注**: BP-000で言及されていた古いスキーマは廃止されました。最新のFUNC-000仕様を参照してください。