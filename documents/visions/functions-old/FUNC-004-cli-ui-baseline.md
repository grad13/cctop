# FUNC-004: CLI UI Baseline Foundation

**作成日**: 2025-06-24  
**作成者**: Architect Agent (Professional監査・更新版)  
**目的**: cctop v0.1.0.0 CLI UI基盤仕様  
**BP-000準拠**: ✅ 完全整合済み (L410-457)  
**抽出元**: ui001-cli-baseline.md

## 📊 表示モード (BP-000準拠)

**v0.1.0.0実装対象**:
- **All Activities モード**: すべてのイベントを時系列表示（デフォルト）
- **Unique Activities モード**: ファイルごとに最新のみ表示

**詳細仕様**: FUNC-005 (Stream Display System) を参照

## 🖥️ 画面レイアウト (BP-000準拠)

**v0.1.0.0実装対象**:
- **ヘッダー部**: カラム定義 (Modified, Elapsed, File Name, Directory, Event, Lines, Blocks)
- **メイン表示部**: データ表示 (デフォルト10行)
- **ステータスバー部**: 状態・操作ヘルプ

**詳細仕様**: FUNC-005 (Stream Display System) を参照

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

## 🎯 v0.1.0.0実装ガイダンス

### Builder Agent向け実装優先順位
1. **基本表示**: All/Uniqueモード切り替え（a/uキー）
2. **キーボード操作**: 基本操作（q終了、a/u切り替え）
3. **色分け**: 5つのイベントタイプ別色分け
4. **フォーカスモード**: ↑↓ナビゲーション（後期実装）

### BP-000完全準拠事項
- **表示カラム**: Modified(19), Elapsed(10), File Name(28), Directory(15), Event(8), Lines(5), Blocks(6)
- **色分け**: find(青), create(明緑), modify(デフォルト), move(シアン), delete(グレー)
- **キーバインド**: [a]All [u]Unique [q]Exit の3つ必須

### 実装ファイル構成（BP-000準拠）
```
src/ui/
├── cli-display.js        # メイン表示制御
├── stream-renderer.js    # 画面描画処理  
└── keyboard-handler.js   # キーボード入力処理
```

### 重要な実装注意点
- **FUNC-005連携**: ストリーム表示システムとの完全統合
- **データベース連携**: FUNC-001/002との整合性確保
- **表示制限**: displayConfig.maxEvents準拠

---

**BP-000関連セクション**: L410-457（CLI表示基盤・キーボード操作・色分け）  
**実装ファイル**: `src/ui/cli-display.js`  

*関連FUNC文書*:
- `FUNC-005`: ストリーム表示システム（密連携）
- `FUNC-001`: データベーススキーマ（データソース）