# cctop 0.2.0.0 実装計画書

**作成日**: 2025年6月25日 10:00  
**更新日**: 2025年6月27日 01:15  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0  
**関連仕様**: FUNC-000-206, func-105, CG-001-004  

## 🎯 0.2.0.0の目標

**v0.1.x.xからの主要な改善点**:
- East Asian Width対応による正確な文字幅計算
- 二重バッファ描画によるちらつき防止
- レスポンシブディレクトリ表示（ターミナルリサイズ対応）
- ファイルライフサイクル追跡の強化
- イベントタイプフィルタリング機能
- postinstall自動初期化による導入の簡素化
- バックグラウンド監視モード（Monitor/Viewer分離アーキテクチャ）
- 即時表示・プログレッシブローディング（0.1秒以内の起動体験）

## 📊 実装スコープ

### 含まれるもの
1. **データベース基盤**（[FUNC-000](../../functions/FUNC-000-sqlite-database-foundation.md)準拠）
2. **ファイルライフサイクル追跡**（[FUNC-001](../../functions/FUNC-001-file-lifecycle-tracking.md)準拠）
3. **設定システム**（[FUNC-105/101](../../functions/func-105-local-setup-initialization.md)準拠）
4. **chokidar統合**（[FUNC-002](../../functions/FUNC-002-chokidar-database-integration.md)準拠）
5. **CLI表示**（[FUNC-202](../../functions/FUNC-202-cli-display-integration.md)準拠）
6. **表示機能拡張**:
   - East Asian Width対応（[FUNC-200](../../functions/FUNC-200-east-asian-width-display.md)）
   - 二重バッファ描画（[FUNC-201](../../functions/FUNC-201-double-buffer-rendering.md)）
   - レスポンシブディレクトリ表示（[FUNC-204](../../functions/FUNC-204-responsive-directory-display.md)）
7. **イベントフィルタリング**（[FUNC-203](../../functions/FUNC-203-event-type-filtering.md)準拠）
8. **自動初期化**（[FUNC-105](../../functions/func-105-local-setup-initialization.md)準拠）
9. **バックグラウンド監視**（[FUNC-003](../../functions/FUNC-003-background-activity-monitor.md)準拠）
10. **即時表示・プログレッシブローディング**（[FUNC-206](../../functions/FUNC-206-instant-view-progressive-loading.md)準拠）

### 含まれないもの
- プラグインシステム（FUNC-901）
- 表示色カスタマイズ（FUNC-900）
- Tracer機能（Selection/Detailモード）
- 高度なFilter/Sort機能
- トリガー・インデックス最適化
- 設定のホットリロード

## 🏗️ システムアーキテクチャ

### 標準モード（単一プロセス）
```
┌─────────────────┐
│   File System   │
└────────┬────────┘
         │ ファイル変更
┌────────▼────────┐
│    chokidar     │
└────────┬────────┘
         │ イベント検出
┌────────▼────────┐
│ Event Processor │ ← 設定システム
└────────┬────────┘
         │ 正規化・メタデータ付加
┌────────▼────────┐
│ SQLite (FUNC-000)│
└────────┬────────┘
         │ データ取得
┌────────▼────────┐
│   CLI Display   │
│  (All/Unique)   │
└─────────────────┘
```

### バックグラウンド監視モード（FUNC-003: 2プロセス分離）
```
┌─────────────────┐
│   File System   │
└────────┬────────┘
         │ ファイル変更
┌────────▼────────┐  Monitor Process (独立実行)
│    chokidar     │  ├── PID管理
└────────┬────────┘  ├── ログ出力
         │ イベント検出  └── 自動復旧
┌────────▼────────┐
│ Event Processor │ ← 設定システム
└────────┬────────┘
         │ 正規化・メタデータ付加
┌────────▼────────┐
│ SQLite (FUNC-000)│  ← WAL mode並行アクセス
│   activity.db   │     (ファイル監視データ専用)
└────────┬────────┘
         │ データ取得（60ms遅延）
┌────────▼────────┐  Viewer Process (フォアグラウンド)
│   CLI Display   │  ├── リアルタイム表示
│  (All/Unique)   │  ├── Monitor状態確認
└─────────────────┘  └── 自動起動制御
```

## 📁 ディレクトリ構造

### プロジェクトディレクトリ
```
cctop/
├── bin/
│   └── cctop              # 実行エントリポイント
├── src/
│   ├── config/
│   │   ├── config-manager.js
│   │   └── config-loader.js
│   ├── database/
│   │   ├── database-manager.js
│   │   ├── schema.js
│   │   └── event-manager.js
│   ├── monitors/
│   │   ├── file-monitor.js
│   │   ├── event-processor.js
│   │   ├── monitor-process.js      # FUNC-003: Monitor Process
│   │   └── process-manager.js      # FUNC-003: PID/ログ管理
│   ├── ui/
│   │   ├── cli-display.js
│   │   ├── stream-renderer.js
│   │   ├── keyboard-handler.js
│   │   └── viewer-process.js       # FUNC-003: Viewer Process
│   └── utils/                      # v0.2.0新設
│       ├── display-width.js         # East Asian Width対応
│       ├── buffered-renderer.js     # 二重バッファ描画
│       └── line-counter.js          # 行数カウント
├── test/
│   └── integration/
│       └── chokidar-db/
│           ├── basic-operations.test.js
│           ├── metadata-integrity.test.js
│           ├── data-integrity.test.js
│           └── fixtures/
└── package.json
```

### 設定ディレクトリ（[FUNC-105](../../functions/func-105-local-setup-initialization.md)準拠）
```
.cctop/                     # カレントディレクトリ配下
├── config.json            # メイン設定ファイル（ネスト構造）
├── plugin/                # プラグイン用（v0.2.0.0では未使用）
├── activity.db            # データベースファイル
├── activity.db-wal        # WAL ファイル（FUNC-003並行アクセス用）
├── activity.db-shm        # SHM ファイル（FUNC-003並行アクセス用）
├── monitor.pid            # FUNC-003: Monitor プロセスID
└── logs/                  # FUNC-003: ログディレクトリ
    ├── monitor.log        # 現在のMonitorログ
    ├── 2025-06-26.log     # 日次ローテーション済みログ
    └── 2025-06-25.log     # 前日ログ
```

## 🔄 実装フェーズ

### Phase 1: 基盤構築（2日）

#### 1.1 プロジェクトセットアップ
- package.json更新（依存関係追加）
  - postinstallスクリプトの設定（[FUNC-105](../../functions/func-105-local-setup-initialization.md)参照）
- ディレクトリ構造作成
- bin/cctop実行ファイル作成
- 設定ファイルの初期化（[FUNC-105](../../functions/func-105-local-setup-initialization.md)参照）

#### 1.2 データベース実装（[FUNC-000](../../functions/FUNC-000-sqlite-database-foundation.md)準拠）
- 5テーブル構成（event_types, files, events, measurements, aggregates）
- ファイル監視データ専用（Monitor状態管理は別途PIDファイル・ログで実装）
- SQLite WALモードでの運用（Monitor/Viewer並行アクセス対応）
- 実装例: [CG-003: Database Schema実装ガイド](../supplementary/CG-003-database-schema-implementation.md)

#### 1.3 設定システム基本実装（[FUNC-105](../../functions/func-105-local-setup-initialization.md)準拠）

**設定システムの基本方針**:
- シンプルな設定管理（`.cctop/config.json`）
- 自動初期化と簡単セットアップ
- 設定ファイルの詳細構造は[FUNC-105]を参照
- JSコード内でのハードコード禁止

**監視対象の管理**:
- 初回起動時にカレントディレクトリを自動設定
- 詳細な動作は[FUNC-105]を参照

**設定ファイル管理のポイント**:
- 設定不在時は自動初期化の実行
- エラーハンドリングの詳細は[FUNC-105]を参照
- 実装例: [CG-002: Config Manager実装ガイド](../supplementary/CG-002-config-manager-implementation.md)


### Phase 2: chokidar統合（2日）

#### 2.1 File Monitor実装
**chokidar初期化設定（[FUNC-002](../../functions/FUNC-002-chokidar-database-integration.md)準拠）**:
```javascript
this.watcher = chokidar.watch(config.paths, {
  persistent: true,
  ignoreInitial: false,  // 初期スキャンを有効化
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50
  },
  atomic: true,
  alwaysStat: true      // statsオブジェクトを常に提供
});
```

**初期スキャンの処理**:
- `ignoreInitial: false`により、起動時に既存ファイルをすべてスキャン
- `ready`イベントで初期スキャン完了を検出
- 初期スキャン中の`add`イベント → `find`として記録
- 初期スキャン後の`add`イベント → `create`として記録

#### 2.2 Event Processor実装
- chokidarイベントをDBイベントに変換
- 初期スキャンとリアルタイム監視の区別
- lost/refindロジックの実装
- 実装例: [CG-001: Event Processor実装ガイド](../supplementary/CG-001-event-processor-implementation.md)

### Phase 3: テスト実装（2日）

#### 3.1 テスト開発必須原則
**機能追加時のテスト義務**:
1. **1つ機能を追加したら、都度それに関するtestを書くこと**
2. **使い捨てのtestコード作成は、これを一切の例外なく認めない**

これらの原則により、機能とテストが常に同期し、品質を継続的に保証する。

#### 3.2 基本テストスイート
- basic-operations.test.js: create/find/modify/delete動作確認
- metadata-integrity.test.js: 6項目メタデータ完全性
- data-integrity.test.js: chokidar-DB間のデータ整合性

#### 3.3 テスト成功基準
- chokidarイベント数 === DB記録数
- timestamp精度±50ms以内
- 10ファイル高速作成で取りこぼしゼロ
- 必須メタデータ6項目すべて正確記録

### Phase 4: CLI実装（1日）

**CLI仕様統合**: CLI全体の仕様は **[FUNC-104: CLIインターフェース統合仕様](../../functions/FUNC-104-cli-interface-specification.md)** を参照

#### 4.1 基本表示機能（[FUNC-202](../../functions/FUNC-202-cli-display-integration.md)準拠）
- All/Uniqueモードの切り替え
- キーボードショートカット
- リアルタイム更新（60fps制限）

#### 4.2 表示フォーマット（ui001/ui002準拠）

**全体レイアウト**:
```
Event Timestamp      Elapsed    File Name             Directory       Event   Lines  Blocks
-------------------------------------------------------------------------------------------------
2025-06-24 14:30:15   00:01:23  index.js             src/            modify    125      8
2025-06-24 14:28:03   00:01:07  new-test.js          test/           create     45      3
2025-06-24 14:25:44   00:00:52  config.json          ./              delete     -       -
─────────────────────────────────────────────────────────────────────────────────
All Activities  Cached Events: 3/156
[a] All  [u] Unique  [q] Exit
```

**カラム仕様（v0.2.0最新）**:
| カラム | 幅 | 配置 | 説明 |
|--------|-----|------|------|
| Event Timestamp | 19 | 左寄せ | イベント発生時刻 |
| Elapsed | 7 | 右寄せ | 経過時間 |
| File Name | 28 | 左寄せ | ファイル名（East Asian Width対応） |
| Event | 8 | 左寄せ | イベントタイプ |
| Lines | 5 | 右寄せ | 行数 |
| Blocks | 6 | 右寄せ | ブロック数 |
| Directory | 可変 | 左寄せ | ディレクトリパス（レスポンシブ） |

**色分け（config.jsonでカスタマイズ可能）**:
- find: 青（chalk.blue）
- create: 明るい緑（chalk.greenBright）
- modify: デフォルト（色なし）
- move: シアン（chalk.cyan）
- delete: グレー（chalk.gray）
- lost: 暗い赤（chalk.red.dim）
- refind: 明るい黄（chalk.yellowBright）

### Phase 5: 統合・検証（1日）- 実動作駆動開発（Running-Driven Development: RDD）に基づく実動作確認

#### 5.1 RDD原則に基づく実動作確認
**RDD（Running-Driven Development）理念**:
1. **実行可能性最優先**: `npm start`で即座に動作することを最初に確認
2. **日次動作確認**: 開発中は毎日必ず実環境で動作確認
3. **段階的統合**: 新機能は必ず動作中のシステムに統合
4. **実ユーザー視点**: 実際の使用者の体験を重視

**実動作確認項目**:
- [ ] `bin/cctop`実行で即座起動（3秒以内）
- [ ] ファイル変更がリアルタイムで表示される
- [ ] All/Uniqueモード切り替えが動作する
- [ ] Ctrl+Cで正常終了する
- [ ] 1000ファイル監視での安定動作
- [ ] .cctop/activity.dbが正しく作成される

#### 5.2 統合テスト（実環境）
- 実際のプロジェクトディレクトリでの動作確認
- 長時間運用（最低1時間）での安定性確認
- メモリリーク・CPU使用率の監視

#### 5.3 ドキュメント作成
- README.md更新（クイックスタート含む）
- インストール・使用方法
- 設定ガイド

## 📊 成功基準

### 必須達成項目
- `npm start`で即座に起動
- chokidar → DB → 表示の完全な動作
- 全テストスイートの合格
- 6項目メタデータの正確な記録
- All/Uniqueモード切り替え動作
- East Asian Width対応の正確な表示
- イベントタイプフィルタリング動作
- ターミナルリサイズ時のレスポンシブ表示

### パフォーマンス目標
- 起動時間: < 3秒
- メモリ使用量: < 200MB
- CPU使用率: < 5%（アイドル時）
- 1000ファイル監視可能

### 実装上の注意点
- 初期化メッセージ（"starting", "initialized"等）はデバッグ用
- NODE_ENV=testまたはCCTOP_VERBOSE設定時のみ表示
- テストではメッセージ内容に依存しない実装とする

## 🚀 実装順序

1. **Phase 1**: 基盤構築（推定2日）
2. **Phase 2**: chokidar統合（推定2日） 
3. **Phase 3**: テスト実装（Phase 2と並行）
4. **Phase 4**: CLI実装（推定1日）
5. **Phase 5**: 統合・検証（推定1日）
6. **バッファ**: 最終調整

## ⚠️ リスクと対策

### リスク1: chokidar-DB統合の不具合
**対策**: FUNC-002の詳細仕様に完全準拠

### リスク2: パフォーマンス問題
**対策**: 最初はシンプルに実装、後で最適化

### リスク3: メタデータ収集の遅延
**対策**: 非同期処理とバッファリング

## 📝 備考

- この計画はRDD原則に基づき、常に動作する状態を維持
- 各フェーズ完了時に必ず実動作確認
- テストは各FUNC仕様に完全準拠
- v0.2.0.0で基本機能を完成
- v0.3.0.0以降でプラグイン・表示色カスタマイズ等を追加予定