# Plans Directory - プロジェクト計画書管理

**作成日**: 2025年6月22日  
**最終更新**: 2025年6月26日  
**管理者**: Architect Agent  
**目的**: 大規模な計画・移行・改善計画の体系的管理

## 📋 概要

このディレクトリは、プロジェクト全体に影響する重要な計画書を管理します。reports/（完了した実施記録）と異なり、plans/は**将来実行する計画・企画**を保持します。

## 📐 ファイル命名規則

```
PLAN-YYYYMMDD-XXX-brief-description.md
```

- **PLAN**: 計画書識別子（固定）
- **YYYYMMDD**: 計画作成日
- **XXX**: 日付内連番（001, 002, ...）
- **brief-description**: 簡潔な説明（kebab-case）

⚠️ **注意**: 同一日付内での連番重複を避けるため、作成前に既存ファイルを確認してください。

## 📊 現在の計画書一覧

### 🗂️ 全計画書（作成日順）

| ID | ファイル名 | タイトル | 作成者 | ステータス | カテゴリ |
|----|-----------|---------|--------|------------|----------|
| 001 | [`PLAN-20250622-001`](PLAN-20250622-001-documents-mass-migration-to-cctop.md) | documents/大規模移行計画 | Architect | 計画書作成完了・実行承認待ち | 📁 文書管理 |
| 002 | [`PLAN-20250622-002`](PLAN-20250622-002-rep-migration-phase1.md) | REP移行Phase1計画 | Architect | 計画書作成完了 | 📁 文書管理 |
| 003 | [`PLAN-20250622-003`](PLAN-20250622-003-inspector-stuff-relocation.md) | inspector-stuff移転計画 | Architect | 計画書作成完了 | 📁 文書管理 |
| 004 | [`PLAN-20250622-004`](PLAN-20250622-004-5agent-system-rebalancing-proposal.md) | 5 Agent体制リバランス提案 | Validator | 提案作成完了・検討待ち | 🔧 開発プロセス |
| 005 | [`PLAN-20250623-001`](PLAN-20250623-001-ui-mode-separation.md) | UIモード分離計画 | Builder | 承認待ち | 🚀 機能開発 |
| 006 | [`PLAN-20250623-002`](PLAN-20250623-002-vis007-tracer-implementation.md) | vis007 Tracer機能実装計画 | Builder | 計画書作成完了 | 🚀 機能開発 |
| 007 | [`PLAN-20250624-002`](PLAN-20250624-002-test-improvement.md) | テスト改善計画書（改訂版） | Builder | 計画書作成完了・実行承認待ち | 🔧 開発プロセス |
| 008 | [`PLAN-20250624-002`](PLAN-20250624-002-documents-reorganization.md)⚠️ | Documents資料整理計画書 | Architect | 計画書作成完了 | 📁 文書管理 |
| 009 | [`PLAN-20250624-003`](PLAN-20250624-003-handoffs-structure-migration.md) | Handoffsディレクトリ構造移行計画 | Clerk | **実行完了**（REP-0094） | 🏗️ システム移行 |
| 010 | [`PLAN-20250624-004`](PLAN-20250624-004-test-isolation-investigation.md) | テスト分離問題調査計画 | Validator | 計画書作成完了・実行承認待ち | 🔧 開発プロセス |
| 011 | [`PLAN-20250624-005`](PLAN-20250624-005-git-management-separation-implementation.md) | Git管理分離ルール化実装プラン | Clerk | **実行完了**（親git/子git分離） | 🏗️ システム移行 |
| 012 | [`PLAN-20250624-006`](PLAN-20250624-006-techs-to-visions-reference-update.md) | techs/→visions/参照更新計画 | Clerk | **実行完了**（REP-0097） | 📁 文書管理 |
| 013 | [`PLAN-20250624-007`](PLAN-20250624-007-specifications-internal-reorganization.md) | specifications/内部整理計画 | Architect | **実行完了** | 📁 文書管理 |
| 014 | [`PLAN-20250624-008`](PLAN-20250624-008-specifications-content-consolidation.md) | specifications/内容統廃合計画書 | Architect | 計画書作成完了・実行承認待ち | 📁 文書管理 |
| 015 | [`PLAN-20250624-008`](PLAN-20250624-008-v0100-specifications-consolidation.md)⚠️ | specifications/統廃合計画書 | Architect | Active | 📁 文書管理 |
| 016 | [`PLAN-20250624-009`](PLAN-20250624-009-functions-extraction-roadmap.md) | Functions抽出ロードマップ（修正版） | Architect | Active | 🏗️ システム移行 |
| 017 | [`PLAN-20250625-001`](PLAN-20250625-001-test-quality-improvement.md) | テスト品質改善計画書 | Validator | **緊急度：Critical** | 🔧 開発プロセス |
| 018 | [`PLAN-20250626-001`](PLAN-20250626-001-legacy-directory-cleanup.md) | Legacy Directory Cleanup Plan | Architect | 計画書作成完了・実行承認待ち | 📁 文書管理 |

⚠️ **番号重複**: PLAN-20250624-002とPLAN-20250624-008に重複があります。次回作成時は既存番号を確認してください。

### 📈 ステータス別集計

| ステータス | 件数 | 割合 |
|-----------|------|------|
| 計画書作成完了・実行承認待ち | 6 | 33% |
| **実行完了** | 4 | 22% |
| 計画書作成完了 | 3 | 17% |
| Active | 2 | 11% |
| その他（承認待ち、提案等） | 3 | 17% |

### 📊 カテゴリ別集計

| カテゴリ | 件数 | アイコン | 説明 |
|----------|------|----------|------|
| 📁 文書管理・整理 | 9 | 📁 | ディレクトリ構造、文書移行、命名規則統一 |
| 🔧 開発プロセス改善 | 5 | 🔧 | ワークフロー、プロトコル、エージェント体制 |
| 🏗️ システム移行・アーキテクチャ | 3 | 🏗️ | 大規模移行、アーキテクチャ変更、DB移行 |
| 🚀 機能開発・実装 | 2 | 🚀 | 新機能開発、Phase別実装、技術統合 |

## 🔄 計画書のライフサイクル

```mermaid
graph LR
    A[計画立案] --> B[承認プロセス]
    B --> C[実行フェーズ]
    C --> D[完了・アーカイブ]
    D --> E[reports/へ実績記録]
```

### Phase詳細

1. **計画立案**
   - Architect/Builder/Validator/Clerk Agentによる計画書作成
   - 影響範囲・リスク分析
   - 実行手順・スケジュール策定

2. **承認プロセス**
   - ユーザーレビュー・承認
   - 関係エージェントとの調整
   - 実行可否判定

3. **実行フェーズ**
   - 計画書に基づく段階的実行
   - 進捗記録・問題対応
   - 完了条件確認

4. **完了・アーカイブ**
   - 実行結果のreports/記録
   - 計画書のarchives/移動
   - 教訓・改善点の抽出

## 🔗 関連ディレクトリ

| ディレクトリ | 用途 | 関係性 |
|-------------|------|--------|
| `reports/` | 完了した作業・調査の記録 | 実行完了後の実績記録先 |
| `incidents/` | 問題・インシデントの記録 | 計画実行中の問題記録 |
| `bugs/` | バグ報告・修正記録 | 技術的問題の記録 |
| `archives/` | 完了・非活性計画の保管 | 古い計画書の保管先 |

## 📝 管理方針

- **実行前提**: 全計画書は実行を前提として作成
- **具体性**: 曖昧な計画は作成しない（実行可能な詳細度必須）
- **影響分析**: リスク・影響範囲を必ず記載
- **段階実行**: 大規模計画はPhase分割必須
- **承認制**: ユーザー承認なしでの実行禁止
- **番号管理**: 同一日付内での連番重複を避ける

## ⚙️ 改善予定

1. **番号重複の解消**: 既存の重複番号を修正予定
2. **通し番号制の検討**: PLAN-0001形式への移行検討中
3. **自動採番ツール**: 番号重複防止のためのツール導入予定

---

**注**: 計画書は実行承認後、該当エージェントによる実行開始となります。Architect Agentは計画立案のみを担当し、実際の実行は適切な権限を持つエージェントが実施します。