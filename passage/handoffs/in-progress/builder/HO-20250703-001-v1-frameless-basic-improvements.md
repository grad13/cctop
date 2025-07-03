# v1 Frameless UI 基本機能改善計画

## 🎯 目標
v1 Frameless UIの基本的な実用性向上

## 📊 現状調査結果

### ✅ 実装済み機能
1. **100msごとのDB更新**
   - `refreshRateMs: 100` でcli-config.tsに設定済み
   - setIntervalで自動更新実装済み

2. **基本的なUI実装**
   - BlessedFramelessUISimpleクラスとして実装
   - DB連携機能実装済み
   - 列間スペース調整済み

### ❌ 要改善項目

1. **画面整理**
   - 現状: `[↑↓] Navigate` や `[c] Config` など多くのキーガイドが表示
   - 問題: 画面下部を占有し、実データ表示領域を圧迫
   - 対応: 必要最小限のキーガイドに削減

2. **日本語対応**
   - 現状: 未検証
   - 懸念: ファイル名・ディレクトリ名に日本語が含まれる場合の表示崩れ
   - 対応: 日本語文字列の表示テストと修正

3. **長いディレクトリ名の動的表示**
   - 現状: truncateText()で固定幅カット（...表示）
   - 問題: ウィンドウリサイズ時の動的調整未実装
   - 対応: Directory列のauto幅計算改善

## 🔧 改善タスク

### Phase 1: UI整理（0.5日）
1. **キーガイドの簡素化**
   ```
   現在: [a] All  [u] Unique  [↑↓] Navigate  [Enter] Select  [space] Pause  [r] Refresh  [c] Config  [q] Exit
   改善案: [a/u] Mode  [space] Pause  [q] Exit
   ```

2. **不要な機能の削除**
   - Config表示機能（[c]キー）の削除検討
   - Select機能（[Enter]キー）の一時削除（詳細表示未実装のため）

### Phase 2: 日本語対応（0.5日）✅ 完了
1. **テストデータ作成** ✅
   - 日本語ファイル名のテストデータ追加
   - 日本語ディレクトリパスのテスト

2. **表示幅計算の修正** ✅
   - East Asian Width考慮（全角文字は2文字幅）
   - truncateTextメソッドの日本語対応

3. **テスト作成** ✅
   - 文字幅計算テスト（getStringWidth）
   - 文字切り詰めテスト（truncateText）
   - パディングテスト（padLeft/padRight）
   - 日本語データ処理テスト
   - 環境設定テスト

### Phase 3: 動的レイアウト（1日）✅ 完了
1. **ウィンドウリサイズ対応** ✅
   - screen.on('resize')イベントハンドラ追加
   - Directory列の動的幅再計算

2. **長いパス名の表示改善** ✅
   - 中間省略表示オプション（例: /very/.../deep/path）
   - ツールチップ表示の検討

**実装内容**:
- setupResizeHandler()メソッド追加
- truncateMiddle()メソッド実装（パス中間省略）
- リサイズ時の自動再レンダリング
- 3個の新規テスト追加（リサイズ・中間省略・幅計算）

### Phase 4: コア機能テスト作成（0.5日）✅ 完了
1. **自動更新機能テスト** ✅
   - 100ms毎の自動更新（refreshRateMs）
   - refreshData()の正常動作

2. **表示モードテスト** ✅
   - All Activities モード
   - Unique Files モード

3. **キーボード操作テスト** ✅
   - a/u: モード切り替え
   - space: 一時停止/再開
   - q: 終了
   - 上下キー: 選択移動

4. **UI要素テスト** ✅
   - ヘッダー表示
   - CLIConfig の読み込み
   - デフォルト値の適用

**実装内容**:
- 11個の新規テストケース追加
- 既存の5個の日本語対応テストと合わせて計16個のテスト
- すべてのテストが合格することを確認

## 📁 対象ファイル
- `modules/cli/src/ui/blessed-frameless-ui-simple.ts`
- `modules/cli/src/database/create-dummy-db.ts`（テストデータ追加）
- `modules/cli/demo-frameless-with-db.js`
- `modules/cli/src/ui/__tests__/blessed-frameless-ui-simple.test.ts`（テストファイル）

## 🎯 成果物
- シンプルで実用的なv1 Frameless UI
- 日本語環境での動作保証
- 動的なレイアウト調整機能

## 優先度
**High** - v1.0リリースの基本品質確保のため

## 進捗状況
- Phase 1: UI整理 - 未着手（Architectと相談予定）
- Phase 2: 日本語対応 - ✅ 完了
- Phase 3: 動的レイアウト - ✅ 完了
- Phase 4: コア機能テスト - ✅ 完了

## 期限
2日以内（2025-07-05まで）

---
作成者: Builder  
作成日時: 2025-07-03 13:30