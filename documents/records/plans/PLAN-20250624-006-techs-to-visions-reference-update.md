# PLAN-20250624-006: techs/→visions/参照更新計画

**計画ID**: PLAN-20250624-006  
**作成日**: 2025年6月24日  
**作成者**: Clerk Agent  
**対象**: techs/ディレクトリ参照の一括更新  
**関連**: Architect→Clerk handoff (visions/構造整理)

## 📋 計画概要

### 背景
- Architectによるtechs/→visions/ディレクトリ名変更完了
- archive以外の文書で古いtechs/参照が残存
- 参照整合性維持のため一括更新が必要

### 目的
- 全文書のtechs/参照をvisions/に更新
- 参照整合性の完全回復
- 新しいvisions/構造への移行完了

## 🔍 調査結果

### 対象ファイル数
- **全体**: 55ファイルでtechs/参照を検出
- **更新対象**: archive以外の約30ファイル
- **除外**: archives/配下（意図的に放置）
- **特別扱い**: visions/blueprints/PLAN-20250624-001-v0100-implementation.md（Architect整備予定）

### 優先度別分類

#### 最優先（システム中核文書）
- `CLAUDE.md` - プロジェクト最重要文書
- `documents/agents/roles/*.md` - 5 Agent役割定義
- `documents/agents/status/*.md` - Agent状況管理
- `documents/README.md` - 文書構造説明

#### 高優先度（運用文書）
- `documents/rules/meta/protocols/*.md` - プロトコル文書
- `documents/visions/*.md` - 新構造内文書
- `documents/rules/meta/checklists/*.md` - チェックリスト

#### 中優先度（記録文書）
- `documents/records/plans/*.md` - 計画書
- `documents/records/reports/*.md` - 報告書
- `documents/records/incidents/*.md` - インシデント記録
- `documents/records/drafts/*.md` - ドラフト文書
- `passage/handoffs/*.md` - 引き継ぎ文書

## 🚀 実行計画

### Phase 1: システム中核文書（最優先）
1. **CLAUDE.md更新**
   - techs/roadmaps/ → visions/blueprints/
   - techs/specifications/ → visions/specifications/

2. **Agentロール・ステータス文書更新**
   - 5つのroles/*.md
   - 3つのstatus/*.md
   - documents/README.md

### Phase 2: 運用文書（高優先度）
3. **プロトコル・チェックリスト更新**
   - p016-agent-permission-matrix.md
   - p026-document-metadata-standard.md
   - chk001-directory-operation.md

4. **visions/内文書更新**
   - README.md
   - specifications/内の相互参照

### Phase 3: 記録文書（中優先度）
5. **records/配下文書更新**
   - plans/配下の計画書
   - reports/配下の報告書
   - incidents/配下のインシデント記録
   - drafts/配下のドラフト

6. **handoffs/文書更新**
   - 現在のhandoff文書内の参照

## ⚠️ 実行時の注意事項

### 除外対象
- **archives/配下全て**: 過去記録として意図的に保持
- **visions/blueprints/PLAN-20250624-001-v0100-implementation.md**: Architect整備予定

### 更新パターン
- `techs/specifications/` → `visions/specifications/`
- `techs/roadmaps/` → `visions/blueprints/`
- `techs/implements/` → `visions/blueprints/`
- `techs/vision/` → `visions/blueprints/`
- `documents/techs/` → `documents/visions/`

### 品質保証
1. **1ファイルずつ確認**: 機械的置換禁止
2. **文脈確認**: 参照が適切か内容確認
3. **関連リンク確認**: 同時に修正が必要な箇所をチェック
4. **Git操作前確認**: CHK006チェックリスト適用

## 📊 進捗管理

### 完了指標
- [ ] Phase 1完了（8ファイル）
- [ ] Phase 2完了（7ファイル）  
- [ ] Phase 3完了（15ファイル）
- [ ] 全体検証完了

### 品質チェック
- [ ] 参照整合性確認
- [ ] リンク切れチェック
- [ ] 文書構造一貫性確認

## 🎯 期待成果

### 短期成果（1日以内）
- システム中核文書の参照整合性回復
- 新visions/構造への完全移行

### 中期成果（継続運用）
- 文書管理の一貫性確保
- 新構造での円滑な運用開始

---

**実行開始**: 2025年6月24日  
**完了予定**: 2025年6月24日  
**責任者**: Clerk Agent

**次のステップ**: Phase 1から順次実行開始