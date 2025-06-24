# ディレクトリ構造違反インシデント

**発生日時**: 2025年6月14日 08:16
**報告者**: ユーザー
**対応者**: Claude Code
**インシデントID**: INC-20250614-006

## 概要
`documents/rules/meta/rules/`という存在しないディレクトリにファイルを作成した。

## 詳細

### 発生状況
- LEGACY_STATUS.md運用ルールを作成する際、誤って`meta/rules/`ディレクトリを作成
- 正しくは`documents/rules/`に配置すべきだった

### ユーザー指摘
「おそらくインシデントです。meta/rulesって何ですか？」

### 違反内容
- GUIDELINES.mdのディレクトリ構造に従っていない
- 存在しないディレクトリ階層を作成

## 原因分析

### 直接原因
- rules/がdocuments直下にあることを確認せず、meta/の下に作成

### 根本原因
1. **GUIDELINES.md確認不足**: ファイル作成前にディレクトリ構造を確認しなかった
2. **H004プロセス違反**: Documents編集前の必須確認事項を実行しなかった
3. **思い込み**: meta関連だからmeta/の下という誤った判断

## 対応

### 即時対応
1. ファイルを正しい場所（documents/rules/）に移動
2. 誤って作成したディレクトリを削除

### 再発防止策
1. **H004遵守の再徹底**: Documents編集時は必ずGUIDELINES.mdを確認
2. **ディレクトリ構造の記憶**: 
   - rules/ → documents直下（開発ルール）
   - meta/ → hypotheses/directions/incidents/statistics のみ
   - **注記**: 記録時点では上記が正しい構造。現在（2025年6月17日）はmeta/下にhypotheses/、protocols/、checklists/、reports/等が配置され、一部はarchive/に移動されている

## 教訓
meta/という名前に惑わされず、常にGUIDELINES.mdで正しい配置を確認すること。