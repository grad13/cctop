# コンテナ環境でのネイティブモジュール問題の解決策

**問題発生日**: 2025-06-30  
**解決日**: 2025-06-30  

## 問題の詳細

### 症状
```
Error: /workspace/cctop/node_modules/sqlite3/build/Release/node_sqlite3.node: invalid ELF header
```

### 原因
- macOS（Mach-O形式）でビルドされたnode_modulesをLinux環境で実行
- ネイティブモジュール（C++で書かれた拡張）はプラットフォーム固有

### 即座の解決
```bash
cd /workspace/cctop
npm rebuild sqlite3
```

## 根本的な解決策

### 1. コンテナ専用の.dockerignore追加
```bash
# /workspace/cctop/.dockerignore
node_modules/
*.node
build/
```

### 2. コンテナ起動時の自動ビルド
```bash
# containers/run-claude-official.sh に追加
container run -it -v /Users/takuo-h/Workspace/Code/06-cctop:/workspace claude-code-official zsh -c "cd /workspace/cctop && npm install && zsh"
```

### 3. プラットフォーム別ビルドの分離
```json
// package.json に追加
"scripts": {
  "postinstall": "npm rebuild sqlite3",
  "clean": "rm -rf node_modules package-lock.json"
}
```

### 4. 開発者への注意事項
- macOSとLinuxコンテナ間でnode_modulesを共有しない
- コンテナ環境では必ず`npm install`または`npm rebuild`を実行
- ネイティブモジュールを含むプロジェクトでは特に注意

## 影響を受けるモジュール
- sqlite3
- chokidar（fsevents）
- その他のネイティブ拡張を含むモジュール

## 推奨ワークフロー
1. ホストマシンでの開発: 通常通り
2. コンテナでのテスト: 
   - 初回: `npm install`
   - 更新時: `npm rebuild`
3. CI/CD: 各環境で独立してビルド