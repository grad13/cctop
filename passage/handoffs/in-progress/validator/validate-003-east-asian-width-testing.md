# Validator Task: East Asian Width対応のテスト検証

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**優先度**: 高（Phase 1機能）  
**関連仕様**: FUNC-017-east-asian-width-display.md  
**前提条件**: Builder実装完了後  

## 背景

日本語ファイル名での表示崩れ問題に対応するため、East Asian Width対応が実装されます。この実装が正しく動作し、既存機能に影響を与えていないことを検証する必要があります。

## テスト要件

### 1. 機能テスト

#### 1.1 各言語での表示確認
以下のテストファイルを作成して表示を確認：

```bash
# テストファイルの作成
touch "test_english_only.txt"
touch "テスト日本語ファイル.md"
touch "测试中文文件.txt"
touch "테스트한국어파일.js"
touch "test混在ファイル名.html"
touch "🎉絵文字を含むファイル.txt"
touch "very_long_filename_that_should_be_truncated_with_ellipsis_これは省略されるべき長いファイル名です.md"
```

**確認項目**:
- 各列が正しく整列していること
- 日本語・中国語・韓国語の文字が2文字幅として扱われていること
- 省略表示（...）が正しく機能していること

#### 1.2 表示モードの確認
```bash
# 通常表示
cctop

# ユニークモード
cctop -u

# 特定イベントタイプ
cctop -e modify
```

### 2. パフォーマンステスト

#### 2.1 大量ファイルでの動作確認
```bash
# 1000個のテストファイル作成
for i in {1..500}; do
  touch "test_file_$i.txt"
  touch "テストファイル_$i.md"
done

# パフォーマンス測定
time cctop
```

**合格基準**:
- 1000ファイルの表示が1秒以内に完了すること
- メモリ使用量が異常に増加しないこと

### 3. 回帰テスト

#### 3.1 既存機能の動作確認
- 英語のみのファイル名で表示が変わっていないこと
- 色分けが正しく機能していること
- ファイルサイズ・行数の表示が正しいこと
- 相対パス表示が正しく機能していること

#### 3.2 エッジケース
```bash
# ゼロ幅文字
touch "test​zero​width.txt"  # ゼロ幅スペース含む

# 結合文字
touch "test👨‍👩‍👧‍👦family.txt"  # 結合絵文字

# RTL文字
touch "test_العربية.txt"  # アラビア文字

# 制御文字
touch $'test\ttab\nNewline.txt'  # タブ・改行含む
```

### 4. 統合テスト

#### 4.1 実際の使用シナリオ
```bash
# 実際のプロジェクトでの動作確認
cd ~/actual-project
cctop

# 監視しながらファイル作成
cctop &
touch "新しい日本語ファイル.md"
echo "content" > "新しい日本語ファイル.md"
```

### 5. ターミナル互換性テスト

以下の環境での動作確認：
- [ ] macOS Terminal.app
- [ ] iTerm2
- [ ] VS Code統合ターミナル
- [ ] Windows Terminal（WSL）
- [ ] Linux (Ubuntu) デフォルトターミナル

## テストチェックリスト

### 基本機能
- [ ] 日本語ファイル名が正しく表示される
- [ ] 中国語ファイル名が正しく表示される
- [ ] 韓国語ファイル名が正しく表示される
- [ ] 混在ファイル名が正しく表示される
- [ ] 長いファイル名が適切に省略される

### パフォーマンス
- [ ] 1000ファイルでの表示速度が1秒以内
- [ ] CPU使用率が異常に高くない
- [ ] メモリリークがない

### 互換性
- [ ] 英語のみのファイルで表示が変わらない
- [ ] 既存の色分けが機能している
- [ ] 各種オプション（-u, -e等）が正常動作

### エッジケース
- [ ] 絵文字を含むファイル名が処理できる
- [ ] 特殊文字・制御文字でクラッシュしない
- [ ] 異常に長いファイル名でもハングしない

## 不具合報告フォーマット

問題を発見した場合、以下の情報を含めて報告：

```markdown
### 問題の概要
[簡潔な説明]

### 再現手順
1. [手順1]
2. [手順2]
3. ...

### 期待される動作
[正しい動作の説明]

### 実際の動作
[問題のある動作の説明]

### 環境情報
- OS: [例: macOS 14.0]
- Terminal: [例: iTerm2 3.4.0]
- Node.js: [例: v20.0.0]
- cctop version: [例: v0.1.0.0]

### スクリーンショット
[可能であれば添付]
```

## 完了条件

1. 全テストケースの実行完了
2. 不具合がない、または全て修正済み
3. パフォーマンス基準を満たしている
4. 3つ以上のターミナル環境で動作確認済み
5. テスト結果レポートの作成

## 参考資料

- [FUNC-017-east-asian-width-display.md](/documents/visions/functions/FUNC-017-east-asian-width-display.md)
- [Builder実装タスク](/passage/handoffs/pending/builder/task-002-east-asian-width-implementation.md)
- [Unicode East Asian Width仕様](https://www.unicode.org/reports/tr11/)