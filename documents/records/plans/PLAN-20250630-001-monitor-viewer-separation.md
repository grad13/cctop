# PLAN-20250630-001: Daemon-CLI機能分離アーキテクチャ移行計画

**作成日**: 2025年6月30日  
**作成者**: Architect Agent  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🏗️ システム移行  
**優先度**: High（致命的バグ対応を含む）  

## 📋 概要

現在のcctopは、バックグラウンドプロセス（Daemon）とCLIインターフェース（CLI）が密結合しており、これが原因でシステム全体に影響を与えるバグ（terminal/ブラウザのクラッシュ）が発生している。本計画では、これらの機能を独立したモジュールに分離し、疎結合なアーキテクチャへ移行することで、安定性・保守性・拡張性を向上させる。

## 🎯 目的

1. **緊急対応**: 起動時のterminal/ブラウザクラッシュバグの解消
2. **アーキテクチャ改善**: Daemon機能とCLI機能の完全分離
3. **保守性向上**: 独立したテスト・デプロイを可能にする
4. **拡張性確保**: 将来的なマイクロサービス化への基盤構築

## 📊 現状分析

### 現在の構造
```
cctop/src/
├── monitors/       # モニター機能（比較的独立）
├── ui/            # 表示機能（分散）
├── display/       # 表示機能（分散）
├── interactive/   # 重複存在（トップレベルとui/配下）
├── database/      # 共有DB操作
└── types/         # 共通型定義
```

### 問題点
1. **密結合**: DaemonとCLIが同一プロセス空間で動作
2. **責任の混在**: 表示関連機能が複数ディレクトリに分散
3. **リソース競合**: DB接続・イベントループの競合可能性
4. **テストの困難性**: 機能単位でのテストが困難

## 🏗️ 提案アーキテクチャ

### 新構造
```
cctop/
├── shared/               # 共通モジュール
│   ├── src/
│   │   ├── schema/       # DBスキーマ定義  
│   │   ├── types/        # 共通型定義
│   │   └── database/     # DB接続・基本操作（WALモード設定含む）
│   └── tests/
├── daemon/               # バックグラウンドプロセス
│   ├── src/
│   │   ├── index.ts      # エントリーポイント
│   │   ├── file-monitor/ # ファイル監視（chokidar）
│   │   └── event-processor/ # イベント処理
│   └── tests/
│       ├── unit/         # 単体テスト
│       └── integration/  # daemon統合テスト
├── cli/                  # CLIインターフェース
│   ├── src/
│   │   ├── index.ts      # エントリーポイント
│   │   ├── display/      # 表示コンポーネント
│   │   ├── interactive/  # インタラクティブ機能
│   │   └── ui/           # UI管理
│   └── tests/
│       ├── unit/         # 単体テスト
│       ├── visual/       # ビジュアルリグレッションテスト
│       └── interaction/  # インタラクションテスト
├── integration/          # システム全体の統合テスト
├── scripts/
│   ├── start-daemon.js   # daemon起動
│   ├── start-cli.js      # cli起動
│   └── start.js          # 統合起動（デフォルト）
└── docs/                 # 全体仕様
```

### アーキテクチャ原則
1. **単一責任原則**: 各モジュールは1つの責任のみ
2. **依存性逆転**: 具象ではなく抽象に依存
3. **インターフェース分離**: 必要最小限のインターフェース
4. **開放閉鎖原則**: 拡張に対して開き、修正に対して閉じる

## 📝 実装計画（並列開発版）

### Phase 0: Worktree環境構築と基盤準備（0.5日）
**目的**: 3つの並列開発環境を即座に構築

```bash
# 3つのworktreeを作成
git worktree add ../06-cctop-shared shared-module-dev
git worktree add ../06-cctop-daemon daemon-dev  
git worktree add ../06-cctop-cli cli-dev

# それぞれで基本構造を作成
```

**並列作業チーム想定**:
- Team A: Shared/DB担当
- Team B: Daemon担当
- Team C: CLI担当

### Phase 1: 並列開発（3-4日）

#### Track A: Shared/DB開発
1. **shared/database作成**
   - スキーマ定義
   - WALモード設定実装
   - Repositoryパターン実装
   - DB操作ユーティリティ
2. **テスト環境**
   - DB確認コマンド実装
   - 単体テスト作成

#### Track B: Daemon開発
1. **daemon構造作成**
   - monitors/からの移行
   - shared/database利用
   - プロセス管理実装
2. **daemon専用テスト**
   - ファイル監視テスト
   - イベント処理テスト
   - 長時間稼働テスト

#### Track C: CLI開発  
1. **cli構造作成**
   - ui/display/interactive統合
   - shared/database利用
   - 100msポーリング実装
2. **CLI専用テスト**
   - **単体テスト**: 表示ロジック
   - **インタラクションテスト**: node-pty使用
   - **ビジュアルテスト**: スナップショット

### Phase 2: 統合とテスト（2日）

1. **3つのworktreeをマージ**
   - 統合ブランチ作成
   - 依存関係解決

2. **統合テスト**
   - E2Eテスト作成
   - パフォーマンス検証

3. **本番移行準備**
   - ドキュメント更新
   - リリース手順確立

## 📅 実装スケジュール（高速並列版）

**総期間**: 約5-6日（並列化により60%短縮）

- Day 0.5: Worktree環境構築
- Day 1-4: 3トラック並列開発
- Day 5-6: 統合・テスト・リリース

**リソース配分**（1人で作業する場合）:
- 午前: Track A（Shared/DB）
- 午後前半: Track B（Daemon）  
- 午後後半: Track C（CLI）
- 夕方: 3トラックの同期・調整

### Git Worktree戦略の採用

**決定: git worktreeを使用した並行開発**

メリット:
- 元のコードを保持したまま安全に作業
- ブランチ切り替えなしで並行開発
- 失敗時のロールバックが容易

作業ディレクトリ:
- メイン: `/Users/takuo-h/Workspace/Code/06-cctop`
- Worktree: `/Users/takuo-h/Workspace/Code/06-cctop-refactor`

## 🧪 テスト戦略詳細

### CLIテストアプローチ

#### 1. インタラクションテスト
```javascript
// node-ptyを使用した仮想ターミナル
import { Terminal } from 'node-pty';

test('キー入力ナビゲーション', async () => {
  const term = new Terminal();
  const cli = new CLIApp(term);
  
  term.write('\x1b[A'); // 上矢印
  await expect(cli.selectedIndex).toBe(previousIndex - 1);
  
  term.write('d'); // 詳細表示
  await expect(cli.mode).toBe('detail');
});
```

#### 2. ビジュアルリグレッションテスト
```javascript
// ターミナル出力をPNG化して比較
import { renderToImage } from 'terminal-to-png';

test('ステータス表示スナップショット', async () => {
  const output = cli.render();
  const image = await renderToImage(output);
  
  expect(image).toMatchImageSnapshot({
    customSnapshotIdentifier: 'status-display',
    threshold: 0.01
  });
});
```

#### 3. 出力検証テスト
```javascript
// ANSIエスケープシーケンスを除去して検証
import stripAnsi from 'strip-ansi';

test('イベントリスト表示', () => {
  const output = cli.renderEventList(mockEvents);
  const plainText = stripAnsi(output);
  
  expect(plainText).toContain('CREATE');
  expect(plainText).toContain('test.js');
  expect(plainText).toMatch(/Size:\s+1\.2KB/);
});
```

## 🚨 技術的課題と解決策

### 1. DB同時アクセス
- **解決**: SQLite WALモードを有効化
- **実装**: `PRAGMA journal_mode=WAL;`

### 2. リアルタイム性
- **解決**: 100msポーリング
- **理由**: ファイル監視において100msの遅延は許容範囲

### 3. daemonの堅牢性
- **方針**: daemonは最優先で安定稼働
- **CLIのバグ**: 許容（表示のみの影響）

### 移行方針
- **daemon優先**: データ収集機能の継続性を最優先
- **CLIの段階的改善**: 初期バージョンは最小機能でOK
- **ロールバック不要**: worktreeで別環境で作業

## 📊 成功指標

1. **バグ解消**: terminal/ブラウザクラッシュの完全解消
2. **性能向上**: 起動時間20%短縮
3. **テスト改善**: 単体テスト実行時間50%短縮
4. **保守性**: コード結合度の測定可能な減少

## 🔄 移行戦略

1. **並行稼働期間**: 新旧両方のアーキテクチャを一時的に共存
2. **段階的切り替え**: feature flagによる段階的有効化
3. **ロールバック計画**: 問題発生時の即座の旧版復帰

## 📝 承認事項

本計画の実行には以下の承認が必要：
1. アーキテクチャ変更の承認
2. 実装スケジュールの承認
3. リソース（作業時間）の確保

## 🎯 次のステップ

承認後：
1. BuilderへのHandoff作成（Step 1: Worktree構築から開始）
2. Git Worktreeの即時作成
3. 日次進捗報告の開始

## 📦 成果物

本計画完了時には以下が実現：
- **daemon**: 独立したバックグラウンドプロセス
- **cli**: 独立したCLIインターフェース
- **shared**: 最小限の共通モジュール
- **完全なテストスイート**: 単体/統合/E2E
- **バグの解消**: terminal/ブラウザクラッシュ問題の根本解決

---

**注記**: 本計画は緊急性の高いバグ対応を含むため、承認後は優先的に実行する必要があります。