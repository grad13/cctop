---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: プロジェクト全体不整合チェック, policies rules ディレクトリ混在, seamless-navigation ディレクトリ不存在, CLAUDE.md不整合, Virtual Desktop名称残存, リンク切れ特定, ドキュメントナビゲーション破綻修正

---

# プロジェクト全体の不整合チェック結果

**作成日時**: 2025年6月12日 11:00
**検証対象**: プロジェクト全体のファイル整合性
**目的**: リンク切れ、ディレクトリ名不整合、import文エラー、その他の不整合を特定

## 🔴 緊急度：高（修正必須）

### 1. **ディレクトリ構造の不整合**

#### 問題1: policies vs rules ディレクトリの混在
- **ファイルパス**: `documents/README.md`
- **問題の内容**: READMEでは `policies/` ディレクトリを参照しているが、実際は `rules/` ディレクトリが存在
- **影響**: ドキュメントのリンクが全て無効
- **修正案**: 
  ```markdown
  # documents/README.md の修正箇所
  - 行8-11: policies/ → rules/ に変更
  - 行39-43: policies/ → rules/ に変更
  - 行70-72: policies/ → rules/ に変更
  - 行99: policies/ → rules/ に変更
  - 行114: policies/ → rules/ に変更
  - 行123-138: policies/ → rules/ に変更
  ```

#### 問題2: seamless-navigation ディレクトリが存在しない
- **ファイルパス**: `documents/README.md`（行51-57）
- **問題の内容**: `roadmap/seamless-navigation/` を参照しているが、実際は `roadmap/quick-switch/` が存在
- **影響**: Quick Switch機能の文書へのナビゲーションが破綻
- **修正案**: seamless-navigation を quick-switch に変更

### 2. **CLAUDE.md の不整合**

#### 問題: development-guidelines.md への誤ったパス
- **ファイルパス**: `CLAUDE.md`（行58）
- **問題の内容**: `documents/policies/development-guidelines.md` を参照しているが、実際は `documents/rules/development-guidelines.md`
- **影響**: 開発ガイドラインへの参照が無効
- **修正案**: policies → rules に変更

### 3. **documents/rules/naming-protocol.md の不整合**

#### 問題: 古いディレクトリ名への参照
- **ファイルパス**: `documents/rules/naming-protocol.md`（行8, 15, 86-88）
- **問題の内容**: まだ `documents/policies/` を参照している
- **影響**: 文書間の相互参照が破綻
- **修正案**: 全ての policies を rules に変更

## 🟡 緊急度：中（改善推奨）

### 1. **Virtual Desktop 名称の残存**

#### 問題: 古い機能名への参照
以下のファイルで "Virtual Desktop" への言及が残存：
- `documents/daily/2025-06-10-1300-foundational-fixes-completion.md`（行80）
- `documents/daily/2025-06-10-project-review.md`（行170, 191, 193）
- `documents/daily/2025-06-11.md`（行8, 25, 38）
- `documents/README.md`（行30）

**影響**: 機能名の混乱を招く可能性
**修正案**: 
- 過去の履歴として残すものは「旧Virtual Desktop（現Quick Switch）」と注記
- 新しい文書では一貫して「Quick Switch」を使用

### 2. **削除されたファイルへの参照**

#### 問題: archive内の古いファイルパス
- **ファイルパス**: `documents/README.md`（行30）
- **問題の内容**: `virtual-window-codes/` への参照があるが、実際のarchiveディレクトリ構造と異なる
- **影響**: アーカイブへのナビゲーションが不正確
- **修正案**: 実際のarchive構造に合わせて更新

## 🟢 緊急度：低（情報のみ）

### 1. **import文の整合性**
- **状態**: 全てのJavaScriptファイルのimport文は正しいパスを指している
- **確認済み**: 
  - frontend/app.js
  - components/utils/
  - islands/taskgrid/
  - islands/timebox/

### 2. **ディレクトリ構造の実態**
実際の構造：
```
documents/
├── rules/        # policiesではなくrules
│   ├── asset-management.md
│   ├── development-guidelines.md
│   ├── glossary.md
│   ├── naming-protocol.md
│   └── terminology.md
├── roadmap/
│   ├── quick-switch/    # seamless-navigationではなくquick-switch
│   │   ├── performance-evaluation-report.md
│   │   ├── quick-switch-specification.md
│   │   └── seamless-navigation-transition-improvements.md
└── archive/
    └── 2025-06/    # 実際のアーカイブ構造
```

## 📋 推奨アクション

1. **即座に修正すべき項目**：
   - documents/README.md の全ての policies → rules 変更
   - CLAUDE.md の policies → rules 変更
   - documents/rules/naming-protocol.md の policies → rules 変更

2. **段階的に改善すべき項目**：
   - Virtual Desktop → Quick Switch の統一（履歴的文書は注記付きで保持）
   - archive構造の正確な記載

3. **現状維持で問題ない項目**：
   - JavaScriptのimport文（全て正常）
   - APIエンドポイントの参照（wrappers経由で統一済み）

## まとめ

主要な不整合は `policies` vs `rules` ディレクトリ名の混在です。これは文書移動時の更新漏れが原因と思われます。早急に修正することで、ドキュメントナビゲーションの整合性を回復できます。

Virtual Desktop → Quick Switch の名称変更については、履歴的文書では旧名称を残しつつ注記を付けることで、変更の経緯を追跡可能にすることを推奨します。