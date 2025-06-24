---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（プロトコル統合）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/rules/meta/protocols/
- 検索キーワード: プロトコルアーカイブ, 廃止プロトコル, P番号システム, プロセス管理, プロトコル整理, 統合移行, アーカイブ管理, プロセス改善

---

# README.mdディレクトリ整合性チェックプロトコル

**Protocol ID**: P021  
**作成日**: 2025年6月15日 nodata  
**カテゴリ**: 整合性チェック  
**ステータス**: 確立済み  
**背景**: INC-20250615-001（meta/README.md更新漏れ）  

## 📋 概要

各README.mdに記載されたディレクトリ構造が、実際のファイルシステムと一致しているかを確認する特化型プロトコル。

## 🔍 チェック手順

### Step 1: 対象README.mdのリストアップ（5分）
```bash
find documents -name "README.md" -type f | sort
```

### Step 2: 各README.mdの構造記載確認（10分）
各README.mdを開き、以下を確認：
- ディレクトリ構成図の有無
- ファイルリストの有無
- サブディレクトリの説明

### Step 3: 実ディレクトリとの照合（15分）
```bash
# 例: documents/README.mdの場合
ls -la documents/
# README.mdの記載と比較
```

### Step 4: 不整合の検出
- **Type A**: README.mdに記載があるが実在しない
- **Type B**: 実在するがREADME.mdに記載がない
- **Type C**: パスや名前の誤記

## 📊 出力形式

```
=== P021 README.md整合性チェック結果 ===
チェック日時: YYYY-MM-DD HH:MM
対象ファイル数: X件

[Critical Issues]
- documents/README.md: "daily/"が記載されているが実在しない
- documents/rules/meta/README.md: "directions/"が記載されているが廃止済み

[Important Issues]  
- documents/records/README.md: "archive/"が実在するが記載なし

[Summary]
Critical: X件, Important: Y件, Info: Z件
```

## ⏰ 実施基準

- **定期実施**: 不要（P022から呼び出し）
- **実施時間**: 約30分
- **前提条件**: なし

---

**重要**: 本プロトコルは単体でも実施可能だが、通常はP022から呼び出される