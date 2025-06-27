# BP-001準拠テスト戦略

**作成日**: 2025-06-27  
**準拠**: BP-001 Phase 3テスト実装 + Phase 5 RDD原則  
**目標**: 90%空白画面バグのような実ユーザー体験破綻の完全防止

## 🎯 BP-001テスト開発必須原則

### 原則1: 機能追加時のテスト義務
> **1つ機能を追加したら、都度それに関するtestを書くこと**

### 原則2: 使い捨て禁止
> **使い捨てのtestコード作成は、これを一切の例外なく認めない**

## 🏗️ 3層テスト体系（BP-001準拠）

### Layer 1: Unit Tests（機能単位）
**目的**: 個別クラス・関数の動作保証  
**基準**: 各FUNC仕様の技術要件準拠

```
test/unit/
├── database/
│   ├── database-manager.test.js      # FUNC-000準拠
│   └── event-manager.test.js
├── monitors/
│   ├── file-monitor.test.js          # FUNC-002準拠  
│   ├── event-processor.test.js
│   └── process-manager.test.js       # FUNC-003準拠
├── ui/
│   ├── buffered-renderer.test.js     # FUNC-201準拠
│   ├── event-display-manager.test.js # FUNC-202準拠
│   └── layout-manager.test.js        # FUNC-204準拠
└── utils/
    ├── display-width.test.js         # FUNC-200準拠
    └── line-counter.test.js
```

### Layer 2: Integration Tests（機能間連携）
**目的**: 機能間データフローの正確性保証  
**基準**: chokidar → DB → 表示の完全動作

```
test/integration/
├── chokidar-database/
│   ├── basic-operations.test.js      # BP-001 Phase 3.2
│   ├── metadata-integrity.test.js    # 6項目メタデータ完全性
│   └── data-integrity.test.js        # データ整合性
├── database-display/
│   ├── event-rendering.test.js       # DB → 画面表示統合
│   └── filter-display.test.js        # フィルタ → 表示統合
└── monitor-viewer/
    ├── background-monitoring.test.js # FUNC-003 2プロセス分離
    └── pid-lifecycle.test.js         # PIDファイル管理
```

### Layer 3: End-to-End Tests（実ユーザー体験）
**目的**: 実際の使用者視点での品質保証  
**基準**: RDD原則「実ユーザー視点」完全準拠

```
test/e2e/
├── visual-display-verification.test.js  # ← 今回作成済み
├── startup-experience.test.js           # FUNC-206 0.1秒起動
├── real-project-simulation.test.js      # 実プロジェクト環境テスト
└── performance-requirements.test.js     # BP-001パフォーマンス目標
```

## 🚨 実ユーザー視点検証項目（90%空白バグ防止）

### 視覚的品質検証
- [ ] **画面内容密度**: 空白率<50%（現在90%空白を防止）
- [ ] **イベント表示数**: 複数イベント表示（1件のみ表示バグ防止）
- [ ] **レイアウト正確性**: ヘッダー・フッター・コンテンツ領域の適切配置
- [ ] **リアルタイム更新**: ファイル変更が画面に即座反映

### 機能完全性検証
- [ ] **起動体験**: `npm start`で3秒以内起動（BP-001成功基準）
- [ ] **データ精度**: chokidarイベント数 === DB記録数 === 画面表示数
- [ ] **操作応答**: キーボードショートカット即座反応
- [ ] **終了制御**: Ctrl+C正常終了

## 📊 RDD原則実装（Phase 5準拠）

### 日次動作確認プロセス
1. **朝: 前日変更の実動作確認**
   ```bash
   npm start
   # 3秒以内起動確認
   # 画面表示正常確認
   # Ctrl+C終了確認
   ```

2. **開発中: 新機能の段階的統合**
   - 機能追加 → Unit Test → Integration Test → 実動作確認
   - 動作中システムへの統合確認

3. **夕: 1日の変更統合確認**
   ```bash
   npm test -- test/e2e/
   # End-to-Endテスト全合格確認
   ```

### 実環境テスト（統合・検証）
```bash
# 実際のプロジェクトディレクトリテスト
cd /real/project/directory
npx cctop

# 長時間運用テスト（最低1時間）
npm run long-term-test

# パフォーマンス監視
npm run performance-monitor
```

## ✅ BP-001成功基準完全準拠

### 必須達成項目チェックリスト
- [ ] `npm start`で即座に起動
- [ ] chokidar → DB → 表示の完全な動作
- [ ] 全テストスイートの合格（3層すべて）
- [ ] 6項目メタデータの正確な記録
- [ ] All/Uniqueモード切り替え動作
- [ ] East Asian Width対応の正確な表示
- [ ] イベントタイプフィルタリング動作
- [ ] ターミナルリサイズ時のレスポンシブ表示

### パフォーマンス目標
- [ ] 起動時間: < 3秒
- [ ] メモリ使用量: < 200MB  
- [ ] CPU使用率: < 5%（アイドル時）
- [ ] 1000ファイル監視可能

## 🔧 テスト実装ガイドライン

### FUNC仕様書参照必須
迷った時は必ず以下を参照：
- **FUNC-000**: SQLite基盤 → database-manager.test.js
- **FUNC-002**: chokidar統合 → chokidar-database統合テスト
- **FUNC-003**: バックグラウンド監視 → monitor-viewer統合テスト
- **FUNC-104**: CLI仕様 → CLI動作End-to-Endテスト
- **FUNC-202**: 表示統合 → visual-display-verification.test.js
- **FUNC-206**: 即時表示 → startup-experience.test.js

### テスト品質基準
1. **実装と独立**: 仕様書のみ参照、src/コード依存禁止
2. **エッジケース網羅**: 境界値・異常系・高負荷対応
3. **実環境近似**: 実際の使用条件に近いテスト環境
4. **保守性確保**: コメント・構造化・再利用性

これにより、90%空白画面のような**実ユーザー体験破綻**を確実に防止します。