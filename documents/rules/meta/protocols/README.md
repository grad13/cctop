# Protocols - 開発プロトコル・ガイドライン

**最終更新**: 2025年6月26日  
**更新内容**: P047 visions/構造分類ガイドライン追加  
**目的**: プロジェクト全体で一貫性のある開発を実現するためのルール集  
**H008適用**: すべてのファイル名が命名規則を遵守していることを確認済み

## 📋 概要

このディレクトリは、TimeBoxingプロジェクトの**開発ルール・ガイドライン**を管理します。
すべての開発者はこれらのルールに従って作業を行います。

## 🔢 Protocol番号体系（P000～）

各protocolには通し番号（P000から開始）を付与し、参照を簡潔化します。

| 番号 | ファイル名 | 概要 |
|------|------------|------|
| P000 | p000-overarching-principles.md | システム最上位原則（H000から移行） |
| P001 | (moved to specifications/terminology/glossary.md) | プロジェクト用語集（旧p001-glossary.mdから移動） |
| P002 | 廃止 | 開発ガイドライン（REP-0038に統合） |
| P003 | p003-deployment.md | デプロイメントプロセス |
| P004 | (moved to specifications/asset-management/favicon-policy.md) | アセット管理方針 |
| P005 | (integrated into specifications/terminology/README.md) | 命名プロトコル（用語管理の組織化ポリシー） |
| P006 | p006-file-naming-convention.md | ファイル命名規則 |
| P007 | p007-document-integrity-check.md | 文書整合性定期チェック |
| P008 | p008-question-resolution.md | 質問解決プロセス |
| P009 | 欠番 | （DDD2に統合済み） |
| P010 | p010-bug-resolution-verification.md | バグ解決検証プロトコル（H040統合済み） |
| P011 | p011-coder-bug-recording-protocol.md | Builder/Validatorバグ記録プロトコル（5エージェント体制対応） |
| P012 | p012-statistics-tracking.md | 統計追跡プロトコル |
| P013 | p013-patterns-restriction-all-agents.md | 全エージェントpatternsコマンド使用制限（5エージェント体制対応） |
| P014 | p014-inspector-patterns-restriction.md | Inspectorエージェントpatternsコマンド使用禁止（documents限定） |
| P015 | p015-incident-creation-protocol.md | インシデント管理総合プロトコル（H041統合済み） |
| P016 | p016-agent-permission-matrix.md | Agent権限マトリックス |
| P017 | p017-directory-placement-guidelines.md | ディレクトリ配置ガイドライン（H030/H043統合済み） |
| P018 | p018-bash-command-execution.md | Bashコマンド実行前確認プロセス（D001から移行） |
| P019 | p019-documents-editing-advanced.md | Documents編集必須プロセス（D002から移行、H030統合済み） |
| P020 | p020-comprehensive-debug-approach.md | 包括的デバッグアプローチ（D003から移行、H020統合済み） |
| P021 | 欠番 | （P022に統合済み） |
| P022 | p022-directory-total-consistency.md | ディレクトリ総合整合性プロトコル（P021/H030統合済み） |
| P023 | 欠番 | （DDD2に統合済み） |
| P024 | p024-monthly-document-review.md | 月次文書管理レビュープロトコル（H045統合済み） |
| P025 | p025-report-creation-guidelines.md | レポート作成ガイドライン |
| P026 | p026-document-metadata-standard.md | ドキュメントメタデータ標準 |
| P027 | 欠番 | （DDD2として昇格済み - 2025年6月18日） |
| P028 | p028-technical-debt-prevention.md | 技術的負債防止プロトコル（H013から移行） |
| P029 | p029-naming-convention-enforcement.md | 命名規則強制プロトコル（H008から移行） |
| P030 | p030-integrated-status-management.md | 統合状況管理プロトコル（H017/P009統合） |
| P031 | p031-process-compliance-enforcement.md | プロセス遵守強制プロトコル（H018/H038統合） |
| P032 | 欠番 | （H032はP031に統合済み） |
| P033 | p033-development-quality-assurance.md | 開発品質保証プロトコル（H016から移行） |
| P034 | p034-active-listening-protocol.md | アクティブリスニングプロトコル（H022から移行） |
| P035 | p035-task-completion-reminder.md | タスク完了時自動リマインダープロトコル（H024から移行） |
| P036 | p036-git-archive-strategy.md | Git完結型アーカイブ戦略プロトコル（H034から移行） |
| P037 | p037-agent-recording-system.md | エージェント適応型記録システムプロトコル（H037から移行） |
| P038 | p038-analysis-framework-protocol.md | 分析フレームワークプロトコル（H042から移行） |
| P039 | p039-claude-optimization-protocol.md | CLAUDE.md最適化プロトコル（H011から移行） |
| P040 | p040-invariant-protection-protocol.md | 不変要素保護プロトコル（H014から移行） |
| P041 | 廃止 | 仮説ライフサイクル管理（hypotheses廃止により不要） |
| P042 | p042-protocol-periodic-review.md | プロトコル定期見直しプロトコル（2025年6月18日制定） |
| P043 | p043-l2-to-l3-archive-migration-protocol.md | L2→L3アーカイブ移行プロトコル（DDD2階層メンテナンス） |
| P044 | p044-l1-l2-migration-protocol.md | L1→L2移行プロトコル（週次status整理） |
| P045 | p045-git-management-separation-protocol.md | Git管理分離プロトコル（親git・子git境界管理） |
| P046 | 欠番 | （P045が重複して作成されたため） |
| P047 | p047-visions-structure-classification-guide.md | visions/構造分類ガイドライン（functions/code-guides/blueprints/） |

**参照例**: 「P000を確認してください」「P007実施完了」

**新規Protocol番号**: P048から（P009、P021、P023、P027はDDD2またはP022に統合済み、P032はP031に統合済み、P046は欠番）


## 📁 ファイル構成（番号順）

⚠️ **重要な注意事項**:
- P001は specifications/terminology/glossary.md に移動済みです
- P005は specifications/terminology/README.md に統合済みです
- P009はDDD2に統合済みのため欠番です
- P021はP022に統合済みのため欠番です
- P023はDDD2に統合済みのため欠番です
- P032はP031に統合済みのため欠番です
- P041は廃止（hypotheses廃止により不要）

### 基本ルール
- **P000: [p000-overarching-principles.md](p000-overarching-principles.md)** - システム最上位原則（H000から移行）
  - オッカムの剃刀：改善要素は多すぎても逆に悪化
  - 基礎基盤の安定性優先
  - 新ルール発散の防止

- **P001: [glossary.md](../../specifications/terminology/glossary.md)** - プロジェクト用語集（旧p001-glossary.mdから移動）
  - プロジェクト固有の概念・用語の定義
  - ビジネス用語の説明
  - ユーザー向け用語の統一

- **P002: 廃止** - 開発ガイドライン（REP-0038に統合、archive/protocols/p002-development-deprecated.mdに移動済み）

### プロセス・運用
- **P003: [p003-deployment.md](p003-deployment.md)** - デプロイメントプロセス
  - GitHub CI/CDを通じたデプロイフロー
  - 禁止事項（直接デプロイの禁止）
  - 本番環境への反映手順

- **P008: [p008-question-resolution.md](p008-question-resolution.md)** - 質問解決プロセス
  - 疑問点の体系的解消手順
  - 技術的問題の質問テンプレート

- **P009: 欠番** - （DDD2に統合済み）

### 管理方針
- **P004: [favicon-policy.md](../../specifications/asset-management/favicon-policy.md)** - アセット管理方針（specifications/に移動）
  - ファビコン・画像の管理
  - 静的ファイルの配置ルール
  - バージョン管理

- **P005: [specifications/terminology/README.md](../../specifications/terminology/README.md)** - 命名プロトコル（統合済み）
  - 用語管理の組織化ポリシー
  - glossaryとterminologyの役割分担
  - specifications/terminology/README.mdに統合
  
- **P006: [p006-file-naming-convention.md](p006-file-naming-convention.md)** - ファイル命名規則 ⚠️H008重点適用
  - ファイル名の形式（kebab-case）
  - ディレクトリ別命名規則
  - 避けるべきパターン（畳語、日本語）
  - 日付フォーマット（dailyログ用）

- **P007: [p007-document-integrity-check.md](p007-document-integrity-check.md)** - 文書整合性定期チェック
  - 仮説・Dominants参照の整合性確認
  - broken link・obsolete参照の根絶
  - ユーザー指定時の完全チェック手順
  - エスカレーション基準

### 専門プロトコル
- **P010: [p010-bug-resolution-verification.md](p010-bug-resolution-verification.md)** - バグ解決検証プロトコル（H040統合）
  - バグ修正後の検証手順
  - 根本原因解決の確認方法
  - 5段階ステータス定義（Found → Investigating → Implementing → Awaiting Verification → Resolved）
  - ユーザー確認の絶対性

- **P011: [p011-coder-bug-recording-protocol.md](p011-coder-bug-recording-protocol.md)** - Builder/Validatorバグ記録プロトコル（5エージェント体制対応）
  - 1ファイル1バグの記録規則
  - pre-commit強制システム

- **P012: [p012-statistics-tracking.md](p012-statistics-tracking.md)** - 統計追跡プロトコル
  - Inspector Agent専用統計システム
  - Git統計・パフォーマンス監視

- **P013: [p013-patterns-restriction-all-agents.md](p013-patterns-restriction-all-agents.md)** - 全エージェントpatternsコマンド使用制限（5エージェント体制対応）
  - 思い込み行動防止
  - README.md確認義務化
  - 実装品質向上

- **P014: [p014-inspector-patterns-restriction.md](p014-inspector-patterns-restriction.md)** - Inspectorエージェントpatternsコマンド使用禁止（documents限定）
  - documentsディレクトリへの適切なアクセス
  - surveillance/ディレクトリ内では制約なし
  - 統計精度向上

- **P015: [p015-incident-creation-protocol.md](p015-incident-creation-protocol.md)** - インシデント作成プロトコル
  - INC-YYYYMMDD-XXX-title.md形式の厳守
  - title部分の必須化
  - README.md更新手順

- **P016: [p016-agent-permission-matrix.md](p016-agent-permission-matrix.md)** - Agent権限マトリックス（5エージェント体制）
  - Read/Write/Create/Delete/Move権限の詳細定義
  - 5エージェント（Builder, Validator, Architect, Clerk, Inspector）の権限一覧
  - Builder-Validator連携プロトコル含む

- **P017: [p017-directory-placement-guidelines.md](p017-directory-placement-guidelines.md)** - ディレクトリ配置ガイドライン
  - 記録系（重複許容）と体系系（MECE原則）の分類
  - 情報のライフサイクルと配置フロー
  - 配置判断フローチャート

- **P018: [p018-bash-command-execution.md](p018-bash-command-execution.md)** - Bashコマンド実行前確認プロセス
  - コマンドチェーン（&&）禁止ルール
  - CLAUDE.md参照義務
  - 検証ステップ

- **P019: [p019-documents-editing-advanced.md](p019-documents-editing-advanced.md)** - Documents編集必須プロセス
  - 3段階検証プロセス
  - 品質問題の90%防止
  - チェックリスト

- **P020: [p020-comprehensive-debug-approach.md](p020-comprehensive-debug-approach.md)** - 包括的デバッグアプローチ（H020統合）
  - ログファースト原則
  - 一度の実行で問題全容把握
  - 効率的調査手法
  - デバッグサイクル3-5回→1-2回への削減

- **P021: 欠番** - （P022に統合済み）

- **P022: [p022-directory-total-consistency.md](p022-directory-total-consistency.md)** - ディレクトリ総合一貫性維持
  - P007とP021のオーケストレーション
  - ディレクトリ変更時の総合的品質保証
  - 統合レポートと優先度付け

- **P023: 欠番** - （DDD2に統合済み）

- **P024: [p024-monthly-document-review.md](p024-monthly-document-review.md)** - 月次文書管理レビュープロトコル
  - 毎月第1営業日の定期レビュー
  - 総合的チェック
  - 文書ライフサイクルの管理

- **P025: [p025-report-creation-guidelines.md](p025-report-creation-guidelines.md)** - レポート作成ガイドライン
  - 1レポート1トピックの原則
  - 依存関係の明示化
  - レポート構造のテンプレート

- **P026: [p026-document-metadata-standard.md](p026-document-metadata-standard.md)** - ドキュメントメタデータ標準
  - 作成日時の統一形式（YYYY年MM月DD日 HH:MM）
  - 参照URL、疑問点・決定事項の記載
  - README.mdとテンプレート以外に適用

- **P027: 欠番** - （DDD2として昇格済み - 2025年6月18日）
  - 階層メモリメンテナンス原則として最高位規則化
  - L0→L1→L2→L3の階層管理はDDD2で規定
  - 文書管理の最上位原則として全プロジェクトに適用

- **P028: [p028-technical-debt-prevention.md](p028-technical-debt-prevention.md)** - 技術的負債防止プロトコル
  - H013から移行
  - 症状隠蔽の禁止
  - 根本原因の特定と解決

- **P029: [p029-naming-convention-enforcement.md](p029-naming-convention-enforcement.md)** - 命名規則強制プロトコル
  - H008（命名規則遵守）のプロトコル化
  - 畳語チェック・ディレクトリ名重複チェック
  - ファイル操作前チェックリストの強制

- **P030: [p030-integrated-status-management.md](p030-integrated-status-management.md)** - 統合状況管理プロトコル
  - H017の統合
  - セッション開始時必須プロセス
  - メモリキャッシュアナロジー

- **P031: [p031-process-compliance-enforcement.md](p031-process-compliance-enforcement.md)** - プロセス遵守強制プロトコル
  - H018/H038統合版
  - インシデント対応5フェーズ強制
  - チェックリスト強制参照システム

- **P032: 欠番** - （P031に統合済み）

- **P033: [p033-development-quality-assurance.md](p033-development-quality-assurance.md)** - 開発品質保証プロトコル
  - H016から移行
  - 3段階開発プロセス
  - 機能検証・品質保証

- **P034: [p034-active-listening-protocol.md](p034-active-listening-protocol.md)** - アクティブリスニングプロトコル
  - H022から移行
  - 理解確認テンプレート
  - トリガーワード検出

- **P035: [p035-task-completion-reminder.md](p035-task-completion-reminder.md)** - タスク完了時自動リマインダー
  - H024から移行
  - トリガーキーワード定義
  - daily切り出し忘れ防止

- **P036: [p036-git-archive-strategy.md](p036-git-archive-strategy.md)** - Git完結型アーカイブ戦略
  - H034から移行
  - archiveディレクトリ完全廃止
  - Git機能による履歴管理

- **P037: [p037-agent-recording-system.md](p037-agent-recording-system.md)** - エージェント適応型記録システム
  - H037から移行
  - Coder: 技術的強制
  - Inspector: 自己監視型

- **P038: [p038-analysis-framework-protocol.md](p038-analysis-framework-protocol.md)** - 分析フレームワークプロトコル
  - H042から移行
  - 分析活動の仮説化
  - 検証可能な分析フレームワーク

- **P039: [p039-claude-optimization-protocol.md](p039-claude-optimization-protocol.md)** - CLAUDE.md最適化プロトコル
  - H011から移行
  - 切り出し基準・最適サイズ
  - 定期レビュータイミング

- **P040: [p040-invariant-protection-protocol.md](p040-invariant-protection-protocol.md)** - 不変要素保護プロトコル
  - H014から移行
  - Dominant/P000の絶対保護
  - アクセス前必須確認プロセス

- **P041: 廃止** - 仮説ライフサイクル管理（hypotheses廃止により不要）

- **P042: [p042-protocol-periodic-review.md](p042-protocol-periodic-review.md)** - プロトコル定期見直しプロトコル
  - 全プロトコルの月次包括見直し
  - 参照正確性・内容最新性・整合性確保
  - 人的精読による品質保証

- **P043: [p043-l2-to-l3-archive-migration-protocol.md](p043-l2-to-l3-archive-migration-protocol.md)** - L2→L3アーカイブ移行プロトコル
  - DDD2階層メンテナンスの具体的実装
  - 2週間経過＋内容精査での移行判定
  - キーワード追加による検索継続性

- **P044: [p044-l1-l2-migration-protocol.md](p044-l1-l2-migration-protocol.md)** - L1→L2移行プロトコル
  - 週次status整理の標準手順
  - 3日間経過での自動移行ルール
  - Agent状態管理の最適化

- **P045: [p045-git-management-separation-protocol.md](p045-git-management-separation-protocol.md)** - Git管理分離プロトコル
  - 親git・子git境界の厳格管理
  - ファイルパスによる機械的判定
  - Agent別操作ガイドライン

- **P046: 欠番** - （P045が重複して作成されたため）

- **P047: [p047-visions-structure-classification-guide.md](p047-visions-structure-classification-guide.md)** - visions/構造分類ガイドライン
  - functions/: 機能仕様（何をするか）
  - code-guides/: 実装ガイド（どう作るか）
  - blueprints/: 統合設計（全体像）

## 🎯 使い方

### 新規参加者の場合
1. まず**P001**（specifications/terminology/glossary.md）でプロジェクト用語を理解
2. **P000**でシステム最上位原則を確認
3. **P006**でファイル命名規則を把握

### 特定の作業を行う場合
- デプロイする → **P003**
- ファイルを追加する → **P006**
- 用語を管理する → **P005**（specifications/terminology/README.mdを参照）
- アセットを管理する → **P004**（specifications/asset-management/へ移動）
- 疑問を解決する → **P008**
- 文書整合性をチェックする → **P007**
- バグを記録する → **P011**
- 統計を追跡する → **P012**
- Builder/Validatorのpatternsコマンド制約 → **P013**
- Inspectorのpatternsコマンド制約 → **P014**
- インシデントを作成する → **P015**
- Agent権限を確認する → **P016**
- 文書の配置先を決める → **P017**
- Bashコマンドを実行する → **P018**
- documentsを編集する → **P019**
- デバッグ・調査を行う → **P020**
- ディレクトリ変更後の一貫性を保つ → **P022**
- L2文書をアーカイブする → **DDD2**
- 月次文書レビューを実施する → **P024**
- レポートを作成する → **P025**
- 作成日時を記載する → **P026**
- H044階層を維持する → **DDD2**
- ファイル名の規則を強制する → **P029**
- セッション開始時確認 → **P030**
- プロセス遵守を確実にする → **P031**
- 開発品質を保証する → **P033**
- ユーザー説明を理解する → **P034**
- タスク完了時チェック → **P035**
- アーカイブ管理 → **P036**
- エージェント記録管理 → **P037**
- 分析活動を体系化する → **P038**
- CLAUDE.mdを最適化する → **P039**
- 不変要素を保護する → **P040**
- 仮説ライフサイクル管理 → **P041**（廃止）
- プロトコル定期見直し → **P042**
- L2→L3アーカイブ移行 → **P043**
- L1→L2移行 → **P044**
- Git管理分離 → **P045**
- visions/構造分類 → **P047**

### 番号での簡潔参照
- 「P007を実施してください」
- 「P000の用語定義を確認」
- 「P011に従ってバグ記録完了」
- 「P013によりpatternsコマンド禁止」
- 「P014によりdocumentsでのpatterns禁止」
- 「P015でインシデント作成手順確認」

## 📝 Protocol追加・更新の方針

### 新規Protocol作成時
1. **実践から生まれたルール**: 実際の開発で必要になったルールを追加
2. **簡潔で実用的**: 長すぎず、すぐに参照できる内容
3. **番号採番**: 最新番号+1を割り当て（P042から）
4. **README.md更新**: 対応表への必須追加
5. **P026準拠**: 作成日時を HH:MM 形式で記載

### 定期的な見直し
- 形骸化したProtocolは削除・統合
- 番号は再利用せず、欠番として管理
- 重要度・使用頻度による並び替え検討

## ⚠️ H008: ファイル命名規則の遵守

### 新規ファイル作成・リネーム時の必須確認事項
1. ✅ 英語のみ使用しているか？
2. ✅ kebab-case形式になっているか？
3. ✅ ディレクトリ名との重複はないか？（例: protocols/内でprotocols-*.mdは禁止）
4. ✅ 同じ単語の繰り返しはないか？
5. ✅ 意味は明確で簡潔か？

### 現在のディレクトリ状態（2025年6月14日 09:30更新）
- **改名実施**: 
  - deployment-process.md → deployment.md
  - development-guidelines.md → development.md
  - naming-protocol.md → naming.md
  - question-resolution-process.md → question-resolution.md
- **理由**: process, guidelines, protocol はすべてprotocolsの類語
- **違反ファイル**: なし
- **要注意**: 新規ファイル追加時は必ず上記チェックリストを確認

## 🔄 関連ディレクトリ

- **[../../archive/](../../archive/)** - 過去の文書アーカイブ
- **[../../specifications/](../../specifications/)** - システム仕様（ルールの適用結果）
- **[../../README.md](../../README.md)** - documents全体の概要