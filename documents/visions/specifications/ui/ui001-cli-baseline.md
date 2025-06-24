# CCTop CLI UI ベースライン仕様（previous-v01ベース）

**作成日**: 2025-06-21  
**作成者**: Inspector Agent  
**目的**: previous-v01の画面構成を分析し、新版開発のベースライン仕様として文書化

## 📊 表示モード

詳細な仕様は [ui002-stream-display.md](./ui002-stream-display.md) を参照してください。

- All Activities モード（デフォルト）
- Unique Activities モード

## 🖥️ 画面レイアウト

詳細な仕様は [ui002-stream-display.md](./ui002-stream-display.md) を参照してください。

- ヘッダー部（カラム定義）
- メイン表示部（データ表示）
- ステータスバー部（状態・操作ヘルプ）

## ⌨️ キーボード操作

### 基本操作
| キー | 機能 | 説明 |
|------|------|------|
| `a` | All モード | すべてのイベントを表示 |
| `u` | Unique モード | ファイルごとに最新のみ表示 |
| `q` | Exit | プログラム終了 |

### イベントフィルタ（トグル動作）
| キー | 対象イベント | デフォルト |
|------|--------------|------------|
| `f` | Find | ON |
| `c` | Create | ON |
| `m` | Modify | ON |
| `v` | moVe | ON |
| `d` | Delete | ON |

### フォーカスモード操作
| キー | 機能 | 説明 |
|------|------|------|
| `↑` | 上移動 | カーソルを上に移動 |
| `↓` | 下移動 | カーソルを下に移動 |
| `Enter` | 詳細表示 | 選択ファイルの詳細情報 |
| `ESC` | 通常モード復帰 | フォーカスモードを終了 |

## 🎨 色とスタイル

### イベントタイプ別の色分け
| イベント | 色 | chalk関数 |
|----------|-----|-----------|
| find | 青 | `chalk.blue()` |
| create | 明るい緑 | `chalk.greenBright()` |
| modify | デフォルト | なし |
| move | シアン | `chalk.cyan()` |
| delete | グレー | `chalk.gray()` |

### フォーカス表示
- 選択行: 背景白・文字黒（`chalk.bgWhite.black()`）
- 反転表示で明確に識別可能

### ステータスバーの色
- モード表示: 黄色（`chalk.yellow()`）
- フィルタ状態: 白（`chalk.white()`）
- フォーカス位置: シアン（`chalk.cyan()`）
- 操作ヘルプ: グレー（`chalk.gray()`）

## 🔄 更新とレンダリング

詳細な仕様は [rendering-update.md](./rendering-update.md) を参照してください。

- リアルタイム更新
- バッファリングレンダリング
- 表示の安定化

## 📋 詳細表示モード

詳細な仕様は [detail-view.md](./detail-view.md) を参照してください。

- フォーカスモードから`Enter`キーで遷移
- 個別ファイルの詳細情報表示
- previous-v01では未実装

## 🔧 設定可能項目

詳細な仕様は [configuration.md](./configuration.md) を参照してください。

- 表示設定（displayLimit等）
- フィルタ設定（除外パターン等）
- 設定ファイル管理

## 💡 実装の特徴

### モジュール構成
- `StreamDisplay`: メインの表示制御クラス
- `KeyboardHandler`: キーボード入力処理
- `StreamRenderer`: 画面描画処理
- `BufferedRenderer`: バッファリング描画
- `FocusManager`: フォーカスモード管理
- `Formatter`: 文字列フォーマット処理

### 非同期処理
- キャッシュの初期化はバックグラウンドで実行
- ファイル監視と表示更新は独立して動作

### エラーハンドリング
- Graceful shutdown（SIGINT対応）
- エラー時は適切なメッセージ表示

---

**注記**: この仕様はprevious-v01の実装を分析して作成したベースライン仕様です。新版開発では、この仕様を基に機能拡張・改善を行います。