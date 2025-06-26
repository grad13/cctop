# HO-20250626-015: --globalオプション削除の緊急修正要求

**作成日**: 2025年6月26日 22:30  
**作成者**: Validator Agent  
**宛先**: Builder Agent  
**優先度**: **Critical**  
**カテゴリ**: Bug Fix & FUNC-105 Compliance  

## 🚨 緊急修正要求

HO-20250626-014の検証結果、**FUNC-105仕様に対する重大な違反**が発見されました。即座の修正が必要です。

### 発見された重大問題

1. **--global/--localオプションが削除されていない**
2. **グローバル設定（~/.cctop/）が作成される**  
3. **不明オプションのエラーハンドリングなし**

## 🔍 具体的な修正箇所

### 1. --global/--localオプションの完全削除

**現状**: 以下のコマンドが正常に実行される（FUNC-105違反）
```bash
node bin/cctop --global  # ❌ エラーが出ずに実行される
node bin/cctop --local   # ❌ エラーが出ずに実行される
```

**修正要求**: FUNC-104準拠のエラーハンドリング実装
```bash
node bin/cctop --global
# 期待出力:
# Error: Unknown option: --global
# Try 'cctop --help' for more information.
```

**修正対象**: 
- `bin/cctop` の CLI引数解析部分
- `src/config/config-manager.js` の引数処理部分
- その他の関連ファイル

### 2. 不明オプションのエラーハンドリング実装

**現状**: 
```bash
node bin/cctop --unknown-option  # ❌ 無視して実行継続
```

**修正要求**: bin/cctopの引数解析ループに追加
```javascript
// 現在のループの最後に追加
else {
  console.error(`Error: Unknown option: ${arg}`);
  console.error("Try 'cctop --help' for more information.");
  process.exit(1);
}
```

### 3. グローバル設定作成の完全禁止

**現状**: ~/.cctop/ディレクトリが作成される
```bash
ls -la ~/.cctop/
# 結果: ディレクトリが存在（FUNC-105違反）
```

**修正要求**: 
- ConfigManagerでグローバル設定パスの使用を完全禁止
- 全処理を.cctop/（カレントディレクトリ）のみに制限

## 🧪 修正確認方法

### Critical Tests (必須合格)

```bash
# Test 1: --globalオプション削除確認
node bin/cctop --global
# 期待結果: "Error: Unknown option: --global"

# Test 2: --localオプション削除確認  
node bin/cctop --local
# 期待結果: "Error: Unknown option: --local"

# Test 3: 不明オプションエラー確認
node bin/cctop --invalid-option
# 期待結果: "Error: Unknown option: --invalid-option"

# Test 4: グローバル設定不作成確認
rm -rf ~/.cctop/
mkdir test-project && cd test-project
timeout 3s node bin/cctop || true
ls ~/.cctop/
# 期待結果: "No such file or directory"

# Test 5: ローカル設定正常作成確認
ls .cctop/
# 期待結果: config.json, .gitignore が存在
```

### Regression Tests (既存機能確認)

```bash
# Test 6: ヘルプメッセージ確認
node bin/cctop --help
# 期待結果: 正常なヘルプ表示（--global/--local記載なし）

# Test 7: 正常な監視開始確認
timeout 3s node bin/cctop || true
# 期待結果: .cctop/に設定ファイル作成、エラーなし
```

## 📋 実装ガイドライン

### Step 1: CLI引数解析の強化
1. `bin/cctop`の引数解析ループの修正
2. 未知オプションの検出と適切なエラーメッセージ
3. FUNC-104準拠のエラー形式実装

### Step 2: --global/--local処理の完全除去
1. 全ソースコードから`--global`/`--local`の検索・除去
2. 関連する条件分岐・設定処理の削除
3. ConfigManagerでのパス決定ロジック単純化

### Step 3: グローバル設定の完全禁止
1. `~/.cctop/`パスへの参照を完全除去
2. `.cctop/`（カレントディレクトリ）のみ使用
3. FUNC-105準拠の実装確認

### Step 4: テスト実行と確認
1. 上記Critical Testsを全て実行
2. 全テストの合格確認
3. Regression Testsで既存機能確認

## ⚠️ 注意事項

### 破壊的変更の確認
- 既存のグローバル設定を使用しているユーザーへの影響
- 移行ガイドの必要性（ドキュメント更新）

### 関連ファイルの確認
以下のファイルで--global/--local関連コードの確認が必要：
- `bin/cctop`
- `src/config/config-manager.js`  
- `src/interfaces/cli-interface.js`
- その他設定関連ファイル

## 🎯 成功基準

### 必須要件 (Critical)
- [ ] --global/--localオプションの完全削除
- [ ] 不明オプションの適切なエラー処理
- [ ] グローバル設定作成の完全禁止
- [ ] ローカル設定（.cctop/）のみ使用

### 推奨要件
- [ ] FUNC-104準拠のエラーメッセージ形式
- [ ] 既存機能への悪影響なし
- [ ] 設定ファイル構造の整合性維持

## 📝 完了報告要求

修正完了後、以下を含む報告をお願いします：

1. **修正内容**: 変更したファイルと修正箇所
2. **テスト結果**: Critical Tests全項目の結果
3. **確認事項**: Regression Tests結果
4. **追加対応**: 関連ドキュメント更新の必要性

---

**緊急度**: この修正は **FUNC-105仕様準拠のために必須** です。他の開発作業よりも優先して対応をお願いします。