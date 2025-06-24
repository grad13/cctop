# システム統合計画

**作成日**: 2025年6月22日 20:25  
**対象範囲**: cctop v3アーキテクチャ全体  
**ステータス**: Phase 1統合完了・Phase 2-6統合計画策定

## 概要

cctop（Claude Code リアルタイムファイル監視システム）における各コンポーネント間の技術的統合を管理する計画書。RDD（実動作駆動開発）方式で段階的にシステムを統合し、高性能で安定したファイル監視システムを実現する。

## 🏗️ システムアーキテクチャ

### **コアコンポーネント**
- **File Watcher**: chokidarベースのファイル監視エンジン
- **Database Manager**: SQLite3によるイベント・統計データ管理
- **Cache System**: 4層キャッシュアーキテクチャ
- **CLI Interface**: リアルタイムストリーム表示システム
- **Configuration**: 階層的設定管理システム

### **データフロー原則**
```
File Events → chokidar → File Watcher
     ↓
Event Processing → Object Fingerprint → Database
     ↓
Cache Layers → Statistics Cache → Background Cache
     ↓
CLI Display → Stream Renderer → User Interface
```

## 📊 現在の統合状況

### **✅ Phase 1統合完了（2025年6月22日）**

#### **1. 基本監視統合（100%）**
**実装済み**:
- ✅ chokidar統合（file-watcher.js）
- ✅ 設定システム統合（config-manager.js）
- ✅ CLI実行環境（bin/cctop）
- ✅ 基本イベント検出（add/change/unlink）

**動作確認済み**:
- ✅ npm start → リアルタイム監視開始
- ✅ ファイル操作 → 即座に検出・表示
- ✅ 設定ファイル → 監視対象・除外パターン

### **⚠️ Phase 2-6 統合計画**

#### **2. Database統合（Phase 2）**
**統合要件**:
- SQLite3データベース統合
- イベント永続化
- 起動時スキャン結果の保存

**技術仕様**:
```javascript
// Database Manager統合
const dbManager = new DatabaseManager({
  dbPath: config.database.path,
  mode: 'WAL'
});
await dbManager.initialize();
```

#### **3. Cache統合（Phase 3-6）**
**4層キャッシュアーキテクチャ**:
- **EventType Cache**: イベントタイプ別高速アクセス
- **Background Cache**: 非同期バックグラウンド処理
- **Statistics Cache**: TTL付き統計キャッシュ
- **Persistent Cache**: SQLite永続化キャッシュ

## 🚀 Phase別統合実装計画

### **Phase 2: Database統合（1週間）**
**目標**: データ永続化・スキャン機能統合

1. **SQLite3統合**
   - database-manager.js実装
   - スキーマ定義・マイグレーション
   - WALモード設定

2. **スキャン機能統合**
   - 起動時ディレクトリ走査
   - 既存ファイル検出・DB保存
   - プログレス表示

3. **データ統合**
   - イベント→DB保存
   - オブジェクト指紋管理
   - 統計情報生成

### **Phase 3: Move検出統合（2週間）**
**目標**: 高度な変更検出・追跡システム

1. **Move Detector統合**
   - inode/ハッシュベース追跡
   - unlink→addペア検出
   - 誤検出防止メカニズム

2. **Object Fingerprint統合**
   - ファイル一意識別
   - 変更履歴追跡
   - 重複検出

### **Phase 4-5: UI・Filter統合（2週間）**
**目標**: 高度な表示・フィルタリング

1. **Display Manager統合**
   - Stream/Uniqueモード切り替え
   - リアルタイム更新最適化
   - キーボードインターフェース

2. **Filter System統合**
   - イベントタイプフィルタ
   - パス・名前パターンフィルタ
   - 正規表現サポート

### **Phase 6: 統計・分析統合（2週間）**
**目標**: 包括的統計・分析システム

1. **Statistics Engine統合**
   - リアルタイム統計計算
   - Hot Filesランキング
   - 時間帯別分析

2. **Cache最適化統合**
   - 全4層キャッシュ統合
   - パフォーマンス最適化
   - メモリ効率改善

## 🔧 技術的統合仕様

### **統一Configuration**
```javascript
// 全コンポーネント共通設定
const config = {
  watcher: {
    paths: [process.cwd()],
    ignored: [/node_modules/, /\.git/],
    options: { persistent: true }
  },
  database: {
    path: '~/.cctop/activity.db',
    mode: 'WAL'
  },
  cache: {
    eventType: { maxSize: 1000, ttl: 300 },
    statistics: { ttl: 60 }
  },
  display: {
    mode: 'stream', // 'stream' | 'unique'
    maxItems: 100,
    refreshRate: 16 // 60fps
  }
}
```

### **統一Event Format**
```javascript
// 全システム共通イベント形式
{
  timestamp: '2025-06-22T20:25:00.000Z',
  event: 'add' | 'change' | 'unlink',
  path: '/absolute/path/to/file',
  objectId: 'unique-fingerprint',
  metadata: { size, mtime, permissions }
}
```

### **Performance Targets**
```javascript
// システム統合パフォーマンス目標
{
  startup: '< 1秒（1万ファイル環境）',
  memory: '< 200MB（通常使用時）',
  cpu: '< 5%（アイドル時）',
  latency: '< 100ms（イベント検出）',
  cache: {
    hit: '< 1ms',
    miss: '< 10ms'
  }
}
```

## 📊 統合成功指標

### **Phase 2 完了基準**
- [ ] SQLite3データベース統合完了
- [ ] 起動時スキャン機能動作
- [ ] イベントデータ永続化確認

### **Phase 3 完了基準**
- [ ] Move/Rename検出精度90%以上
- [ ] Object Fingerprint追跡機能
- [ ] 重複検出・除外機能

### **Phase 4-5 完了基準**
- [ ] Stream/Uniqueモード切り替え
- [ ] 高度フィルタリング機能
- [ ] 60fps制限表示最適化

### **Phase 6 完了基準**
- [ ] リアルタイム統計表示
- [ ] 4層キャッシュ統合完成
- [ ] パフォーマンス目標達成

## 🎯 長期統合ビジョン

### **高性能監視プラットフォーム**
各コンポーネントが最適化されて統合され、大規模環境でも高速・安定して動作するファイル監視システム。開発者の生産性向上を支援する統計・分析機能を提供。

### **拡張性確保**
- プラグインアーキテクチャによる機能拡張
- 外部ツール連携（IDE、CI/CD等）
- カスタム統計・レポート機能

---

**関連文書**:
- `project-roadmap.md` - cctop v3全体戦略
- `../specifications/` - 技術仕様詳細
- `surveillance/internals/docs/plans/p005-development-surveillance-v3-phased-plan.md` - 詳細実装計画