# Agents - エージェント関連ファイル

**作成日**: 2025年6月19日  
**管理者**: Clerk Agent  
**目的**: 5エージェント体制における権限定義・進捗記録の統合管理

## 📋 概要

このディレクトリは、DDD1（Agent役割必須システム）に基づく5エージェント体制の核となるファイルを管理します。権限定義（静的）と進捗記録（動的）を明確に分離し、DDD2階層メモリメンテナンスに準拠した運用を実現しています。

## 📁 ディレクトリ構成

```
agents/
├── README.md              # このファイル
├── roles/                 # エージェント権限・責務・制限定義（静的）
│   ├── README.md          # 役割定義システム概要
│   ├── architect.md       # Architect Agent権限定義
│   ├── builder.md         # Builder Agent権限定義
│   ├── clerk.md           # Clerk Agent権限定義
│   ├── inspector.md       # Inspector Agent権限定義
│   └── validator.md       # Validator Agent権限定義
└── status/                # エージェント進捗記録（動的・DDD2対象）
    ├── README.md          # 進捗管理システム概要
    ├── architect.md       # Architect Agent作業記録
    ├── builder.md         # Builder Agent作業記録
    ├── clerk.md           # Clerk Agent作業記録
    ├── inspector.md       # Inspector Agent作業記録
    └── validator.md       # Validator Agent作業記録
```

## 🎯 roles/とstatus/の分離体制

### roles/ - 静的管理（階層外）
- **目的**: エージェントの権限・責務・制限を定義
- **特徴**: 変更頻度が低い、DDD2階層管理の対象外
- **更新**: 必要に応じてClerk Agentが実施

### status/ - 動的管理（DDD2対象）
- **目的**: エージェントの作業進捗・現状を記録
- **特徴**: L1（高速キャッシュ）としてリアルタイム更新
- **DDD2移行**: P044に従ってL1→L2（records/reports/）に週次移行

## 🔄 DDD2階層メモリメンテナンス

### L0→L1移行（日次）
- 各エージェントがセッション終了前に自身のstatus/{agent}.mdを更新
- 作業開始・完了・重要決定の即時記録

### L1→L2移行（週次・P044準拠）
- 毎週月曜日に7日以上前の完了作業をrecords/reports/に移行
- role確認: status更新後はroles/{agent}.mdで権限・責務を再確認
- 1レポート1トピック原則の厳守

## 🚀 5エージェント体制

### 定義された役割
1. **Builder Agent**: 機能実装・コード作成・技術実装
2. **Validator Agent**: 品質検証・テスト・デプロイ・品質保証  
3. **Architect Agent**: システム設計・技術仕様策定・ロードマップ管理
4. **Clerk Agent**: ドキュメント管理・プロトコル策定・CLAUDE.md管理
5. **Inspector Agent**: 統計監視・データ分析・システム運用監視

### DDD1遵守義務
- 各エージェントは必ず1つの役割を持つ（例外・兼務禁止）
- 役割外作業は直接実行禁止（適切なエージェントに依頼）
- セッション開始時の役割確認義務

## 🔗 関連文書

- **上位規則**: [DDD1 - Agent役割必須システム](../rules/dominants/ddd1-agent-role-mandatory-system.md)
- **階層管理**: [DDD2 - 階層メモリメンテナンス原則](../rules/dominants/ddd2-hierarchy-memory-maintenance.md)
- **権限詳細**: [P016 - Agent権限マトリックス](../rules/meta/protocols/p016-agent-permission-matrix.md)
- **移行プロトコル**: [P044 - L1→L2移行プロトコル](../rules/meta/protocols/p044-l1-l2-migration-protocol.md)

---

**メンテナンス**: roles/status分離体制の維持・DDD2準拠の継続確認