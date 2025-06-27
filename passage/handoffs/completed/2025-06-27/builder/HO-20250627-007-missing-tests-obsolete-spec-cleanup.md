# HO-20250627-007: Missing Module Tests & Obsolete Specification Cleanup

**作成日時**: 2025-06-27 03:30 JST  
**作成者**: Validator Agent  
**宛先**: Builder Agent  
**優先度**: Critical（品質保証基盤の確立）  
**推定工数**: 8-12時間（2段階実装）  

## 🚨 根本問題

**ユーザー指摘**: 「１つはそう、もう１つは古い仕様を参照してるtestをいつまでも更新しないこと」

**発見した2つの根本的漏れ**:
1. **実装済み主要モジュールのテスト完全欠如**（32%のモジュールが野放し）
2. **古い仕様参照テストの放置**（BP-000、r002等の廃止仕様をいまだに参照）

## 📊 問題の深刻度

### **問題1: 主要モジュールテスト完全欠如**
**25個のソースファイル中、8個（32%）がテスト0**

| モジュール | 機能 | テスト状況 | 影響度 |
|------------|------|------------|--------|
| `instant-viewer.js` | FUNC-206核心機能 | ❌ なし | Critical |
| `progressive-loader.js` | プログレッシブローディング | ❌ なし | High |
| `monitor-process.js` | Monitor Process本体 | ❌ なし | Critical |
| `process-manager.js` | PID・プロセス制御 | ❌ なし | Critical |
| `event-display-manager.js` | 表示制御中核 | ❌ なし | High |
| `layout-manager.js` | レイアウト制御 | ❌ なし | Medium |
| `render-controller.js` | 描画制御 | ❌ なし | Medium |
| `event-formatter.js` | イベント表示形式 | ❌ なし | Medium |

### **問題2: 古い仕様参照テスト放置**
**6ファイルが廃止済み仕様を参照**

| ファイル | 古い仕様参照 | 現在の正仕様 |
|----------|--------------|--------------|
| `metadata-integrity.test.js` | "BP-000準拠", "6項目メタデータ" | BP-001, FUNC-000準拠 |
| `config-validation.test.js` | "r002 Phase 1" | FUNC-105/101準拠 |
| `basic-operations.test.js` | "BP-000準拠" | BP-001準拠 |
| `data-integrity.test.js` | "6項目メタデータ" | FUNC-000準拠 |
| `cli-display.test.js` | "BP-000準拠" | BP-001, FUNC-202準拠 |
| `feature-5-event-processor.test.js` | "r002準拠" | FUNC-002準拠 |

## 🎯 修正計画

### **Phase 1: 主要モジュールテスト作成（4-6時間）**

#### 1.1 Critical Priority（即座実装必要）
```javascript
// test/unit/instant-viewer.test.js（新規）
- 起動時間測定（0.1秒以内検証）
- プログレッシブローディング段階確認
- エラーハンドリング検証
- FUNC-206完全準拠

// test/unit/monitor-process.test.js（新規）
- プロセス独立起動・停止
- PIDファイル管理
- ログ出力検証
- 異常終了・復旧テスト

// test/unit/process-manager.test.js（新規）
- PIDファイル形式検証（FUNC-003準拠）
- プロセス間通信
- 起動者記録ルール
- 終了制御ロジック
```

#### 1.2 High Priority（早期実装推奨）
```javascript
// test/unit/progressive-loader.test.js（新規）
- 段階的データロード
- 非ブロッキング処理
- 進捗表示制御
- FUNC-206統合

// test/unit/event-display-manager.test.js（新規）
- 表示制御ロジック
- All/Uniqueモード切り替え
- リアルタイム更新
- FUNC-202準拠
```

#### 1.3 Medium Priority（後期実装）
```javascript
// test/unit/layout-manager.test.js（新規）
// test/unit/render-controller.test.js（新規）
// test/unit/event-formatter.test.js（新規）
- レイアウト制御・描画制御・フォーマット制御の各テスト
```

### **Phase 2: 古い仕様参照テスト修正（4-6時間）**

#### 2.1 仕様参照修正（一括置換）
```bash
# 修正対象キーワード
"BP-000" → "BP-001"
"r002 Phase 1" → "FUNC-XXX準拠"
"6項目メタデータ" → "FUNC-000データベーススキーマ準拠"
"r002準拠" → "FUNC-002準拠"
```

#### 2.2 テスト内容の根本的書き直し
```javascript
// 修正例: metadata-integrity.test.js
// 現在のテスト（間違い）
expect(event.file_size).toBe(file.expectedSize);  // eventsテーブルに存在しないカラム

// FUNC-000準拠の正しいテスト
const measurement = await dbManager.getMeasurement(event.id);
expect(measurement.file_size).toBe(file.expectedSize);  // measurementsテーブルのカラム
expect(measurement.line_count).toBe(file.expectedLines);
```

**重要**: 単なる表記修正ではなく、**テストロジック自体が根本的に間違っている**ため、全面書き直しが必要

#### 2.3 廃止済みテストの削除判定
```javascript
// 削除候補の評価
- 現在の仕様で不要になったテスト
- 重複している古いテスト
- 実装と乖離しているテスト
```

## 💡 実装の考慮点

### 1. 段階的修正（リスク回避）
- Phase 1→Phase 2の順序で実装
- 既存テスト破壊の回避
- 修正前後での実行結果比較

### 2. 仕様準拠の徹底
- 各テストで参照すべきFUNC仕様を明記
- テストコメントでの仕様書リンク
- 期待値の根拠明確化

### 3. テスト品質向上
- RDD原則（実動作駆動）の適用
- 実装と独立したテスト設計
- エッジケース・異常系の充実

## 📊 成功基準

### 定量的指標
- [ ] 主要モジュール8個すべてにテスト作成完了
- [ ] 古い仕様参照6ファイルすべて修正完了
- [ ] テストカバレッジ向上（32%のモジュール野放し解消）
- [ ] 仕様準拠率100%達成

### 定性的指標
- [ ] "テストは通るが実際は動かない"状況の解消
- [ ] BP-001とFUNC仕様の完全同期
- [ ] 品質保証精度の根本的向上

## 🔄 期待効果

### 即座効果
- **品質保証精度**: 32%のテスト空白地帯解消
- **仕様同期**: 古い仕様参照による混乱解消
- **開発効率**: 正確なテストによる迅速な問題検出

### 中長期効果
- **信頼性向上**: 実装とテストの完全同期
- **保守性向上**: 最新仕様準拠による一貫性
- **リリース品質**: 野放しモジュールの品質保証

## 📞 連携・確認事項

- **優先順位**: Phase 1 Critical → High → Phase 2の順序で進行
- **仕様確認**: 不明な点があれば現在のFUNC仕様書で確認
- **削除判定**: 廃止候補テストは保留してValidator確認

---

**注記**: この修正により、「実装したコードに対する基本的なテストが存在しない」「古い仕様参照による混乱」という2つの根本問題が解決し、真の品質保証体制が確立されます。特に32%のモジュールが野放し状態だった問題は、本番リリース前に必ず解決が必要です。