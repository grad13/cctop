---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: Monitor Inspectorリネーム, エージェント名称変更, surveillanceディレクトリ, 5エージェント体制, 職業名統一, 動詞名詞混同解消, CLAUDE.md更新, DDD1更新, 移行計画詳細, 影響範囲85ファイル, Git移動手順, 互換性維持, 段階的実施, 完全移行計画, システム一貫性

---

# REP-0045: Monitor→Inspectorリネーム実施計画書

**作成日**: 2025年6月18日 02:00  
**作成者**: Clerk Agent  
**ステータス**: 計画中  
**カテゴリー**: システム改善  
**参照URL**: 
- REP-0033: Monitor→Inspector名称変更提案書
- REP-0034: 5エージェント体制実装計画書
- DDD1: Agent役割必須システム

## 疑問点・決定事項
- [x] 5エージェント体制との独立性確認 → 独立実施可能
- [x] ディレクトリ名（surveillance/）の扱い → 技術的名称として維持
- [ ] 実施タイミング → ユーザー承認後に決定
- [ ] 移行期間中の互換性維持方法

---

## 1. 概要

Monitor AgentをInspector Agentにリネームする実施計画。5エージェント体制への移行とは独立して実施可能であり、名詞と動詞の混同を解消し、職業名での統一性を確保する。

## 2. 背景と目的

### 2.1 現状の問題点
- **動詞との混同**: "monitor"（動詞）と"Monitor"（エージェント名）の混同
- **職業名不統一**: Coder/Clerkは職業名だが、Monitorは動作名
- **コミュニケーション上の曖昧性**: 「monitorする」と「Monitorに依頼」の区別困難

### 2.2 改善目標
- **明確な識別**: Inspector（検査官）として職業名統一
- **役割の明確化**: 監視・分析・検査の専門職として確立
- **将来の拡張性**: 5エージェント体制でも一貫性維持

## 3. 影響範囲分析

### 3.1 必須更新対象（Critical）

#### ドキュメント
```
documents/
├── dominants/
│   └── ddd1-agent-role-mandatory-system.md（3箇所）
├── status/
│   ├── inspector.md → inspector.md（ファイル名変更）
│   ├── clerk.md（Inspector参照：約10箇所）
│   └── coder.md（Inspector参照：約5箇所）
├── meta/
│   ├── protocols/（P014等、Inspector専用プロトコル）
│   └── checklists/（Inspector関連チェックリスト）
└── records/
    └── reports/（Inspector実装記録等）
```

#### コード関連
```
CLAUDE.md（Agent定義、権限システム等：約20箇所）
surveillance/ディレクトリ → 維持（技術的名称として）
```

### 3.2 更新優先度

| 優先度 | 対象 | 理由 |
|-------|------|------|
| P1 | CLAUDE.md | 全エージェントの基準文書 |
| P1 | DDD1 | 最高位規則での定義 |
| P1 | status/inspector.md | エージェント自身の定義 |
| P2 | protocols/ | 実行ルールの整合性 |
| P2 | 他status/ | エージェント間連携 |
| P3 | reports/ | 過去記録（参照頻度低） |

### 3.3 追加変更項目：surveillance/ディレクトリリネーム

#### 背景
- monitorを動詞としてのみ使用したいため
- Inspector Agentとの一貫性向上
- surveillance（監視システム）として技術的意味を明確化

#### 変更内容
```
monitor/ → surveillance/
├── config/ → surveillance/config/
├── logs/ → surveillance/logs/
├── src/ → surveillance/src/
├── docs/ → surveillance/docs/
└── utils/ → surveillance/utils/
```

#### 追加影響範囲
1. **ディレクトリ移動**
   ```bash
   git mv monitor surveillance
   ```

2. **設定ファイル更新**
   - package.json内のパス参照
   - npm scriptsでのパス指定
   - 各種設定ファイル内のsurveillance/パス

3. **ソースコード更新**
   - require/import文でのパス
   - ファイルシステム操作でのパス
   - ログファイル出力先パス

4. **ドキュメント更新**
   - README.md内のディレクトリ説明
   - 開発ガイド内のパス説明
   - surveillance/docs/配下の自己参照

### 3.4 維持する要素
- 過去のレポート内のInspector参照（歴史的記録）
- Git履歴内の参照（変更不可）

## 4. 実施手順

### Phase 1: 準備（Day 1）
1. **全参照箇所の特定**
   ```bash
   grep -r "Inspector\|monitor" documents/ --include="*.md" | grep -v "surveillance/"
   ```
   
2. **更新スクリプト準備**
   - 大文字小文字を区別した置換
   - コンテキスト確認（動詞vs名詞）

3. **バックアップ作成**
   ```bash
   tar -czf monitor-to-inspector-backup-$(date +%Y%m%d).tar.gz documents/
   ```

### Phase 2: コア更新（Day 1-2）
1. **DDD1更新**
   - Agent定義を「Inspector」→「Inspector」
   - 役割説明の調整

2. **CLAUDE.md更新**
   - Agent権限システムセクション
   - 各種参照箇所
   - 用語統一

3. **status/inspector.md → status/inspector.md**
   - ファイル名変更
   - 内容の全面更新
   - 自己参照の修正

4. **monitor/ディレクトリ → surveillance/移動**
   ```bash
   git mv monitor surveillance
   ```
   - package.json内パス更新
   - npm scripts更新
   - ソースコード内パス更新

### Phase 3: 関連文書更新（Day 2-3）
1. **protocols/更新**
   - P014: monitor-patterns-restriction.md → inspector-patterns-restriction.md
   - その他Monitor参照プロトコル

2. **他エージェントstatus更新**
   - clerk.md: Monitor参照をInspectorに変更
   - coder.md: Monitor参照をInspectorに変更

3. **checklists/更新**
   - Monitor関連チェックリスト

### Phase 4: 検証と完了（Day 3）
1. **整合性チェック**
   - 更新漏れ確認
   - リンク切れ確認
   - 用語統一確認

2. **動作確認**
   - 新規セッションでInspector宣言
   - 権限システム動作確認

3. **完了報告**
   - REP作成
   - 各status更新

## 5. 移行時の注意事項

### 5.1 互換性維持
- **移行期間**: 1週間は両名称を認識
- **エラーメッセージ**: 「MonitorはInspectorに名称変更されました」
- **リダイレクト**: 必要に応じて旧参照から新参照へ誘導

### 5.2 コミュニケーション
- **事前通知**: 全エージェントのstatusに変更予告
- **変更理由**: 各更新箇所にコメント追加
- **FAQ準備**: よくある質問への回答準備

### 5.3 リスク管理
- **ロールバック計画**: バックアップからの復元手順
- **段階的実施**: Critical → Important → Nice to have
- **確認ポイント**: 各Phase後の動作確認

## 6. 期待効果

### 6.1 即時効果
- 名詞/動詞の混同解消
- 職業名統一による一貫性向上
- コミュニケーションの明確化

### 6.2 長期効果
- 5エージェント体制への円滑な移行
- 新規参加者の理解容易性向上
- システム全体の品質向上

## 7. 成功基準

### 定量的基準
- [ ] 全Critical更新の完了（100%）
- [ ] リンク切れゼロ
- [ ] エラー発生ゼロ

### 定性的基準
- [ ] エージェント識別の明確化
- [ ] ユーザー体験の向上
- [ ] システム一貫性の確保

## 8. タイムライン

```
Day 1: 準備・コア更新開始
Day 2: コア更新完了・関連文書更新
Day 3: 検証・完了・報告
Day 4-7: 移行期間（互換性維持）
Day 8: 完全移行
```

## 9. 代替案の検討

### 9.1 他の名称候補
- Auditor: 監査に特化した印象
- Analyst: 分析に限定される印象
- **Inspector**: 監視・分析・検査を包含（採用）

### 9.2 実施タイミング
- Option A: 即時実施（推奨）
- Option B: 5エージェント体制と同時
- Option C: 四半期区切りで実施

## 10. 完全な影響範囲一覧

### 10.1 Critical（即座更新必須）

#### CLAUDE.md（5箇所）
- Agent定義（Coder/Clerk/Monitor→Inspector）
- エージェント一覧での説明
- agent宣言の例文
- statusファイル確認の説明
- Monitorエージェント権限の記載

#### DDD1（2箇所）
- `documents/rules/dominants/ddd1-agent-role-mandatory-system.md`
  - Agent定義（3. Monitor Agent→Inspector Agent）
  - statusファイル参照

#### DDD2（1箇所）
- `documents/rules/dominants/ddd2-hierarchy-memory-maintenance.md`
  - Monitor Agent責務説明

#### dominants/README.md（1箇所）
- エージェント定義リスト

### 10.2 High Priority（1日目に更新）

#### statusファイル
- `documents/agents/status/monitor.md` → `inspector.md`（ファイル名変更）
- `documents/agents/status/clerk.md`（9箇所のMonitor参照）
- `documents/agents/status/coder.md`（2箇所のMonitor参照）
- `documents/agents/status/README.md`

#### プロトコル（8箇所）
- `p014-monitor-patterns-restriction.md` → `p014-inspector-patterns-restriction.md`
- `p015-incident-creation-protocol.md`（Monitor Agent記載）
- `p016-agent-permission-matrix.md`（Monitor Agent権限定義）
- `p027-hierarchy-memory-maintenance.md`（Monitor Agent責務）
- `p037-agent-recording-system.md`（Monitor記録システム）
- `p011-coder-bug-recording-protocol.md`（技術支援者）
- `p026-document-metadata-standard.md`（提案者）
- `protocols/README.md`（Monitor Agent専用システム説明）

### 10.3 Medium Priority（2-3日目に更新）

#### インシデント記録（約30ファイル）
```
records/incidents/INC-20250615-005-grep-command-violation.md
records/incidents/INC-20250615-006-debug-without-plan.md
records/incidents/INC-20250614-026-h025-repeated-violation-monitor.md
records/incidents/INC-20250614-028-h025-triple-violation-monitor.md
records/incidents/INC-20250615-007-monitor-specifications-misplacement.md
records/incidents/README.md
（その他Monitor関連インシデント）
```

#### レポート（約15ファイル）
```
records/reports/REP-0033-monitor-to-inspector-rename-proposal.md
records/reports/REP-0027-monitor-system-ui-improvements-20250614.md
records/reports/REP-0018-monthly-review-202506.md
records/reports/REP-0020-five-agent-system-migration-plan.md
records/reports/REP-0030-h044-implementation-insights.md
records/reports/REP-0034-five-agent-implementation-plan.md
（その他Monitor言及レポート）
```

### 10.4 Low Priority（段階的更新）

#### アーカイブファイル
- `documents/archives/`配下の全Monitor参照（歴史的記録として低優先度）
- バックアップファイル内の参照

#### その他ドキュメント
- `documents/README.md`
- チェックリスト内のMonitor参照

### 10.5 surveillance/ディレクトリ変更項目

#### 新規追加：surveillance/への移行
- `monitor/` → `surveillance/`ディレクトリ名変更
- 全サブディレクトリの移行
- 関連パス参照の更新

#### 技術的影響（追加で必要）
- package.json：約5箇所のパス更新
- npm scripts：実行パスの修正
- ソースコード：require/importパス
- 設定ファイル：ログ出力先等

### 10.6 更新除外項目

#### 変更不要項目
- 動詞としてのmonitor使用
- 過去の歴史的記録での"monitor"言及

### 10.7 自動処理可能項目

```bash
# Agent名の一括置換
sed -i.bak 's/Monitor Agent/Inspector Agent/g' [対象ファイル]
sed -i.bak 's/monitor\.md/inspector.md/g' [対象ファイル]

# ディレクトリ移動（Git履歴保持）
git mv monitor surveillance
```

### 10.8 手動確認必要項目

- 文脈依存の箇所（動詞monitor vs Agent名）
- ファイル名参照
- 歴史的記録での意味保持
- surveillance/パス参照の完全性確認

### 総計
- **影響ファイル数**: 約85ファイル（surveillance/追加により5ファイル増）
- **Critical更新**: 9ファイル
- **High Priority**: 20ファイル（ディレクトリ変更により5ファイル増）
- **Medium Priority**: 45ファイル
- **Low Priority**: 11ファイル

## 11. 結論

Monitor→Inspector + monitor/→surveillance/のリネームは、システムの一貫性と明確性を向上させる重要な改善である。5エージェント体制とは独立して実施可能であり、3日間の計画的な実施により、リスクを最小化しながら確実に移行できる。

**主要な改善点**:
- Agent名と動詞の混同完全解消
- Inspector Agentとsurveillanceシステムの職業的一貫性
- monitorの動詞専用化

完全な影響範囲の特定により、段階的で確実な移行が可能となった。

---

## 更新履歴

- 2025年6月18日 02:00: 初版作成（Clerk Agent）