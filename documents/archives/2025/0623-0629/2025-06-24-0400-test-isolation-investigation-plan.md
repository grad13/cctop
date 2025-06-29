---
Archive-Date: 2025-06-29
Archive-Week: 2025-0623-0629
Original-Path: documents/records/plans/PLAN-20250624-004-test-isolation-investigation.md
Keywords: test-isolation, test-failures, integration-testing, side-effects, resource-conflicts, test-dependencies, validator-agent, debugging-strategy, pair-testing, root-cause-analysis, ci-cd-reliability, test-matrix
---

# PLAN-20250624-004: テスト分離問題調査計画書

**作成日**: 2025-06-24  
**作成者**: Validator Agent  
**種別**: 調査計画  
**優先度**: 高

## 1. 問題の概要

### 現象
- **個別実行**: 全9テストファイルが成功
- **全体実行（直列）**: 一部のテストが失敗
- **実行時間**: 約105秒（タイムアウト内）

### 症状
- テスト間の副作用により、実行順序に依存した失敗が発生
- 直列実行（--runInBand）でも問題が解消されない

### 影響
- CI/CDパイプラインの信頼性低下
- 並列実行による高速化が不可能
- テスト結果の非決定性

## 2. 調査方針

### 基本原則
1. **最小再現ケースの特定**: 失敗を引き起こす最小のテスト組み合わせを発見
2. **系統的探索**: 二分探索的アプローチで効率的に原因を絞り込む
3. **根本原因の解明**: 副作用の発生源を特定し、適切な隔離を実装

### 仮説
- リソース競合（ファイル、DB、ポート）
- グローバル状態の汚染
- 不完全なクリーンアップ
- メモリリーク

## 3. 実行計画

### Phase 1: ベースライン確立（15分）
1. 全テストの個別実行時間と成功状態を記録
2. 現在の実行順序での失敗パターンを確認
3. 失敗するテストの具体的なエラーメッセージを収集

### Phase 2: ペア組み合わせテスト（30分）
失敗が報告されているテストを中心に、2つずつの組み合わせを実行：

```
優先調査対象：
- feature-2-database.test.js
- feature-5-event-processor.test.js
- rdd-verification.test.js
```

実行マトリックス：
| 先行テスト | 後続テスト | 結果 |
|-----------|-----------|------|
| feature-2 | feature-5 | ? |
| feature-5 | feature-2 | ? |
| feature-1 | feature-2 | ? |
| feature-4 | feature-5 | ? |
| ... | ... | ... |

### Phase 3: 問題ペアの深堀り（20分）
失敗するペアが見つかった場合：
1. 共有リソースの特定
2. beforeEach/afterEachの確認
3. グローバル変数の使用確認
4. プロセス・ファイルハンドルの確認

### Phase 4: 三つ組以上の調査（必要に応じて）
ペアで問題が見つからない場合、3つ以上の組み合わせを調査

### Phase 5: 修正案の作成（15分）
1. 具体的な修正方法の提案
2. 実装優先順位の決定
3. 修正後の検証計画

## 4. 調査ツール

### コマンド例
```bash
# ペアテスト実行
npm test test/integration/test1.js test/integration/test2.js

# 実行順序を逆にして確認
npm test test/integration/test2.js test/integration/test1.js

# デバッグ情報付き実行
DEBUG=* npm test test/integration/test1.js test/integration/test2.js

# リソース使用状況の監視
lsof -p <PID>  # 開いているファイル
ps aux | grep node  # プロセス状態
```

### チェックリスト
- [ ] データベースファイルの競合
- [ ] テンポラリディレクトリの衝突
- [ ] ポート番号の重複
- [ ] 環境変数の汚染
- [ ] グローバルモックの残存
- [ ] setTimeoutの未クリア
- [ ] EventEmitterのリスナーリーク

## 5. 期待される成果

### 成果物
1. **問題マトリックス**: どの組み合わせで失敗するかの完全な表
2. **根本原因レポート**: 各失敗の具体的な原因
3. **修正PR**: テスト独立性を確保する修正

### 成功基準
- 全テストが任意の順序で実行可能
- 並列実行（--runInBandなし）でも成功
- CI/CDでの安定した動作

## 6. リスクと対策

### リスク
- 調査に時間がかかりすぎる可能性
- 修正により新たな問題が発生する可能性

### 対策
- タイムボックスを設定（合計1.5時間）
- 修正は段階的に実装
- 各修正後に回帰テストを実施

## 7. スケジュール

| 時間 | 作業内容 |
|------|----------|
| 0-15分 | Phase 1: ベースライン確立 |
| 15-45分 | Phase 2: ペア組み合わせテスト |
| 45-65分 | Phase 3: 問題ペアの深堀り |
| 65-80分 | Phase 4: 必要に応じて追加調査 |
| 80-90分 | Phase 5: 修正案作成 |

---

**次のステップ**: Phase 1の実行開始