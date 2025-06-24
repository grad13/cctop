---
**アーカイブ情報**
- アーカイブ日: 2025-06-18（surveillance統合）
- アーカイブ週: 2025/0616-0622
- 元パス: surveillance/docs/
- 検索キーワード: iI001実装, surveillance実装, 監視システム, implementations, 技術実装, システム管理, 監視機能, アーカイブ記録

---

# ファイル移動追跡の課題と改善案

作成日: 2025年6月17日

## 現状の問題

TimeBox監視システムは、ファイル移動を正確に追跡できない構造的な問題を抱えています。

### 問題の詳細

1. **イベントの分離**
   - ファイル移動は`unlink`（削除）と`add`（追加）の2つのイベントとして検出
   - chokidarライブラリの仕様上、ネイティブな移動イベントは提供されない

2. **ファイルIDの断絶**
   - 削除時: 既存のファイルIDがマッピングから削除される
   - 追加時: 新しいファイルIDが割り当てられる
   - 結果: 同一ファイルが別ファイルとして扱われる

3. **統計への影響**
   - 実際の変更数より多くカウントされる
   - ファイルの継続的な履歴が失われる
   - 「新規ファイル」として誤分類される

## 実例分析

2025年6月17日のClerkエージェントによる大規模なファイル移動：

```
移動前: documents/rules/meta/hypotheses/h013-unified-technical-debt-prevention.md (ID:138)
移動後: documents/archives/hypotheses/2025-06-17-protocols-migration/h013-unified-technical-debt-prevention.md (ID:700)
```

この1つの移動操作が以下のように記録：
- DELETE イベント: 1件
- ADD イベント: 1件
- 変更カウント: 2件（実際は0件の変更）

## 改善案

### 案1: ヒューリスティックベースの移動検出

```javascript
class MoveDetector {
  constructor(timeWindow = 1000) {
    this.deleteEvents = new Map(); // filePath -> {timestamp, fileId, hash}
    this.timeWindow = timeWindow;
  }

  onDelete(filePath, fileId) {
    const content = this.getFileHash(filePath); // 削除前に取得
    this.deleteEvents.set(filePath, {
      timestamp: Date.now(),
      fileId,
      hash: content,
      baseName: path.basename(filePath)
    });
    
    // 古いエントリをクリーンアップ
    this.cleanup();
  }

  onAdd(filePath) {
    const baseName = path.basename(filePath);
    const now = Date.now();
    
    // 同じファイル名の削除イベントを探す
    for (const [deletedPath, info] of this.deleteEvents) {
      if (info.baseName === baseName && 
          now - info.timestamp < this.timeWindow) {
        
        // 内容のハッシュを比較
        const currentHash = this.getFileHash(filePath);
        if (currentHash === info.hash) {
          return {
            type: 'MOVE',
            from: deletedPath,
            to: filePath,
            fileId: info.fileId // 既存のIDを維持
          };
        }
      }
    }
    
    return { type: 'ADD', path: filePath };
  }
}
```

### 案2: 拡張バイナリフォーマット

現行の9バイトフォーマットを16バイトに拡張：

```
既存フォーマット (9 bytes):
[fileId:2][timestamp:4][lines:2][sections:1]

拡張フォーマット (16 bytes):
[fileId:2][timestamp:4][lines:2][sections:1][eventType:1][prevFileId:2][reserved:4]

eventType:
- 0: MODIFY (通常の変更)
- 1: CREATE (新規作成)
- 2: DELETE (削除)
- 3: MOVE   (移動)
```

### 案3: メタデータトラッキング

ファイルの内容ハッシュと作成時刻を追跡：

```javascript
// file-metadata.json
{
  "files": {
    "documents/example.md": {
      "id": 123,
      "hash": "sha256:abc123...",
      "created": 1719000000,
      "modified": 1719001000,
      "size": 1024,
      "history": [
        {
          "path": "documents/old/example.md",
          "timestamp": 1719000500,
          "event": "MOVE"
        }
      ]
    }
  }
}
```

### 案4: Git統合による移動検出

```javascript
async function detectGitMoves() {
  try {
    // git status --porcelain=v2 で移動を検出
    const { stdout } = await exec('git status --porcelain=v2');
    const moves = [];
    
    for (const line of stdout.split('\n')) {
      if (line.startsWith('2 R')) {
        // Renamed file
        const parts = line.split('\t');
        moves.push({
          from: parts[1],
          to: parts[2],
          similarity: parseInt(parts[0].split(' ')[2])
        });
      }
    }
    
    return moves;
  } catch (error) {
    // Git利用不可の場合はフォールバック
    return [];
  }
}
```

## 推奨実装

短期的には**案1（ヒューリスティック）**を実装し、中長期的に**案2（拡張フォーマット）**への移行を推奨。

### 実装ステップ

1. **Phase 1**: MoveDetectorクラスの実装
   - ファイル名とタイムスタンプによる単純なマッチング
   - 1秒以内のDELETE/ADDペアを検出

2. **Phase 2**: コンテンツハッシュの追加
   - MD5またはSHA256によるファイル内容の比較
   - より正確な移動検出

3. **Phase 3**: 拡張フォーマットへの移行
   - 後方互換性を保ちながら新フォーマット導入
   - 移動履歴の永続化

## 期待される効果

1. **統計の正確性向上**
   - 移動を変更としてカウントしない
   - 実際の作業量を正確に反映

2. **ファイル履歴の継続性**
   - ファイルIDの維持により履歴が途切れない
   - 長期的な変更傾向の追跡が可能

3. **ユーザー体験の改善**
   - より正確なダッシュボード表示
   - 誤解を招く統計の削減