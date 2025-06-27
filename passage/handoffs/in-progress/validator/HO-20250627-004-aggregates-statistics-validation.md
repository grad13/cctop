# HO-20250627-004: Aggregates Statistics Validation

**作成日**: 2025年6月27日  
**依頼者**: Architect Agent  
**対象**: Validator Agent  
**優先度**: High  
**関連仕様**: FUNC-000, PIL-008, HO-20250627-003  
**前提**: Builder実装完了後

## 📋 検証依頼内容

### 拡張aggregatesテーブルの統計精度検証
HO-20250627-003でBuilderが実装した拡張aggregatesテーブル（First/Max/Last統計）の精度・整合性・パフォーマンスを検証してください。

## 🎯 検証要件

### 1. 統計精度検証

#### First/Max/Last値の正確性検証
```javascript
// 検証対象統計
const statsToValidate = [
  'first_size', 'max_size', 'last_size',
  'first_lines', 'max_lines', 'last_lines', 
  'first_blocks', 'max_blocks', 'last_blocks',
  'first_event_timestamp', 'last_event_timestamp'
];

// 手動計算との比較検証
for (const fileId of testFileIds) {
  const aggregateStats = await getAggregateStats(fileId);
  const manualStats = await calculateManualStats(fileId);
  
  for (const stat of statsToValidate) {
    assert.equal(aggregateStats[stat], manualStats[stat], 
      `${stat} mismatch for file ${fileId}`);
  }
}
```

#### 累積統計の整合性検証
```javascript
// total_* vs individual counts
assert.equal(
  stats.total_events,
  stats.total_creates + stats.total_modifies + stats.total_deletes + 
  stats.total_moves + stats.total_restores
);

// 平均値計算の検証
const expectedAvgSize = stats.total_size / stats.total_events;
const actualAvgSize = calculateAverageSize(fileId);
assert.equal(expectedAvgSize, actualAvgSize);
```

### 2. リアルタイム更新検証

#### トリガー動作の正確性
```javascript
describe('Real-time trigger updates', () => {
  it('should update statistics on file modification', async () => {
    const fileId = createTestFile();
    const initialStats = await getAggregateStats(fileId);
    
    // ファイル変更実行
    await modifyFile(fileId, { size: 1000, lines: 50, blocks: 20 });
    
    const updatedStats = await getAggregateStats(fileId);
    
    // 更新確認
    expect(updatedStats.total_modifies).toBe(initialStats.total_modifies + 1);
    expect(updatedStats.last_size).toBe(1000);
    expect(updatedStats.max_size).toBe(Math.max(initialStats.max_size, 1000));
    expect(updatedStats.last_event_timestamp).toBeGreaterThan(initialStats.last_event_timestamp);
  });
});
```

#### 複数操作の統計整合性
```javascript
describe('Multiple operations consistency', () => {
  it('should maintain consistency across multiple file operations', async () => {
    const fileId = createTestFile();
    
    // 連続操作実行
    await createFile(fileId, { size: 100, lines: 10, blocks: 5 });
    await modifyFile(fileId, { size: 200, lines: 20, blocks: 10 });
    await modifyFile(fileId, { size: 150, lines: 15, blocks: 8 });
    await deleteFile(fileId);
    await restoreFile(fileId, { size: 300, lines: 30, blocks: 15 });
    
    const stats = await getAggregateStats(fileId);
    
    // 統計確認
    expect(stats.total_creates).toBe(1);
    expect(stats.total_modifies).toBe(2);
    expect(stats.total_deletes).toBe(1);
    expect(stats.total_restores).toBe(1);
    expect(stats.total_events).toBe(5);
    
    // メトリック確認
    expect(stats.first_size).toBe(100);
    expect(stats.max_size).toBe(300);
    expect(stats.last_size).toBe(300);
  });
});
```

### 3. パフォーマンス検証

#### 大量データでの性能テスト
```javascript
describe('Performance with large datasets', () => {
  it('should maintain performance with 1000+ events per file', async () => {
    const fileId = createTestFile();
    const startTime = Date.now();
    
    // 大量イベント生成
    for (let i = 0; i < 1000; i++) {
      await modifyFile(fileId, { 
        size: Math.random() * 10000,
        lines: Math.random() * 1000,
        blocks: Math.random() * 100
      });
    }
    
    const insertTime = Date.now() - startTime;
    
    // 統計取得性能測定
    const queryStartTime = Date.now();
    const stats = await getAggregateStats(fileId);
    const queryTime = Date.now() - queryStartTime;
    
    // 性能基準確認
    expect(insertTime).toBeLessThan(10000); // 10秒以内
    expect(queryTime).toBeLessThan(100);    // 100ms以内
    expect(stats.total_events).toBe(1001);  // 精度確認
  });
});
```

#### トリガーオーバーヘッド測定
```javascript
describe('Trigger overhead measurement', () => {
  it('should measure trigger execution overhead', async () => {
    // トリガー無効状態での挿入時間測定
    await disableTriggers();
    const withoutTriggersTime = await measureInsertTime(100);
    
    // トリガー有効状態での挿入時間測定
    await enableTriggers();
    const withTriggersTime = await measureInsertTime(100);
    
    const overhead = withTriggersTime - withoutTriggersTime;
    
    // オーバーヘッド基準確認（50%以内）
    expect(overhead / withoutTriggersTime).toBeLessThan(0.5);
  });
});
```

### 4. エラーハンドリング検証

#### 異常データでの動作確認
```javascript
describe('Error handling validation', () => {
  it('should handle NULL measurements gracefully', async () => {
    const fileId = createTestFile();
    
    // NULL値を含むmeasurement挿入
    await insertMeasurement(fileId, { 
      file_size: null, 
      line_count: 100, 
      block_count: null 
    });
    
    const stats = await getAggregateStats(fileId);
    
    // NULL値の適切な処理確認
    expect(stats.first_size).toBeNull();
    expect(stats.first_lines).toBe(100);
    expect(stats.first_blocks).toBeNull();
  });
  
  it('should handle negative values appropriately', async () => {
    const fileId = createTestFile();
    
    // 負の値での測定
    await insertMeasurement(fileId, { 
      file_size: -100, 
      line_count: -10, 
      block_count: -5 
    });
    
    const stats = await getAggregateStats(fileId);
    
    // 負の値の処理確認（仕様に応じて）
    // 例: 負の値は0として処理、またはエラーとして処理
  });
});
```

## 📊 検証項目チェックリスト

### 統計精度
- [ ] First値の正確性（初回イベント値との一致）
- [ ] Max値の正確性（全イベント中の最大値との一致）
- [ ] Last値の正確性（最新イベント値との一致）
- [ ] 累積統計の整合性（total_* の整合性）
- [ ] 平均値計算の正確性

### リアルタイム更新
- [ ] events INSERT時のトリガー動作
- [ ] measurements INSERT時のトリガー動作
- [ ] 複数操作での統計一貫性
- [ ] トランザクション内での原子性

### パフォーマンス
- [ ] 大量データでの統計更新性能
- [ ] 統計取得クエリの応答性能  
- [ ] トリガーオーバーヘッドの測定
- [ ] メモリ使用量の確認

### エラーハンドリング
- [ ] NULL値の適切な処理
- [ ] 異常値（負の値等）の処理
- [ ] トリガーエラー時のロールバック
- [ ] データ不整合の検出

## 🔧 検証ツール

### 自動検証スクリプト
```bash
# 統計精度検証
npm run test:aggregates-accuracy

# パフォーマンス検証  
npm run test:aggregates-performance

# 整合性検証
npm run test:aggregates-consistency

# 総合検証
npm run test:aggregates-comprehensive
```

### 手動検証手順
1. **テストデータ生成**: 多様なファイル操作パターンの生成
2. **統計比較**: aggregatesテーブル vs 手動計算の比較
3. **性能測定**: 大量データでの応答時間測定
4. **異常ケーステスト**: エラー条件での動作確認

## 📅 完了基準

- [ ] 全自動テストの合格
- [ ] 統計精度100%の確認  
- [ ] 性能基準クリア（挿入<10s、取得<100ms）
- [ ] エラーハンドリングの適切性確認
- [ ] PIL-008での表示確認（実装後）

**検証完了予定**: Builder実装完了後1日以内  
**品質証明書発行**: 検証完了後、品質保証レポート作成