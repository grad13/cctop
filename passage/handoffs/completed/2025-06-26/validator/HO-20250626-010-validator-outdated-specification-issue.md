# Validator依頼: 古い仕様書情報による誤指示修正

**依頼ID**: HO-20250626-010  
**作成日**: 2025-06-26  
**依頼元**: Builder Agent  
**優先度**: High  
**種別**: Specification Compliance Issue  

## 問題概要

**Validatorエージェントが古い仕様書情報に基づいて誤った修正指示を出している**

## 🚨 具体的問題

### HO-20250626-008での誤指示
**依頼書記載内容**:
```javascript
/**
 * Scan for lost files (files in DB but no longer exist on disk)
 * FUNC-001 compliant: lost event detection on startup
 */
```

**問題点**:
- **FUNC-001仕様では「lost/refind」イベントは廃止済み**
- 現在の正式仕様は「delete/restore」イベント使用
- FUNC-001:52-55「lost/refindイベントの廃止理由」明記済み

### 引用：FUNC-001の正式仕様
```
### **イベント統合の設計判断**

**lost/refindイベントの廃止理由**：
- 「ファイルが存在しない」という事実を異なる状態で表現する複雑性を排除
- scan時の不在もリアルタイム監視時の削除も、本質的には同じ「不在」
- 統一により実装とユーザー理解の両方がシンプル化
```

## 📋 現在の正式仕様

**FUNC-001で定義された6つのイベントタイプ**:
1. **find** - 初期スキャン時の既存ファイル発見
2. **create** - リアルタイム監視中の新規ファイル作成
3. **modify** - ファイル内容・メタデータの変更
4. **move** - ファイルの移動・リネーム
5. **delete** - ファイル不在の検出（削除・監視外移動・起動時不在）
6. **restore** - delete状態からの復活検出

**lost/refindは廃止されている**

## 🎯 要求する対応

### 1. 古いテストファイルの修正
- `test/integration/chokidar-db/file-lifecycle.test.js`を現在仕様に準拠させる
- lost/refindイベント期待→delete/restoreイベント期待に修正

### 2. 依頼書の修正
- HO-20250626-008の内容をFUNC-001準拠に修正
- 「lost event detection」→「delete event detection on startup」

### 3. 仕様書確認プロセスの改善
- 依頼作成前にactiveFUNC文書の最新確認を必須化
- 古い仕様書情報に基づく指示の防止

## ⚠️ 影響範囲

**現在の実装状況**:
- Builder側で誤ってlost/refindイベントタイプをschema.jsに追加済み
- scanForLostFilesメソッドでlostイベントを記録する実装を追加済み
- **すべて現在仕様違反の状態**

**必要な修正**:
- schema.jsからlost/refindイベントタイプ削除
- scanForLostFilesをscanForDeletedFiles（またはscanForMissingFiles）に変更
- deleteイベントとして記録するよう修正

## 📊 期待成果

1. **FUNC-001完全準拠**のテスト・実装
2. **lost/refind完全排除**
3. **delete/restore正式採用**
4. Validator品質改善（古い仕様書依存の解消）

---
**Builder Comment**: 現在のfunctionsが常に正しい。古い仕様書情報による混乱を避けるため、Validatorは最新FUNC文書確認を徹底してください。