---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: ファイル移動リネーム追跡調査, MoveDetectorクラス改善, inode番号追跡, タイミングベース検出, クロスプラットフォーム対応課題, Windows対応不完全, FileWatcherクラス, chokidarイベント処理, コンテンツハッシュ追跡, SHA256ハッシュ, ファイルサイズ修正時刻, 機械学習ベース, 信頼度スコアリング, 誤検知防止, パフォーマンス最適化, 段階的検証アプローチ, 部分ハッシュ活用, ファイルID代替実装, 移動履歴UI表示, Inspector Agent機能調査, Git rsync Dropbox比較分析

---

# ファイル移動・リネーム追跡機能調査レポート

**作成日時**: 2025-06-22 17:30  
**作成者**: Inspector Agent  
**カテゴリ**: 機能調査・技術検証  
**優先度**: 高

## エグゼクティブサマリー

CCTopシステムにおけるファイルの移動（mv）およびリネーム（rename）追跡機能について包括的な調査を実施しました。現在のシステムは`MoveDetector`クラスによる基本的な追跡機能を持っていますが、より高度な追跡を実現するための改善余地があります。

### 主要な発見事項
- 既存の`MoveDetector`はinode番号とタイミングベースで動作
- 2秒間のキャッシュウィンドウで削除→追加イベントを相関
- クロスプラットフォーム対応に課題あり
- データベース構造は追跡に適した設計

## 1. 現在の実装状況

### 1.1 MoveDetectorクラス
**ファイル**: `src/monitors/move-detector.js`

```javascript
// 主要な実装内容
- inode番号を使用したファイル識別
- 削除イベントの2秒間キャッシュ
- キャッシュ内でinode一致を検索
- rename/moveイベントとして分類・発行
```

**特徴**:
- **利点**: 高速、正確（同一ファイルシステム内）
- **制限**: Windows対応不完全、クロスファイルシステム非対応

### 1.2 FileWatcherクラス
**ファイル**: `src/monitors/file-watcher.js`

```javascript
// chokidarイベントの処理
- 'add': ファイル追加
- 'change': ファイル変更
- 'unlink': ファイル削除
// ネイティブな'rename'イベントは存在しない
```

### 1.3 データベース構造
```sql
-- file_objects_cache: 現在のファイル位置を追跡
CREATE TABLE file_objects_cache (
    object_id INTEGER PRIMARY KEY,
    current_file_path TEXT,
    current_file_name TEXT,
    current_directory TEXT,
    last_event_timestamp DATETIME
);

-- object_fingerprint: ファイルの同一性を確認
CREATE TABLE object_fingerprint (
    object_id INTEGER,
    sha256_hash TEXT,
    inode_number INTEGER,
    creation_time DATETIME
);

-- events: 移動履歴を記録
CREATE TABLE events (
    source_path TEXT,  -- 移動元パス
    event_type_id INTEGER,  -- 5: move
    ...
);
```

## 2. 技術的アプローチの分析

### 2.1 現在使用している手法

#### A. inode番号追跡
```javascript
const stats = await fs.stat(filePath);
const inode = stats.ino;
```
- **長所**: 高速、一意性保証（同一FS内）
- **短所**: Windows制限、クロスFS非対応

#### B. タイミングベース検出
```javascript
// 2秒間のキャッシュウィンドウ
this.deletionCache.set(key, { filePath, stats, timestamp });
setTimeout(() => this.deletionCache.delete(key), 2000);
```
- **長所**: シンプル、誤検知少ない
- **短所**: 大量操作時の精度低下

### 2.2 代替手法の検討

#### A. コンテンツハッシュ追跡
```javascript
// SHA256ハッシュによる同一性判定
const hash = crypto.createHash('sha256');
hash.update(fileContent);
const contentHash = hash.digest('hex');
```
- **長所**: プラットフォーム非依存、確実
- **短所**: 計算コスト高、大ファイル問題

#### B. ファイルサイズ＋修正時刻
```javascript
const key = `${stats.size}_${stats.mtime.getTime()}`;
```
- **長所**: 高速、実用的
- **短所**: 完全一致の保証なし

#### C. 機械学習ベース
- ファイル名の類似度
- パスパターンの学習
- **長所**: 柔軟、進化可能
- **短所**: 複雑、初期データ必要

## 3. 実装上の課題と解決策

### 3.1 クロスプラットフォーム対応

#### 課題
- Windows: inode相当値の取得困難
- ネットワークドライブ: 統計情報の不整合
- 異なるファイルシステム間: inode非互換

#### 解決策
```javascript
// プラットフォーム別戦略
const getFileIdentifier = async (filePath, stats) => {
    if (process.platform === 'win32') {
        // Windowsではファイルサイズ＋修正時刻＋ハッシュの組み合わせ
        const partialHash = await getPartialHash(filePath, 1024); // 最初の1KB
        return `${stats.size}_${stats.mtime.getTime()}_${partialHash}`;
    } else {
        // Unix系ではinode優先
        return `${stats.ino}_${stats.dev}`;
    }
};
```

### 3.2 パフォーマンス最適化

#### 課題
- 大量ファイル操作時のメモリ使用
- ハッシュ計算のCPU負荷
- データベースクエリの遅延

#### 解決策
```javascript
// 段階的検証アプローチ
class OptimizedMoveDetector {
    async detectMove(deletedFile, addedFile) {
        // Level 1: 高速チェック（inode/サイズ）
        if (this.quickCheck(deletedFile, addedFile)) {
            // Level 2: 中速チェック（部分ハッシュ）
            if (await this.partialHashCheck(deletedFile, addedFile)) {
                // Level 3: 完全検証（必要時のみ）
                return await this.fullVerification(deletedFile, addedFile);
            }
        }
        return false;
    }
}
```

### 3.3 誤検知の防止

#### 課題
- 同時に複数の類似ファイル操作
- 一時ファイルの誤認識
- ネットワーク遅延による順序逆転

#### 解決策
```javascript
// 信頼度スコアリング
const calculateConfidence = (deleted, added) => {
    let score = 0;
    
    // inode一致: +40点
    if (deleted.ino === added.ino) score += 40;
    
    // ファイル名類似度: +0-30点
    score += calculateNameSimilarity(deleted.name, added.name) * 30;
    
    // タイミング: +0-20点（2秒以内で線形減少）
    const timeDiff = added.time - deleted.time;
    score += Math.max(0, 20 - (timeDiff / 100));
    
    // サイズ一致: +10点
    if (deleted.size === added.size) score += 10;
    
    return score; // 70点以上で移動と判定
};
```

## 4. 推奨実装計画

### 4.1 短期改善（Phase 4.1）
1. **Windows対応強化**
   - ファイルIDの代替実装
   - 部分ハッシュの活用

2. **信頼度スコアリング導入**
   - 多要素での判定
   - 閾値の調整可能化

3. **パフォーマンス最適化**
   - キャッシュサイズの動的調整
   - バッチ処理の実装

### 4.2 中期改善（Phase 4.2）
1. **履歴追跡UI**
   - ファイル移動履歴の表示
   - 移動パターンの可視化

2. **API拡張**
   - 移動履歴のクエリAPI
   - Webhook通知機能

3. **設定可能性**
   - 検出感度の調整
   - 除外パターンの設定

### 4.3 長期展望（Phase 5）
1. **機械学習統合**
   - 移動パターンの学習
   - 異常検知機能

2. **分散システム対応**
   - 複数ノード間での追跡
   - 同期機能の実装

## 5. 他システムとの比較

### 5.1 Git
```bash
# Gitの移動検知（-M オプション）
git diff -M --name-status
```
- **アルゴリズム**: コンテンツ類似度（デフォルト50%）
- **利点**: 部分的な変更でも検知
- **欠点**: 計算コスト高

### 5.2 rsync
```bash
# rsyncの移動検知（--fuzzy オプション）
rsync --fuzzy --delete-after
```
- **アルゴリズム**: ファイル名類似度＋サイズ
- **利点**: 高速、実用的
- **欠点**: 完全性の保証なし

### 5.3 Dropbox/Google Drive
- **アルゴリズム**: 独自ID＋サーバー側追跡
- **利点**: 完全な追跡
- **欠点**: クラウド依存

## 6. 実装優先順位

### 高優先度
1. Windows対応の改善
2. 信頼度スコアリングの実装
3. パフォーマンステストの追加

### 中優先度
1. 設定ファイルでの調整機能
2. 移動履歴のクエリAPI
3. 詳細なメトリクス収集

### 低優先度
1. 機械学習統合
2. 分散システム対応
3. リアルタイムUI更新

## 7. リスクと対策

### リスク
1. **誤検知**: 無関係なファイルを移動と判定
2. **見逃し**: 実際の移動を検出できない
3. **パフォーマンス劣化**: 大規模環境での速度低下

### 対策
1. **段階的ロールアウト**: 機能フラグで制御
2. **詳細なログ**: 判定プロセスの記録
3. **フォールバック**: 従来方式への切り替え

## 8. 結論

CCTopの現在の移動検知機能は基本的なユースケースには十分ですが、以下の改善により、より堅牢で汎用的なシステムになります：

1. **プラットフォーム抽象化層**の導入
2. **多要素判定**による精度向上
3. **パフォーマンス最適化**による大規模対応

これらの改善により、エンタープライズレベルのファイル追跡システムとして、より信頼性の高いソリューションとなることが期待されます。

---
**次のステップ**: 実装計画の承認を得て、Phase 4.1の開発に着手