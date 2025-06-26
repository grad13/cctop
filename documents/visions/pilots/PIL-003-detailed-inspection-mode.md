# PIL-003: Detailed Inspection Mode

**作成日**: 2025年6月26日 17:05  
**更新日**: 2025年6月26日 18:00  
**作成者**: Architect Agent  
**ステータス**: Draft  
**対象バージョン**: -
**カテゴリ**: Display & UI Experiments  

## 概要

選択されたファイル・ディレクトリの詳細情報を全画面表示し、履歴・メタデータ・関連ファイルを包括的に分析・表示する詳細検査機能。

## 機能仕様

### 基本表示構成

#### 画面レイアウト
```
┌─ File Details: src/main.js ─────────────────────────────┐
│ >> Basic Info                                           │
│    Path: /project/src/main.js                           │
│    Size: 2,134 bytes (2.1 KB)                          │
│    Modified: 2025-06-26 12:34:56                       │
│    Type: JavaScript (*.js)                             │
│                                                         │
│ >> Change History (Last 10)                            │
│    [12:34:56] Modified  +15 -3   Function refactoring  │
│    [12:30:21] Modified  +2  -1   Import statement fix  │
│    [12:25:15] Created   +47 -0   Initial creation      │
│                                                         │
│ >> File Metadata                                       │
│    Permissions: -rw-r--r-- (644)                       │
│    Owner: user:group                                    │
│    Inode: 12345678                                     │
│    Hash: a1b2c3d4e5f6...                               │
│                                                         │
│ [q]uit [r]efresh [h]istory [d]iff [f]ilter [n]ext     │
└─────────────────────────────────────────────────────────┘
```

### 情報カテゴリ

#### Basic Info（基本情報）
- **フルパス**: 絶対パス表示
- **ファイルサイズ**: バイト数 + 人間読み可能形式
- **最終更新**: タイムスタンプ（秒精度）
- **ファイルタイプ**: 拡張子ベース + MIME判定
- **エンコーディング**: 文字エンコーディング検出

#### Change History（変更履歴）
- **変更時刻**: 分秒まで表示
- **変更タイプ**: Created/Modified/Deleted/Moved
- **差分サマリ**: 追加行数・削除行数
- **変更説明**: 自動生成またはユーザー注釈

#### File Metadata（ファイルメタデータ）
- **権限情報**: UNIX形式パーミッション
- **所有者情報**: ユーザー・グループ
- **システム情報**: inode、デバイス、リンク数
- **ハッシュ値**: SHA-256またはMD5

#### Advanced Analysis（高度分析）
- **関連ファイル**: 同名・同拡張子・依存ファイル
- **変更パターン**: 時間別・曜日別変更頻度
- **サイズ変遷**: ファイルサイズの推移グラフ
- **ホットスポット**: 頻繁に変更される行・セクション

### 操作機能

#### 基本操作
- **q/Esc**: 詳細モード終了、選択モードに復帰
- **r/F5**: 情報の再取得・画面更新
- **↑↓**: 情報セクション間の移動
- **Enter**: セクション展開/折りたたみ

#### 履歴操作
- **h**: 変更履歴の詳細表示（全履歴）
- **d**: 前回変更との差分表示
- **t**: タイムライン表示（時系列グラフ）
- **s**: 統計情報表示（変更頻度・パターン）

#### フィルタ・検索
- **f**: 履歴フィルタリング（日付・タイプ・サイズ）
- **/**: 履歴内容検索（正規表現対応）
- **n**: 次の検索結果
- **N**: 前の検索結果

#### ナビゲーション
- **Tab**: 関連ファイル間の移動
- **Space**: 選択ファイルのプレビュー表示
- **o**: 外部エディタで開く
- **c**: ファイルパスをクリップボードにコピー

### 詳細表示モード

#### History Detail View（履歴詳細表示）
```
┌─ Change History: src/main.js ───────────────────────────┐
│ Total Changes: 23 (Last 30 days)                       │
│                                                         │
│ 2025-06-26 12:34:56 [Modified] +15 -3                  │
│ >> Function refactoring in parseConfig()               │
│    Added error handling for invalid JSON               │
│    Removed deprecated compatibility code               │
│    Size: 2,134 bytes (+312 bytes)                      │
│                                                         │
│ 2025-06-26 12:30:21 [Modified] +2 -1                   │
│ >> Import statement fix                                 │
│    Changed: require() -> import statement              │
│    Size: 1,822 bytes (-15 bytes)                       │
│                                                         │
│ [Page 1/3] [q]uit [d]iff [j/k]scroll [f]ilter         │
└─────────────────────────────────────────────────────────┘
```

#### Diff View（差分表示）
```
┌─ Diff: src/main.js (2025-06-26 12:34:56) ──────────────┐
│  15 | function parseConfig(configPath) {                │
│  16 |+  try {                                           │
│  17 |     const data = fs.readFileSync(configPath);     │
│  18 |+    if (!data) throw new Error('Empty file');     │
│  19 |     return JSON.parse(data);                      │
│  20 |+  } catch (error) {                               │
│  21 |+    console.error('Config parse error:', error);  │
│  22 |+    return {};                                     │
│  23 |+  }                                               │
│  24 |-  // Legacy compatibility code                    │
│  25 |-  if (typeof window !== 'undefined') return {};   │
│  26 | }                                                 │
│                                                         │
│ [q]uit [n]ext-change [p]rev-change [w]hole-file       │
└─────────────────────────────────────────────────────────┘
```

## 技術仕様

### データソース
- **SQLiteデータベース**: 変更履歴・メタデータ
- **ファイルシステム**: リアルタイムファイル情報
- **Git履歴**: Gitリポジトリ内での変更履歴（オプション）
- **外部ツール**: file、stat、lsofコマンド連携

### 依存関係
- **FUNC-000**: SQLiteデータベース基盤（履歴データ）
- **FUNC-001**: ファイルライフサイクル追跡（変更記録）
- **FUNC-903**: インタラクティブ選択モード（呼び出し元）
- **FUNC-021**: 二重バッファ描画（画面更新最適化）

### パフォーマンス最適化
- **遅延読み込み**: 大きなファイルの段階的情報取得
- **キャッシュ機能**: 重いメタデータ計算結果の保持
- **バックグラウンド処理**: ハッシュ計算・関連ファイル検索の非同期実行

## 設定項目

### config.json設定
```json
{
  "detailMode": {
    "enabled": true,
    "maxHistoryItems": 50,
    "showFullPath": true,
    "autoRefresh": false,
    "refreshInterval": 5000,
    "diffContextLines": 3,
    "enableGitIntegration": true,
    "externalEditor": "code",
    "analysis": {
      "calculateHash": true,
      "findRelatedFiles": true,
      "maxRelatedFiles": 10,
      "detectEncoding": true
    }
  }
}
```

### 設定項目詳細
- **maxHistoryItems**: 表示する履歴項目の最大数
- **showFullPath**: フルパス表示の有効/無効
- **autoRefresh**: 詳細表示の自動更新
- **refreshInterval**: 自動更新間隔（ms）
- **diffContextLines**: 差分表示時の前後行数
- **enableGitIntegration**: Git履歴連携機能
- **externalEditor**: 外部エディタのコマンド
- **analysis**: 高度分析機能の設定

## 使用方法

### 基本的な使用手順
1. 選択モード（FUNC-903）でファイルを選択
2. Enterキーで詳細モードに移行
3. ↑↓キーで情報セクション間を移動
4. 各種キーで詳細操作実行
5. qキーで選択モードに復帰

### 高度な使用例
```bash
# 変更履歴の詳細分析
1. ファイル選択 → Enter（詳細モード）
2. h キー（履歴詳細表示）
3. f キー（日付でフィルタ：last week）
4. d キー（差分表示で変更内容確認）

# 関連ファイルの調査
1. 詳細モード表示中
2. Tab キー（関連ファイルナビゲーション）
3. Space キー（関連ファイルのクイックプレビュー）
4. Enter キー（関連ファイルの詳細表示）
```

## 制限事項

### 技術的制限
- **大きなファイル**: 1GB超ファイルの処理制限
- **バイナリファイル**: バイナリの差分表示不可
- **権限制限**: アクセス権限のないファイルの制限情報
- **ネットワークファイル**: NFS等での遅延・制限

### 表示制限
- **ターミナルサイズ**: 最小80x24推奨
- **文字エンコーディング**: UTF-8以外での表示崩れ
- **履歴件数**: 大量履歴での表示遅延
- **同時処理**: 複数ファイル同時詳細表示不可

## 拡張予定

### Phase 1実装（v0.3.0.0）
- 基本情報表示（Basic Info + Change History）
- 基本操作（移行・終了・更新）
- 履歴詳細・差分表示

### Phase 2拡張（v0.3.1.0）
- 高度分析機能（関連ファイル・統計）
- Git連携（Git履歴の統合表示）
- 外部ツール連携（エディタ・差分ツール）

### Phase 3高度化（v0.4.0.0）
- カスタム分析プラグイン
- 履歴データのエクスポート
- チーム共有機能（履歴注釈・タグ）

## 関連機能

- **FUNC-903**: インタラクティブ選択モード（呼び出し元）
- **FUNC-000**: SQLiteデータベース基盤（データソース）
- **FUNC-001**: ファイルライフサイクル追跡（変更記録）
- **FUNC-021**: 二重バッファ描画（描画最適化）

## 参考資料

### 類似機能の参考実装
- **git log**: Git履歴表示・フィルタリング
- **tig**: Gitブラウザのインターフェース
- **less**: ページング・検索機能
- **stat**: ファイルメタデータ表示

### 技術参考
- ANSI escape sequences: 全画面制御
- Node.js fs.stat: ファイルメタデータ取得
- SQLite window functions: 時系列データ分析