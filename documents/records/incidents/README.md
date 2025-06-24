# インシデント管理

**作成日時**: 2025年6月13日 23:15  
**最終更新**: 2025年6月15日 - 命名規則標準化実施  
**目的**: プロジェクトで発生したインシデントの記録と学習

## 📋 概要

このディレクトリは、TimeBoxingプロジェクトで発生したインシデント、違反事例、問題事例を記録し、学習と改善に活用するためのものです。

## 📁 命名規則（2025年6月15日更新）

### インシデント記録の命名規則
- **形式**: `INC-YYYYMMDD-XXX-title.md`
- **各要素**:
  - `INC`: インシデントを示す固定接頭辞
  - `YYYYMMDD`: 発生日（例：20250615）
  - `XXX`: 3桁の連番（000から開始、日付リセットなし）
  - `title`: 簡潔な説明（kebab-case）
- **例**: 
  - `INC-20250615-001-coder-self-resolution.md`
  - `INC-20250614-019-timebox-pause-timer-continues.md`

### 採番ルール
- 連番は全体を通じて一意（日付でリセットしない）
- 欠番は再利用しない
- 最新番号: **002**（2025年6月18日現在）

## 🔍 記録すべき内容

各インシデントファイルには以下を含める：

1. **発生日時**: インシデントが発生した正確な日時
2. **概要**: 何が起きたかの簡潔な説明
3. **影響**: プロジェクトへの影響度
4. **根本原因**: なぜ発生したかの分析（5 Whys法推奨）
5. **対応内容**: 実施した修正・対策
6. **学習ポイント**: 今後の改善に活かせる教訓
7. **再発防止策**: 同様の問題を防ぐための対策

## 📊 インシデント一覧（最新順）

### 2025年6月18日
| ID | ファイル名 | 概要 | 重要度 | 状態 |
|---|---|---|---|---|
| 001 | INC-20250618-001-repeated-workspace-logs-creation.md | workspace直下logs作成再発（権限違反・検証不備） | Critical | 対応完了 |

### 2025年6月15日
| ID | ファイル名 | 概要 | 重要度 | 状態 |
|---|---|---|---|---|
| 001 | INC-20250615-001-meta-readme-outdated.md | meta/README.md更新漏れ | Critical | 対応中 |
| 008 | INC-20250615-008-unauthorized-directory-creation.md | 無断でdecisionsディレクトリ作成 | High | 対応中 |
| 007 | INC-20250615-007-monitor-specifications-misplacement.md | Inspector仕様書の配置場所違反 | High | 対応中 |
| 006 | INC-20250615-006-debug-without-plan.md | デバッグ計画なしでの修正着手 | High | 対応中 |
| 005 | INC-20250615-005-grep-command-violation.md | documentsでのGrepコマンド使用違反 | High | 対応中 |
| 004 | INC-20250615-004-incident-id-naming-violation.md | インシデントID命名規則違反 | High | 対応中 |
| 003 | INC-20250615-003-stats-visualizer-repeated-failure.md | 統計ビジュアライザー繰り返し修正失敗 | Critical | 対応中 |
| 002 | INC-20250615-002-bug-report-status-update-failure.md | バグ対応レポート・status更新漏れ | High | 対応中 |
| 001 | INC-20250615-001-coder-self-resolution.md | Coderが独断で解決判定 | High | 対応中 |

### 2025年6月14日
| ID | ファイル名 | 概要 | 重要度 | 状態 |
|---|---|---|---|---|
| 031 | INC-20250614-031-coder-authority-violation.md | Coder権限違反 | Critical | 対応中 |
| 030 | INC-20250614-030-meta-incident-record-only.md | インシデント記録のみで対策なし | High | 対応中 |
| 029 | INC-20250614-029-h025-triple-violation-coder.md | Coder H025 3連続違反 | Critical | 対応中 |
| 028 | INC-20250614-028-h025-triple-violation-inspector.md | Inspector H025 3連続違反 | Critical | 対応中 |
| 027 | INC-20250614-027-h025-repeated-violation-coder.md | Coder H025 2連続違反 | High | 対応中 |
| 026 | INC-20250614-026-h025-repeated-violation-inspector.md | Inspector H025 2連続違反 | High | 対応中 |
| 025 | INC-20250614-025-checklist-reference-failure.md | チェックリスト参照失敗 | High | 対応中 |
| 024 | INC-20250614-024-deleted-file-phantom-reference.md | 削除ファイル幻影参照 | Medium | 対応中 |
| 023 | INC-20250614-023-terminology-violation-h028.md | 用語定義違反（H028） | Critical | 対応中 |
| 022 | INC-20250614-022-technical-infinite-loop-h013.md | 技術的無限ループ（H013違反） | Critical | 対応中 |
| 021 | INC-20250614-021-bugs-directory-non-usage.md | bugsディレクトリ未使用 | Critical | 対応中 |
| 020 | INC-20250614-020-nonexistent-process-reference.md | 存在しないH027参照 | Critical | 対応中 |
| 019 | INC-20250614-019-timebox-pause-timer-continues.md | TimeBoxタイマー継続問題 | Critical | 対応中 |
| 018 | INC-20250614-018-multi-agent-protocol-violation.md | マルチエージェント違反 | High | 対応中 |
| 017 | INC-20250614-017-project-status-file-missing.md | LEGACY_STATUS.md消失 | High | 対応中 |
| 016 | INC-20250614-016-coder-claude-md-unauthorized-edit.md | CLAUDE.md無断編集 | Critical | 対応中 |
| 015 | INC-20250614-015-bug-status-misjudgment-archive.md | バグ誤判断archive移動 | Critical | 対応中 |
| 014 | INC-20250614-014-incident-response-process-failure.md | インシデント対応見落とし | Critical | 対応中 |
| 013 | INC-20250614-013-project-status-reference-protocol-violation.md | 廃止ファイル参照 | High | 対応中 |
| 012 | INC-20250614-012-terminology-violation-coder.md | Coder用語違反 | High | 対応中 |
| 011 | INC-20250614-011-taskgrid-input-focus-conflict.md | フォーカス管理競合 | Medium | 対応中 |
| 010 | INC-20250614-010-incident-response-process-violation.md | インシデント対応違反 | High | 対応中 |
| 009 | INC-20250614-009-hypotheses-management-failure.md | 仮説管理失敗 | High | 対応中 |
| 008 | INC-20250614-008-project-status-update-forget.md | LEGACY_STATUS更新忘れ | High | 対応中 |
| 007 | INC-20250614-007-feedback-recording-failure.md | フィードバック記録漏れ | Critical | 対応中 |
| 006 | INC-20250614-006-incident-response-incomplete.md | インシデント対応不完全 | High | 対応中 |
| 005 | INC-20250614-005-daily-cutout-forget.md | daily切り出し忘れ | Medium | 対応中 |
| 004 | INC-20250614-004-project-status-record-forget.md | LEGACY_STATUS記録忘れ | High | 対応中 |
| 003 | INC-20250614-003-directory-structure-violation.md | ディレクトリ構造違反 | Medium | 対応中 |
| 002 | INC-20250614-002-communication-failure-not-listening.md | コミュニケーション失敗 | High | 対応中 |
| 001 | INC-20250614-001-quick-switch-12hour-debug-failure.md | 12時間デバッグ失敗 | Critical | 対応中 |

### 2025年6月13日
| ID | ファイル名 | 概要 | 重要度 | 状態 |
|---|---|---|---|---|
| 002 | INC-20250613-002-h013-violation-examples.md | H013違反事例 | Medium | 対応中 |
| 001 | INC-20250613-001-h004-wrong-path-hypothesis.md | H004誤パス仮説作成 | Medium | 対応中 |

### 2025年6月12日
| ID | ファイル名 | 概要 | 重要度 | 状態 |
|---|---|---|---|---|
| 002 | INC-20250612-002-h004-guidelines-update-forget.md | README.md更新忘れ | Medium | 対応中 |
| 001 | INC-20250612-001-directory-structure-inconsistency.md | ディレクトリ構造不整合 | Medium | 対応中 |

## 🎯 目的

1. **透明性**: 問題を隠さず記録し、チーム全体で共有
2. **学習**: 失敗から学び、同じ過ちを繰り返さない
3. **改善**: インシデントパターンを分析し、プロセスを改善
4. **参照**: 将来同様の問題が発生した際の参考資料

## ⚠️ 注意事項

- インシデント記録は非難や批判のためではなく、学習と改善のため
- 個人を特定する情報は含めない（システムとプロセスに焦点）
- 客観的事実と分析に基づいて記録する

## 📈 統計（2025年6月15日現在）

- **総インシデント数**: 38件
- **Critical**: 16件
- **High**: 16件
- **Medium**: 6件
- **解決済み**: 0件（すべて対応中）

---

**メンテナンス**: このREADME.mdは新規インシデント追加時に更新すること