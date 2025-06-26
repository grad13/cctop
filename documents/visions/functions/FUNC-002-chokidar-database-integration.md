# FUNC-002: chokidar-Database統合監視機能

**作成日**: 2025年6月24日 10:00  
**更新日**: 2025年6月25日 21:15  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0  

## 📊 機能概要

chokidarによるファイル変更検出とFUNC-000で定義されたデータベーススキーマへの統合記録を行う中核監視機能。ファイルシステムイベントを検出し、適切なテーブルに分散して記録する。

**ユーザー価値**:
- リアルタイムファイル変更検出
- 完全なファイルライフサイクル追跡
- 高速かつ確実なイベント記録

## 🎯 機能境界

### ✅ **実行する**
- chokidarによるファイルシステム監視
- FUNC-001定義の6イベントタイプへの変換
- FUNC-000スキーマに基づくDB記録
- ファイル測定値の収集（size/lines/blocks）
- エラーハンドリングとリトライ

### ❌ **実行しない**
- UI表示（FUNC-022の責務）
- 設定管理（FUNC-010/011の責務）
- ファイル内容の解析
- プラグイン拡張（FUNC-901の責務）

## 📋 必要な仕様

### **データベース統合仕様**

FUNC-000で定義された5テーブル構成への適切な記録：

#### **1. filesテーブル管理**
- 新規ファイル検出時: INSERT（path_hash計算）
- ファイル削除時: is_deleted=1に更新
- ファイル復元時: is_deleted=0に更新
- inodeの再利用を考慮した設計

#### **2. eventsテーブル記録**
- 全イベントを時系列で記録
- event_type: FUNC-001定義の6種類
  - find: 初期スキャン時の発見
  - create: 新規作成
  - modify: 変更
  - move: 移動・リネーム
  - delete: 削除
  - restore: 復元

#### **3. measurementsテーブル更新**
- modifyイベント時に測定値記録
- size: ファイルサイズ（バイト）
- lines: 行数（テキストファイルのみ）
- blocks: ブロック数

### **chokidar設定仕様**

#### **基本設定**
```javascript
{
    ignored: ['**/node_modules/**', '**/.git/**', '**/.*', '**/.cctop/**'],
    persistent: true,
    ignoreInitial: false,
    followSymlinks: false,
    alwaysStat: true,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
}
```

### **イベント変換仕様**

#### **chokidar→cctopイベントマッピング**
| chokidarイベント | 条件 | cctopイベント |
|-----------------|------|---------------|
| `add` | ready前 | `find` |
| `add` | ready後 + moveペンディングなし | `create` |
| `add` | ready後 + moveペンディングあり（100ms以内・同一inode） | `move` |
| `add` | ready後 + 削除履歴あり（5分以内） | `restore` |
| `change` | - | `modify` |
| `unlink` | - | pending_unlinksに保持 |
| （100ms経過） | pending_unlinksタイムアウト | `delete` |
| `error` | - | （記録しない） |

#### **moveイベントの検出**
- `unlink`イベントをpending_unlinksマップに一時保持
- 100ms以内に同一inodeの`add`イベントが発生したらmove
- タイムアウトしたらdelete確定

#### **restoreイベントの検出**
- deleteイベント後、同パスで`add`イベント検出
- 削除から5分以内（設定可能）
- filesテーブルで既存レコードがある場合

## 🔧 実装ガイドライン

### **監視マネージャー設計**

1. **FileWatcher クラス**
   - chokidar初期化と監視開始
   - イベントハンドラー登録
   - ready状態管理

2. **EventProcessor クラス**
   - chokidarイベントの正規化
   - ファイル情報収集（stat）
   - データベーストランザクション管理

3. **MeasurementCollector クラス**
   - ファイルサイズ取得
   - 行数カウント（テキストファイル判定）
   - ブロック数計算

### **トランザクション設計**

```javascript
// 1. file_idの解決または作成
// 2. eventsテーブルへの挿入
// 3. measurementsテーブルへの挿入（modifyイベント時）
// 4. aggregatesテーブルの更新
```

## 🧪 テスト要件

1. **基本動作確認**
   - 6種類のイベントタイプ正常検出
   - データベース記録の整合性
   - 測定値の正確性

2. **エラーハンドリング確認**
   - 権限エラー時の動作
   - ファイル削除中の処理
   - データベースエラー時のリトライ

3. **パフォーマンス確認**
   - 大量ファイル同時変更
   - 長時間連続動作
   - メモリリーク検証

## 💡 使用シナリオ

### **開発環境での使用**
```javascript
// プロジェクトディレクトリを監視
const watcher = new FileWatcher({
    path: './src',
    db: './cctop/activity.db'
});

// イベント発生時の処理
watcher.on('event', (event) => {
    console.log(`${event.type}: ${event.path}`);
});
```

## 🎯 成功指標

1. **完全性**: 全ファイルイベントの確実な記録
2. **正確性**: FUNC-000スキーマへの適切な記録
3. **パフォーマンス**: リアルタイム性の維持（100ms以内）
4. **安定性**: 24時間連続動作での信頼性