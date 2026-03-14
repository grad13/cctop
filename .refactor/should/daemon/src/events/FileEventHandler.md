# FileEventHandler.ts

- **行数**: 293行
- **判定**: should
- **理由**: 責務混在とfallbackパターンが複数存在する

## 責務混在

このクラスは複数の独立した責務を持っています：
1. **ファイルイベントハンドリング**: handleFileEvent, handleUnlinkEvent, handleAddEvent
2. **イベント種別判定**: moveの検出、restoreの検出
3. **測定値計算の統合**: measurementCalculatorの組み込み
4. **移動検出の統合**: moveDetectorの管理
5. **ファイルシステムアクセス**: fs.stat呼び出し
6. **データベース操作**: db.insertEvent, db.getRecentEvents呼び出し

## Fallbackパターン

1. **44-48行**: fs.statエラーをキャッチしデフォルト値で継続
   ```typescript
   } catch (statError) {
     this.logger.log('warn', `Could not get stats for ${filePath}: ${statError}`);
     inode = 0;
     stats = { size: 0 };
   }
   ```
   - inodeが0では正確なファイル追跡ができない可能性

2. **87-98行**: 測定値計算エラーをキャッチし最小値を返す
   ```typescript
   } catch (error) {
     this.logger.log('warn', `Could not calculate measurements...`);
     measurement = { eventId: 0, inode: inode, fileSize: 0, lineCount: 0, ... };
   }
   ```
   - 実際の測定値が失われ、0で埋められる

3. **145-147行, 165-167行, 284-286行**: トップレベルでのエラー握りつぶし
   - エラーがログされるのみで、呼び出し側に通知されない

## 推奨アクション

1. **単一責務に分割**:
   - `FileEventProcessor`: イベント判定・検出ロジック
   - `FileMetadataManager`: ファイル統計・測定値取得
   - `FileEventHandler`: 統合・オーケストレーション

2. **Fallbackの明示化**:
   - エラー時の動作を明確なポリシーに統一
   - 重要な情報喪失（inodeが0になる等）を呼び出し側に通知
   - または、スタンバイ機構を導入（前回値の再利用等）

3. **エラーハンドリングの改善**:
   - catchブロックでの処理を明確化
   - 復帰不可能なエラーと一時的なエラーを区別
   - 呼び出し側へのエラー伝播を検討
