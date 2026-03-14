# index.ts

- **行数**: 233行
- **判定**: should
- **理由**:
  1. **責務混在**: CLIパース、エラーハンドリング、UI/DB初期化、ファイルシステム操作、シグナルハンドリングが1ファイルに混在
  2. **fallback問題**: 189-203行でprocess.stderrの出力を無条件に握りつぶしており、本来のエラー情報が隠蔽される
- **推奨アクション**:
  1. CLIパース機能を `cli/argument-parser.ts` に抽出
  2. .cctop構造初期化を `filesystem/cctop-initializer.ts` に抽出
  3. ヘルプメッセージを `cli/help-messages.ts` に抽出
  4. stderr握りつぶし処理を削除または`terminal-error-suppressor.ts`に明示的に切り出し（理由とコメント付き）
  5. `CCTOPCli`クラスをエントリーポイント・オーケストレーション層に限定
