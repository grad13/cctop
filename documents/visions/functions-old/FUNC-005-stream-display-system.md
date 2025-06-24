# FUNC-005: Stream Display System Foundation

**作成日**: 2025-06-24  
**作成者**: Architect Agent (Professional監査・更新版)  
**目的**: cctop v0.1.0.0 ストリーム表示システム仕様  
**BP-000準拠**: ✅ 完全整合済み (L426-457)  
**抽出元**: ui002-stream-display.md

## 📊 表示モード詳細 (BP-000準拠)

### All Activities モード（デフォルト）
- **v0.1.0.0実装対象**: すべてのファイル変更イベントを時系列表示
- **FUNC-001連携**: eventsテーブルから最新N件取得
- **表示順序**: timestamp DESC (最新が上部)
- **表示数**: displayConfig.maxEvents準拠

### Unique Activities モード
- **v0.1.0.0実装対象**: ファイルごとに最新のみ表示
- **ユニーク化**: GROUP BY object_idで重複排除
- **用途**: アクティブなファイルの一覧機能
- **パフォーマンス**: インデックス最適化必要

## 🖥️ 画面構成

### 全体レイアウト
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-21 18:57:01   00:01:23  example.js           src/            modify    125      8
2025-06-21 18:56:45   00:01:07  index.html           public/         create     45      3
2025-06-21 18:55:30   00:00:52  api.js               src/lib/        modify     89     12
[... 表示行が続く ...]
─────────────────────────────────────────────────────────────────────────────────
All Activities  Scan:ON Create:ON Modify:ON Move:ON Delete:OFF  5/20
[a] All  [u] Unique  [q] Exit
[s] Scan  [c] Create  [m] Modify  [v] moVe  [d] Delete  [/] Search
[↑↓] Move  [Enter] Detail  [ESC] Normal  ← フォーカスモード時のみ表示
```

### ヘッダー部
| カラム | 幅 | 配置 | 説明 |
|--------|-----|------|------|
| Modified | 19 | 右寄せ | ファイル変更時刻（YYYY-MM-DD HH:MM:SS） |
| Elapsed | 10 | 右寄せ | 経過時間（HH:MM:SS または MM:SS） |
| File Name | 28 | 左寄せ | ファイル名（長い場合は省略） |
| Directory | 15 | 左寄せ | ディレクトリパス（長い場合は省略） |
| Event | 8 | 左寄せ | イベントタイプ |
| Lines | 5 | 右寄せ | 行数（-で不明を表示） |
| Blocks | 6 | 右寄せ | ブロック数（-で不明を表示） |

**合計幅**: 97文字（区切り文字含む）

### メイン表示部
- デフォルト10行（displayLimitで設定可能）
- 最新のイベントが上部に表示
- 表示行数が少ない場合は空行で埋める（画面安定化）

### ステータスバー部

#### 1行目: 区切り線
```
─────────────────────────────────────────────────────────────────────────────────
```
- 80文字のグレー線（`chalk.gray()`）

#### 2行目: 状態表示
```
All Activities  Scan:ON Create:ON Modify:ON Move:ON Delete:OFF  5/20
```
- **モード表示**: "All Activities" or "Unique Activities"（黄色）
- **フィルタ状態**: 各イベントタイプのON/OFF（白）
- **表示件数**: 現在表示数/全体数（通常時）またはフォーカス位置（フォーカス時）

#### 3-5行目: 操作ヘルプ
- **3行目**: 基本操作 `[a] All  [u] Unique  [q] Exit`
- **4行目**: フィルタ操作 `[s] Scan  [c] Create  [m] Modify  [v] moVe  [d] Delete  [/] Search`
- **5行目**: フォーカス操作（フォーカスモード時のみ）

## 🎨 表示スタイル

### イベントタイプ別の色分け
| イベント | 色 | chalk関数 | 用途 |
|----------|-----|-----------|------|
| scan | 青 | `chalk.blue()` | 初期スキャン |
| create | 明るい緑 | `chalk.greenBright()` | 新規作成 |
| modify | デフォルト | なし | 通常の変更 |
| move | シアン | `chalk.cyan()` | 移動・リネーム |
| delete | グレー | `chalk.gray()` | 削除（薄く表示） |

### フォーマット処理

#### ファイル名・ディレクトリの省略
```javascript
// 28文字を超える場合は省略
function truncateFileName(name, maxLength = 28) {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}
```

#### 時刻フォーマット
```javascript
// YYYY-MM-DD HH:MM:SS形式
function formatEditTime(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString()
    .replace('T', ' ')
    .substring(0, 19);
}
```

#### 経過時間フォーマット
```javascript
// 1時間未満: MM:SS
// 1時間以上: HH:MM:SS
function formatElapsedTime(timestamp, now = Date.now()) {
  const elapsed = now - new Date(timestamp).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

#### 相対パス変換（2025-06-22追加）
```javascript
// 監視ディレクトリからの相対パス表示
function formatRelativeDirectory(fullPath, watchPath) {
  if (!fullPath || !watchPath) return fullPath;
  
  const path = require('path');
  
  try {
    const absoluteFullPath = path.resolve(fullPath);
    const absoluteWatchPath = path.resolve(watchPath);
    
    // 監視ディレクトリ配下かチェック
    if (absoluteFullPath.startsWith(absoluteWatchPath + path.sep)) {
      const relativePath = path.relative(absoluteWatchPath, absoluteFullPath);
      return relativePath || './';
    }
    
    return fullPath; // 配下にない場合は元のパス
  } catch (error) {
    return fullPath; // エラー時は元のパス
  }
}
```

**目的**: Claude Code使用ケースでの可読性向上
- **問題**: 共通する監視ディレクトリパス部分が表示で冗長
- **解決**: 監視ディレクトリからの相対パスで表示
- **例**: `/Users/user/project/src/` → `src/`

## 📊 データ取得

### All Activitiesモード
```sql
SELECT 
  e.timestamp,
  e.file_name,
  e.directory,
  et.code as operation_type,
  e.line_count,
  e.block_count
FROM events e
JOIN event_types et ON e.event_type_id = et.id
WHERE et.code IN (?) -- フィルタ条件
ORDER BY e.timestamp DESC
LIMIT ?
```

### Unique Activitiesモード
```sql
SELECT 
  MAX(e.timestamp) as timestamp,
  e.file_name,
  e.directory,
  et.code as operation_type,
  e.line_count,
  e.block_count
FROM events e
JOIN event_types et ON e.event_type_id = et.id
WHERE e.id IN (
  SELECT MAX(id) FROM events GROUP BY object_id
)
AND et.code IN (?) -- フィルタ条件
GROUP BY e.object_id
ORDER BY timestamp DESC
LIMIT ?
```

## 🔄 更新フロー

### 通常モード
1. ファイル変更イベント発生
2. データベースに記録
3. `displayLatest()`呼び出し
4. 最新データ取得
5. 画面全体を再描画

### 画面更新方式（2025-06-24追加）
**採用方式**: 画面全体の再描画方式（top/htopスタイル）

#### 実装詳細
- `console.clear()`で画面をクリア
- ヘッダー、データ行、フッターを一度に出力
- 各要素は固定位置に表示される
- 更新間隔: 100ms（設定可能）

#### 理由
- **プロフェッショナルなUI**: topコマンドのような安定した表示
- **情報の固定配置**: ユーザーが情報を見つけやすい
- **操作説明の常時表示**: キーバインドを忘れない

#### 注意事項
- パイプやリダイレクト時は画面クリアコードが混入する
- テスト時は画面全体の出力を解析する必要がある
- CPU使用率が単純な追記方式より高い

### フォーカスモード
1. 通常の自動更新を停止
2. ユーザー操作（↑↓）に応じて表示更新
3. ESCで通常モードに復帰

## 💡 実装のポイント

### StreamDisplayクラスの責務
- モード管理（All/Unique）
- フィルタ状態管理
- 表示データの取得・更新
- 各種レンダラーの調整

### StreamRendererクラスの責務
- ヘッダー描画
- アクティビティ行描画
- ステータスバー描画
- 色付けとフォーマット
- **相対パス変換**: 監視ディレクトリからの相対パス表示

### パフォーマンス考慮
- 不要な再描画を避ける（デバウンス）
- データベースクエリの最適化（インデックス活用）
- メモリ効率的なバッファリング

### UX改善機能（2025-06-22追加）
- **相対パス表示**: 共通パス部分の自動削除により可読性向上
- **Claude Code対応**: 典型的な開発ワークフローでの使いやすさを重視
- **エラーハンドリング**: パス変換失敗時は元のパスをフォールバック表示

## 🎯 v0.1.0.0実装ガイダンス

### Builder Agent向け最重要事項
1. **FUNC-004密連携**: CLI UI基盤との完全統合
2. **固定カラム幅**: Modified(19), Elapsed(10), File Name(28), Directory(15), Event(8), Lines(5), Blocks(6)
3. **画面更新方式**: console.clear()による全体再描画（top/htopスタイル）

### BP-000完全準拠事項
- **データ取得**: FUNC-001のevents/event_typesテーブル連携
- **表示制限**: displayConfig.maxEvents（デフォルト20）
- **更新間隔**: refreshRateMs（デフォルト100ms）
- **相対パス表示**: 監視ディレクトリからの相対パス自動変換

### 重要なSQL実装（BP-000準拠）
```sql
-- All Activitiesモード
SELECT e.timestamp, e.file_name, e.directory, et.code, e.line_count, e.block_count
FROM events e JOIN event_types et ON e.event_type_id = et.id
ORDER BY e.timestamp DESC LIMIT ?

-- Unique Activitiesモード  
SELECT MAX(e.timestamp), e.file_name, e.directory, et.code, e.line_count, e.block_count
FROM events e JOIN event_types et ON e.event_type_id = et.id
GROUP BY e.object_id ORDER BY timestamp DESC LIMIT ?
```

### 実装クラス構成（BP-000準拠）
```
src/ui/
├── stream-renderer.js    # 画面描画・フォーマット処理
├── stream-display.js     # モード管理・データ取得
└── keyboard-handler.js   # キーボード入力処理（FUNC-004連携）
```

---

**BP-000関連セクション**: L426-457（表示フォーマット・カラム仕様・色分け）  
**実装ファイル**: `src/ui/stream-renderer.js`  

*関連FUNC文書*:
- `FUNC-004`: CLI UI基盤（密連携）
- `FUNC-001`: データベーススキーマ（データソース）
- `FUNC-002`: chokidar-DB統合（データフロー）