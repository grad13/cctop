---
**アーカイブ情報**
- アーカイブ日: 2025-06-17
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: 通し番号体系実装, 接頭辞付き命名規則, CHK-XXX体系導入, BUG-YYYYMMDD-XXX体系, documents統一管理, ファイル命名規則, ディレクトリ配置ガイドライン, P006更新, 接頭辞一覧明文化, checklists番号体系, bugs番号体系, kebab-case形式, 検索性向上, 一貫性確保, カテゴリ別管理, 参照簡素化, 欠番禁止原則, README更新義務

---

# REP-0043: 通し番号体系実装プロジェクト

**作成日**: 2025年6月17日 23:59  
**作成者**: Clerk Agent  
**ステータス**: 完了  
**関連**: P006（ファイル命名規則）、P017（ディレクトリ配置ガイドライン）

## 📋 プロジェクト概要

checklistsとbugsディレクトリにディレクトリ機能に基づいた接頭辞付き通し番号体系を導入。documents全体でユニークな接頭辞による統一的な管理体制を確立。

## 🎯 目標

1. **checklists/**: CHK-XXX体系の導入
2. **bugs/**: BUG-YYYYMMDD-XXX体系の導入（incidents/と同じ日付形式）
3. **P006**: 接頭辞一覧の明文化
4. **一貫性**: documents全体での統一的命名規則

## 📊 現状分析

### checklists/ (6ファイル)
```
- directory-operation-checklist.md → CHK-001-directory-operation.md
- directory-reorganization-checklist.md → CHK-002-directory-reorganization.md
- hypothesis-creation-checklist.md → CHK-003-hypothesis-creation.md (廃止予定)
- incident-response-checklist.md → CHK-004-incident-response.md
- task-completion-checklist.md → CHK-005-task-completion.md
- weekly-document-integrity-checklist.md → CHK-006-weekly-document-integrity.md
```

### bugs/ (11ファイル)
```
- bug-report-template.md → BUG-20250101-001-report-template.md
- logout-visionstore-null-error-2025-06-14.md → BUG-20250614-001-logout-visionstore-null-error.md
- specification-gaps-analysis-2025-06-15.md → BUG-20250615-001-specification-gaps-analysis.md
- taskgrid-timebox-vision-sync-failure-2025-06-15.md → BUG-20250615-002-taskgrid-timebox-vision-sync-failure.md
- timebox-empty-task-display-visionstore-2025-06-14.md → BUG-20250614-002-timebox-empty-task-display-visionstore.md
- timebox-longpress-completed-failure-2025-06-15.md → BUG-20250615-003-timebox-longpress-completed-failure.md
- timebox-regression-comprehensive-plan-2025-06-15.md → BUG-20250615-004-timebox-regression-comprehensive-plan.md
- timebox-reload-data-loss-2025-06-14-detailed-plan.md → BUG-20250614-003-timebox-reload-data-loss-detailed-plan.md
- timebox-reload-data-loss-2025-06-14.md → BUG-20250614-004-timebox-reload-data-loss.md
- timebox-timer-abnormal-behavior-2025-06-15.md → BUG-20250615-005-timebox-timer-abnormal-behavior.md
- vision-sync-new-implementation-2025-06-15.md → BUG-20250615-006-vision-sync-new-implementation.md
```

## 🔄 実施手順

### Phase 1-2: 分析・設計 ✅ 完了
- 現状調査完了
- 接頭辞体系設計完了：CHK-XXX, BUG-XXX

### Phase 3: P006更新 ✅ 完了
- [x] checklists命名規則追加
- [x] bugs命名規則更新
- [x] 接頭辞一覧セクション追加

### Phase 4-7: 実装 ✅ 完了
- [x] checklists/リネーム実施
- [x] bugs/リネーム実施
- [x] 関連文書参照更新（CLAUDE.md）
- [x] README.md更新

## 📋 接頭辞一覧（documents全体）

| 接頭辞 | ディレクトリ | 番号体系 | 例 |
|--------|-------------|----------|-----|
| P-XXX | protocols/ | 3桁連番 | p006-file-naming-convention.md |
| DDD-X | dominants/ | 1桁連番 | ddd1-agent-role-mandatory-system.md |
| CHK-XXX | checklists/ | 3桁連番 | chk001-task-completion.md |
| BUG-YYYYMMDD-XXX | bugs/ | 日付+3桁 | BUG-20250617-001-report-template.md |
| REP-XXXX | reports/ | 4桁連番 | REP-0043-numbering-system-implementation.md |
| INC-YYYYMMDD-XXX | incidents/ | 日付+3桁 | INC-20250617-001-example.md |

## 🚨 注意事項

1. **欠番禁止**: 削除・統合時も番号は再利用しない
2. **README更新**: 各ディレクトリのREADME.mdを必ず更新
3. **参照更新**: 既存文書からの参照リンクを全て更新
4. **kebab-case**: 接頭辞以降はkebab-case形式を維持

## 📈 期待効果

1. **検索性向上**: 接頭辞による効率的なファイル検索
2. **一貫性確保**: documents全体での統一的命名
3. **管理効率**: カテゴリ別の体系的管理
4. **参照簡素化**: 短い番号での参照可能

---

## 実施記録

### 2025年6月17日 23:59
- REP-0043作成
- 接頭辞一覧表作成

### 2025年6月18日 00:05  
- BUG体系をBUG-XXXからBUG-YYYYMMDD-XXXに変更（incidents/と統一）
- 日付ベースでの番号管理による一貫性確保

### 2025年6月18日 00:15
- 全実装完了
- checklists/: CHK-001〜006の通し番号体系導入
- bugs/: BUG-YYYYMMDD-XXX形式への完全移行
- 関連文書の参照リンク更新完了