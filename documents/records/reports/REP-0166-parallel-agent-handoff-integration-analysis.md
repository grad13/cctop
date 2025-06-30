# REP-0166: 並列Agent運用におけるHandoff統合分析レポート

**レポート番号**: REP-0166  
**作成日**: 2025-06-30  
**作成者**: Clerk Agent  
**カテゴリ**: 分析・調査レポート  
**ステータス**: 活動中  
**関連**: DRAFT-20250630-002, container/worktree導入  

## 1. エグゼクティブサマリー

container/worktree環境での並列Agent運用において、現行の1Agent=1statusファイル体制の限界と、handoffsシステムを活用した新しいアプローチを分析した。「status = 自分自身へのhandoff」という概念により、既存システムを最大限活用しながら並列運用を実現する方法を提案する。

## 2. 現状分析

### 2.1 現行システムの課題
- **ファイル競合**: 複数インスタンスが同一statusファイルを更新
- **Git競合**: マージコンフリクトによる作業記録の消失
- **進捗追跡困難**: どのインスタンスがどの作業をしているか不明

### 2.2 既存リソース
- **statusシステム**: documents/agents/status/{agent}.md
- **handoffsシステム**: passage/handoffs/の3段階ワークフロー
- **DDD1/DDD2原則**: エージェント役割と階層管理

## 3. 提案する解決策

### 3.1 概念の革新：Status as Handoff

**従来の分離概念**：
```
status/    → 進捗記録（内部状態）
handoffs/  → タスク交換（外部インターフェース）
```

**新しい統一概念**：
```
handoffs/  → すべての作業記録（自分への引き継ぎ含む）
status/    → アクティブなhandoffへのポインタ集
```

### 3.2 実装構造

```
handoffs/
├── pending/
│   ├── builder/
│   │   ├── HO-20250630-001-self-main-continue.md      # メイン環境の継続作業
│   │   ├── HO-20250630-002-self-worktree1-feature.md  # worktree環境の作業
│   │   └── HO-20250630-003-from-validator-fixes.md    # 他エージェントから
│   └── ...
├── in-progress/
│   └── builder/
│       └── HO-20250630-001-self-main-continue.md      # 作業中
└── completed/
    └── 2025-06-30/
        └── builder/
            └── HO-20250629-099-self-main-refactor.md  # 完了済み
```

### 3.3 命名規則の拡張

```
HO-{date}-{number}-{source}-{instance}-{description}.md

source:
  - self: 自分自身への引き継ぎ
  - from-{agent}: 他エージェントからの依頼
  
instance:
  - main: メインブランチ
  - worktree{n}: worktree環境
  - container{n}: container環境
```

## 4. 利点と課題

### 4.1 利点
1. **競合回避**: 各インスタンスが独立したhandoffファイルを作成
2. **統一管理**: すべての作業がhandoffとして一元管理
3. **既存活用**: 現行のhandoffsワークフローをそのまま利用
4. **追跡容易**: pending/in-progress/completedの状態管理が明確

### 4.2 課題
1. **ファイル増加**: self-handoffによりファイル数が増加
2. **習慣変更**: statusへの直接記録からhandoff作成への移行
3. **検索複雑化**: 作業履歴の検索がhandoffs全体に分散

## 5. 移行計画

### Phase 1: 概念実証（1週間）
- Builderエージェントでの試験実装
- self-handoffの運用テスト
- 並列実行シナリオの検証

### Phase 2: 部分適用（2週間）
- 全エージェントへの段階的適用
- statusファイルの役割変更
- 運用ドキュメントの整備

### Phase 3: 完全移行（1ヶ月）
- プロトコル化（P0XX）
- CLAUDE.md更新
- 旧status記録のhandoffs移行

## 6. 技術的考察

### 6.1 statusファイルの新形式
```markdown
# Builder Status

## Active Handoffs
| Environment | Handoff | Started | Priority |
|-------------|---------|---------|----------|
| main | HO-20250630-001-self-main-continue.md | 2025-06-30 08:00 | High |
| worktree-fix | HO-20250630-002-self-worktree1-feature.md | 2025-06-30 09:00 | Medium |

## Recent Completions (Last 24h)
- HO-20250629-099-self-main-refactor.md
- HO-20250629-098-from-validator-test-fixes.md
```

### 6.2 自動化の可能性
- handoff作成スクリプト
- status自動更新機能
- 環境検出とインスタンスID付与

## 7. 結論と次のステップ

「status = 自分自身へのhandoff」という概念は、既存システムを革新的に再解釈し、並列Agent運用の課題を解決する優れたアプローチである。

**推奨事項**：
1. 小規模な概念実証から開始
2. ユーザーフィードバックを収集
3. 段階的な移行計画の実施

**次のアクション**：
- [ ] ユーザーとの詳細検討
- [ ] 実装詳細の策定
- [ ] 試験運用の開始

## 8. 参考資料

- DRAFT-20250630-002-parallel-agent-status-management.md
- passage/handoffs/README.md
- documents/rules/dominants/ddd1-agent-role-mandatory-system.md

---

**アーカイブキーワード**: 並列Agent, handoff統合, status再定義, container運用, worktree対応, self-handoff, 競合回避, インスタンス管理, ワークフロー統一, システム革新