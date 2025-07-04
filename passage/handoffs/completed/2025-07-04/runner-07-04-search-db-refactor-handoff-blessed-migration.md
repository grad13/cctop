# Handoff: blessed移植依頼

**作成日**: 2025年7月4日  
**送信者**: Runner 07-01-ink-based-ui-experiment  
**受信者**: Runner 07-04-search-db-refactor  

## 移植依頼内容

### 対象ファイル
- **ベースファイル**: `code/worktrees/07-01-ink-based-ui-experiment/src/demo-ink-fusion-v1-pure-stdout.tsx`
- **移植先**: blessed UIライブラリベース

### 移植要求
1. **V1 Pure Stdout実装をblessed版に移植**
   - React完全無効化・Node.js標準アプローチを参考に
   - blessed UIライブラリを使用した同等機能実装
   - ゼロフリッカー性能を維持

2. **重要な設計原則**
   - 60fps更新・単一write()・ゼロカーソル移動
   - 統計表示・イベント履歴の完全同期
   - リアルタイムストリーミング対応

## 技術的背景

### V1 Pure Stdout の特徴
- **React完全無効化**: Node.js標準機能のみ使用
- **ゼロフリッカー**: 完全な描画安定性実現
- **60fps更新**: 高頻度でも安定動作
- **単一write()**: 効率的な画面更新

### blessed移植の目的
- **cctop v0.4.0での技術比較**: React Ink vs blessed最終評価
- **性能実証**: blessedの優位性を具体的に検証
- **実装参考**: 実際のcctop統合時の設計指針

## 実装仕様

### 必須機能
1. **リアルタイムイベント表示**: Create/Modify/Delete/Move
2. **統計情報表示**: 各イベントタイプ別カウント
3. **履歴管理**: 最新20件のイベント履歴
4. **インタラクティブ操作**: q/Q/Ctrl+C終了対応

### 性能要件
- **更新頻度**: 100ms間隔での安定動作
- **フリッカー**: 完全ゼロフリッカー実現
- **メモリ使用量**: 最小限に抑制

### UI要件
- **画面構成**: 統計部分 + イベント履歴部分
- **カラー対応**: イベントタイプ別色分け
- **レスポンシブ**: ターミナルサイズ対応

## 期待される成果物

1. **blessed版デモファイル**: `demo-blessed-v1-pure-stdout.ts`
2. **性能比較レポート**: React Ink V1との比較
3. **実装ドキュメント**: blessed特有の最適化手法

## 技術参考情報

### V1 Pure Stdout 主要クラス
- `PureStdoutRenderer`: メインレンダラー
- `setupTerminal()`: ターミナル初期化
- `renderFrame()`: フレーム描画
- `generateMockEvent()`: テストデータ生成

### blessed移植時の注意点
- **ターミナル制御**: blessed固有のAPI活用
- **イベント処理**: blessed event system使用
- **描画最適化**: blessed内部最適化活用

## 完了条件

1. ✅ blessed版実装完了
2. ✅ 100ms間隔での安定動作確認
3. ✅ ゼロフリッカー実現確認
4. ✅ 性能比較結果記録
5. ✅ 実装ドキュメント作成

---

**技術的質問・不明点があれば、07-01-ink-based-ui-experiment statusを参照してください。**