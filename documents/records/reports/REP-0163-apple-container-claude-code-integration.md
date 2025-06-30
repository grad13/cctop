# REP-20250630-001: Apple Container Claude Code統合調査レポート

**作成日**: 2025年6月30日  
**作成者**: Builder Agent  
**カテゴリ**: 2. 分析・調査レポート  
**ステータス**: 活動中  

## 概要

cctopプロジェクトのクラッシュ問題デバッグのため、Apple Container内でClaude Codeを実行する環境構築方法を調査した。本レポートでは、公式ドキュメントとコミュニティの知見をまとめる。

## 背景

- **問題**: cctopで`.cctop`ディレクトリ削除時にターミナル・ブラウザがクラッシュする深刻な問題が発生
- **目的**: 安全な隔離環境でClaude Codeを使用してデバッグを実施
- **選択技術**: Apple Container（Appleシリコン向けLinuxコンテナ環境）

## 調査結果

### 1. Apple ContainerでのClaude Code実行方法

#### 1.1 Zennの記事による方法
参考: [Claude Code を Apple Container の中で動かす](https://zenn.dev/schroneko/articles/claude-code-on-apple-container)

**手順**:
```bash
# 1. Apple Container インストール
# container-0.1.0-installer-signed.pkg をダウンロード・インストール

# 2. システム起動
container system start

# 3. 作業ディレクトリ作成
mkdir claude-code-container && cd claude-code-container

# 4. Anthropic公式Dockerfileをダウンロード
curl -O https://raw.githubusercontent.com/anthropics/claude-code/main/.devcontainer/Dockerfile
curl -O https://raw.githubusercontent.com/anthropics/claude-code/main/.devcontainer/init-firewall.sh

# 5. ビルド
container build -t claude-code .

# 6. 実行
container run -it claude-code zsh
claude --dangerously-skip-permissions
```

#### 1.2 GitHub claude-docker プロジェクト
参考: [VishalJ99/claude-docker](https://github.com/VishalJ99/claude-docker)

コミュニティ管理のDocker設定で、以下の特徴がある：
- MCP（Model Context Protocol）サーバー事前設定
- Twilio通知機能
- 永続的な会話履歴

### 2. 公式ドキュメントからの知見

#### 2.1 npmによるインストール方法
```bash
npm install -g @anthropic-ai/claude-code
```

#### 2.2 セキュリティ上の利点
- **多層セキュリティアプローチ**: 精密なアクセス制御
- **デフォルト拒否ポリシー**: ホワイトリスト以外の外部接続をブロック
- **隔離された開発環境**: メインシステムから分離

### 3. 実装上の課題と解決策

#### 3.1 単一ファイルマウントの問題
**問題**: Apple Containerは単一ファイル（claudeバイナリ）のマウントをサポートしない
```
Error Domain=VZErrorDomain Code=2 "A directory sharing device configuration is invalid."
```

**解決策**: 一時ディレクトリにバイナリをコピーしてディレクトリとしてマウント

#### 3.2 Claude Codeインストールスクリプトの404エラー
**問題**: 
```bash
curl -fsSL https://storage.googleapis.com/public-download-production/claude-code/install.sh | sh
# curl: (22) The requested URL returned error: 404
```

**解決策**: npmを使用した直接インストール、または公式.devcontainerの使用

## 推奨アプローチ

### プロダクション環境向け
1. Anthropic公式の`.devcontainer`設定を使用
2. プロジェクト全体をボリュームマウント
3. コンテナ内でnpmインストール

### デバッグ環境向け（cctopプロジェクト用）
```bash
# プロジェクトルートから
container run -it \
  -v /Users/takuo-h/Workspace/Code/06-cctop:/workspace \
  claude-code-official zsh

# コンテナ内で
cd /workspace
npm install -g @anthropic-ai/claude-code
claude --dangerously-skip-permissions
```

## 関連ファイル

- `cctop/Dockerfile` - カスタムDockerfile（プロジェクト固有）
- `cctop/container-debug.sh` - デバッグ用スクリプト
- `.dockerignore` - ビルド最適化用

## 今後の課題

1. Apple Container用の最適な設定の確立
2. CI/CD環境への統合方法の検討
3. セキュリティポリシーの詳細設計

## 参考リンク

- [Apple Container GitHub](https://github.com/apple/container)
- [Claude Code公式ドキュメント](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic claude-code GitHub](https://github.com/anthropics/claude-code)

---

**キーワード**: Apple Container, Claude Code, Docker, コンテナ, デバッグ環境, --dangerously-skip-permissions, cctop, システムクラッシュ, Electron, JavaScript, 隔離環境, セキュリティ, MCP, devcontainer