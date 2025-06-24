# Roles - エージェント役割定義

このディレクトリには、5エージェント体制における各エージェントの役割定義を格納しています。

## 概要

各ファイルには、DDD1（Agent役割必須原則）に基づく以下の情報が含まれています：
- 役割定義
- 権限範囲
- 責務
- 絶対制限事項
- DDD1遵守義務
- 連携フロー（該当する場合）

## ファイル一覧

- [builder.md](./builder.md) - Builder Agent役割定義（機能実装・コード作成・技術実装）
- [validator.md](./validator.md) - Validator Agent役割定義（品質検証・テスト・デプロイ・品質保証）
- [architect.md](./architect.md) - Architect Agent役割定義（システム設計・技術仕様策定・ロードマップ管理）
- [clerk.md](./clerk.md) - Clerk Agent役割定義（ドキュメント管理・プロトコル策定・CLAUDE.md編集）
- [inspector.md](./inspector.md) - Inspector Agent役割定義（統計監視・データ分析・システム運用監視）

## 参照

- **上位規則**: [DDD1 - Agent役割必須システム](../../rules/dominants/ddd1-agent-role-mandatory-system.md)
- **権限詳細**: [P016 - Agent権限マトリックス＆協調システム](../../rules/meta/protocols/p016-agent-permission-matrix.md)
- **連携システム**: [REP-0022 - エージェント間受け渡しシステム](../../records/reports/REP-0022-agent-handoff-system.md)