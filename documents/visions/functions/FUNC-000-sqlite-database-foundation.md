# FUNC-000: SQLiteデータベース基盤管理機能

**作成日**: 2025年6月24日 14:00  
**更新日**: 2025年6月25日 18:30  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

## 📊 機能概要

cctopの全データを管理するSQLite基盤（activity.db）の初期化・管理を行う機能。シンプルな5テーブル構成で、ファイルの同一性を保ちながらinode再利用にも対応。

**v0.2.0.0での変更点**:
- テーブル名変更: object_fingerprint → files、object_statistics → aggregates
- measurementsテーブルの新規追加（測定値の分離）
- previous_event_id削除（file_id+timestampでtraverse）
- source_path削除（シンプル化）
- restore時のfile_id再利用による同一性管理

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

### **SQLスキーマ定義（5テーブル構成）**

**設計思想**: 
- **files**: 現在状態のみ管理（inodeは最新値、履歴は不要）
- **events**: ファイルの全イベント履歴（traverseはfile_id+timestampで実現）
- **measurements**: イベント時点の測定値（inode履歴含む）
- **aggregates**: fileの集計値的統計

#### 1. **events テーブル**
```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,          -- Unix timestamp形式
    event_type_id INTEGER NOT NULL,
    file_id INTEGER NOT NULL,             -- filesへの参照
    file_path TEXT NOT NULL,              -- フルパス
    file_name TEXT NOT NULL,              -- ファイル名のみ
    directory TEXT NOT NULL,              -- ディレクトリパス
    FOREIGN KEY (event_type_id) REFERENCES event_types(id),
    FOREIGN KEY (file_id) REFERENCES files(id)
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

#### 3. **files テーブル**
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inode INTEGER,                        -- 現在の最新inode値（復活時は更新）
    is_active BOOLEAN DEFAULT TRUE        -- アクティブ状態フラグ
);
```

#### 4. **measurements テーブル**
```sql
CREATE TABLE measurements (
    event_id INTEGER PRIMARY KEY,
    inode INTEGER,                        -- その時点のinode値（履歴保存用）
    file_size INTEGER,                    -- ファイルサイズ（バイト）
    line_count INTEGER,                   -- 行数（テキストファイルのみ）
    block_count INTEGER,                  -- ブロック数
    FOREIGN KEY (event_id) REFERENCES events(id)
);
```

#### 5. **aggregates テーブル**
```sql
CREATE TABLE aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,                      -- filesテーブルへの参照
    period_start INTEGER,                 -- 集計期間の開始時刻
    
    -- 累積統計値
    total_size INTEGER DEFAULT 0,         -- 累積ファイルサイズ
    total_lines INTEGER DEFAULT 0,        -- 累積行数
    total_blocks INTEGER DEFAULT 0,       -- 累積ブロック数
    
    -- イベント回数
    total_events INTEGER DEFAULT 0,       -- 総イベント数
    total_creates INTEGER DEFAULT 0,      -- 作成イベント数
    total_modifies INTEGER DEFAULT 0,     -- 変更イベント数
    total_deletes INTEGER DEFAULT 0,      -- 削除イベント数
    total_moves INTEGER DEFAULT 0,        -- 移動イベント数
    total_restores INTEGER DEFAULT 0,     -- 復活イベント数
    
    -- メタデータ
    last_updated INTEGER DEFAULT CURRENT_TIMESTAMP,
    calculation_method TEXT DEFAULT 'trigger',
    
    FOREIGN KEY (file_id) REFERENCES files(id)
);
```

### **インデックス定義（v0.1.0.0では基本インデックスのみ）**
```sql
-- Phase 1で実装する基本インデックス
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_file_path ON events(file_path);
CREATE INDEX idx_events_file_id ON events(file_id);
CREATE INDEX idx_events_file_timestamp ON events(file_id, timestamp);  -- traverseの高速化

-- Phase 2以降で追加予定の詳細インデックス
-- CREATE INDEX idx_events_type_timestamp ON events(event_type_id, timestamp);
-- CREATE INDEX idx_events_directory ON events(directory);
-- CREATE INDEX idx_aggregates_updated ON aggregates(last_updated);
```

### **初期データ（event_types）**
```sql
INSERT INTO event_types (code, name, description) VALUES
('find', 'Find', 'Initial file discovery'),
('create', 'Create', 'File creation'),
('modify', 'Modify', 'File modification'),
('delete', 'Delete', 'File deletion'),
('move', 'Move', 'File move/rename'),
('restore', 'Restore', 'File restoration after deletion');
-- error タイプは v0.2.0.0 で追加予定
```

### **設定仕様**
- **WALモード**: 有効化（同時読み取り性能向上）
- **同期モード**: NORMAL（安全性とパフォーマンスのバランス）
- **キャッシュサイズ**: 64MB（大量データ処理対応）
- **一時ストレージ**: メモリ使用

### **生成ファイル仕様**

#### メインデータベース
- **activity.db**: 主要データベースファイル（SQLスキーマ・データ）

#### WALモード関連ファイル
- **activity.db-wal**: Write-Ahead Logファイル（トランザクション中間記録）
- **activity.db-shm**: Shared Memoryファイル（WALインデックス・同期制御）

#### ファイル管理仕様
```
.cctop/ または ~/.cctop/
├── activity.db      # メインDBファイル（永続保存）
├── activity.db-wal  # WALファイル（SQLite自動生成）
└── activity.db-shm  # SHMファイル（SQLite自動生成）
```

**重要事項**:
- **WAL/SHMファイル**: SQLiteが自動生成・管理（手動削除禁止）
- **運用考慮**: バックアップ時はactivity.dbのみを対象とする
- **終了時処理**: cctop正常終了時にWAL/SHMファイルは自動削除
- **異常終了**: WAL/SHMファイル残存時は次回起動で自動処理

## 🔍 統合対象（重複解消）

### **"activity.db"記述の統合**
- **FUNC-001**: 5テーブル構成詳述
- **FUNC-002**: chokidar→DB記録連携言及
- **FUNC-011**: 設定ファイルでのDB設定言及
- **FUNC-007**: postinstall時のDB初期化言及  
- **FUNC-008**: パフォーマンス監視でのDB最適化言及

**統合結果**: 上記5文書の"activity.db"関連記述を本機能定義に一元化

## 🎯 機能要件

### **DB生成要件**
1. **初回起動時**: activity.dbが存在しない場合、自動作成
2. **スキーマ作成順序**: 
   - event_types → files → events → measurements → aggregates
   - 外部キー制約のため順序厳守
3. **エラー処理**: 
   - ディレクトリ不在時: ~/.cctop/ディレクトリ自動作成
   - 権限エラー時: 明確なエラーメッセージ表示
   - DB破損時: バックアップ作成後に再作成提案

### **データ整合性要件**
1. **トランザクション**: 関連データの一貫性保証
2. **外部キー制約**: event_types参照整合性保証
4. **ファイル同一性管理**: 
   - 削除→復活時は同じfile_idを再利用
   - filesテーブルのinodeを最新値に更新
   - is_activeフラグで状態管理

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