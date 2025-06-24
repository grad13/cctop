---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0623-0629
- 元パス: documents/records/reports/
- 検索キーワード: 画面ちらつき問題, cctop, classicモード, inkモード, BufferedRenderer, ANSIエスケープシーケンス, console.clear問題, 差分更新, カーソル位置制御, フレームレート制限, ダブルバッファリング, パフォーマンス改善, UI表示問題, ターミナル描画, product-v01技術, product-v02技術, stream-display修正, バッチレンダリング, 行単位更新, ユーザー体験改善

---

# 画面ちらつき問題の調査レポート

**文書ID**: REP-0089
**作成日**: 2025-06-23
**作成者**: Claude Assistant (Builder Agent)
**カテゴリ**: 技術調査
**関連Issue**: 画面ちらつき問題

## 1. エグゼクティブサマリー

### 問題の概要
cctopのclassicモードとinkモードの両方で画面がちらつく問題が発生している。

### 調査結果
過去のバージョン（product-v01, product-v02）では、BufferedRendererクラスを使用して画面ちらつきを防止する技術が実装されており、成功していた。

### 推奨解決策
過去バージョンの BufferedRenderer 技術をそのまま借用し、現在のstream-display.jsに適用する。

## 2. 現状の問題分析

### 2.1 現在の実装（stream-display.js）

```javascript
// 画面クリア
console.clear();  // <- 問題の原因

// 定期更新を開始（500msごと）
this.refreshInterval = setInterval(async () => {
  if (this.isRunning) {
    await this.display();
  }
}, 500);
```

**問題点**：
- `console.clear()` による全画面クリアがちらつきの主原因
- 500msごとの更新でも、毎回全画面をクリアしている
- バッファリングなし、差分更新なし

## 3. 過去バージョンの成功技術

### 3.1 product-v02の BufferedRenderer

**ファイル**: `/VERSIONs/product-v02/src/renderers/buffered-renderer.js`

**主な技術**：
1. **フレームレート制限**: 16.67ms（60fps）で更新を制限
2. **カーソル位置の保存/復元**: ANSIエスケープシーケンス使用
   - `\x1b[s` - カーソル位置保存
   - `\x1b[u` - カーソル位置復元
3. **部分クリア**: `\x1b[J` でカーソル位置から下のみクリア
4. **バッチレンダリング**: 複数の更新をバッファに蓄積してから一括描画

### 3.2 product-v01の BufferedRenderer（より高度）

**ファイル**: `/VERSIONs/product-v01/src/utils/buffered-renderer.js`

**主な技術**：
1. **ダブルバッファリング**: `buffer` と `previousBuffer` で差分管理
2. **カーソル制御**:
   - `\x1b[?25l` - カーソル非表示
   - `\x1b[?25h` - カーソル表示
   - `\x1b[${row};${col}H` - カーソル位置指定
3. **行単位の差分更新**: 変更があった行のみ更新
4. **行クリア**: `\x1b[2K` で個別の行をクリア

## 4. 推奨実装方法

### 4.1 BufferedRendererの移植

product-v02のBufferedRendererクラスをそのまま借用し、stream-display.jsに組み込む。

### 4.2 実装手順

1. **BufferedRendererクラスの追加**
   - `/cctop/src/utils/buffered-renderer.js` として移植

2. **stream-display.jsの修正**
   ```javascript
   // BufferedRendererをインポート
   const BufferedRenderer = require('../utils/buffered-renderer');
   
   // コンストラクタで初期化
   this.renderer = new BufferedRenderer();
   
   // display()メソッドの修正
   async display() {
     // console.clear() を削除
     
     // バッファに追加
     this.renderer.clear();
     this.renderer.addLine(headerContent);
     this.renderer.addLines(eventLines);
     
     // レンダリング
     this.renderer.render();
   }
   ```

3. **初回表示時のカーソル保存**
   ```javascript
   async start() {
     this.isRunning = true;
     
     // カーソル位置を保存
     this.renderer.saveCursor();
     
     // 以降の処理...
   }
   ```

## 5. 期待される効果

1. **ちらつきの解消**: 差分更新により画面のちらつきがなくなる
2. **パフォーマンス向上**: 必要な部分のみ更新
3. **ユーザー体験の改善**: スムーズな表示更新

## 6. 実装の優先度

**高優先度** - ユーザー体験に直接影響する問題のため、即座に対応すべき。

## 7. 参考資料

- `/VERSIONs/product-v02/src/renderers/buffered-renderer.js`
- `/VERSIONs/product-v01/src/utils/buffered-renderer.js`
- ANSIエスケープシーケンスのリファレンス

## 8. 次のアクション

1. BufferedRendererクラスの移植
2. stream-display.jsへの組み込み
3. テストと動作確認
4. 必要に応じてInk UIモードへの適用検討