# refactor-code サマリー

実行日: 2026-03-14
対象: `code/` 配下 TypeScript ファイル（上位20件）

## 統計

- **分析ファイル数**: 20
- **must**: 0件（500行超のファイルなし、最大358行）
- **should**: 10件
- **clean**: 10件

## should 一覧

| # | ファイル | 行数 | 主な問題 |
|---|---------|------|---------|
| 1 | `code/view/src/ui/UILayoutManager.ts` | 338 | 責務混在（レイアウト管理+コンテンツ生成+状態同期）、マジックナンバー |
| 2 | `code/shared/src/config/LocalSetupInitializer.ts` | 338 | 責務混在（ディレクトリ作成+設定生成+検証）、100行超メソッド |
| 3 | `code/view/src/ui/UIKeyHandler.ts` | 329 | 責務混在（5種のキーハンドリング）、エラー握りつぶし |
| 4 | `code/daemon/src/events/FileEventHandler.ts` | 292 | 責務混在（イベント処理+判定+統合）、複数fallback |
| 5 | `code/daemon/src/database/EventOperations.ts` | 288 | 責務混在（insertEvent内に4責務）、fallback |
| 6 | `code/daemon/src/events/MeasurementCalculator.ts` | 287 | 責務混在（バイナリ検出+行数計算+構造解析）、fallback |
| 7 | `code/view/src/ui/UIDataManager.ts` | 291 | 責務混在（データロード+キャッシュ+検索）、エラー握りつぶし |
| 8 | `code/view/src/database/FileEventReader.ts` | 239 | 責務混在（DB接続+クエリ+ビルド）、コード重複 |
| 9 | `code/view/src/index.ts` | 232 | 責務混在（CLI+初期化+シグナル）、stderrモンキーパッチ |
| 10 | `code/view/src/ui/UIScreenManager.ts` | — | fallback（destroy内エラー握りつぶし）、ターミナル互換性対策の混在 |
| 11 | `code/daemon/src/database/TriggerManager.ts` | 208 | エラー握りつぶし、SQL重複、責務混在 |

## clean 一覧

| ファイル | 行数 | 備考 |
|---------|------|------|
| `code/daemon/tests/integration/func000-measurement-integration.test.ts` | 358 | テストファイル、単一責務 |
| `code/view/src/ui/UIState.ts` | 306 | 委譲パターンで適切に分離 |
| `code/daemon/src/index.ts` | 299 | 適切に外部クラスに委譲 |
| `code/view/src/ui/components/EventTable/EventTable.ts` | 282 | EventRow/HeaderRendererに委譲 |
| `code/shared/src/config-manager.ts` | 282 | 単一責務（設定管理） |
| `code/daemon/src/database/database-reader.ts` | 257 | 単一責務（DB読取） |
| `code/view/src/ui/BlessedFramelessUI.ts` | 246 | オーケストレーション専任 |
| `code/daemon/src/database/MeasurementOperations.ts` | 228 | 単一責務（measurements CRUD） |
| `code/view/src/ui/components/EventTable/EventRow.ts` | 213 | 単一責務、キャッシュ効率良 |

## 共通パターン

### 頻出問題
1. **責務混在**: should判定の全ファイルで検出。1クラスに複数の独立した関心事が集約
2. **エラー握りつぶし**: try-catch内でエラーを無視、またはデフォルト値で隠蔽
3. **fallback乱用**: fs.stat失敗時の `inode = 0`、計算失敗時の最小値など

### 推奨アプローチ
- 責務ごとにクラス/関数を分割
- エラーは適切にログ出力または上位に伝播
- fallbackを使う場合はログを残す
