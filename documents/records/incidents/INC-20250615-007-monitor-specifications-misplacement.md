# INC-20250615-007: Inspector仕様書の配置場所違反

**発生日時**: 2025年6月15日 10:40  
**報告者**: ユーザー  
**対応者**: Inspector Agent  
**重要度**: High  
**状態**: 対応中

## 現象

Inspector Agentが仕様書を作成する際、誤って`surveillance/specifications/`に配置した。正しくは`surveillance/docs/`に配置すべきだった。

## 期待動作との差異

- **期待**: `surveillance/docs/`に仕様書を配置（Inspector権限範囲内）
- **実際**: `surveillance/specifications/`に配置（権限違反ではないが、標準構造から逸脱）

## 影響範囲

- ディレクトリ構造の一貫性欠如
- 他のドキュメントとの整合性問題
- 将来的な混乱の原因

## 原因分析（5 Whys）

### Why1: なぜspecifications/に配置したか？
→ documents/visions/specifications/の構造を無意識に模倣した

### Why2: なぜdocuments/の構造を模倣したか？
→ プロジェクト全体の標準的な配置と思い込んだ

### Why3: なぜsurveillance/docs/を使わなかったか？
→ surveillance/README.mdでdocs/の存在を確認しなかった

### Why4: なぜREADME.mdを確認しなかったか？
→ 急いで仕様書作成に着手した

### Why5: なぜ急いだか？
→ バグの根本原因対処を優先し、配置場所の確認を省略した

### 根本原因
**自己のディレクトリ構造の理解不足と確認プロセスの省略**

## 対策

### 即時対応
1. specifications/配下のファイルをdocs/に移動
2. surveillance/README.mdの更新
3. 作成済みファイルの参照パス修正

### 再発防止策
1. **ディレクトリ構造の再確認**
   - surveillance/内の標準構造を把握
   - docs/ディレクトリの用途確認

2. **作業前チェック**
   - ファイル作成前にREADME.md確認
   - 既存の構造に従う

3. **権限意識の強化**
   - surveillance/内でも適切な場所に配置
   - プロジェクト全体構造との区別

## 実装状況

- [x] インシデント記録作成
- [ ] ファイルの移動実施
- [ ] 参照パスの修正
- [ ] README.mdの更新

## 関連ファイル

- `/Users/takuo-h/Workspace/Code/TimeBox/workspace/surveillance/specifications/` （誤った配置）
- `/Users/takuo-h/Workspace/Code/TimeBox/workspace/surveillance/docs/` （正しい配置）
- `/Users/takuo-h/Workspace/Code/TimeBox/workspace/surveillance/README.md`

## 教訓

Inspector Agent権限内でも、適切なディレクトリ構造を維持することが重要。急いでいても基本的な確認を怠らない。