# Builder依頼: Validator仕様違反修正への対応

**依頼ID**: HO-20250626-011  
**作成日**: 2025-06-26  
**依頼元**: Validator Agent  
**優先度**: Critical  
**種別**: Specification Compliance Correction  

## 深刻な問題の認識と謝罪

**私（Validator）の重大な誤り**により、古い仕様書情報に基づいて誤った修正指示を出してしまいました。
FUNC-001で**lost/refindイベントは廃止済み**であるにも関わらず、これらのイベントタイプの実装を要求してしまいました。

## 🚨 修正が必要な誤指示内容

### 1. HO-20250626-008（誤指示）
```javascript
// ❌ 誤った依頼内容
/**
 * Scan for lost files (files in DB but no longer exist on disk)
 * FUNC-001 compliant: lost event detection on startup
 */
async scanForLostFiles() {
  // lostイベントとして記録
  event_type: 'lost'
}
```

### 2. HO-20250626-010（誤指示）
- `lost`イベントタイプの登録問題として報告
- 実際にはlost/refindイベント自体が仕様違反

## ✅ FUNC-001準拠の正しい仕様

**廃止**: lost/refindイベント  
**採用**: delete/restoreイベント

```javascript
// ✅ 正しい実装（FUNC-001準拠）
/**
 * Scan for missing files (files in DB but no longer exist on disk)
 * FUNC-001 compliant: delete event detection on startup
 */
async scanForMissingFiles() {
  // deleteイベントとして記録（起動時不在検出）
  event_type: 'delete'
}
```

## 🔧 必要な修正作業

### 1. schema.js修正
```javascript
// ❌ 削除対象
{ code: 'lost', name: 'Lost', description: 'File detected as missing on startup' },
{ code: 'refind', name: 'Refind', description: 'Previously lost file rediscovered' }

// ✅ 正式なイベントタイプのみ（FUNC-001準拠）
const initialData = {
  event_types: [
    { code: 'find', name: 'Find', description: 'File discovered during initial scan' },
    { code: 'create', name: 'Create', description: 'New file created' },
    { code: 'modify', name: 'Modify', description: 'File content modified' },
    { code: 'delete', name: 'Delete', description: 'File deletion or missing detection' },
    { code: 'move', name: 'Move', description: 'File moved/renamed' },
    { code: 'restore', name: 'Restore', description: 'File restored after deletion' }
  ]
};
```

### 2. EventProcessor修正
```javascript
// ✅ 正しいメソッド名と実装
async scanForMissingFiles() {
  // 起動時に存在しないファイルをdeleteイベントとして記録
  event_type: 'delete'
}

// ✅ 後方互換性のための別名（必要に応じて）
async scanForLostFiles() {
  return await this.scanForMissingFiles();
}
```

### 3. テストファイル修正
- `test/integration/chokidar-db/file-lifecycle.test.js`
- lost/refindイベント期待 → delete/restoreイベント期待に修正

## ⚠️ 現在の影響範囲

Builderが既に実装してしまった内容：
- ❌ schema.jsにlost/refindイベントタイプ追加
- ❌ scanForLostFilesでlostイベント記録
- ❌ 仕様違反状態の実装

## 🎯 期待する修正結果

1. **FUNC-001完全準拠**: delete/restoreのみ使用
2. **lost/refind完全排除**: schema.js、EventProcessor
3. **テスト修正**: 正しい仕様に基づくテスト
4. **動作確認**: delete/restoreイベントの正常動作

## 🙏 Validatorからの改善約束

1. **最新FUNC文書確認の徹底**: 依頼作成前の必須確認
2. **古い仕様書依存の根絶**: activeなFUNC文書のみ参照
3. **品質向上**: このような仕様違反指示の再発防止

---

**Builder様への深いお詫び**: 誤った指示により貴重な時間を無駄にしてしまい、深くお詫び申し上げます。今後はFUNC-001等の最新仕様書を必ず確認してから依頼を作成いたします。