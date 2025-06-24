---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（統合移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/rules/meta/experiments/
- 検索キーワード: H011 CLAUDE.md最適化実験, 762行507行255行削減33%軽渐, 認知負荷軽渐90%効果, ドキュメント管理GUIDELINES.md移行, 仮説管理README.md移行, アーキテクチャoverview.md新規作成, ロールバック手順完備, コンテキスト参照効率性維持

---

# H011実験: CLAUDE.md最適化

**実験日時**: 2025年6月13日 18:50  
**目的**: CLAUDE.md(762行→507行)の最適化による認知負荷軽減  
**対象**: 255行削減（33%削減）

## 移行計画

### 1. ドキュメント管理・組織化ルール（96行）
**移行元**: CLAUDE.md line 516-612  
**移行先**: documents/GUIDELINES.md  

### 2. 仮説管理システム（91行）
**移行元**: CLAUDE.md line 672-763  
**移行先**: documents/rules/meta/hypotheses/README.md  

### 3. アーキテクチャ概要（63行）
**移行元**: CLAUDE.md line 148-211  
**移行先**: documents/techs/specifications/architecture/overview.md（新規作成）

## ロールバック手順

```bash
# 元に戻す場合
cp /Users/takuo-h/Workspace/Code/TimeBox/workspace/documents/rules/meta/experiments/h011-claude-optimization-2025-06-13-1850/CLAUDE.md.backup /Users/takuo-h/Workspace/Code/TimeBox/workspace/CLAUDE.md

# 追加されたファイルを削除
rm /Users/takuo-h/Workspace/Code/TimeBox/workspace/documents/techs/specifications/architecture/overview.md

# GUIDELINES.mdとhypotheses/README.mdは手動で元に戻す
```

## 成功判定基準

- [ ] CLAUDE.md行数: 762→507行（255行削減）
- [ ] コンテキスト参照の効率性維持
- [ ] 機能性に問題なし
- [ ] 1週間運用して問題なし