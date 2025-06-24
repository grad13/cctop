# CLI UI実装計画書

**作成日**: 2025-06-21 21:00  
**作成者**: Inspector Agent  
**目的**: ../specifications/ui/ui002-stream-display.md仕様に基づくCLI UI基本画面の実装計画

## 🎯 実装目標

../specifications/ui/ui002-stream-display.mdの仕様に従い、CCTopのメイン画面（All Activities/Unique Activitiesモード）を実装する。

## 📋 実装順序と依存関係

### Phase 1: 基礎構造（1時間）
1. **ディレクトリ構造確認・作成**
   - `cctop/src/ui/` ディレクトリ作成
   - 必要なサブディレクトリの整理

2. **基本クラス設計**
   ```
   cctop/src/ui/
   ├── stream-display.js      # メインの表示制御クラス
   ├── stream-renderer.js     # 描画処理クラス
   ├── buffered-renderer.js   # バッファリング制御
   └── formatters.js          # 共通フォーマット関数
   ```

3. **モックデータ準備**
   - データベースが未実装のため、モックデータで動作確認
   - `cctop/test/fixtures/mock-events.js` 作成

### Phase 2: StreamRenderer実装（1.5時間）
1. **基本レンダリング機能**
   - ヘッダー描画（カラム名・区切り線）
   - データ行描画（色分け含む）
   - ステータスバー描画

2. **フォーマット関数実装**
   - `truncateFileName()` - ファイル名省略
   - `formatEditTime()` - 時刻フォーマット
   - `formatElapsedTime()` - 経過時間計算

3. **色付け処理**
   - イベントタイプ別の色設定
   - chalkライブラリの活用

### Phase 3: StreamDisplay実装（2時間）
1. **状態管理**
   - 表示モード（All/Unique）
   - フィルタ状態（各イベントタイプのON/OFF）
   - 表示データのキャッシュ

2. **データ取得インターフェース**
   - モックデータ取得（後でDBに差し替え）
   - All Activitiesモードのデータ整形
   - Unique Activitiesモードのデータ整形

3. **更新制御**
   - 初期表示
   - 定期更新（1秒ごと）
   - 手動更新トリガー

### Phase 4: キーボード操作（1時間）
1. **基本操作の実装**
   - `a` - All Activitiesモード切り替え
   - `u` - Unique Activitiesモード切り替え
   - `q/Q` - 終了
   - `Tab` - モード切り替え（トグル）

2. **イベントハンドラー設定**
   - readline/keypressイベントの設定
   - 非ブロッキング入力処理

### Phase 5: メイン実行ファイル（30分）
1. **bin/cctop作成**
   - コマンドライン引数処理
   - 初期化処理
   - エラーハンドリング

2. **起動スクリプト調整**
   - package.jsonのbinセクション更新
   - 実行権限設定

## 🔧 技術的な考慮事項

### パフォーマンス最適化
- **描画の最適化**
  - 差分更新ではなく全体再描画（シンプルさ重視）
  - デバウンス処理で過剰な更新を防止
  - BufferedRendererで60fps制限

- **メモリ効率**
  - 表示に必要なデータのみ保持
  - 古いデータの自動破棄

### エラーハンドリング
- ターミナルサイズ取得エラー
- 描画エラー時のフォールバック
- キーボード入力の異常終了対応

### テスト容易性
- 各クラスの責務を明確に分離
- モックデータでの動作確認を優先
- 統合テストは後回し

## 📊 成果物と確認方法

### 期待される成果物
1. **実装ファイル**
   - `cctop/src/ui/stream-display.js`
   - `cctop/src/ui/stream-renderer.js`
   - `cctop/src/ui/buffered-renderer.js`
   - `cctop/src/ui/formatters.js`
   - `cctop/bin/cctop`

2. **テスト用ファイル**
   - `cctop/test/fixtures/mock-events.js`
   - `cctop/test/manual/ui-test.js`

### 動作確認方法
```bash
# 開発中の動作確認
node cctop/bin/cctop

# モックデータでの表示確認
node cctop/test/manual/ui-test.js

# npm経由での実行
npm link
cctop
```

### 確認項目チェックリスト
- [ ] ヘッダーが正しく表示される
- [ ] データ行が色付きで表示される
- [ ] ステータスバーが3-5行で表示される
- [ ] All/Uniqueモードの切り替えが動作する
- [ ] q/Qキーで終了できる
- [ ] 画面サイズ変更に対応している
- [ ] 経過時間が更新される

## 🚨 リスクと対策

### リスク1: ターミナル互換性
- **問題**: 異なるターミナルでの表示崩れ
- **対策**: ANSI標準エスケープシーケンスのみ使用

### リスク2: データベース未実装
- **問題**: 実データでのテストができない
- **対策**: モックデータで十分な種類のパターンを用意

### リスク3: パフォーマンス問題
- **問題**: 大量データでの描画遅延
- **対策**: 表示行数を制限（デフォルト10行）

## 📅 実装スケジュール

**総時間見積もり**: 5.5時間

1. **21:00-22:00** - Phase 1: 基礎構造
2. **22:00-23:30** - Phase 2: StreamRenderer実装
3. **翌日 09:00-11:00** - Phase 3: StreamDisplay実装
4. **11:00-12:00** - Phase 4: キーボード操作
5. **12:00-12:30** - Phase 5: メイン実行ファイル

## 🔄 次のステップ

本実装完了後：
1. データベース接続の実装
2. Scan/Sort/Filter機能の追加
3. 検索機能（/キー）の実装
4. 詳細表示機能の実装

---

**承認待ち**: この計画でよろしければ、Phase 1から実装を開始します。