# Rules - ルール文書

**作成日**: 2025年6月19日  
**管理者**: Clerk Agent  
**目的**: プロジェクトの最高位原則・プロトコル・チェックリストの統合管理

## 📋 概要

このディレクトリは、プロジェクト運営の根幹となるルール体系を管理します。Clerk Agentが主管し、不変の最高位原則（dominants/）と運用プロトコル（meta/）を体系的に整理しています。

## 📁 ディレクトリ構成

```
rules/
├── README.md              # このファイル
├── dominants/             # 最高位原則（不変の公理）
│   ├── README.md          # Dominant原則概要
│   ├── ddd0-hierarchical-improvement-principle.md # 階層性原則
│   ├── ddd1-agent-role-mandatory-system.md       # Agent役割必須
│   └── ddd2-hierarchy-memory-maintenance.md      # 階層メモリ管理
└── meta/                  # メタレベル管理（体系系）
    ├── README.md          # メタ管理概要
    ├── protocols/         # 確立されたプロトコル（P番号）
    │   ├── README.md      # プロトコル管理
    │   ├── p000-overarching-principles.md # システム最上位原則
    │   ├── p016-agent-permission-matrix.md # Agent権限マトリックス
    │   ├── p022-directory-total-consistency.md # 総合整合性
    │   ├── p044-l1-l2-migration-protocol.md # L1→L2移行
    │   └── [44個のプロトコル]
    └── checklists/        # 各種チェックリスト
        ├── README.md      # チェックリスト管理
        ├── chk001-directory-operation.md # ディレクトリ操作
        ├── chk004-incident-response.md   # インシデント対応
        └── [6個のチェックリスト]
```

## 🔺 dominants/とmeta/の階層関係

### dominants/ - 最高位原則（Dominantレベル）
- **性質**: 不変の公理、変更・例外・無視は一切禁止
- **内容**: DDD0（階層性）、DDD1（Agent役割）、DDD2（階層メモリ）
- **適用**: プロジェクト全体の根本原則、すべての活動に優先

### meta/ - 運用プロトコル（Metaレベル）
- **性質**: Dominant原則に基づく具体的方法論
- **内容**: protocols/（P番号体系）、checklists/（CHK番号体系）
- **適用**: 日常運用・作業手順の標準化

## 🎯 Clerk Agent主管体制

### 権限・責務
- **ルール体系管理**: protocols/checklists/の作成・更新・廃止
- **CLAUDE.md編集**: システム設定ファイルの唯一の編集権限
- **文書整合性維持**: P022等を活用した体系的整合性管理
- **Dominant原則保護**: P040に基づく不変要素の厳格保護

### プロトコル管理体制
- **P000**: システム最上位原則（過剰改善防止）
- **P022**: ディレクトリ総合整合性（本格的品質管理）
- **P044**: L1→L2移行プロトコル（DDD2実装）
- **P043**: L2→L3アーカイブ移行（長期保存管理）

## 🔒 不変要素保護（P040）

### 絶対不変要素
- **Dominantセクション全体**（CLAUDE.md内）
- **P000**（システム最上位原則）
- **DDD0/DDD1/DDD2**（最高位原則3本柱）

### 変更禁止の徹底
- 変更・統合・修正は一切禁止
- 違反時は即座に作業停止・ユーザー報告
- Clerk Agentでも例外なし

## 🔄 プロトコル運用サイクル

### 月次見直し（P042）
- プロトコル有効性の確認
- 障害要因の排除
- 新規プロトコルの必要性評価

### 日常適用
- 状況別プロトコルの自動適用
- チェックリスト必須参照（記憶依存禁止）
- 違反エスカレーションシステム（P031）

## 🔗 関連文書

- **システム設定**: [CLAUDE.md](../../CLAUDE.md)
- **Clerk権限**: [Clerk Agent役割定義](../agents/roles/clerk.md)
- **整合性管理**: [P022 - ディレクトリ総合整合性](meta/protocols/p022-directory-total-consistency.md)
- **不変保護**: [P040 - 不変要素保護プロトコル](meta/protocols/p040-invariant-protection-protocol.md)

---

**メンテナンス**: Clerk Agentがルール体系の整合性・運用効果を継続管理