# HO-20250627-006: Test Suite FUNC Specification Compliance Fixes

**作成日時**: 2025-06-27 03:15 JST  
**作成者**: Validator Agent  
**宛先**: Builder Agent  
**優先度**: High（本番品質保証）  
**推定工数**: 6-8時間（3段階実装）  

## 🚨 問題概要

**ユーザー指摘**: 「そもそも、何回か設計書とtestを比較してといったのにその漏れ、です」

**発見**: テストスイートとFUNC仕様書の重大な不一致を検出
- **FUNC-104**: CLI Interface準拠率20%未満（7/8オプション未実装）
- **FUNC-206**: Instant View完全テスト欠如
- **FUNC-003**: PIDファイル仕様不一致
- **全体**: 仕様適合率60%（目標90%）

## 🎯 修正目標

### 全体目標
- **テスト仕様適合率**: 60% → 90%向上
- **CLI準拠率**: 20% → 100%達成
- **品質保証精度**: FUNC仕様完全同期による信頼性向上

### 重点修正項目
1. **FUNC-104**: CLI Interface完全実装
2. **FUNC-206**: Instant View/Progressive Loading検証
3. **FUNC-003**: Background Monitor仕様準拠

## 📋 詳細修正計画

### **Phase 1: FUNC-104 CLI Interface完全実装（1-2日）**

#### 1.1 未実装CLIオプション追加
**要求仕様**: FUNC-104-cli-interface-specification.md準拠

```bash
# 現在未実装（緊急実装必要）
cctop --dir <path>          # 監視ディレクトリ指定
cctop --timeout <seconds>   # 表示更新間隔
cctop --verbose            # 詳細ログ出力
cctop --quiet              # 最小限出力
cctop --check-limits       # inotify制限確認（現在--check-inotify）
cctop --help               # ヘルプ表示
cctop --version            # バージョン表示
```

#### 1.2 ヘルプ形式統一
**要求**: FUNC-104仕様のヘルプテンプレート準拠
- セクション構造: Usage/Options/Examples/Monitor Status
- カラーコード統一: chalk.blueBright等
- 文言統一: 「File change monitoring tool」

#### 1.3 テストケース作成
```javascript
// test/integration/func-104-cli-complete.test.js（新規）
- 全8オプションの動作確認
- エラーメッセージ形式検証
- ヘルプ表示内容チェック
- 引数解析精度テスト
```

### **Phase 2: FUNC-206 Instant View実装・FUNC-003仕様準拠（2-3日）**

#### 2.1 FUNC-206テスト完全作成
**要求**: 即時表示・プログレッシブローディング検証

```javascript
// test/integration/func-206-instant-view.test.js（新規）
- 起動時間測定（0.1秒以内目標）
- プログレッシブローディング段階確認
- エラーハンドリング検証
- FUNC-205統合テスト
```

#### 2.2 FUNC-003 PIDファイル仕様修正
**現状問題**: 
```json
// 現在実装（推定）
{"pid": 12345, "startTime": "2025-06-27T03:00:00Z", "version": "0.2.0"}

// FUNC-003要求仕様
{"pid": 12345, "started_by": "viewer", "started_at": "2025-06-27T03:00:00Z", "config_path": "/path/.cctop/config.json"}
```

**修正内容**:
- `startTime` → `started_at`（フィールド名修正）
- `version`削除、`started_by`/`config_path`追加
- 起動者記録ルール実装（"viewer"/"standalone"判定）

#### 2.3 Background Monitor終了制御テスト
```javascript
// test/func003/monitor-lifecycle.test.js（拡張）
- 起動者別終了制御ロジック
- PIDファイル整合性検証
- Monitor/Viewer協調動作確認
```

### **Phase 3: 品質向上・古いテスト修正（2-3日）**

#### 3.1 Database Schema Tests強化
**FUNC-000準拠**: 
- aggregatesテーブルテスト追加
- 外部キー制約検証強化
- パフォーマンステスト実装

#### 3.2 Config System統合テスト
**FUNC-105/101準拠**:
- Schema Validation実動作確認
- 設定初期化プロセス原子性検証
- CLI引数 > config.json優先順位確認

#### 3.3 古いテスト修正
- 仕様変更で無効になったテスト削除
- メッセージ形式・API変更反映
- コメント・describe文の英語化統一

## 💡 実装の考慮点

### 1. 互換性保持
- 既存テスト実行継続（破壊的変更回避）
- 段階的移行（一括変更リスク回避）

### 2. エラーハンドリング充実
- CLI引数エラー詳細メッセージ
- PIDファイル破損時の復旧処理
- 起動失敗時の適切なフォールバック

### 3. テスト実行効率
- 長時間テスト（起動時間測定）の並列化
- リソース使用量監視・メモリリーク検出

## 📊 成功基準

### 定量的指標
- [ ] FUNC-104: 8/8 CLIオプション実装完了
- [ ] FUNC-206: 起動時間0.1秒以内達成
- [ ] FUNC-003: PIDファイル100%仕様準拠
- [ ] テスト仕様適合率90%達成

### 定性的指標
- [ ] ユーザー体験統一（ヘルプ・エラーメッセージ）
- [ ] 本番品質保証精度向上
- [ ] リリース前検証の自動化完成

## 🔄 次のステップ

1. **Phase 1完了後**: Validator検証・フィードバック
2. **Phase 2完了後**: 統合テスト実行・品質確認
3. **Phase 3完了後**: 最終検証・本番リリース承認

## 📞 連携・確認事項

- **実装方針**: 段階的実装 vs 一括実装の選択
- **優先順位**: Phase 1-3の順序調整必要時は相談
- **テスト戦略**: 既存テスト影響範囲確認

---

**注記**: この修正により、Validatorが指摘したテスト古い問題・設計齟齬が解決し、FUNC仕様書とテストスイートの完全同期が実現します。特にCLI Interface（FUNC-104）の修正は、ユーザー体験向上に直結する重要な改善です。