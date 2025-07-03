# PLAN-20250703-034: Runner Role導入計画

**計画番号**: PLAN-20250703-034  
**作成日**: 2025年7月3日  
**作成者**: Clerk Agent  
**カテゴリ**: 🏗️ システム移行  
**ステータス**: 計画書作成完了・実行承認待ち  
**実装期間**: 3段階・約1週間  

## 🎯 Executive Summary

worktree/container環境での並列開発を実現するため、横断的実装を担う**Runner Role**を新設する。既存の5 Agent System（Builder/Validator/Architect/Clerk/Inspector）と並行して、動的に生成される平等なRunnerインスタンスによる分散実装体制を構築する。

## 📋 背景と課題

### 現状課題
1. **Status競合問題**: worktree並列作業時の1Agent=1statusファイル制約
2. **Role専門性制約**: 従来role（builder=src, validator=test）による機能横断作業の困難
3. **Context効率問題**: n倍のプロジェクトでstatus管理がn倍になる無駄

### 解決アプローチ
- **並列実行単位**: worktree/container専用のRunner Role新設
- **横断的権限**: src + test の一貫実装（docs は既存Agent連携）
- **Dynamic Management**: context連動による平等・無制限な動的Runner生成

## 🏗️ 実装計画

### Phase 1: Core Infrastructure (1-2日)

#### 1.1 Role定義文書作成
```
documents/agents/roles/runner.md
```
**内容**:
- Runner Roleの責務・権限・制限
- worktree/container専用実行者としての位置づけ
- src + test の横断的実装権限（docs は既存Agent連携）
- 既存5 Agentとの協調原則
- 動的生成・平等性・context連動の基本原則

#### 1.2 Handoffs構造構築
```
passage/handoffs/
├── pending/
│   ├── runner-daemon-separation/    # context連動・動的生成
│   ├── runner-ui-refactor/          # worktree名ベース
│   ├── runner-test-integration/     # 機能名ベース
│   └── runner-{context}/            # 無制限拡張
├── in-progress/
│   ├── runner-daemon-separation/    # 平等・無差別
│   └── runner-ui-refactor/          # 自動増減
└── completed/
    └── 2025-07-03/
        └── runner-hotfix-auth/      # 完了済み自動アーカイブ
```

**動的生成原則**:
- Runner識別子: `runner-{context}`
- Context = worktree名 または 機能名
- 同一contextでの重複防止
- 完了時自動アーカイブ・クリーンアップ

#### 1.3 Status管理システム
```
documents/agents/status/runner.md
```
**内容**:
- 動的Runnerインスタンスの統合ステータス
- アクティブRunner一覧の可視化
- Context別リソース割り当て状況
- 自動生成・削除の履歴管理

### Phase 2: Protocol Integration (2-3日)

#### 2.1 既存システム統合
- **P016更新**: Agent権限マトリックスにRunner追加
- **DDD1拡張**: 3柱+N Agent SystemとしてDominant規則更新（Architect+Runner+Clerk+動的Runner数）
- **CLAUDE.md更新**: Runnerの説明・使い分け指針追加

#### 2.2 協調プロトコル策定
```markdown
## Runner ⇔ 既存Agent 協調原則

### Work Distribution
- **設計・仕様**: Architect専任
- **実装・品質**: Runner担当 (src + test 一体実装 in worktree環境)
- **ドキュメント**: Clerk専任（人間判断重視）

### 実質的3柱体制
```
```

### Runner設計参考
- **Builder経験**: 実装パターン・コーディング規約
- **Validator経験**: テスト手法・品質保証プロセス
- **統合アプローチ**: src+test同時開発によるTDD実践
```

## 🔧 技術仕様

### Status Synchronization

#### Unified Status View
```markdown
## documents/agents/status/runner.md Format

### Active Runners (Dynamic List)
| Runner Context | Status | Task | Started | Progress | ETA |
|----------------|--------|------|---------|----------|-----|
| daemon-separation | active | daemon分離実装 | 14:00 | 60% | 17:00 |
| ui-refactor | active | UI component改善 | 14:30 | 30% | 18:00 |
| test-integration | pending | 統合テスト環境 | - | queued | - |
| docs-update | active | README更新 | 15:30 | 80% | 16:00 |

### System Metrics
- **Active Runners**: 3
- **Pending Runners**: 1  
- **Today's Peak**: 5 runners (13:45)
- **Total Contexts**: 4
- **Auto-completed**: 8 (today)
```

## 🎯 Success Metrics

### Quantitative Metrics
- **並列実装数**: 同時並行実装機能数（目標: 無制限・需要連動）
- **Context切り替え時間**: runner間移動時間（目標: <10秒）
- **競合発生率**: Git conflictの発生頻度（目標: 90%削減）
- **実装速度**: 機能完成までの時間（目標: 30%短縮）
- **Runner利用率**: 動的生成・削除の効率性（目標: 95%適切）

### Qualitative Metrics
- **ユーザー満足度**: Runner活用による開発体験向上
- **システム安定性**: 3柱体制の協調の円滑さ
- **保守性**: 新システムの維持・改善の容易さ

## 📅 Implementation Timeline

```
Week 1:
├── Day 1-2: Phase 1 (Core Infrastructure)
├── Day 3-4: Phase 2 (Protocol Integration)  
├── Day 5-6: Phase 3 (Operational Deployment)
└── Day 7: Review & Optimization
```

## 🔗 関連計画・前提条件

### 前提条件
- **worktrees/ディレクトリ整備**: PLAN-20250701-033完了後
- **P045プロトコル更新**: Git管理分離の新構造対応済み
- **handoffsシステム**: 現行3段階ワークフロー正常稼働

### 関連計画
- **PLAN-20250701-033**: Code Directory Restructure（前提）
- **PLAN-20250630-001**: Daemon-CLI機能分離（並行可能）
- **PLAN-20250701-032**: v0.3.0モジュール統合（並行可能）

## 💰 実装コスト・影響範囲

### 影響範囲
- **高影響**: passage/handoffs/, documents/agents/
- **中影響**: CLAUDE.md, P016プロトコル
- **低影響**: 既存5 Agentの日常作業（互換性保持）

### 実装コスト
- **開発時間**: 約1週間（7日間）
- **学習コスト**: 新ワークフロー習得（ユーザー側）
- **保守コスト**: 10 Agent管理への移行

## 🎉 Conclusion

**Runner Role**の導入により、cctopプロジェクトは**Architect・Runner・Clerk**の実質的3柱体制による動的並列開発を実現します。設計・実装・文書化の明確な分離と、Runnerの動的性の組み合わせで、無制限にスケーラブルで効率的な開発環境を実現し、worktree/container活用の課題を根本的に解決します。

Builder/Validatorの知見を統合したRunnerにより、TDD実践とテスト一体開発を促進し、需要に応じて柔軟に拡縮する次世代開発環境を構築します。

---

**承認後実行開始**: Phase 1からの段階的実装を推奨

**実行Agent**: Clerk（Phase 1-2の文書・構造整備）+ Builder（Phase 3の実装確認）