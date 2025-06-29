# REP-20250626-002: Plans Directory現状分析レポート

**作成日**: 2025年6月26日  
**作成者**: Clerk Agent  
**種別**: 分析レポート  
**関連**: records/plans/README.md整理作業

## 🔍 現状分析

### ファイル数の差異
- **README.md記載**: 11件のPLAN
- **実際のファイル数**: 18件のPLANファイル
- **差分**: 7件が未記載

### README.md未記載のPLANファイル
1. PLAN-20250623-001-ui-mode-separation.md
2. PLAN-20250623-002-vis007-tracer-implementation.md
3. PLAN-20250624-002-documents-reorganization.md（※PLAN-20250624-002が重複）
4. PLAN-20250624-005-git-management-separation-implementation.md
5. PLAN-20250624-006-techs-to-visions-reference-update.md
6. PLAN-20250624-008-v0100-specifications-consolidation.md（※PLAN-20250624-008が重複）
7. PLAN-20250624-009-functions-extraction-roadmap.md
8. PLAN-20250625-001-test-quality-improvement.md

## 📊 Index規格の現状

### 1. 命名規則
現在の命名規則は一貫している：
```
PLAN-YYYYMMDD-XXX-brief-description.md
```

### 2. 連番の問題点
- **日付内での連番重複**: 
  - PLAN-20250624-002が2つ存在（test-improvement と documents-reorganization）
  - PLAN-20250624-008が2つ存在（specifications-content-consolidation と v0100-specifications-consolidation）
- **連番の欠番**: 確認されていない
- **日付を跨いだ通し番号なし**: 各日付で001から開始

### 3. カテゴリ分類
README.mdでは以下の4カテゴリで分類：
- 🏗️ システム移行・アーキテクチャ
- 📁 文書管理・整理
- 🔧 開発プロセス改善
- 🚀 機能開発・実装

しかし、各PLANファイル内にカテゴリ情報が埋め込まれていない。

## 🎯 改善提案

### 1. Index規格化の提案

#### Option A: 通し番号制（推奨）
```
PLAN-XXXX-YYYYMMDD-brief-description.md
```
- XXXX: 4桁の通し番号（0001から開始）
- 利点：重複なし、総数把握容易、一意性保証
- 欠点：既存ファイルのリネーム必要

#### Option B: 日付内連番の厳格管理
```
PLAN-YYYYMMDD-XXX-brief-description.md（現行維持）
```
- 重複チェックツールの導入
- 連番管理表の作成
- 利点：既存構造維持
- 欠点：手動管理の負担

### 2. カテゴリの明示化
各PLANファイルのフロントマターに以下を追加：
```yaml
category: "システム移行・アーキテクチャ" | "文書管理・整理" | "開発プロセス改善" | "機能開発・実装"
```

### 3. ステータス管理の強化
現在のステータス値の標準化：
- `計画書作成完了`
- `実行承認待ち`
- `実行中`
- `実行完了`
- `中止・保留`

## 📋 次のアクション

1. **重複番号の解消**（緊急）
2. **未記載PLANのREADME.md追加**
3. **Table形式への変換**
4. **Index規格の決定と実装**