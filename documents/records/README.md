# Records Directory

**最終更新**: 2025年6月22日
**管理**: 全Agent（Builder/Validator/Architect/Clerk/Inspector）共同編集可能

## 📋 概要

このディレクトリは、プロジェクトのすべての記録系ドキュメントを一元管理します。全Agentが編集権限を持ち、協調して記録を行います。

## 📁 ディレクトリ構造

```
records/
├── bugs/        # バグ記録（Builder/Validator主管）
├── drafts/      # ドラフト文書（正式適用前）
├── incidents/   # インシデント記録
├── plans/       # プロジェクト計画書（2025年6月22日追加）
└── reports/     # 分析レポート・実施履歴
```

## 🎯 配置基準

### incidents/
- **内容**: プロセス違反・システム問題の記録
- **作成者**: 全Agent（緊急時）
- **命名**: `INC-YYYYMMDD-XXX-title.md`（P015準拠）
- **用途**: 5フェーズ対応の完全記録

### experiments/ ⚠️ 廃止済み
- **廃止日**: 2025年6月17日
- **移行先**: archive/experiments-legacy/
- **理由**: hypotheses統合に伴い実験検証フェーズが終了

### reports/
- **内容**: 分析レポート・プロトコル実施履歴
- **作成者**: 全Agent
- **命名**: 目的別（例: `p007-execution-YYYY-MM-DD.md`）
- **用途**: 定期実施記録・分析結果

### bugs/
- **内容**: バグ記録・修正履歴
- **主管**: Builder/Validator Agent（実装・検証連携）
- **構造**: フラット構造（解決済みは即座にdocuments/archives/bugs/へ移動）
- **用途**: バグトラッキング（P011準拠）
- **更新**: 2025年6月18日に5エージェント体制対応

### drafts/
- **内容**: 正式適用前のドラフト文書
- **作成者**: 全Agent
- **命名**: `DRAFT-YYYYMMDD-XXX-title.md`
- **用途**: CLAUDE.md更新案、プロトコル草案等の一時保管
- **追加**: 2025年6月23日新設

### plans/
- **内容**: 大規模プロジェクト計画・移行計画・改善計画
- **主管**: Architect Agent（計画立案）
- **命名**: `PLAN-YYYYMMDD-XXX-brief-description.md`
- **用途**: 実行前の計画書管理（承認制）
- **追加**: 2025年6月22日新設

## 📝 記録原則

1. **即時記録**: 発生・実施時に即座に記録
2. **詳細性**: 再現・理解に必要な情報を網羅
3. **検索性**: 明確なタイトル・構造化された内容
4. **協調性**: 他Agentの記録を尊重・補完

## 🔍 関連文書

- `documents/rules/meta/protocols/p017-directory-placement-guidelines.md` - 配置ガイドライン
- `documents/rules/meta/protocols/p015-incident-creation-protocol.md` - インシデント作成手順
- `documents/rules/meta/protocols/p011-coder-bug-recording-protocol.md` - バグ記録プロトコル（Builder/Validator体制対応済み）

---

## 更新履歴

- 2025年6月26日: drafts/ディレクトリ追加、records/draft（誤作成）を統合（Clerk Agent）
- 2025年6月22日: plans/ディレクトリ追加、大規模計画書管理開始（Architect Agent）
- 2025年6月17日 23:59: experiments/ディレクトリ廃止、archive/experiments-legacy/に移動（Clerk Agent）
- 2025年6月15日: 初版作成（records統合に伴う）