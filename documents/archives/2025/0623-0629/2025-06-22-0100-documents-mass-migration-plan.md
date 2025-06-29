---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250622-001-documents-mass-migration-to-cctop.md
Keywords: documents-migration, cctop-cli-transition, timebox-legacy, web-ui-removal, archive-structure, authentication-removal, asset-management-removal, spa-cleanup, project-purification, 70percent-reduction, architect-clerk-collaboration
---

# documents/ 大規模移行計画書 - cctop CLI特化

**計画番号**: PLAN-20250622-001  
**作成日時**: 2025年6月22日 21:20  
**作成者**: Architect Agent  
**目的**: timeboxingアプリからcctop CLIへの移行に伴うdocuments/ディレクトリの大規模整理

## 📋 概要

cctop（Claude Code リアルタイムファイル監視システム）への移行において、documents/ディレクトリの約70%がWebアプリ関連で不要と判明。CLI特性に基づく体系的な整理により、開発効率とプロジェクト純度を向上させる。

## 🔍 現状分析

### 文書規模
- **総ファイル数**: 推定500+ファイル
- **不要推定**: 約70%（350+ファイル）
- **主要不要カテゴリ**: timebox関連（69ファイル）、Web UI、認証システム、SPA設計

### 問題点
1. **検索効率低下**: 不要文書による関連文書の発見困難
2. **開発混乱**: timeboxingアプリとcctop CLIの仕様混在
3. **保守負担**: 不要文書の維持コスト
4. **認識齟齬**: プロジェクト範囲の曖昧化

## 🎯 移行計画

### Phase 1: 即座移行対象（優先度A+）
**実行期限**: 2025年6月22日-23日  
**対象**: 明確に不要なファイル群

#### 1.1 timebox関連バグ・インシデント（69+ファイル）
```bash
# 移動対象
documents/records/bugs/BUG-*-timebox-*
documents/records/bugs/BUG-*-taskgrid-*
documents/records/bugs/BUG-*-vision-*
documents/records/incidents/INC-*-timebox-*
documents/records/incidents/INC-*-taskgrid-*

# 移動先
documents/archives/timebox-legacy/records/bugs/
documents/archives/timebox-legacy/records/incidents/
```

**移動理由**: cctop CLIには存在しない機能のバグ・問題記録

#### 1.2 認証システム仕様・計画（大規模）
```bash
# 移動対象
documents/visions/specifications/authentication/
documents/visions/blueprints/features/authentication/

# 移動先
documents/archives/web-ui-legacy/authentication/
```

**移動理由**: CLIツールに認証機能は不要（将来Web UI実装時まで保留）

#### 1.3 アセット管理関連
```bash
# 移動対象
documents/visions/specifications/asset-management/

# 移動先
documents/archives/web-ui-legacy/asset-management/
```

**移動理由**: CLIツールにWebアセット管理は不要

### Phase 2: 選択的移行対象（優先度A）
**実行期限**: 2025年6月23日-24日  
**対象**: 詳細検討が必要なファイル群

#### 2.1 Web UI・SPA関連文書
```bash
# 調査・移動対象（推定100+ファイル）
documents/visions/specifications/*island*
documents/visions/specifications/*spa*
documents/visions/specifications/*frontend*
documents/visions/blueprints/*ui*
documents/records/reports/*ui*
documents/records/reports/*web*
```

#### 2.2 timeboxingアプリ機能関連レポート
```bash
# 移動対象
documents/records/reports/REP-*-timebox-*
documents/records/reports/REP-*-taskgrid-*
documents/records/reports/REP-*-quick-switch-*
documents/records/reports/REP-*-vision-sync-*
```

### Phase 3: 体系的整理（優先度B）
**実行期限**: 2025年6月24日-25日  
**対象**: 保持判定・体系化

#### 3.1 保持対象の精査・再編成
- 汎用的な開発プロトコル・ルール
- エージェントシステム関連文書
- cctop適用可能な技術仕様

#### 3.2 README.md系統的更新
- 各ディレクトリのREADME.md更新
- 移動記録・理由の明記
- 新しい構造の反映

## 📁 移行先ディレクトリ構造

### archives/配下の設計
```
documents/archives/
├── timebox-legacy/                    # timeboxingアプリ関連
│   ├── specifications/
│   │   ├── timebox/                  # 既に移動済み
│   │   └── taskgrid/                 # 既に移動済み
│   ├── records/
│   │   ├── bugs/                     # Phase 1で移動
│   │   ├── incidents/                # Phase 1で移動
│   │   └── reports/                  # Phase 2で移動
│   └── roadmaps/
│       └── features/                 # timeboxingアプリ機能計画
├── web-ui-legacy/                     # Web UI・認証関連
│   ├── authentication/               # Phase 1で移動
│   ├── asset-management/             # Phase 1で移動
│   ├── spa-architecture/             # Phase 2で移動
│   └── frontend-design/              # Phase 2で移動
└── general-legacy/                    # その他汎用・分類困難
    └── miscellaneous/
```

## 🔧 実行手順

### Phase 1実行手順
1. **移動先ディレクトリ準備**
   ```bash
   mkdir -p documents/archives/timebox-legacy/records/{bugs,incidents}
   mkdir -p documents/archives/web-ui-legacy/{authentication,asset-management}
   ```

2. **ファイル移動実行**
   ```bash
   # timebox関連バグ・インシデント
   mv documents/records/bugs/BUG-*-timebox-* documents/archives/timebox-legacy/records/bugs/
   mv documents/records/incidents/INC-*-timebox-* documents/archives/timebox-legacy/records/incidents/
   
   # 認証・アセット管理
   mv documents/visions/specifications/authentication/ documents/archives/web-ui-legacy/
   mv documents/visions/specifications/asset-management/ documents/archives/web-ui-legacy/
   mv documents/visions/blueprints/features/authentication/ documents/archives/web-ui-legacy/
   ```

3. **README.md更新**
   - 移動元ディレクトリのREADME.md更新
   - 移動記録・理由の追記

### Phase 2実行手順
1. **詳細調査実行**
   ```bash
   # Web UI関連ファイル特定
   find documents/ -name "*.md" | grep -E "(island|spa|frontend|ui|web)" > web-ui-files.txt
   
   # timebox関連レポート特定
   find documents/records/reports/ -name "*timebox*" -o -name "*taskgrid*" > timebox-reports.txt
   ```

2. **選択的移動実行**
   - 調査結果に基づく移動実行
   - 保持判定の文書化

## 📊 期待効果

### 定量的効果
- **文書削減**: 350+ファイル → archives移動
- **検索効率**: 不要文書除去による検索精度向上
- **保守負担**: 維持対象文書70%削減

### 定性的効果
- **プロジェクト純度**: cctop CLI特化による焦点集中
- **開発効率**: 関連文書の即座発見
- **認識明確化**: プロジェクト範囲の明確化

## ⚠️ リスク・注意事項

### 移行リスク
1. **参照リンク切れ**: 移動ファイルへの内部リンク
2. **知識散逸**: 過去の設計判断・経緯の見失い
3. **復旧困難**: 誤移動時の復旧手順

### 対策
1. **参照チェック**: 移動前の参照関係確認
2. **移動記録**: 詳細な移動理由・経緯の文書化
3. **段階実行**: Phase別実行による影響範囲限定

## 🚀 実行スケジュール

### 2025年6月22日（今日）
- **21:30-22:00**: Phase 1準備・移動先ディレクトリ作成
- **22:00-23:00**: timebox関連バグ・インシデント移動（優先度A+）

### 2025年6月23日
- **09:00-12:00**: 認証・アセット管理移動（Phase 1完了）
- **13:00-17:00**: Web UI関連調査・移動（Phase 2開始）

### 2025年6月24日
- **09:00-12:00**: timeboxingアプリ関連レポート移動（Phase 2継続）
- **13:00-17:00**: 保持文書精査・README.md更新（Phase 3開始）

### 2025年6月25日
- **09:00-12:00**: 体系的整理完了・検証
- **13:00-15:00**: 移行完了レポート作成

## 📋 完了条件

### Phase 1完了条件
- [ ] timebox関連バグ・インシデント移動完了（69+ファイル）
- [ ] 認証システム仕様・計画移動完了
- [ ] アセット管理関連移動完了
- [ ] 移動先README.md作成完了

### Phase 2完了条件
- [ ] Web UI・SPA関連文書調査・移動完了
- [ ] timeboxingアプリ関連レポート移動完了
- [ ] 選択的移行判定の文書化完了

### Phase 3完了条件
- [ ] 保持文書の体系的整理完了
- [ ] README.md系統的更新完了
- [ ] 参照リンク整合性確認完了

### 全体完了条件
- [ ] documents/配下がcctop CLI特化に完全移行
- [ ] 不要文書70%削減達成
- [ ] 移行完了レポート作成・承認

## 📝 実行記録

### 2025年6月22日 21:15
- **Phase 1部分実行**: timebox/、taskgrid/ディレクトリ移動完了
- **specifications/README.md更新**: 移動記録追加
- **計画書作成**: 本文書作成・承認待ち

---

**次のアクション**: Phase 1本格実行の承認・開始  
**担当**: Architect Agent（設計・計画）、Clerk Agent（文書移動実行）連携  
**承認者**: ユーザー確認後、実行開始