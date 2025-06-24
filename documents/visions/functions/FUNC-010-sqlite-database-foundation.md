# FUNC-010: SQLiteデータベース基盤管理機能

**作成日**: 2025年6月24日  
**作成者**: Architect Agent  
**カテゴリ**: Core Infrastructure  
**Phase**: 1 (最優先機能)  
**ステータス**: Active

## 📊 機能概要

cctopの全データを管理するSQLite基盤（activity.db）の初期化・管理を行う機能。

**ユーザー価値**: 全ファイル変更履歴の永続化・高速検索・統計情報生成

## 🎯 機能境界

### ✅ **実行する**
- SQLite DB作成・テーブル初期化
- インデックス管理・トランザクション管理
- WALモード設定・パフォーマンス最適化
- 初期データ投入（event_types 6種類）

### ❌ **実行しない**
- UI表示・ファイル監視・設定管理
- 他システムとの連携・外部データ取得

## 📋 必要な仕様

### **SQLスキーマ定義（4テーブル構成）**

#### 1. **events テーブル**
```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix timestamp形式
    event_type_id INTEGER NOT NULL,
    object_id INTEGER NOT NULL,           -- object_fingerprintへの参照
    file_path TEXT NOT NULL,              -- フルパス
    file_name TEXT NOT NULL,              -- ファイル名のみ
    directory TEXT NOT NULL,              -- ディレクトリパス
    is_directory INTEGER DEFAULT 0,       -- ディレクトリフラグ
    previous_event_id INTEGER,            -- 同一オブジェクトの前イベント
    source_path TEXT,                     -- moveイベント時の移動元
    file_size INTEGER,                    -- ファイルサイズ（バイト）
    line_count INTEGER,                   -- 行数（テキストファイルのみ）
    block_count INTEGER,                  -- ブロック数
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (previous_event_id) REFERENCES events(id),
    FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

#### 2. **event_types テーブル**
```sql
CREATE TABLE event_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,            -- find/create/modify/delete/move
    name TEXT NOT NULL,                   -- 表示名
    description TEXT                      -- 説明
);
```

#### 3. **object_fingerprint テーブル**
```sql
CREATE TABLE object_fingerprint (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inode INTEGER UNIQUE                  -- ファイルシステムのinode番号
);
```

#### 4. **object_statistics テーブル**
```sql
CREATE TABLE object_statistics (
    object_id INTEGER PRIMARY KEY,
    current_file_size INTEGER DEFAULT 0,
    current_line_count INTEGER DEFAULT 0,
    current_block_count INTEGER DEFAULT 0,
    total_events INTEGER DEFAULT 0,
    total_modifications INTEGER DEFAULT 0,
    total_line_count INTEGER DEFAULT 0,
    total_block_count INTEGER DEFAULT 0,
    total_line_changes INTEGER DEFAULT 0,
    total_block_changes INTEGER DEFAULT 0,
    create_events INTEGER DEFAULT 0,
    modify_events INTEGER DEFAULT 0,
    move_events INTEGER DEFAULT 0,
    last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
    calculation_method TEXT DEFAULT 'trigger',
    FOREIGN KEY (object_id) REFERENCES object_fingerprint(id)
);
```

### **インデックス定義（v0.1.0.0では基本インデックスのみ）**
```sql
-- Phase 1で実装する基本インデックス
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_object_id ON events(object_id);

-- Phase 2以降で追加予定の詳細インデックス
-- CREATE INDEX idx_events_type_timestamp ON events(event_type_id, timestamp);
-- CREATE INDEX idx_events_directory ON events(directory);
-- CREATE INDEX idx_object_stats_updated ON object_statistics(last_updated);
```

### **初期データ（event_types）**
```sql
INSERT INTO event_types (code, name, description) VALUES
('find', 'Find', 'Initial file discovery'),
('create', 'Create', 'File creation'),
('modify', 'Modify', 'File modification'),
('delete', 'Delete', 'File deletion'),
('move', 'Move', 'File move/rename');
-- error タイプは v0.2.0.0 で追加予定
```

### **設定仕様**
- **WALモード**: 有効化（同時読み取り性能向上）
- **同期モード**: NORMAL（安全性とパフォーマンスのバランス）
- **キャッシュサイズ**: 64MB（大量データ処理対応）
- **一時ストレージ**: メモリ使用

## 🔍 統合対象（重複解消）

### **"activity.db"記述の統合**
- **FUNC-001**: 4テーブル構成詳述
- **FUNC-002**: chokidar→DB記録連携言及
- **FUNC-006**: 設定ファイルでのDB設定言及
- **FUNC-007**: postinstall時のDB初期化言及  
- **FUNC-008**: パフォーマンス監視でのDB最適化言及

**統合結果**: 上記5文書の"activity.db"関連記述を本機能定義に一元化

## 🎯 機能要件

### **DB生成要件**
1. **初回起動時**: activity.dbが存在しない場合、自動作成
2. **スキーマ作成順序**: 
   - event_types → object_fingerprint → events → object_statistics
   - 外部キー制約のため順序厳守
3. **エラー処理**: 
   - ディレクトリ不在時: ~/.cctop/ディレクトリ自動作成
   - 権限エラー時: 明確なエラーメッセージ表示
   - DB破損時: バックアップ作成後に再作成提案

### **パフォーマンス要件**
1. **イベント挿入性能**: 
   - 通常時: 1秒間に100イベント以上
   - バースト時: 1秒間に1000イベントまで対応
2. **同時読み取り**: 
   - WALモードによる書き込み中の読み取り保証
   - CLI表示の100ms更新に対応
3. **ディスク効率**: 
   - WALファイル: 1000ページ到達時に自動チェックポイント
   - activity.db: 定期的なVACUUM（v0.2.0.0で実装）

### **データ整合性要件**
1. **トランザクション**: 関連データの一貫性保証
2. **外部キー制約**: event_types参照整合性保証
3. **データ型検証**: 不正データの挿入防止

## 📊 期待効果

### **システム基盤確立**
- cctop全体のデータ永続化基盤確立
- 高速データアクセス・検索機能提供
- 将来的な統計・分析機能の基盤準備

### **開発効率向上**
- 他機能からの統一的データアクセス
- DBスキーマの一元管理・バージョン管理
- パフォーマンス問題の早期発見

---

**核心価値**: cctopの全データ永続化基盤として、他の全機能を支える基礎インフラを提供