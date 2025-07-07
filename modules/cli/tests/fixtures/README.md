# Test Fixtures

テスト用のダミーデータ生成や共通ユーティリティファイルです。

## 📁 ファイル構成

### `create-test-db.ts`
FUNC-000準拠のテスト用SQLiteデータベースを作成するスクリプト。

```bash
# 使用方法
npm run demo:create-db
```

**機能**:
- FUNC-000スキーマのテーブル作成
- サンプルデータの挿入
- テスト用データベースファイル生成

### `demo-python-dummy-data.ts`
Pythonスクリプトで生成されたダミーデータを読み込むデモ。

```bash
# 使用方法
npm run demo:python-data
```

**機能**:
- Python生成データの読み込み
- Node.js統合テスト
- 統計情報表示

## 🔧 開発者向けユーティリティ

これらのファイルは以下の目的で使用されます：

1. **単体テスト**: vitest実行時のテストデータ生成
2. **統合テスト**: Python-Node.js統合フローの検証
3. **開発デモ**: 機能動作確認用の実行可能スクリプト
4. **CI/CD**: 自動テストでの環境構築

## 📋 使用例

### テスト用データベース作成
```typescript
import './fixtures/create-test-db';
// FUNC-000準拠のテストDBが ./cctop.db に作成される
```

### Python統合テスト
```bash
# 1. Pythonでダミーデータ生成
python3 scripts/dummy_data_generator.py --files 50 --days 7

# 2. Node.jsで読み込みテスト
npm run demo:python-data
```

## ⚠️ 注意事項

- これらのファイルは**テスト専用**です
- 本番環境では使用しないでください
- 生成されるデータベースファイルは開発・テスト目的のみです
- `/tmp`ディレクトリにファイルが作成される場合があります

## 🔄 関連ドキュメント

- `../python-integration-test.md` - Python統合テスト手順
- `../README.md` - テストスイート全体の説明
- `../scripts/full_integration_test.sh` - 自動統合テスト