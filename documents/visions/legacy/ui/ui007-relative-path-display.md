# 相対パス表示機能仕様

**作成日**: 2025-06-22  
**作成者**: Inspector Agent  
**目的**: 監視ディレクトリからの相対パス表示による可読性向上

## 📋 機能概要

### 目的
Claude Code使用時の典型的なワークフローで、共通する監視ディレクトリパス部分が表示で冗長になる問題を解決

### 解決方法
- 監視ディレクトリからの相対パスで表示
- 表示領域の有効活用
- ユーザビリティ向上

## 🔧 技術仕様

### 実装ファイル
1. **`src/cli/formatters/stream-formatter.js`**: 相対パス変換関数
2. **`src/ui/stream-renderer.js`**: 表示時の変換適用
3. **`src/cli/display-manager.js`**: watchPath管理
4. **`bin/cctop`**: watchPathの受け渡し

### 中核関数
```javascript
function formatRelativeDirectory(fullPath, watchPath) {
  if (!fullPath || !watchPath) return fullPath;
  
  const path = require('path');
  
  try {
    const absoluteFullPath = path.resolve(fullPath);
    const absoluteWatchPath = path.resolve(watchPath);
    
    // 監視ディレクトリ配下かチェック
    if (absoluteFullPath.startsWith(absoluteWatchPath + path.sep)) {
      const relativePath = path.relative(absoluteWatchPath, absoluteFullPath);
      return relativePath || './';
    }
    
    return fullPath; // 配下にない場合は元のパス
  } catch (error) {
    return fullPath; // エラー時は元のパス
  }
}
```

## 📊 動作仕様

### 変換ルール

| 監視ディレクトリ | ファイルパス | 表示結果 |
|-----------------|--------------|-----------|
| `/Users/user/project/` | `/Users/user/project/src/components/` | `src/components/` |
| `/Users/user/project/` | `/Users/user/project/` | `./` |
| `/Users/user/project/` | `/Users/user/other/file.js` | `/Users/user/other/file.js` |
| `./` | `./src/utils/` | `src/utils/` |

### エラーハンドリング

| ケース | 対応 |
|--------|------|
| watchPathがnull/undefined | 元のパスをそのまま表示 |
| fullPathがnull/undefined | 空文字または'-'を表示 |
| パス解析エラー | 元のパスを表示 |
| 監視ディレクトリ配下でない | 元のパスを表示 |

## 🎯 UX効果

### Before（修正前）
```
Modified             Elapsed    File Name             Directory                     Event   Lines  Blocks
─────────────────────────────────────────────────────────────────────────────────────────────────
2025-06-22 14:30:15   00:01:23  component.tsx         /Users/user/long/project/sr   modify    125      8
2025-06-22 14:29:52   00:01:00  utils.js              /Users/user/long/project/sr   create     89     12
```

### After（修正後）
```
Modified             Elapsed    File Name             Directory       Event   Lines  Blocks
─────────────────────────────────────────────────────────────────────────────────
2025-06-22 14:30:15   00:01:23  component.tsx         src/components/ modify    125      8
2025-06-22 14:29:52   00:01:00  utils.js              src/utils/      create     89     12
```

### 改善効果
- **可読性**: 重要な相対パス部分が明確
- **領域効率**: 共通パス削除により表示領域を有効活用
- **認知負荷軽減**: 不要な情報の除去

## 🔄 データフロー

### 処理の流れ
1. **CLI**: ユーザーが`./bin/cctop -p /path/to/monitor`実行
2. **DisplayManager**: watchPathを受け取り、StreamRendererに渡す
3. **StreamRenderer**: 表示時に`formatRelativeDirectory`で変換
4. **表示**: 変換されたパスをDirectory列に表示

### 設定継承
```
bin/cctop (options.path) 
→ DisplayManager (this.watchPath)
→ StreamRenderer (drawStream options.watchPath)
→ formatRelativeDirectory (watchPath)
```

## ⚠️ 制約・注意事項

### 制約
- 監視ディレクトリ配下のファイルのみ相対パス変換
- シンボリックリンクは考慮していない
- パフォーマンスのためのキャッシュなし（将来改善可能）

### 設計判断
- **フォールバック重視**: エラー時は元のパス表示で安全性を確保
- **シンプル実装**: path.relative()を使用したストレートな実装
- **後方互換**: 既存の表示幅・レイアウトは変更なし

## 🚀 将来拡張

### 潜在的改善
- **パフォーマンス**: パス変換結果のキャッシュ
- **設定**: 相対パス表示のON/OFF設定
- **カスタマイズ**: ベースパスの手動指定
- **高度変換**: シンボリックリンク対応

---

**設計方針**: Claude Codeの典型的な使用パターンに最適化し、開発者の認知負荷を軽減する