---
**アーカイブ情報**
- アーカイブ日: 2025-06-18（実行日）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/archives/
- 検索キーワード: Coder Agent移行, 5エージェント体制, Builder Validator分離, エージェント廃止, 体制変更, アーカイブ記録, 組織変更, システム移行

---

# Coder Agent関連ファイルアーカイブ記録

**アーカイブ日**: 2025年6月18日  
**実施者**: Clerk Agent  
**理由**: 5エージェント体制への移行完了によるCoder Agent廃止

## アーカイブしたファイル

### 1. status/coder.md
- **移動元**: documents/agents/status/coder.md
- **移動先**: documents/archives/status/coder-deprecated-20250618.md
- **理由**: Coder AgentがBuilder/Validator/Architectに分割されたため

### 2. coder-task-classification.md
- **移動元**: documents/handoffs/migration/coder-task-classification.md（※削除済み）
- **移動先**: documents/archives/migration/coder-task-classification-20250618.md
- **理由**: Coder分割計画の完了により役割終了
- **補足**: documents/handoffs/は2025年6月18日にワークスペースroot handoffs/に統合

### 3. p013-coder-patterns-restriction.md
- **移動元**: 既にdocuments/archives/protocols/に存在
- **状態**: アーカイブ済み（P013はBuilder/Validator/Architectに適用される形で更新済み）

## 残存するCoder参照ファイル（歴史的記録として保持）

### protocols/
- p011-coder-bug-recording-protocol.md（Builder/Validator用に内容は更新済み、ファイル名は継続性のため維持）

### incidents/（歴史的記録）
- INC-20250614-012-terminology-violation-coder.md
- INC-20250614-016-coder-claude-md-unauthorized-edit.md
- INC-20250614-027-h025-repeated-violation-coder.md
- INC-20250614-029-h025-triple-violation-coder.md
- INC-20250614-031-coder-authority-violation.md
- INC-20250615-001-coder-unauthorized-resolution.md

### reports/
- REP-0049-coder-split-phase1-plan.md（移行計画文書として保持）

## 5エージェント体制

現在は以下の5エージェントが稼働：
1. **Builder Agent**: 機能実装・コード作成
2. **Validator Agent**: 品質検証・テスト・デプロイ
3. **Architect Agent**: システム設計・技術仕様・ロードマップ管理
4. **Clerk Agent**: 文書管理・プロセス策定
5. **Inspector Agent**: 統計監視・データ分析

---

**注**: このアーカイブはCoder Agentから5エージェント体制への移行完了を記録するものです。