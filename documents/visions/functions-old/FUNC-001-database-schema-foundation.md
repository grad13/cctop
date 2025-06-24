# FUNC-001: Database Schema Foundation

**作成日**: 2025-06-24  
**作成者**: Architect Agent (Professional監査・更新版)  
**対象**: cctop v0.1.0.0 データベーススキーマ基盤  
**BP-000準拠**: ✅ 完全整合済み  
**抽出元**: db001-schema-design.md

## 📊 4テーブル構成（v0.1.0.0基盤設計）

**v0.1.0.0実装対象**: 
1. **event_types**: イベントタイプマスター（6種類）
2. **object_fingerprint**: オブジェクト指紋（inode管理）
3. **events**: メインイベントテーブル（chokidar統合、is_directory対応）
4. **object_statistics**: オブジェクト統計（リアルタイム更新）

**データベースファイル**: `~/.cctop/activity.db` (BP-000準拠)

**🔄 Next Phase（将来拡張）**:
- **period_types**: 期間タイプマスター
- **object_statistics_by_period**: 期間別統計（セッション非連続性対応）

### 1. event_types（イベントタイプマスター）

```sql
CREATE TABLE event_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT
);
```

**初期データ**（IDはAUTOINCREMENTで自動採番）:
| Code | Name | Description |
|------|------|-------------|
| find | Initial Discovery | Found during initial scan |
| create | File Created | New file creation |
| modify | File Modified | File content changed |
| move | Directory Moved | Directory relocation |
| rename | File Renamed | File name changed |
| delete | File Deleted | File deletion |


### 2. object_fingerprint（オブジェクト指紋テーブル）

```sql
CREATE TABLE object_fingerprint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inode INTEGER UNIQUE
);
```

### 3. events（メインイベントテーブル）

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,              -- Unix milliseconds (BP-000準拠)
  event_type_id INTEGER NOT NULL,
  
  object_id INTEGER NOT NULL,
  
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  directory TEXT NOT NULL,
  is_directory INTEGER DEFAULT 0,         -- 新規追加: ディレクトリ判定 (BP-000準拠)
  
  previous_event_id INTEGER,
  source_path TEXT,
  
  -- ファイル状態（その瞬間の値）
  file_size INTEGER,
  line_count INTEGER,
  block_count INTEGER,
    
  FOREIGN KEY (event_type_id) REFERENCES event_types(id),
  FOREIGN KEY (previous_event_id) REFERENCES events(id),
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

### 4. object_statistics（オブジェクト統計テーブル）

```sql
CREATE TABLE object_statistics (
  object_id INTEGER PRIMARY KEY,           -- 1 Object = 1統計レコード
  
  -- 現在の状態値
  current_file_size INTEGER DEFAULT 0,
  current_line_count INTEGER DEFAULT 0,
  current_block_count INTEGER DEFAULT 0,
  
  -- 累積統計（全期間）
  total_events INTEGER DEFAULT 0,
  total_modifications INTEGER DEFAULT 0,
  total_line_count INTEGER DEFAULT 0,      -- 現在の総行数
  total_block_count INTEGER DEFAULT 0,     -- 現在の総ブロック数
  total_line_changes INTEGER DEFAULT 0,    -- 累積行数変化（絶対値の合計）
  total_block_changes INTEGER DEFAULT 0,   -- 累積ブロック数変化（絶対値の合計）
  
  -- イベント種別カウント
  create_events INTEGER DEFAULT 0,
  modify_events INTEGER DEFAULT 0,
  move_events INTEGER DEFAULT 0,
  
  -- メタデータ
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  calculation_method TEXT DEFAULT 'trigger',
  
  FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

## 🔧 設計原則

### 完全正規化による利点
1. **データ整合性**: Single Source of Truth
2. **責務分離**: 各テーブルが明確な役割
3. **スケーラビリティ**: 将来拡張が容易
4. **メンテナンス性**: 変更影響範囲が限定的

### パフォーマンス最適化
1. **キャッシュテーブル**: 高頻度アクセス用
2. **プリコンピューテッド統計**: リアルタイム更新
3. **適切なインデックス**: クエリ最適化
4. **AUTOINCREMENT統一**: JOIN効率向上

### inode管理の設計方針
- **UNIQUE制約**: 同一inodeは同一オブジェクトとして管理
- **理由**: ファイルの同一性追跡を保証
- **注意**: inode再利用は極めて稀であり、実用上問題なし

## 🎯 v0.1.0.0実装ガイダンス

### 実装優先順位
1. **event_types**: マスターデータ投入（6種類のイベント）
2. **object_fingerprint**: inode管理テーブル
3. **events**: メインテーブル（is_directory対応必須）
4. **object_statistics**: 統計テーブル（後続フェーズでトリガー連携）

### BP-000完全準拠事項
- **timestamp**: INTEGER型（Unix milliseconds）を厳守
- **activity.db**: データベース名をBP-000と完全一致
- **is_directory**: ディレクトリ判定フィールド必須
- **6項目メタデータ**: file_size, line_count, block_count, timestamp, file_path, inode

### Builder Agent向け実装注意点
- **初期化SQL**: event_typesマスターデータ準備が最重要
- **chokidar統合**: timestamp形式（INTEGER）での記録必須
- **エラーハンドリング**: inode重複時の適切な処理

---

**BP-000関連セクション**: L104-161（SQLスキーマ定義）  
**実装ファイル**: `src/database/schema.js`  

*関連FUNC文書*:
- `FUNC-002`: chokidar-DB統合テスト設計
- `FUNC-003`: 設定システム（DB接続設定）