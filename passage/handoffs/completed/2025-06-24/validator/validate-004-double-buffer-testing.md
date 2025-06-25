# Validator Task: 二重バッファ描画機能の検証

**作成日**: 2025年6月25日  
**作成者**: Architect Agent  
**優先度**: 高（Phase 1機能）  
**関連仕様**: FUNC-018-double-buffer-rendering.md  
**前提条件**: Builder実装完了後  

## 背景

二重バッファ描画機能により、画面のちらつき（フリッカー）を防止する実装が行われます。この機能が正しく動作し、パフォーマンスに悪影響を与えていないことを検証する必要があります。

## テスト要件

### 1. 視覚的品質テスト

#### 1.1 ちらつき防止の確認
```bash
# 高頻度更新のテスト環境を作成
for i in {1..100}; do
  touch "test_file_$i.txt"
done

# cctopを起動
cctop

# 別ターミナルで連続的にファイル更新
while true; do
  echo "update" >> test_file_$((RANDOM % 100 + 1)).txt
  sleep 0.1
done
```

**確認項目**:
- [ ] 画面更新時にちらつきが発生しないこと
- [ ] 文字が一瞬消えたり、部分的に表示されたりしないこと
- [ ] 色の変化がスムーズであること

#### 1.2 カーソル制御の確認
- [ ] 描画中にカーソルが見えないこと
- [ ] 描画完了後、カーソルが適切な位置に表示されること
- [ ] カーソルの点滅が正常であること

### 2. パフォーマンステスト

#### 2.1 CPU使用率測定
```bash
# CPU使用率のモニタリング
top -pid $(pgrep -f cctop)

# または
htop -p $(pgrep -f cctop)
```

**合格基準**:
- アイドル時: CPU使用率 < 1%
- 通常更新時: CPU使用率 < 5%
- 高頻度更新時: CPU使用率 < 20%

#### 2.2 メモリ使用量測定
```bash
# 長時間実行テスト（1時間）
cctop &
PID=$!

# 10分ごとにメモリ使用量を記録
for i in {1..6}; do
  ps -p $PID -o rss,vsz
  sleep 600
done
```

**合格基準**:
- メモリリークがないこと（使用量が増加し続けない）
- 1000行表示時のメモリ使用量 < 50MB

#### 2.3 描画性能測定
```bash
# 大量ファイルでの性能テスト
mkdir large_test && cd large_test
for i in {1..5000}; do
  touch "file_$i.txt"
done

# 描画時間の測定
time cctop
```

**合格基準**:
- 初期描画: < 1秒（5000ファイル）
- 更新描画: < 100ms（単一ファイル変更）

### 3. 互換性テスト

#### 3.1 ターミナルエミュレータ
以下の環境で動作確認：

**macOS**:
- [ ] Terminal.app
- [ ] iTerm2
- [ ] Alacritty
- [ ] VS Code統合ターミナル

**Linux**:
- [ ] GNOME Terminal
- [ ] Konsole
- [ ] xterm

**Windows**:
- [ ] Windows Terminal
- [ ] PowerShell
- [ ] Git Bash

#### 3.2 SSH接続テスト
```bash
# リモート環境での動作確認
ssh remote-server
cctop
```

**確認項目**:
- [ ] 遅延があっても描画が崩れないこと
- [ ] ANSIエスケープシーケンスが正しく処理されること

### 4. 回帰テスト

#### 4.1 既存機能の動作確認
- [ ] ファイル監視機能が正常に動作
- [ ] 色分け表示が正しい
- [ ] オプション（-u, -e等）が機能する
- [ ] Ctrl+Cで正常終了する

#### 4.2 エッジケース
```bash
# 画面サイズ変更テスト
cctop &
# ターミナルウィンドウをリサイズ

# 極小画面テスト（10x10）
printf '\e[8;10;10t'
cctop

# 極大画面テスト（300x100）
printf '\e[8;100;300t'
cctop
```

### 5. ストレステスト

#### 5.1 長時間実行
```bash
# 24時間連続実行テスト
cctop > /dev/null 2>&1 &
PID=$!

# 1時間ごとにプロセス状態を確認
for i in {1..24}; do
  echo "Hour $i: $(ps -p $PID -o pid,state,rss)"
  sleep 3600
done
```

#### 5.2 高負荷環境
```bash
# CPUを意図的に高負荷にした状態でテスト
stress --cpu 8 --timeout 60s &
cctop
```

## 不具合チェックリスト

### 描画関連
- [ ] 画面がちらつく
- [ ] 残像が残る
- [ ] 文字が欠ける
- [ ] 色が正しく表示されない
- [ ] カーソルが消えたまま

### パフォーマンス関連
- [ ] 動作が重い
- [ ] メモリ使用量が増加し続ける
- [ ] CPU使用率が異常に高い
- [ ] 描画が遅延する

### 互換性関連
- [ ] 特定のターミナルで動作しない
- [ ] SSH経由で表示が崩れる
- [ ] 画面サイズ変更で異常終了

## テスト結果レポートフォーマット

```markdown
## 二重バッファ描画機能 検証レポート

### テスト環境
- OS: [例: macOS 14.0]
- Terminal: [例: iTerm2 3.4.0]
- Node.js: [例: v20.0.0]
- cctop version: [例: v0.1.0.0]

### テスト結果サマリ
- 視覚的品質: [合格/不合格]
- パフォーマンス: [合格/不合格]
- 互換性: [合格/不合格]
- 回帰テスト: [合格/不合格]

### 詳細結果
[各テスト項目の結果を記載]

### 発見された問題
[問題がある場合は詳細を記載]

### 推奨事項
[改善提案があれば記載]
```

## 完了条件

1. 全テストケースの実行完了
2. ちらつきが完全に解消されていること
3. パフォーマンス基準を満たしていること
4. 5種類以上のターミナルで動作確認済み
5. 24時間連続実行で問題なし
6. テスト結果レポートの作成完了

## 参考資料

- [FUNC-018-double-buffer-rendering.md](/documents/visions/functions/FUNC-018-double-buffer-rendering.md)
- [Builder実装タスク](/passage/handoffs/pending/builder/task-003-double-buffer-rendering.md)
- [ANSI Escape Sequences Reference](https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797)