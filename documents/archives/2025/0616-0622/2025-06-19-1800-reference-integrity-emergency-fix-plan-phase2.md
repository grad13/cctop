---
**アーカイブ情報**
- アーカイブ日: 2025-06-19
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: 参照整合性修正計画, REP-0080緊急監査対応, 古いファイル名参照, hypothesesディレクトリ参照問題, chk003-hypothesis-creation参照, 存在しないディレクトリ参照, incidents-reports修正優先度, archive歴史的記録保持, 緊急修正24時間以内, 中優先度1週間以内, hypothesis参照置き換え, プロトコル参照変換, 文書整合性確保, 100箇所以上参照発見, 修正戦略分類, Phase2対応計画

---

# REP-0081: 参照整合性修正計画 - Phase 2対応

**作成日時**: 2025年6月19日 18:00  
**作成者**: Clerk Agent  
**種別**: 緊急修正計画  
**優先度**: 高（文書整合性確保）  
**関連**: REP-0080緊急監査報告書

## 1. 発見した参照整合性問題

### 1.1 古いファイル名への参照
**chk003-hypothesis-creation.md** への参照：
- `INC-20250614-009-hypotheses-management-failure.md`
- `REP-0080` 内の記録（報告書内なので保持）

### 1.2 存在しないhypothesesディレクトリへの参照
**大量の参照発見**（合計100箇所以上）：

#### A. 現在のincidents/reports（修正必要）
- `INC-20250614-001-quick-switch-12hour-debug-failure.md`
- `INC-20250615-006-debug-without-plan.md`
- `INC-20250615-003-stats-visualizer-repeated-failure.md`
- `INC-20250613-001-h004-wrong-path-hypothesis.md`
- `REP-0051-p022-comprehensive-consistency-check-20250617.md`
- `REP-0040-p022-phase2-readme-check-20250617.md`

#### B. アーカイブ済み文書（修正不要）
- `documents/archives/` 配下の文書は歴史的記録として保持

## 2. 修正優先度分類

### 🔥 緊急修正（24時間以内）
**現在のrecords/incidents/内の参照**
- 実際に参照される可能性がある
- プロジェクト運用に影響する

### 🔶 中優先度修正（1週間以内）
**現在のrecords/reports/内の参照**
- 参照頻度は低いが整合性のため修正必要

### 🔵 低優先度（修正不要）
**archive/配下の文書**
- 歴史的記録として保持
- 当時の状況を正確に反映

## 3. 修正戦略

### 3.1 hypothesis参照の置き換え方針

#### 置き換えパターン1: プロトコル参照
```
documents/rules/meta/hypotheses/h013-unified-technical-debt-prevention.md
↓
documents/rules/meta/protocols/p028-technical-debt-prevention.md
```

#### 置き換えパターン2: archive参照
```
documents/rules/meta/hypotheses/h020-comprehensive-logging-first.md
↓
documents/archives/2025/0616-0622/h020-comprehensive-logging-first.md
```

#### 置き換えパターン3: 削除
存在しない文書への参照で、代替が不明確な場合は参照削除

### 3.2 具体的修正対象

#### A. INC-20250614-001（高優先度）
- H013 → P028
- H020 → archive/2025/0616-0622/h020-comprehensive-logging-first.md
- H017 → P030（統合済み）

#### B. INC-20250614-009（高優先度）
- chk003-hypothesis-creation.md → chk003-problem-analysis-improvement.md

#### C. その他incident/report（中優先度）
- 個別に内容確認して適切な修正方針決定

## 4. 実行計画

### Phase 1: 緊急修正（今日中）
1. **INC-20250614-009修正**
   - chk003ファイル名参照の修正

2. **INC-20250614-001修正**
   - hypothesis参照をプロトコル/archive参照に変更

### Phase 2: 中優先度修正（明日）
3. **その他incident修正**
   - INC-20250615-006, INC-20250615-003等

4. **reports修正**
   - REP-0051, REP-0040等

### Phase 3: 長期対応（1週間以内）
5. **参照整合性チェック体制構築**
   - 定期的な参照確認スクリプト作成
   - 新規文書作成時の参照確認プロセス

## 5. 予防策

### 5.1 即時実施
- **ファイル参照時の存在確認必須化**
- **移動・統合時の参照更新チェックリスト作成**

### 5.2 システム化
- **自動参照整合性チェック**
- **文書間リンク管理システム**

## 6. 完了基準

### Phase 1完了基準
- [ ] INC-20250614-009の参照修正完了
- [ ] INC-20250614-001の参照修正完了
- [ ] 修正内容の動作確認

### Phase 2完了基準
- [ ] 全incidents/reportsの参照修正完了
- [ ] 修正箇所の記録・追跡完了

### 最終完了基準
- [ ] 現在の文書（非archive）からの不正参照0件
- [ ] 参照整合性チェック体制確立
- [ ] 修正履歴の完全記録

---

**次のアクション**: Phase 1緊急修正の即座実行  
**担当**: Clerk Agent  
**完了予定**: 2025年6月19日 20:00