# FUNC仕様書 Validator分析レポート - 全15機能の要求仕様統合

**作成日**: 2025年6月27日 02:50  
**作成者**: Validator Agent  
**分析対象**: 全15個のFUNC仕様書  
**目的**: テスト観点からの機能要件・制約・検証項目の統合分析

## 📊 分析概要

全15個のFUNC仕様書を読み込み、各機能の要求仕様をValidator観点から整理。現在のテストカバレッジと照合し、仕様適合性を検証するための情報を提供。

## 🏗️ Core Infrastructure (基盤機能群)

### FUNC-000: SQLiteデータベース基盤管理
**データベーススキーマ要件**:
- 5テーブル構成: events, event_types, files, measurements, aggregates
- WALモード必須、キャッシュサイズ64MB
- 外部キー制約: event_types参照整合性
- インデックス: timestamp, file_path, file_id複合索引必須

**テスト検証項目**:
- [ ] 初期化時のテーブル作成順序（外部キー制約考慮）
- [ ] WAL/SHMファイル自動生成・削除
- [ ] event_types初期データ6種類挿入
- [ ] トランザクション一貫性
- [ ] ファイル同一性管理（削除→復活時のfile_id再利用）

### FUNC-001: ファイルライフサイクル追跡
**イベントタイプ定義**:
- 6種類: find, create, modify, move, delete, restore
- chokidarマッピング: ready前後での動作分岐
- move検出: 100ms以内同一inode判定
- restore判定: 削除後5分以内復活

**テスト検証項目**:
- [ ] 各イベントタイプの正確な検出
- [ ] move vs delete+create の時間窓判定
- [ ] システム再起動後のdelete検出
- [ ] inode再利用時の新規オブジェクト作成
- [ ] restore期間制限（デフォルト5分）の設定適用

### FUNC-002: chokidar-Database統合監視
**監視設定要件**:
- ignored: node_modules, .git, .*, .cctop
- awaitWriteFinish: 2000ms安定化
- alwaysStat: true必須

**テスト検証項目**:
- [ ] chokidar設定の正確な適用
- [ ] イベント変換ロジック（chokidar→cctop）
- [ ] pending_unlinksマップでのmove検出
- [ ] データベーストランザクション管理
- [ ] 測定値収集（size/lines/blocks）

### FUNC-003: Background Activity Monitor
**プロセス管理要件**:
- PIDファイル: JSON形式、started_by記録必須
- 起動者記録: "viewer" vs "standalone"
- 終了制御: 起動者に応じた適切な終了

**テスト検証項目**:
- [ ] PIDファイル形式の正確性（JSON構造）
- [ ] Monitor/Viewer独立動作
- [ ] 起動者記録ルールの実装
- [ ] Viewer終了時のMonitor制御
- [ ] SQLite WAL並行アクセス

## 🔧 Configuration & Setup (設定・初期化)

### FUNC-105: ローカル設定・初期化
**ディレクトリ構造要件**:
```
.cctop/
├── config.json
├── activity.db
├── .gitignore
└── cache/
```

**テスト検証項目**:
- [ ] 初回実行時の自動ディレクトリ作成
- [ ] .gitignore自動生成内容
- [ ] postinstall.js実行確認
- [ ] 複数プロジェクト間の設定分離

### FUNC-101: 階層的設定管理
**config.jsonスキーマ**:
- monitoring.watchPaths, excludePatterns
- database.path, mode
- display.maxEvents, colors設定
- JSON Schema検証必須

**テスト検証項目**:
- [ ] JSON Schema準拠検証
- [ ] CLI引数 > config.json優先順位
- [ ] 設定値の型変換・範囲チェック
- [ ] デフォルト値の適用
- [ ] 設定ファイル不正時のエラーハンドリング

### FUNC-102: ファイル監視上限管理
**システム制限チェック**:
- Linux: /proc/sys/fs/inotify/max_user_watches
- 推奨値: 524288
- --check-limits オプション実装

**テスト検証項目**:
- [ ] プラットフォーム判定（Linux/macOS/Windows）
- [ ] inotify制限値読み取り
- [ ] 警告メッセージ表示制御
- [ ] --check-limits コマンド出力内容

### FUNC-104: CLIインターフェース統合
**オプション定義**:
- 基本: -d, -t, -v, -q, -h, --version
- システム: --check-limits
- インタラクティブ: a/u/q, f/c/m/d/v/r

**テスト検証項目**:
- [ ] 全CLIオプションの解析正確性
- [ ] ヘルプメッセージ内容・形式
- [ ] エラーメッセージ統一性
- [ ] インタラクティブキー応答性

## 🎨 Display & UI (表示・インターフェース)

### FUNC-200: East Asian Width対応表示
**文字幅計算要件**:
- string-width^5.1.2依存
- 半角1幅、全角2幅計算
- 省略記号（...）処理

**テスト検証項目**:
- [ ] ASCII/日本語/中国語ファイル名の正確な幅計算
- [ ] パディング処理（padEndWithWidth/padStartWithWidth）
- [ ] 幅超過時の省略処理
- [ ] 混在ファイル名の表示確認

### FUNC-201: 二重バッファ描画
**描画要件**:
- メモリバッファでの画面構築
- ANSIエスケープシーケンス制御
- 60fps維持（16ms間隔）

**テスト検証項目**:
- [ ] バッファ管理（clear/addLine/render）
- [ ] カーソル表示/非表示制御
- [ ] 高頻度更新でのちらつき防止
- [ ] 各種ターミナルでの互換性

### FUNC-202: CLI表示統合
**表示レイアウト**:
- カラム構成: Modified(19), Elapsed(9), FileName(35), Event(8), Lines(6), Blocks(8), Directory(可変)
- All/Uniqueモード切り替え
- 100ms更新間隔

**テスト検証項目**:
- [ ] カラム幅・配置の正確性
- [ ] All/Uniqueモード表示内容
- [ ] データベースクエリ最適化
- [ ] キーボード操作応答性
- [ ] East Asian Width統合

### FUNC-203: イベントタイプフィルタリング
**フィルタ機能**:
- キーバインド: f/c/m/d/v/r
- トグル動作、独立ON/OFF
- リアルタイム反映

**テスト検証項目**:
- [ ] 各イベントタイプフィルタの動作
- [ ] フィルタ状態の視覚的表示
- [ ] 複数フィルタ組み合わせ
- [ ] 既存表示の即座更新

### FUNC-204: レスポンシブディレクトリ表示
**動的調整要件**:
- ターミナルリサイズ検知
- ディレクトリカラム可変幅
- 末尾優先切り詰め

**テスト検証項目**:
- [ ] リサイズイベント処理
- [ ] 幅計算アルゴリズム（固定88文字 + 可変）
- [ ] 最小10文字幅保証
- [ ] 長パスの末尾優先表示

### FUNC-205: ステータス表示エリア
**ステータス表示要件**:
- 最大3行（設定可能）ストリーム表示
- プレフィックス: !! (エラー), >> (通常)
- 横スクロール対応（長文メッセージ）

**テスト検証項目**:
- [ ] ストリーム形式プッシュダウン動作
- [ ] 優先度による行並び替え
- [ ] 横スクロール動作（200ms/文字）
- [ ] 統計情報生成精度
- [ ] 設定行数制限

### FUNC-206: 即時表示・プログレッシブローディング
**起動要件**:
- 0.1秒以内Viewer表示
- 非ブロッキングMonitor起動
- プログレッシブデータ表示

**テスト検証項目**:
- [ ] 起動時間測定（目標100ms）
- [ ] Monitor起動並行処理
- [ ] データベース接続リトライ
- [ ] エラー時画面維持
- [ ] 起動者記録と終了制御

## 🔍 統合テスト検証項目

### データ整合性
- [ ] ファイル削除→復活時の同一file_id維持
- [ ] イベント履歴の完全性（timestamps順序）
- [ ] measurements/aggregatesテーブル同期
- [ ] 外部キー制約違反防止

### パフォーマンス要件
- [ ] 初期スキャン: 10,000ファイル < 5秒
- [ ] リアルタイム更新: 100ms間隔維持
- [ ] メモリ使用量: 長時間監視での増加抑制
- [ ] データベースサイズ: 適正な増加パターン

### エラー処理・回復性
- [ ] データベース破損時の回復
- [ ] Monitor異常終了時の自動復旧
- [ ] 権限不足時の適切な警告
- [ ] 設定ファイル不正時の初期化

### クロスプラットフォーム対応
- [ ] Linux: inotify制限チェック
- [ ] macOS: FSEvents動作確認
- [ ] Windows: ReadDirectoryChanges確認
- [ ] ターミナル互換性（iTerm2, Windows Terminal, VS Code）

## ⚠️ 現在テストが不足している領域

### 1. **FUNC-003 Monitor管理**
- PIDファイル形式検証
- 起動者記録ルール
- Viewer終了時のMonitor制御

### 2. **FUNC-105/101 設定管理統合**
- config.json初期化処理
- 設定値継承・マージロジック
- JSON Schema検証

### 3. **FUNC-200-206 表示システム統合**
- East Asian Width + 二重バッファ統合
- レスポンシブ + ステータス表示統合
- プログレッシブローディング全体

### 4. **エッジケース・異常系**
- 大量ファイル削除/復活
- 極端に長いファイル名/パス
- データベース競合状態
- メモリ制限環境での動作

## 🎯 推奨テスト優先順位

### Priority 1: Core Infrastructure
1. FUNC-000: データベーススキーマ整合性
2. FUNC-003: Monitor/Viewer協調動作
3. FUNC-001: ライフサイクル追跡完全性

### Priority 2: Configuration & Setup
4. FUNC-101: 設定管理階層化
5. FUNC-105: 初期化プロセス
6. FUNC-102: システム制限チェック

### Priority 3: Display Integration
7. FUNC-202 + FUNC-200: 表示基盤統合
8. FUNC-205: ステータス表示システム
9. FUNC-206: 起動プロセス最適化

---

**結論**: 現在のテストは基本的な単体機能をカバーしているが、機能間連携・設定管理・エラー処理の統合テストが不足。特にFUNC-003のプロセス管理とFUNC-200-206の表示システム統合に重点的なテスト拡充が必要。