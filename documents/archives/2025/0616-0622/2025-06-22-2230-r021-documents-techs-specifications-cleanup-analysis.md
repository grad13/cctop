# documents/techs/specifications/ 整理分析レポート

**レポート番号**: REP-0021  
**作成日時**: 2025年6月22日 22:30  
**作成者**: Inspector Agent  
**目的**: cctop CLI特性に基づくdocuments/techs/specifications/配下の整理対象特定

## 📋 調査概要

cctop（Claude Code リアルタイムファイル監視システム）プロジェクトへの移行に伴い、documents/techs/specifications/配下のファイル・ディレクトリについて、cctop CLI特性に基づく分類・整理を実施。

## 🔍 調査結果

### archives移動候補（cctopに不要）

#### 1. authentication/ - 本格認証システム
**理由**: CLIツールには認証機能不要
- `system-overview.md`: JWT認証・ゲスト登録システム（Webアプリ用）
- `registration-flow.md`: ユーザー登録フロー（Webアプリ用）  
- `implementation-details.md`: 実装詳細（Webアプリ用）

#### 2. asset-management/ - Webアセット管理
**理由**: CLIツールにアセット管理不要
- `favicon-policy.md`: ファビコン管理方針（Web UI専用）

#### 3. taskgrid/ - timeboxingアプリ関連
**理由**: cctopと機能的に無関係（todoアプリ機能）
- `design.md`: タスクグリッド設計（DAGベースのタスク整理）
- `data-format.md`: タスクデータ形式

#### 4. timebox/ - timeboxingアプリ関連
**理由**: cctopと機能的に無関係（todoアプリ機能）
- `timer-functionality.md`: ポモドーロタイマー機能
- `dummy-task.md`: ダミータスク仕様
- `timer-functionality-decisions.md`: タイマー設計決定

### 保持すべきファイル（cctop適用可能）

#### 1. architecture/ - システムアーキテクチャ（汎用）
- `overview.md`: ✅ cctop v3アーキテクチャ概要（**既に更新済み**）
- `url-structure-consideration.md`: 汎用・将来のWeb UI用
- `wrappers-security.md`: APIセキュリティ設計（汎用・将来のAPI用）
- `database/database-initialization.md`: SQLite初期化（cctop適用可能）

#### 2. terminology/ - 用語定義（汎用）
- `glossary.md`: ✅ cctop用語集（**既に更新済み**）
- `terms-and-rules.md`: プロジェクト用語統一（汎用）

## 📊 整理対象サマリー

### archives移動対象
- **4ディレクトリ**: authentication/, asset-management/, taskgrid/, timebox/
- **合計9ファイル**: 認証3 + アセット1 + タスクグリッド2 + タイマー3
- **移動先**: `documents/archives/timebox-legacy/specifications/`

### 保持対象
- **2ディレクトリ**: architecture/, terminology/
- **合計6ファイル**: アーキテクチャ4 + 用語2

## 🎯 推奨整理アクション

### 優先度A（即座実行推奨）
1. **timebox/ディレクトリ移動**
   - 理由: cctopと完全に無関係
   - 移動先: `documents/archives/timebox-legacy/specifications/timebox/`

2. **taskgrid/ディレクトリ移動**
   - 理由: cctopと完全に無関係
   - 移動先: `documents/archives/timebox-legacy/specifications/taskgrid/`

### 優先度B（将来検討）
1. **authentication/ディレクトリ移動**
   - 理由: 現在は不要だが、将来のWeb UI拡張で必要になる可能性
   - 移動先: `documents/archives/web-ui-legacy/specifications/authentication/`

2. **asset-management/ディレクトリ移動**
   - 理由: 現在は不要だが、将来のWeb UI拡張で必要になる可能性
   - 移動先: `documents/archives/web-ui-legacy/specifications/asset-management/`

### 保持推奨
1. **architecture/ディレクトリ**
   - 理由: 汎用的なアーキテクチャ設計は将来も活用可能
   - 注意: overview.mdは既にcctop専用に更新済み

2. **terminology/ディレクトリ**
   - 理由: 用語定義は汎用的で継続利用価値あり
   - 注意: glossary.mdは既にcctop専用に更新済み

## 📋 移動計画詳細

### Phase 1: timebox/taskgrid関連（即座実行）
```bash
# timebox関連の移動
mv documents/techs/specifications/timebox/ documents/archives/timebox-legacy/specifications/
mv documents/techs/specifications/taskgrid/ documents/archives/timebox-legacy/specifications/

# README.md更新
# documents/techs/specifications/README.mdからtimebox/taskgrid関連記述削除
```

### Phase 2: Web UI関連（将来検討）
```bash
# Web UI関連の移動（将来実行）
mkdir -p documents/archives/web-ui-legacy/specifications/
mv documents/techs/specifications/authentication/ documents/archives/web-ui-legacy/specifications/
mv documents/techs/specifications/asset-management/ documents/archives/web-ui-legacy/specifications/
```

## 🔍 整理後の構造予想

```
documents/techs/specifications/
├── README.md (更新必要)
├── architecture/
│   ├── overview.md (cctop v3専用・更新済み)
│   ├── url-structure-consideration.md (汎用)
│   ├── wrappers-security.md (汎用)
│   └── database/
│       └── database-initialization.md (cctop適用可能)
└── terminology/
    ├── README.md
    ├── glossary.md (cctop専用・更新済み)
    └── terms-and-rules.md (汎用)
```

## 📈 効果・期待値

### 整理による効果
1. **プロジェクト純度向上**: cctop関連文書のみに集約
2. **開発効率向上**: 不要文書による混乱回避
3. **保守性向上**: 関連文書の特定容易化

### リスク・注意点
1. **将来の機能拡張**: Web UI実装時に認証・アセット管理が必要になる可能性
2. **参照関係**: 他文書からの参照リンクの確認・修正が必要
3. **知識の散逸**: 過去の設計判断の経緯が見つけにくくなる可能性

## 🚀 次のアクション

1. **Phase 1実行確認**: timebox/taskgrid関連の移動実行可否の確認
2. **README.md更新**: documents/techs/specifications/README.mdの更新
3. **参照リンク確認**: 移動対象ファイルへの参照リンクの洗い出し・修正
4. **archives/README.md更新**: 移動理由・経緯の記録

---

**Inspector Agent記録**: 2025年6月22日 22:30  
**ステータス**: 分析完了・実行待ち  
**関連レポート**: r019-timebox-legacy-cleanup-plan.md（timebox全般整理）