---
**アーカイブ情報**
- アーカイブ日: 2025-06-19（DDD2 L2→L3移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: meta整理v2, documents構造最適化, recordsディレクトリ, 文書管理改善, 権限管理, 構造変更, 最終計画, 実装済み, REP-0001改訂版, 実行完了

---

# metaディレクトリ整理計画書 v2

**作成日**: 2025年6月15日  
**作成者**: Clerk Agent  
**目的**: documentsディレクトリ全体の構造最適化  
**状態**: 実施待ち  

## 📊 改訂された整理方針

### 1. records/ディレクトリの新設
**目的**: 記録系ディレクトリを一元化し、全Agentがアクセス可能に

```
documents/records/  # 新設（全Agent編集可能）
├── daily/         # 移動（from documents/daily/）
├── incidents/     # 移動（from documents/rules/meta/incidents/）
├── experiments/   # 移動（from documents/rules/meta/experiments/）
├── reports/       # 移動（from documents/rules/meta/reports/）
└── bugs/          # 移動（from documents/bugs/）
```

### 2. meta/のシンプル化
**目的**: 体系系文書のみに特化したクリーンな構造

```
documents/rules/meta/    # 体系系に特化
├── README.md
├── hypotheses/    # 仮説管理（維持）
├── protocols/     # プロトコル（維持）
├── directions/    # 確立済み手法（内容整理後）
└── checklists/    # チェックリスト（維持）
```

### 3. directionsの再定義
**現状**: 6ファイル（D001-D006）が形骸化
**対応方針**:

| ファイル | 現在の内容 | 移動先 |
|---------|-----------|--------|
| D001 | Bashコマンド実行チェック | protocols/へ統合 |
| D002 | documents編集プロセス | protocols/へ統合 |
| D003 | 包括的デバッグアプローチ | protocols/へ統合 |
| D004 | Coderマイルストーン記録 | archive/へ移動（記録的） |
| D005 | Monitor作業検出リマインダー | archive/へ移動（記録的） |
| D006 | H025教訓 | archive/へ移動（記録的） |

**結果**: directions/は空になり削除

## 📋 実施計画 v2

### 事前準備（10分）

#### 1. 他Agent作業停止通知
```markdown
## 🚨 文書構造大規模変更通知

**期間**: 2025年6月15日 XX:XX - XX:XX（約2時間）
**実施者**: Clerk Agent
**内容**: documents/配下の大規模ディレクトリ再編

**依頼事項**:
- Coder Agent: documents/への変更を一時停止
- Monitor Agent: documents/への変更を一時停止
- 作業中の内容は一時保存してください
```

#### 2. 完全バックアップ
```bash
# archiveへのバックアップ
mkdir -p documents/archives/backup-2025-06-15
cp -r documents/meta documents/archives/backup-2025-06-15/
cp -r documents/daily documents/archives/backup-2025-06-15/
cp -r documents/bugs documents/archives/backup-2025-06-15/

# Git tagは作成済み: v0.3.0-meta-prepare
```

### Phase 1: records/作成と記録系移動（30分）

```bash
# records/ディレクトリ作成
mkdir -p documents/records

# 記録系ディレクトリの移動
mv documents/daily documents/records/
mv documents/rules/meta/incidents documents/records/
mv documents/rules/meta/experiments documents/records/
mv documents/rules/meta/reports documents/records/
mv documents/bugs documents/records/
```

### Phase 2: directionsの整理（20分）

#### Step 1: protocols/への統合
```bash
# D001-D003をprotocolsへ（番号変更）
mv documents/rules/meta/directions/process/d001-*.md documents/rules/meta/protocols/p018-bash-command-execution.md
mv documents/rules/meta/directions/process/d002-*.md documents/rules/meta/protocols/p019-documents-editing-advanced.md
mv documents/rules/meta/directions/process/d003-*.md documents/rules/meta/protocols/p020-comprehensive-debug-approach.md
```

#### Step 2: archiveへの移動
```bash
# D004-D006を記録としてarchiveへ
mkdir -p documents/archives/directions-legacy
mv documents/rules/meta/directions/agent-systems/* documents/archives/directions-legacy/
mv documents/rules/meta/directions/lessons/* documents/archives/directions-legacy/
```

#### Step 3: directionsディレクトリ削除
```bash
rm -rf documents/rules/meta/directions
```

### Phase 3: 参照更新（60分）

#### 優先度別更新対象

**最優先（全Agent影響）**:
1. **CLAUDE.md**
   - daily/への参照
   - incidents/への参照
   - directions/への参照（D001等）
   - チェックリストへの参照

2. **各Agent status**
   - documents/agents/status/*.md の更新

**高優先（システム影響）**:
3. **hypotheses/内の参照**
   - incidents/への参照多数
   - daily/への参照

4. **protocols/README.md**
   - 新規プロトコル（P018-P020）の追加
   - directionsへの参照削除

**中優先（個別文書）**:
5. 各種README.md
6. 個別の相互参照

### Phase 4: 権限更新（15分）

#### P016（Agent権限マトリックス）更新
```
records/ - 全Agent RWCDM権限
├── daily/      - 従来通り
├── incidents/  - 全Agent編集可能に変更
├── experiments/- 全Agent編集可能に変更
├── reports/    - 全Agent編集可能に変更
└── bugs/       - 全Agent編集可能に変更
```

### Phase 5: 検証（30分）

1. **P007文書整合性チェック**
   - 全参照パスの確認
   - broken linkの検出

2. **動作確認**
   - 主要なワークフローの確認
   - Agent権限の確認

3. **Git差分確認**
   - 意図しない変更がないか確認

## ⚠️ リスクと対策

### リスク
1. **大規模な参照更新**: 100箇所以上の更新が必要
2. **Agent作業の衝突**: 2時間の作業停止が必要
3. **directionsの完全削除**: 参照が残る可能性

### 対策
1. **段階的更新**: grep/sedで機械的に更新後、手動確認
2. **明確な通知**: 作業開始前に全Agentへ通知
3. **archive保存**: 削除前にarchiveへ完全移動

## 📊 影響分析 v2

| 変更内容 | 影響箇所数 | 影響Agent | 重要度 |
|---------|-----------|----------|--------|
| daily/移動 | 50+ | 全Agent | 最高 |
| incidents/移動 | 40+ | 全Agent | 高 |
| bugs/移動 | 30+ | Coder中心 | 高 |
| directions削除 | 10+ | Clerk中心 | 中 |
| experiments/移動 | 5+ | Clerk中心 | 低 |

## 🎯 期待効果

1. **構造の単純化**
   - meta/は体系系のみ（4ディレクトリ）
   - records/は記録系のみ（5ディレクトリ）

2. **権限の明確化**
   - records/: 全Agent編集可能
   - meta/: 基本的にClerk管理

3. **アクセス性向上**
   - 記録系が一箇所に集約
   - directionsの形骸化解消

## 📅 実施スケジュール

**所要時間**: 約2.5時間

```
開始
├── 事前準備（10分）
├── Phase 1: records/作成（30分）
├── Phase 2: directions整理（20分）
├── Phase 3: 参照更新（60分）
├── Phase 4: 権限更新（15分）
├── Phase 5: 検証（30分）
└── 完了報告（5分）
```

---

**実施確認**: 
この計画v2で実施してよろしいでしょうか？
特に以下の点をご確認ください：

1. ✅ records/への一元化（daily, incidents, experiments, reports, bugs）
2. ✅ meta/のシンプル化（hypotheses, protocols, checklists のみ）
3. ✅ directionsの解体（protocols統合 + archive移動）
4. ✅ 全Agentへのrecords/編集権限付与

承認いただければ、他Agentへの通知から開始します。