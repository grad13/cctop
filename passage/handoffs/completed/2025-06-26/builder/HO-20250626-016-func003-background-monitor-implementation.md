# HO-20250626-016: FUNC-003 Background Activity Monitor実装依頼

**作成日**: 2025年6月26日 23:00  
**依頼者**: Architect Agent  
**対象者**: Builder Agent  
**優先度**: High  
**推定工数**: 2-3日  

## 📋 実装依頼概要

FUNC-003（Background Activity Monitor）の2プロセス分離アーキテクチャ実装。Monitor Process（バックグラウンド監視）とViewer Process（フォアグラウンド表示）の完全分離による継続的ファイル監視機能を実装してください。

## 🎯 実装対象機能

### FUNC-003: Background Activity Monitor
**仕様書**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`

**Core Functionality**:
- Monitor Process: 独立プロセスによる24/7ファイル監視
- Viewer Process: Databaseからの情報取得・表示
- SQLite WAL mode: 並行読み書きアクセス
- Process Management: PID管理・ログ出力・自動復旧

## 🏗️ 実装アーキテクチャ

### 2プロセス分離設計
```
Monitor Process (独立実行)     Viewer Process (フォアグラウンド)
├── chokidar監視              ├── Database読み取り
├── Event Processor            ├── FUNC-202 CLI表示
├── Database書き込み           ├── Monitor状態確認
└── PID・ログ管理              └── 自動起動制御
          │                           │
          └── SQLite WAL mode ←──────┘
             (activity.db)
```

### 必要ファイル実装
```
src/monitors/
├── monitor-process.js      # Monitor Process実装
└── process-manager.js      # PID・ログ管理

src/ui/
└── viewer-process.js       # Viewer Process実装
```

## 📊 実装仕様詳細

### 1. Monitor Process (`monitor-process.js`)
**責務**: バックグラウンドファイル監視・Database書き込み

**実装要件**:
- **FUNC-001/002準拠**: ファイルライフサイクル・chokidar統合機能を継承
- **独立実行**: ターミナル占有なし・24/7動作
- **SQLite書き込み**: WAL modeでeventsテーブルへ記録
- **プロセス管理**: 正常終了・異常復旧・シグナルハンドリング

### 2. Process Manager (`process-manager.js`)
**責務**: PIDファイル・ログファイル・プロセス状態管理

**実装要件**:
- **PIDファイル**: `~/.cctop/monitor.pid` 管理
- **ログ出力**: `~/.cctop/logs/monitor.log` 構造化ログ
- **プロセス制御**: 起動・停止・状態確認・重複防止
- **自動復旧**: 異常終了検出・自動再起動

### 3. Viewer Process (`viewer-process.js`)
**責務**: フォアグラウンド表示・Monitor制御

**実装要件**:
- **FUNC-202継承**: CLI表示統合機能をViewer内で実行
- **Database読み取り**: SQLite WAL mode並行アクセス
- **Monitor制御**: 自動起動・状態確認・プロセス連携
- **リアルタイム表示**: 60ms遅延でのデータ更新

## 🔧 技術実装要件

### Database要件
- **既存スキーマ**: FUNC-000準拠の5テーブル構成を使用
- **WAL Mode**: Monitor（書き込み）・Viewer（読み取り）並行アクセス
- **分離原則**: activity.db=ファイル監視専用、Monitor状態=PIDファイル管理

### Process State Management
- **PIDファイル**: JSON形式でプロセス情報管理
- **ログ管理**: 構造化ログ・ローテーション・保持期間
- **設定分離**: Monitor状態とファイル監視データの完全分離

### CLI Integration
```bash
# 統合コマンド（推奨）
cctop                    # Monitor自動起動 + Viewer表示

# 手動制御
cctop --daemon          # Monitor起動のみ
cctop --stop            # Monitor停止
```

## 🎯 実装順序（推奨）

### Phase 1: Process Manager基盤（1日）
1. **PIDファイル管理**: 作成・読み取り・削除・プロセス生存確認
2. **ログシステム**: 構造化ログ・ファイル出力・ローテーション
3. **基本テスト**: PID管理・ログ出力の単体テスト

### Phase 2: Monitor Process実装（1日）
1. **独立プロセス**: chokidar監視・Event Processor統合
2. **Database書き込み**: WAL mode対応・トランザクション処理
3. **シグナルハンドリング**: SIGTERM/SIGINT/SIGHUP対応

### Phase 3: Viewer Process実装（1日）
1. **FUNC-202統合**: CLI表示機能のViewer内実行
2. **Monitor制御**: 自動起動・状態確認・プロセス連携
3. **並行アクセス**: SQLite WAL mode読み取り

### Phase 4: 統合・検証（半日）
1. **CLI統合**: bin/cctopでの統合コマンド実装
2. **エラーハンドリング**: 異常終了・復旧処理
3. **動作確認**: 2プロセス分離の完全動作テスト

## 🧪 実装完了基準

### 必須動作確認
- [ ] `cctop` 実行でMonitor自動起動・Viewer表示
- [ ] Monitor独立実行・ターミナル終了後も監視継続
- [ ] Viewer終了後もMonitor動作継続
- [ ] `cctop --stop` でMonitor正常停止
- [ ] 異常終了時の自動復旧・PIDファイル整合性

### パフォーマンス確認
- [ ] Monitor最小限CPU使用（<5%）
- [ ] Viewer 60ms遅延でのリアルタイム表示
- [ ] SQLite WAL mode並行アクセス正常動作
- [ ] 1000ファイル監視での安定性

### エラーハンドリング確認
- [ ] Monitor crash時の自動復旧
- [ ] Database lock時の待機・再試行
- [ ] PIDファイル破損時の回復処理

## 📁 関連リソース

### 仕様書
- **FUNC-003**: `documents/visions/functions/FUNC-003-background-activity-monitor.md`
- **FUNC-000**: `documents/visions/functions/FUNC-000-sqlite-database-foundation.md`
- **FUNC-202**: `documents/visions/functions/FUNC-202-cli-display-integration.md`

### 実装ガイド
- **BP-001**: `documents/visions/blueprints/BP-001-for-version0200-restructered.md`
  - Section: バックグラウンド監視モード（FUNC-003: 2プロセス分離）

### 既存実装参照
- **FUNC-001/002**: ファイル監視・chokidar統合の既存実装
- **FUNC-202**: CLI表示統合の既存実装

## 🚀 次のステップ

1. **仕様書確認**: FUNC-003仕様書の詳細読解
2. **Phase 1実装**: Process Manager基盤から段階的実装
3. **Validator連携**: 各Phase完了時の品質確認依頼

この実装により、cctopは継続的バックグラウンド監視とリアルタイム表示の2プロセス分離アーキテクチャを実現します。

**期待される効果**:
- 24/7継続監視による完全なファイル変更追跡
- UI表示の独立性によるユーザー体験向上
- SQLite WAL modeによる高パフォーマンス並行アクセス