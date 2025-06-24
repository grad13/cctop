# CCTop CLI UI 新設計仕様

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: previous-v01のベースライン仕様を基に、新版の拡張機能を含むCLI UI設計

## 🎯 設計方針

### ベースラインからの継承
- previous-v01の基本操作性を維持
- 既存ユーザーが迷わない操作体系
- 実績のある表示レイアウトを基盤として採用

### MVP範囲での新機能
- パス検索機能（vim/htop風）

## 📊 表示モード

### 1. All Activities Mode（デフォルト）
- すべてのファイル変更イベントを時系列表示
- 最新の変更が上部に表示
- previous-v01と同じ基本機能

### 2. Unique Activities Mode
- ファイルごとに最新のイベントのみ表示
- 重複を排除してファイルの現在状態を把握
- previous-v01と同じ基本機能

## ⌨️ キーボード操作

### 基本操作（previous-v01互換）
| キー | 機能 | 説明 |
|------|------|------|
| `a` | All events | すべてのイベント表示 |
| `u` | Unique files | ファイルごとに最新のみ |
| `i,c,m,v,d` | Event filters | イベントタイプフィルタ |
| `↑↓` | Navigate | フォーカス移動 |
| `Enter` | Detail | 詳細表示 |


### 検索機能（新規）
| キー | 機能 | 説明 |
|------|------|------|
| `/` | Search | パス検索開始（詳細は検索機能仕様参照） |

### グローバル操作
| キー | 機能 | 説明 |
|------|------|------|
| `h` or `?` | Help | ヘルプ表示 |
| `q` | Quit | 終了 |
| `ESC` | Cancel/Back | キャンセル・戻る |
| `Tab` | Next field | 次のフィールド |
| `Shift+Tab` | Prev field | 前のフィールド |

## 🖥️ 画面レイアウト

### 通常時のレイアウト
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-21 18:57:01   00:01:23  example.js           src/            modify    125      8
2025-06-21 18:56:45   00:01:07  index.html           public/         create     45      3
[... 表示行 ...]
─────────────────────────────────────────────────────────────────────────────────
All Activities  Scan:ON Create:ON Modify:ON Move:ON Delete:OFF  5/20
[a] All  [u] Unique  [q] Exit
[s] Scan  [c] Create  [m] Modify  [v] moVe  [d] Delete  [/] Search
[↑↓] Move  [Enter] Detail  [ESC] Normal  ← フォーカスモード時のみ表示
```


### 検索時のレイアウト（検索機能仕様書参照）
検索モード時の詳細な画面レイアウトは [ui004-search-feature.md](../ui/ui004-search-feature.md) を参照してください。

## 🎨 色とスタイル

### イベントタイプ別の色分け（previous-v01継承）
| イベント | 色 | chalk関数 |
|----------|-----|-----------|
| scan | 青 | `chalk.blue()` |
| create | 明るい緑 | `chalk.greenBright()` |
| modify | デフォルト | なし |
| move | シアン | `chalk.cyan()` |
| delete | グレー | `chalk.gray()` |

### フォーカス表示
- 選択行: 背景白・文字黒（`chalk.bgWhite.black()`）

## 🔧 設定と永続化

### 設定項目（将来拡張）
- 表示行数（displayLimit）
- デフォルトのイベントフィルタ
- 除外パターン
- カラーテーマ

## 📈 パフォーマンス最適化

### BufferedRendererによる描画最適化（previous-v01継承）
- 画面のちらつき防止
- 約60fps（16ms）のデバウンス処理
- カーソル位置の保存・復元

### キャッシュ戦略
- イベントタイプキャッシュ
- 非同期バックグラウンド初期化

---

**注記**: この仕様は、previous-v01の実績ある設計を基盤とし、MVPとして必要最小限の新機能（検索）を追加したものです。