# PLAN-20250701-032: v0.3.0モジュール統合・実行可能環境構築計画

**作成日**: 2025年7月1日  
**作成者**: Builder Agent  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🏗️ システム移行  
**優先度**: 緊急  
**予想作業時間**: 4-6時間  

## 📋 概要

v0.3.0のDaemon-CLI分離アーキテクチャ実装において、複数のworktree環境で開発された成果物が混在し、実行可能な統合環境が存在しない状況を解消する。BP-002設計に基づいた正式な統合環境を構築する。

## 🎯 目標

1. **統合環境の確立**: cctop/modules/を正式な実装場所として確定
2. **実行可能性の確保**: bin/cctop-daemon, bin/cctop-cliが正常に動作
3. **依存関係の整理**: モノレポ構造での一元管理
4. **開発環境の保持**: worktreesは実験環境として維持

## 📊 現状分析

### 混在している実装

1. **cctop/modules/** - 最新の統合済みモジュール（部分的）
2. **worktrees/shared-module-dev/** - 共有モジュール（22テスト完了）
3. **worktrees/v030-cli/** - CLI実装
4. **worktrees/v030-daemon/** - Daemon実装
5. **worktrees/v030-shared/** - 別の共有モジュール

### 主要な問題点

- モジュール間の依存関係が未解決
- bin/実行ファイルが正しいモジュールを参照できない
- 各worktreeが独立したnode_modulesを持つ
- ビルドプロセスが統一されていない

## 🚀 実装計画

### Phase 1: 現状調査とバックアップ（30分）

1. **全実装の詳細調査**
   - 各worktreeの実装状態確認
   - テストの実行状況確認
   - 依存関係の洗い出し

2. **バックアップ作成**
   - 現在のcctop/modules/のバックアップ
   - worktreesの実装状態記録

### Phase 2: モジュール統合（2時間）

1. **最良実装の選定**
   - 各モジュールで最も完成度の高い実装を特定
   - テスト通過状況を基準に選定

2. **cctop/modules/への統合**
   ```
   cctop/modules/
   ├── shared/    # worktrees/shared-module-dev/から移植
   ├── daemon/    # worktrees/v030-daemon/から移植
   └── cli/       # worktrees/v030-cli/から移植
   ```

3. **重複コードの削除**
   - 古い実装の削除
   - 不要なファイルのクリーンアップ

### Phase 3: 依存関係の整理（1時間）

1. **npm workspaces設定**
   ```json
   // cctop/package.json
   {
     "workspaces": [
       "modules/shared",
       "modules/daemon", 
       "modules/cli"
     ]
   }
   ```

2. **相互依存の設定**
   - daemon → shared
   - cli → shared
   - 各package.jsonの依存関係更新

3. **統一ビルドスクリプト**
   - ルートレベルでのビルド管理
   - TypeScript設定の統一

### Phase 4: 実行環境の構築（1時間）

1. **bin/ディレクトリの修正**
   - cctop-daemon: modules/daemon/を参照
   - cctop-cli: modules/cli/を参照
   - 実行権限の確認

2. **起動スクリプトの作成**
   ```json
   // package.json scripts
   {
     "daemon": "node bin/cctop-daemon",
     "cli": "node bin/cctop-cli",
     "dev": "npm run daemon & npm run cli"
   }
   ```

3. **設定ファイルの配置**
   - .cctop/ディレクトリ構造の確認
   - デフォルト設定の配置

### Phase 5: 検証とテスト（1時間）

1. **基本動作確認**
   - daemonプロセスの起動
   - CLIの起動と表示
   - ファイル監視機能

2. **統合テスト**
   - daemon-CLI間の連携
   - データベース読み書き
   - イベント処理フロー

3. **既知の問題確認**
   - キー入力問題の状況
   - クラッシュ問題の再現性

### Phase 6: ドキュメント更新（30分）

1. **README.md更新**
   - 新しい起動方法
   - アーキテクチャ説明
   - トラブルシューティング

2. **開発ガイド作成**
   - モノレポでの開発手順
   - モジュール追加方法
   - テスト実行方法

## 🔄 ロールバックプラン

1. **バックアップからの復元**
   - Phase 1で作成したバックアップを使用
   - git resetによる状態復元

2. **worktree環境の維持**
   - 統合失敗時は元の開発環境で継続
   - 段階的な再統合を検討

## ⚠️ リスクと対策

### リスク1: 依存関係の競合
- **対策**: package-lock.jsonの慎重な管理
- **検証**: 各モジュールでのnpm install成功確認

### リスク2: TypeScript設定の不整合
- **対策**: tsconfig.jsonの統一設定作成
- **検証**: 全モジュールでのビルド成功

### リスク3: 実行時エラー
- **対策**: 段階的な起動確認
- **検証**: ログ出力による問題特定

## 📊 成功基準

1. **実行可能性**
   - `npm run daemon`でDaemonプロセス起動
   - `npm run cli`でCLI起動
   - 基本的なファイル監視動作

2. **開発効率**
   - 単一のnpm installで全依存関係解決
   - 統一されたビルド・テストコマンド

3. **保守性**
   - 明確なモジュール境界
   - 重複コードの排除

## 📝 実行後の課題

1. **キー入力問題の解決**（HO-20250630-001）
2. **コード重複解消リファクタリング**（PLAN-20250629-001）
3. **テストカバレッジの向上**

## 🔗 関連ドキュメント

- [BP-002](../../visions/blueprints/BP-002-for-version0300-daemon-cli-architecture.md): Daemon-CLI分離アーキテクチャ設計
- [HO-20250630-001](../../passage/handoffs/pending/builder/HO-20250630-001-crash-debugging-status.md): クラッシュ問題
- [REP-20250701-002](../reports/): 実装完了後の記録（要作成）

---

**承認後の実行手順**:
1. Phase 1から順次実行
2. 各Phaseの完了確認後に次へ進行
3. 問題発生時は即座に停止・報告