---
**アーカイブ情報**
- アーカイブ日: 2025-06-19（DDD2 L2→L3移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: meta整理, ディレクトリ構造, 文書管理, メタディレクトリ, 構造最適化, 管理計画, 整理案, アーキテクチャ, REP-0002前身, 実行完了

---

# metaディレクトリ整理計画書

**作成日**: 2025年6月15日  
**作成者**: Clerk Agent  
**目的**: metaディレクトリの構造整理と最適化  

## 📊 現状分析

### 現在のmetaディレクトリ構成

```
meta/
├── README.md
├── checklists/     # 5ファイル（体系系）
├── directions/     # 6ファイル（特殊・確立済み手法）
├── experiments/    # 5つの実験記録（記録系）
├── hypotheses/     # 24ファイル（体系系）
├── incidents/      # 37ファイル（記録系）
├── protocols/      # 18ファイル（体系系）
└── reports/        # 3ファイル（記録系）
```

### 発見された課題

1. **想定外のディレクトリ**
   - checklists/ - 当初meta内に想定していなかった
   - experiments/ - hypothesesの実験記録だが独立している
   - incidents/ - 問題記録がmeta内に混在

2. **directionsの形骸化**
   - 6ファイルのみ（D001-D006）
   - 最終更新が古い（多くが6月13日）
   - 参照頻度が低い

3. **ディレクトリの混在**
   - 体系系（hypotheses, protocols, checklists）
   - 記録系（incidents, experiments, reports）
   - 特殊（directions）
   が同一階層に混在

## 🎯 整理方針

### 基本原則
1. **最小限の移動**: 既存の参照を壊さない
2. **段階的実施**: 影響度の低いものから順次
3. **完全バックアップ**: 削除前に必ずバックアップ

### 提案する新構造

```
meta/
├── README.md
├── core/              # コア管理文書（体系系）
│   ├── hypotheses/    # 仮説管理
│   ├── protocols/     # プロトコル
│   └── directions/    # 確立済み手法
├── operational/       # 運用支援文書
│   └── checklists/    # チェックリスト
└── records/          # 記録系
    ├── incidents/    # インシデント
    ├── experiments/  # 実験記録
    └── reports/      # レポート
```

## 📋 実施計画

### Phase 1: バックアップ作成（5分）
```bash
# metaディレクトリ全体のバックアップ
cp -r documents/meta documents/archives/meta-backup-2025-06-15

# Git tagは作成済み: v0.3.0-meta-prepare
```

### Phase 2: ディレクトリ作成（5分）
```bash
mkdir -p documents/rules/meta/core
mkdir -p documents/rules/meta/operational
mkdir -p documents/rules/meta/records
```

### Phase 3: 段階的移動（30分）

#### Step 1: 記録系の移動（影響小）
```bash
# incidents → records/incidents
mv documents/rules/meta/incidents documents/rules/meta/records/

# experiments → records/experiments  
mv documents/rules/meta/experiments documents/rules/meta/records/

# reports → records/reports
mv documents/rules/meta/reports documents/rules/meta/records/
```

#### Step 2: 運用系の移動（影響中）
```bash
# checklists → operational/checklists
mv documents/rules/meta/checklists documents/rules/meta/operational/
```

#### Step 3: コア系の移動（影響大）
```bash
# hypotheses → core/hypotheses
mv documents/rules/meta/hypotheses documents/rules/meta/core/

# protocols → core/protocols
mv documents/rules/meta/protocols documents/rules/meta/core/

# directions → core/directions
mv documents/rules/meta/directions documents/rules/meta/core/
```

### Phase 4: 参照更新（60分）

#### 優先更新対象
1. **CLAUDE.md** - meta/への参照多数
2. **各Agent status** - チェックリスト参照
3. **README.md各所** - ディレクトリ構造の説明

#### 更新方法
- 一括置換ではなく、個別確認しながら更新
- 相対パスは維持（../meta/ → ../meta/core/等）

### Phase 5: 検証（30分）
1. P007文書整合性チェック実施
2. 主要な参照パスの動作確認
3. Git diffで意図しない変更がないか確認

## ⚠️ リスクと対策

### リスク
1. **参照パス破壊**: 多数の文書が参照している
2. **作業中断**: 大規模変更のため中断リスク
3. **Agent混乱**: 慣れ親しんだ構造の変更

### 対策
1. **完全バックアップ**: archive/とGit tagで二重保護
2. **段階実施**: 影響の小さいものから順次
3. **明確な文書化**: 新構造の説明文書作成

## 🔄 代替案

### 最小限の整理案
もし上記が大規模すぎる場合：

1. **incidents/のみ移動**: meta/incidents → documents/incidents
2. **experiments/統合**: experiments/ → hypotheses/experiments/
3. **directions/現状維持**: 参照が少ないため影響小

## 📊 影響分析

| ディレクトリ | ファイル数 | 推定参照数 | 影響度 |
|-------------|-----------|-----------|--------|
| hypotheses | 24 | 高（100+） | 大 |
| protocols | 18 | 高（50+） | 大 |
| incidents | 37 | 中（20+） | 中 |
| checklists | 5 | 高（30+） | 大 |
| directions | 6 | 低（10-） | 小 |
| experiments | 5 | 低（5-） | 小 |

## 💡 推奨事項

1. **実施タイミング**: 週末や作業の区切りで実施
2. **実施者**: Clerk Agent（文書管理権限）
3. **所要時間**: 約2-3時間（検証含む）
4. **事前通知**: 他Agentへの構造変更通知

## 🎯 期待効果

1. **構造の明確化**: 体系系/記録系/運用系の分離
2. **検索性向上**: 階層化による直感的アクセス
3. **保守性向上**: 役割別管理による責任明確化

---

**判断依頼**: 
- A案: 上記の完全整理を実施
- B案: 最小限の整理のみ実施
- C案: 現状維持（整理見送り）

どの案で進めるか、ご指示をお願いします。