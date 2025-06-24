# INC-20250615-004: インシデントID命名規則違反

**発生日時**: 2025年6月15日 10:05  
**報告者**: ユーザー  
**対応者**: Inspector Agent  
**重要度**: High  
**状態**: 対応中

## 現象

インシデントファイル作成時に誤った命名形式 `INC-20250615-002-monitor-stats-visualizer-failure.md` を使用。正しい形式は `INC-YYYYMMDD-XXX-title.md` であるべきだった。

## 期待動作との差異

- **期待**: `INC-20250615-002-monitor-stats-visualizer-failure.md`
- **実際**: `INC-20250615-002-monitor-stats-visualizer-failure.md`（日付部分のハイフンが余計）

## 影響範囲

- インシデント管理システムの一貫性を損なう
- 自動化ツールやスクリプトでの処理に支障
- 命名規則への信頼性低下

## 原因分析（5 Whys）

### Why1: なぜ間違った形式で作成したか？
→ 命名規則を正確に確認せずに作成した

### Why2: なぜ命名規則を確認しなかったか？
→ incidents/README.mdの確認を省略した

### Why3: なぜREADME.mdの確認を省略したか？
→ 記憶に頼って「知っている」と判断した

### Why4: なぜ記憶に頼ったか？
→ インシデント対応チェックリストの参照を怠った

### Why5: なぜチェックリストを参照しなかったか？
→ インシデント対応の緊急性を優先し、基本手順を軽視した

### 根本原因
**基本手順の軽視と記憶への過信**

## 対策

### 即時対応
1. 誤った命名のファイルを正しい形式にリネーム
2. incidents/README.mdの更新
3. 関連する参照の修正

### 再発防止策
1. **インシデント作成時の必須確認**
   - incidents/README.mdの命名規則セクション必読
   - 最新の連番確認の徹底
   - 作成前の形式ダブルチェック

2. **チェックリストの厳守**
   - incident-response-checklist.mdの必須参照
   - 記憶に頼らず文書を確認

3. **自動検証の導入検討**
   - 命名規則チェックスクリプトの作成

## 実装状況

- [x] インシデント記録作成
- [ ] ファイル名の修正
- [ ] README.mdの更新
- [ ] 関連参照の修正

## 関連ファイル

- `/Users/takuo-h/Workspace/Code/TimeBox/workspace/documents/rules/meta/incidents/README.md`
- `/Users/takuo-h/Workspace/Code/TimeBox/workspace/documents/rules/meta/checklists/incident-response-checklist.md`

## 教訓

緊急時こそ基本手順の遵守が重要。記憶に頼らず、必ず文書を参照すること。