# Documents ディレクトリ

**最終更新**: 2025年6月22日 19:45  
**管理者**: Clerk Agent  
**目的**: cctopプロジェクトの全文書管理

## 📋 概要

このディレクトリは、cctop（Claude Code リアルタイムファイル監視システム）プロジェクトに関する全ての文書を管理します。
技術仕様、開発計画、作業記録、メタレベル管理等を体系的に整理しています。

**通信・連携システム**: プロジェクト全体では `passage/` ディレクトリが通信アーキテクチャを統合管理しています。
- `passage/handoffs/`: エージェント間・ユーザー間通信
- `passage/externals/`: 外部システム連携

## 📁 ディレクトリ構成

```
documents/
├── README.md              # このファイル
├── agents/                # エージェント関連ファイル
│   ├── roles/             # エージェント権限・責務・制限定義（静的）
│   │   ├── README.md      # 役割定義システム概要
│   │   ├── architect.md   # Architect Agent権限定義
│   │   ├── builder.md     # Builder Agent権限定義
│   │   ├── clerk.md       # Clerk Agent権限定義
│   │   ├── inspector.md   # Inspector Agent権限定義
│   │   └── validator.md   # Validator Agent権限定義
│   └── status/            # エージェント進捗記録（動的・DDD2対象）
│       ├── README.md      # 進捗管理システム概要
│       ├── architect.md   # Architect Agent作業記録
│       ├── builder.md     # Builder Agent作業記録
│       ├── clerk.md       # Clerk Agent作業記録
│       ├── inspector.md   # Inspector Agent作業記録
│       └── validator.md   # Validator Agent作業記録
├── techs/                 # 技術文書（Architect主管）
│   ├── roadmaps/          # 開発計画・将来構想
│   │   ├── README.md      # ロードマップ管理概要
│   │   ├── project-roadmap.md # 全体ロードマップ
│   │   ├── agenda/        # 検討課題
│   │   ├── completed/     # 完了済み計画
│   │   └── features/      # 機能別計画
│   │       └── authentication/ # 認証拡張計画
│   └── specifications/    # 現在のシステム仕様・定義
│       ├── README.md      # 仕様管理概要
│       ├── architecture/  # システムアーキテクチャ
│       ├── asset-management/ # アセット管理方針
│       ├── authentication/   # 認証システム仕様
│       └── terminology/   # 用語・定義管理
├── rules/                 # ルール文書（Clerk主管）
│   ├── dominants/         # 最高位原則（不変の公理）
│   │   ├── README.md      # Dominant原則概要
│   │   ├── ddd0-hierarchical-improvement-principle.md # 階層性原則
│   │   ├── ddd1-agent-role-mandatory-system.md       # Agent役割必須
│   │   └── ddd2-hierarchy-memory-maintenance.md      # 階層メモリ管理
│   └── meta/              # メタレベル管理（体系系）
│       ├── README.md      # メタ管理概要
│       ├── protocols/     # 確立されたプロトコル（P番号）
│       │   └── README.md  # プロトコル管理
│       └── checklists/    # 各種チェックリスト
│           └── README.md  # チェックリスト管理
├── records/               # L2記録系文書（全Agent編集可）
│   ├── README.md          # 記録管理概要
│   ├── bugs/              # バグ対応記録
│   │   └── README.md      # バグ記録管理
│   ├── incidents/         # インシデント記録
│   │   └── README.md      # インシデント記録管理
│   └── reports/           # 各種レポート
│       └── README.md      # レポート記録管理
└── archives/              # L3長期保存（全Agent参照可）
    ├── README.md          # アーカイブ管理概要
    └── 2025/0616-0622/    # 週次アーカイブ（P043準拠）
        └── README.md      # アーカイブ内容管理
```

**変更履歴**:
- **2025年6月15日**: `daily/`, `bugs/`, `incidents/`, `reports/` → `records/`に集約
- **2025年6月17日**: `meta/hypotheses/`、`records/experiments/` → 完全廃止・アーカイブ完了
- **2025年6月19日**: **REP-0085大規模再編実施**
  - `roles/`、`status/` → `agents/`に統合（エージェント関連）
  - `roadmaps/`、`specifications/` → `techs/`に統合（技術文書）
  - `dominants/`、`meta/` → `rules/`に統合（ルール文書）  
  - `archive/` → `archives/`にリネーム（L3長期保存）

## 🎯 目的別ナビゲーション

### 🚀 開発を始める前に
1. **[CLAUDE.md](../CLAUDE.md)** - プロジェクト全体のルール・方針
2. **[rules/dominants/](rules/dominants/)** - 変更不可の最高位原則
3. **[agents/status/{agent}.md](agents/status/)** - 現在の作業状況確認

### 📝 日常的な作業
1. **作業記録**: [records/reports/](/documents/records/reports/)
2. **バグ対応**: [records/bugs/](/documents/records/bugs/)
3. **インシデント**: [records/incidents/](/documents/records/incidents/)

### 🔧 開発・仕様確認
1. **システム仕様**: [specifications/](/documents/techs/specifications/)
2. **開発計画**: [roadmaps/](/documents/techs/roadmaps/)
3. **プロトコル**: [meta/protocols/](/documents/rules/meta/protocols/)

### 🔬 改善・管理
1. **プロトコル管理**: [meta/protocols/](/documents/rules/meta/protocols/)
2. **チェックリスト**: [meta/checklists/](/documents/rules/meta/checklists/)
3. **過去の実験**: [archive/experiments-legacy/](/documents/archives/experiments-legacy/)（参考資料）

## 📐 文書配置原則

詳細は[P017: ディレクトリ配置ガイドライン](/documents/rules/meta/protocols/p017-directory-placement-guidelines.md)参照

### 基本原則（新構造）
- **エージェント関連** → `agents/`（roles/権限定義 + status/進捗記録）
- **技術文書** → `techs/`（roadmaps/計画 + specifications/仕様）
- **ルール文書** → `rules/`（dominants/原則 + meta/プロトコル）
- **記録系** → `records/`（L2アクティブ記録・全Agent編集可）
- **長期保存** → `archives/`（L3アーカイブ・P043準拠）

### 判断基準（新構造）
1. **エージェント権限・進捗** → agents/
2. **技術仕様・計画** → techs/
3. **ルール・プロトコル** → rules/
4. **時系列で蓄積される記録** → records/
5. **長期保存・アーカイブ** → archives/

## 🔍 関連情報

- **文書管理ルール**: P017/P019/P022に分解統合済み（旧H030）
- **Agent権限マトリックス**: [P016](/documents/rules/meta/protocols/p016-agent-permission-matrix.md)
- **用語集**: [glossary.md](/documents/techs/specifications/terminology/glossary.md)

---

**メンテナンス**: ディレクトリ構造変更時は必ず更新すること