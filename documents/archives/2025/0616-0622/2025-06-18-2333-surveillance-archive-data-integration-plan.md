---
**アーカイブ情報**
- アーカイブ日: 2025-06-18
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: アーカイブデータ統合, Surveillanceシステム, バイナリアーカイブ統合, SQLite統合計画, ファイル変更履歴, monitor.db統合, 過去データ活用, 段階的統合アプローチ, archive_files테이블, archive_changes테이블, 包括的履歴提供, データ価値向上, 安全統合戦略, アーカイブテーブル作成, スキーマ互換性, バイナリレコード解析, デセリアライゼーション

---

# REP-0062: アーカイブデータ統合計画書

**レポートID**: REP-0062  
**作成日**: 2025年6月18日  
**作成者**: Inspector Agent  
**カテゴリ**: 計画書・データ統合  
**状態**: 計画中  

## 概要

Surveillanceシステムにおいて、過去にアーカイブされたファイル変更履歴データを現在のSQLiteシステムに統合し、より包括的なファイル編集履歴を提供する計画。

段階的な統合アプローチにより、現在の安定したシステムを保護しつつ、過去データの活用を実現する。

## 背景・目的

### 現状
- 現在のSurveillanceシステムは SQLite（monitor.db）ベースで動作
- 過去のバイナリアーカイブデータ（2025-06-17-records.bin等）が未活用
- ファイルの完全な編集履歴が取得できない状況

### 目的
1. **包括的な履歴提供**: ファイルの作成から現在までの完全な編集履歴
2. **データの価値向上**: アーカイブされた過去データの有効活用
3. **安全な統合**: 現在の安定システムを破綻させない段階的アプローチ

## 実装計画

### Phase 1: アーカイブテーブル作成（リスク：低）

#### 1.1 現在のスキーマ分析
```sql
-- 現在のテーブル構造確認
.schema files
.schema changes
```

#### 1.2 アーカイブテーブル設計
```sql
-- アーカイブ専用テーブル（現在のスキーマと互換）
CREATE TABLE IF NOT EXISTS archive_files (
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL,
    created_at INTEGER,
    first_seen INTEGER
);

CREATE TABLE IF NOT EXISTS archive_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,
    timestamp INTEGER NOT NULL,
    lines INTEGER,
    event_type TEXT DEFAULT 'MODIFY',
    archive_source TEXT,  -- 追加：データ元の識別
    FOREIGN KEY (file_id) REFERENCES archive_files (id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_archive_changes_timestamp ON archive_changes(timestamp);
CREATE INDEX IF NOT EXISTS idx_archive_changes_file_id ON archive_changes(file_id);
```

#### 1.3 データインポート機能実装
- バイナリアーカイブファイルからarchive_changesへのインポート機能
- 重複データ防止機能
- インポート進捗表示

### Phase 2: 統合ビュー実装（リスク：中）

#### 2.1 統合APIエンドポイント作成
```javascript
// 新しいAPIエンドポイント：/api/stream-unified
async function getUnifiedFileChangeStream(limit = 50, since = null, includeArchive = true) {
    // 現在のchangesテーブルとarchive_changesテーブルを UNION
    let query = `
        SELECT 
            c.timestamp,
            c.lines,
            c.event_type,
            f.path,
            f.id as file_id,
            'current' as data_source
        FROM changes c 
        JOIN files f ON c.file_id = f.id 
    `;
    
    if (includeArchive) {
        query += `
        UNION ALL
        SELECT 
            ac.timestamp,
            ac.lines,
            ac.event_type,
            af.path,
            af.id as file_id,
            'archive' as data_source
        FROM archive_changes ac 
        JOIN archive_files af ON ac.file_id = af.id 
        `;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT ?`;
    // 実装詳細...
}
```

#### 2.2 フロントエンド拡張
- Stream表示で過去データを含む統合ビューを提供
- データソース表示（現在/アーカイブ）
- フィルタリング機能（期間、データソース）

#### 2.3 パフォーマンス検証
- 大量データでの応答時間測定
- メモリ使用量監視
- インデックス効果の検証

### Phase 3: 完全統合（リスク：高）

#### 3.1 統合可否判定
**統合実施の条件**:
- [ ] Phase 2での安定動作（1週間以上）
- [ ] パフォーマンス問題なし（応答時間 < 2秒）
- [ ] データ整合性確認完了
- [ ] ユーザー承認取得

#### 3.2 テーブル統合実行
```sql
-- バックアップ作成
.backup monitor_backup_before_merge.db

-- データ統合
INSERT INTO files (path, created_at, first_seen)
SELECT path, created_at, first_seen 
FROM archive_files 
WHERE path NOT IN (SELECT path FROM files);

INSERT INTO changes (file_id, timestamp, lines, event_type)
SELECT 
    f.id,
    ac.timestamp,
    ac.lines,
    ac.event_type
FROM archive_changes ac
JOIN archive_files af ON ac.file_id = af.id
JOIN files f ON f.path = af.path;

-- アーカイブテーブル削除
DROP TABLE archive_changes;
DROP TABLE archive_files;
```

## 技術的実装詳細

### データインポート仕様

#### バイナリデータ解析
```javascript
// バイナリアーカイブからの読み取り
function importBinaryArchive(archivePath) {
    const buffer = fs.readFileSync(archivePath);
    const recordSize = 16; // timestamp(4) + fileId(4) + lines(4) + sections(4)
    
    for (let i = 0; i < buffer.length; i += recordSize) {
        const timestamp = buffer.readUInt32LE(i);
        const fileId = buffer.readUInt32LE(i + 4);
        const lines = buffer.readUInt32LE(i + 8);
        // archive_changesに挿入
    }
}
```

#### ファイルマッピング
- 既存のfile-mapping.jsonを活用
- fileId → path の変換処理
- 存在しないパスの処理方針

### API互換性保証

#### 既存APIの維持
- `/api/stream` - 現在のデータのみ（既存動作保持）
- `/api/stream-unified` - 統合データ（新機能）
- `/api/stream-stats` - 統計情報の拡張

#### フロントエンド選択制
```javascript
// ユーザーが選択可能
const streamMode = {
    current: '/api/stream',           // 現在のみ
    unified: '/api/stream-unified',   // 統合ビュー
    archive: '/api/stream-archive'    // アーカイブのみ
};
```

## リスク分析と対策

### リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 現在システムの破綻 | 高 | 低 | 段階的実装・バックアップ |
| パフォーマンス劣化 | 中 | 中 | インデックス最適化 |
| データ不整合 | 中 | 低 | 詳細検証・テスト |
| ディスク容量不足 | 低 | 中 | 容量監視・クリーンアップ |

### 対策詳細

#### 1. ロールバック戦略
```bash
# 各Phase完了時点でのバックアップ
cp data/monitor.db data/monitor_phase1_backup.db
cp data/monitor.db data/monitor_phase2_backup.db

# 問題発生時の復旧手順
mv data/monitor_phase1_backup.db data/monitor.db
./scripts/restart.sh
```

#### 2. パフォーマンス監視
- API応答時間の継続監視
- SQLクエリ実行時間の計測
- メモリ使用量のトラッキング

#### 3. データ検証
```sql
-- データ整合性チェック
SELECT COUNT(*) FROM changes WHERE file_id NOT IN (SELECT id FROM files);
SELECT COUNT(DISTINCT path) FROM files;
```

## 実装スケジュール

### Phase 1: アーカイブテーブル作成（推定：2-3日）
- **Day 1**: スキーマ設計・テーブル作成
- **Day 2**: データインポート機能実装
- **Day 3**: テスト・検証

### Phase 2: 統合ビュー実装（推定：3-4日）
- **Day 1-2**: 統合API実装
- **Day 3**: フロントエンド拡張
- **Day 4**: パフォーマンステスト

### Phase 3: 完全統合（推定：1-2日）
- **Day 1**: 最終検証・バックアップ
- **Day 2**: テーブル統合実行

## 成功指標

### 機能面
- [ ] 過去データを含む完全な履歴表示
- [ ] 現在システムの全機能維持
- [ ] 新機能の安定動作

### パフォーマンス面
- [ ] API応答時間：2秒以内
- [ ] メモリ使用量：増加20%以内
- [ ] データ整合性：100%

### ユーザビリティ面
- [ ] 直感的な統合データ表示
- [ ] 適切なデータソース識別
- [ ] スムーズな操作性

## 関連ファイル

### 実装対象
- `surveillance/src/api/stream-api.js` - API拡張
- `surveillance/src/web/file-stream.html` - フロントエンド拡張
- `surveillance/src/utils/archive-importer.js` - 新規作成
- `surveillance/data/monitor.db` - スキーマ拡張

### 参考データ
- `surveillance/data/file-mapping.json` - ファイルマッピング
- `surveillance/data/*.bin` - アーカイブデータ
- `surveillance/scripts/` - 運用スクリプト

## 次のアクション

1. **Phase 1開始判断**: ユーザー承認待ち
2. **詳細設計**: スキーマ詳細の確定
3. **開発環境準備**: テスト用データベース作成
4. **実装開始**: アーカイブテーブル作成から開始

---

**作成者**: Inspector Agent  
**レビュー**: 未実施  
**承認**: ユーザー承認待ち  
**開始予定**: ユーザー承認後即座