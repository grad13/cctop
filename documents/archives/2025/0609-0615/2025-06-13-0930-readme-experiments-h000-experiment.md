---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/rules/meta/experiments/
- 検索キーワード: H000実験記録, 仮説最適化バランス実験, CLAUDE.mdスリム化実験, H012 H013統廃合, 重複解消実験, バックアップ付き実験, ロールバック手順, 42行削減達成

---

# H000実験記録 - 2025年6月13日

## 概要

H000（仮説最適化バランス）に基づく、CLAUDE.mdのスリム化実験記録です。

## 実験内容

### 実験1: H012とCLAUDE.md重複の統廃合
- H012とCLAUDE.mdのバグ修正原則を統合
- H013として新規作成
- CLAUDE.mdから詳細を削除し、参照形式に

### 実験2: CLAUDE.md事例抽出
- 具体的事例を専用ファイルに移動
- 原則のみCLAUDE.mdに残す
- 42行削減を達成

## ディレクトリ構造

```
h000-experiment-20250613/
├── backup/              # 実験前のバックアップファイル
│   ├── CLAUDE.md.backup-20250613-1540
│   ├── CLAUDE.md.backup-20250613-092953
│   └── h012-technical-debt-prevention-principle.md
├── results/             # 実験結果（評価後に追加予定）
└── README.md           # 本ファイル
```

## バックアップファイル

### CLAUDE.md関連
- `backup/CLAUDE.md.backup-20250613-1540` - 実験1のバックアップ
- `backup/CLAUDE.md.backup-20250613-092953` - 実験2のバックアップ

### H012関連
- `backup/h012-technical-debt-prevention-principle.md` - H013に統合される前の原本

## ロールバック手順

問題が発生した場合は、以下のコマンドで復元可能：

```bash
# CLAUDE.mdを実験前の状態に復元
cp documents/rules/meta/experiments/h000-experiment-20250613/backup/CLAUDE.md.backup-20250613-092953 CLAUDE.md

# 抽出したファイルを削除（任意）
rm documents/hypotheses/h013-violation-examples.md
rm documents/rules/question-resolution-process.md
```

## 評価予定

- 1週間後（2025年6月20日）に効果を評価
- 認知負荷の軽減、参照性の向上を確認