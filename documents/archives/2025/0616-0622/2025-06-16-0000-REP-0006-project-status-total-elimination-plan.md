---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（P024実施日）
- アーカイブ週: 2025/0602-0608
- 元パス: documents/records/reports/
- 検索キーワード: LEGACY_STATUS削除計画, ステータスファイル整理, プロジェクト整理, ファイル管理, 削除作業, 完全削除, 整理計画, 中間計画

---

# REP-0006: LEGACY_STATUS.md完全削除計画書

作成日: 2025年6月16日 00:00
作成者: Clerk Agent

## 現状

LEGACY_STATUSという文字列が48ファイルに残存している：
- アクティブ文書: 1ファイル（documents/agents/status/clerk.md）
- アーカイブ: 47ファイル

## 削除方針

Git履歴を除き、LEGACY_STATUSという文字列の一切の存在を許容しない。

## 実施手順

### Phase 1: アクティブ文書の修正（5分）
1. documents/agents/status/clerk.md内のLEGACY_STATUS参照を削除
   - 作業記録をより中立的な表現に置換
   - "LEGACY_STATUS.md" → "旧ステータス管理ファイル"

### Phase 2: アーカイブの処理（10分）
1. documents/archives/内の全LEGACY_STATUS参照を置換
   - "LEGACY_STATUS" → "LEGACY_STATUS"
   - ファイル名の変更は不要（内容のみ）

### Phase 3: 最終確認（5分）
1. LEGACY_STATUS文字列の残存確認
2. 0件であることを確認
3. Git履歴のみに存在することを確認

## 予想時間

約20分

## リスクと対策

**リスク**: アーカイブファイルの破損
**対策**: 慎重な置換処理

## 成功基準

```bash
find . -type f -not -path "./.git/*" | xargs grep -l "LEGACY_STATUS" | wc -l
# 結果: 0
```