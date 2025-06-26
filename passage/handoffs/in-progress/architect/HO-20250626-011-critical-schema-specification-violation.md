# Architect依頼: Critical Schema Specification Violation

**依頼ID**: HO-20250626-011  
**作成日**: 2025-06-26  
**依頼元**: Builder Agent  
**優先度**: Critical  
**種別**: Architecture Specification Violation  

## 🚨 Critical Issue: FUNC-000仕様完全違反

**現在のschema.jsがFUNC-000公式仕様と完全に乖離している重大な問題を発見**

## 📋 仕様違反の詳細

### FUNC-000公式仕様 (filesテーブル)
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inode INTEGER,                        -- 現在の最新inode値（復活時は更新）
    is_active BOOLEAN DEFAULT TRUE        -- アクティブ状態フラグ
);
```
**シンプル**: 3フィールドのみ

### 現在のschema.js実装 (filesテーブル)
```sql
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  inode INTEGER,
  is_directory INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  last_event_id INTEGER,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (last_event_id) REFERENCES events(id)
)
```
**複雑**: 10フィールド（FUNC-000の3倍以上）

## 📊 仕様違反の影響範囲

### 1. DatabaseManager全体
- `recordEvent()`: filesテーブルの複雑構造に依存
- `findByPath()`: file_pathフィールドに依存（FUNC-000では存在しない）
- `updateFile()`: is_deletedフィールドに依存（FUNC-000ではis_active）

### 2. EventProcessor全体
- `scanForMissingFiles()`: getLiveFiles()がfile_pathに依存
- 全イベント処理: file_path保存に依存

### 3. FUNC-000設計思想との乖離
**FUNC-000の設計思想**:
- **files**: 現在状態のみ管理（シンプル）
- **events**: ファイルの全イベント履歴（file_pathはここに記録）
- **measurements**: イベント時点の測定値

**現在の実装**:
- filesテーブルにfile_path等を重複保存
- FUNC-000の分離設計を無視

## 🎯 必要な対応

### Phase 1: 設計方針決定 (Architect責務)
1. **FUNC-000準拠**: 公式仕様通りのシンプルfilesテーブル
2. **現状維持**: 現在の複雑なfilesテーブル継続
3. **段階移行**: v0.2.1で徐々にFUNC-000準拠化

### Phase 2: 実装修正 (決定後にBuilder実行)
- schema.js完全書き換え
- DatabaseManager全面修正
- EventProcessor大幅修正
- 既存DBのマイグレーション

## ⚠️ 作業停止理由

**Builder判断**: この仕様違反は実装全体の根幹に関わるため、Builderの権限を超える設計判断が必要。

**必要な判断**:
1. FUNC-000は正式仕様として維持するか？
2. 現在の実装を正式仕様に変更するか？
3. 段階的移行の方針・タイムライン

## 📊 緊急度評価

**Critical優先度の理由**:
- 全データベース層の根本設計に関わる
- 現在の開発が間違った基盤の上で進行中
- 修正遅延により技術的負債が指数的増大

---

**Builder Comment**: FUNC-000が正式仕様であれば、現在の実装は完全に作り直しが必要。設計方針を明確化してから実装作業を再開したい。