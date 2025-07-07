# HO-20250704-003: daemon FUNC-000 完全準拠実装

**作成日**: 2025-07-04  
**担当**: Runner Agent  
**Worktree**: code/worktrees/07-04-daemon-func000-compliance  
**優先度**: 高  

## 📋 作業概要

**daemon の FUNC-000 SQLite Foundation 完全準拠実装**

### 発見された問題
1. **Database実装の不一致**
   - 現在: 旧 `Database` クラス使用
   - 必要: FUNC-000 5テーブル構成（events, event_types, files, measurements, aggregates）

2. **スキーマ構造の乖離**
   - 現在の実装は旧schema
   - FUNC-000準拠の新schema実装が必要

## 🎯 実装計画

### Phase 1: FUNC-000準拠Database実装
- [ ] FUNC-000 5テーブル構成DatabaseAdapter実装
- [ ] events, event_types, files, measurements, aggregates テーブル
- [ ] 外部キー制約・インデックス実装

### Phase 2: daemon統合
- [ ] FileEventHandler の新DatabaseAdapter対応
- [ ] イベント記録ロジックの FUNC-000 準拠化
- [ ] measurements テーブル連携実装

### Phase 3: テスト・検証
- [ ] FUNC-000準拠テスト実装
- [ ] 既存テストの修正
- [ ] 統合テスト実行

## 📁 技術詳細

### **実装ファイル構成**
```
code/worktrees/07-04-daemon-func000-compliance/
└── modules/daemon/
    ├── src/
    │   ├── database/
    │   │   └── DatabaseAdapterFunc000.ts  # 新規実装
    │   └── events/
    │       └── FileEventHandler.ts        # 修正
    └── tests/
        └── database/
            └── func000-compliance.test.ts # 新規
```

### **FUNC-000 準拠仕様**
- **5テーブル構成**: events, event_types, files, measurements, aggregates
- **WALモード**: パフォーマンス最適化
- **外部キー制約**: データ整合性保証
- **ファイルパス**: `.cctop/data/activity.db`

## 🚨 重要事項

### **既存機能への影響**
- daemon の全イベント記録機能
- CLI での DB読み取り機能
- 統計・集計機能

### **互換性考慮**
- 段階的移行戦略
- 既存データの保持・移行
- テスト完全実行

---

**Runner権限**: worktree環境での並列実装、TDD実践、src+test一体開発