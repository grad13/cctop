# Plans Directory - プロジェクト計画書管理

**作成日**: 2025年6月22日  
**最終更新**: 2025年6月29日  
**管理者**: Architect Agent  
**目的**: 大規模な計画・移行・改善計画の体系的管理

## 🗄️ DDD2実行記録

### L2→L3アーカイブ移行（2025-06-29）
- **実施内容**: 3日以上経過した18ファイルをarchives/へ移行
- **移行先**: `documents/archives/2025/0623-0629/`
- **P043準拠**: 各ファイルにアーカイブ情報とキーワード追加
- **検索方法**: `patterns "計画書名" archives/2025/0623-0629/`

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
| 019 | [`PLAN-20250628-001`](PLAN-20250628-001-typescript-migration.md) | TypeScript Migration Plan | Builder | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |
| 020 | [`PLAN-20250628-003`](PLAN-20250628-003-typescript-refactoring-overview.md) | TypeScript移行後リファクタリング総合計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 021 | [`PLAN-20250628-004`](PLAN-20250628-004-colormanager-refactoring.md) | ColorManager.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 022 | [`PLAN-20250628-005`](PLAN-20250628-005-detailinspection-refactoring.md) | DetailInspectionController.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 023 | [`PLAN-20250628-006`](PLAN-20250628-006-statusdisplay-refactoring.md) | status-display.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 024 | [`PLAN-20250628-007`](PLAN-20250628-007-interactivefeatures-refactoring.md) | InteractiveFeatures.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 025 | [`PLAN-20250628-008`](PLAN-20250628-008-processmanager-refactoring.md) | process-manager.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 026 | [`PLAN-20250628-009`](PLAN-20250628-009-configmanager-refactoring.md) | config-manager.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 027 | [`PLAN-20250628-010`](PLAN-20250628-010-eventprocessor-refactoring.md) | event-processor.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 028 | [`PLAN-20250628-011`](PLAN-20250628-011-databasemanager-refactoring.md) | database-manager.ts リファクタリング詳細計画 | Builder | 計画書作成完了 | 🔧 開発プロセス改善 |
| 029 | [`PLAN-20250628-012`](PLAN-20250628-012-typescript-refactoring-revised.md) | TypeScript移行後リファクタリング現状対応版 | Builder | 計画書作成完了・実行承認待ち | 🔧 開発プロセス改善 |
| 030 | [`PLAN-20250628-013`](PLAN-20250628-013-typescript-gradual-introduction.md) | TypeScript段階的導入計画（安全重視版） | Builder | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |
| 031 | [`PLAN-20250630-001`](PLAN-20250630-001-monitor-viewer-separation.md) | Daemon-CLI機能分離アーキテクチャ移行計画 | Architect | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |
| 032 | [`PLAN-20250701-032`](PLAN-20250701-032-v030-module-integration.md) | v0.3.0モジュール統合・実行可能環境構築計画 | Builder | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |
| 033 | [`PLAN-20250701-033`](PLAN-20250701-033-code-directory-restructure.md) | Code Directory Restructure Plan | Clerk | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |
| 034 | [`PLAN-20250703-034`](PLAN-20250703-034-runner-role-introduction.md) | Runner Role導入計画 | Clerk | 計画書作成完了・実行承認待ち | 🏗️ システム移行 |

### 📝 アーカイブされた計画書

2025-06-29のL2→L3移行により、以下の計画書がアーカイブされました：
- PLAN-20250622-001 〜 PLAN-20250626-003（計18ファイル）
- 検索は `patterns "計画書名" archives/2025/0623-0629/` で可能です
- 番号は欠番となりますが、新規計画書は連番を継続します（次は035から）

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