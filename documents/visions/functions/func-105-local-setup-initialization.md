# FUNC-105: ローカル設定・初期化機能

**作成日**: 2025年6月26日 19:30  
**更新日**: 2025年6月26日 19:30  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

## 📊 機能概要

cctopの設定・データベースを現在ディレクトリ（.cctop/）で管理し、初回実行時の自動初期化を行うシンプルなローカル設定システム。

**統合元機能**:
- **FUNC-100**: ローカル設定管理機能
- **FUNC-103**: postinstall自動初期化機能

**ユーザー価値**: 
- プロジェクト毎の独立した設定管理
- 設定とコードの一体管理（バックアップ・移行が簡単）
- 予想通りの動作（実行場所で設定が決まる）
- インストール後すぐに使える状態

## 🎯 機能境界

### ✅ **実行する**
- ローカル（.cctop/）のみ使用
- 初回実行時の自動ディレクトリ作成
- 設定ファイルの自動生成
- .gitignoreファイルの自動作成
- npm postinstall時の基本セットアップ

### ❌ **実行しない**
- グローバル設定管理（~/.cctop/使用禁止）
- 設定の継承・マージ機能
- 複雑な優先順位システム
- 既存設定の移行・コピー機能
- 対話的な確認プロンプト

## 📋 必要な仕様

### **基本動作仕様**

#### **1. デフォルト動作**
- カレントディレクトリの`.cctop/`を使用
- 存在しない場合は自動作成してから監視開始
- 作成時に初期設定ファイルも生成

#### **2. ディレクトリ構造**
```
.cctop/
├── config.json      # 設定ファイル
├── activity.db      # イベントデータベース
├── activity.db-wal  # SQLite自動生成
├── activity.db-shm  # SQLite自動生成
├── plugins/         # プラグイン用（将来拡張）
├── cache/           # 一時ファイル（オプション）
└── .gitignore       # Git除外設定
```

### **設定ファイル仕様**

設定ファイル（config.json）の詳細構造については、**FUNC-101（階層的設定管理機能）**を参照。

#### **.gitignore内容**
```
# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
```

### **初回実行時のメッセージ**

```
Created configuration in ./.cctop/
Edit ./.cctop/config.json to customize settings
Starting monitoring...
```

## 🎯 実装内容

### **postinstall自動セットアップ**

#### package.json設定
```json
{
  "scripts": {
    "postinstall": "node scripts/postinstall.js"
  }
}
```

#### scripts/postinstall.js
```javascript
const fs = require('fs');
const path = require('path');

// グローバルインストール時のみ簡単なメッセージ表示
// ローカル.cctop/の作成は初回実行時に行う
if (process.env.npm_config_global) {
  console.log('cctop installed globally');
  console.log('Run "cctop" in your project directory to start monitoring');
} else {
  console.log('cctop installed locally');
  console.log('Run "cctop" to initialize .cctop/ and start monitoring');
}
```

### **ランタイム初期化処理**

#### 実行時の自動初期化
1. **DirectoryManager**: ディレクトリ管理
   - `.cctop/`の存在確認
   - 不在時の自動作成（config.json, .gitignore含む）
   - 存在確認と自動作成処理を統合

2. **ConfigManager**: 設定ファイル管理
   - config.jsonの読み込み・検証
   - 初回実行時のデフォルト設定作成
   - データベースパスの相対パス解決

3. **CLIインターフェース**: コマンドライン引数処理
   - ローカル設定のみ使用
   - 初回実行を検出して自動初期化
   - 作成場所の明確な表示

## 🧪 テスト要件

1. **基本動作確認**
   - デフォルト動作（ローカル設定）の自動作成
   - 既存設定での起動
   - 設定ファイルの適切な初期化

2. **設定管理確認**
   - config.json初期作成・デフォルト値
   - データベースパス解決（相対・絶対）
   - 初回実行メッセージの表示

3. **実環境確認**
   - 複数ディレクトリでの独立動作
   - プロジェクト間での設定分離

4. **postinstall確認**
   - npm install時の適切なメッセージ表示
   - グローバル・ローカルインストールの区別
   - エラーなしでの完了

## 💡 使用シナリオ

### **基本的な使用フロー**
```bash
cd my-project
cctop                 # 初回: .cctop/自動作成して監視開始
cctop                 # 2回目以降: 既存設定で監視開始
```

### **複数プロジェクトの独立管理**
```bash
# プロジェクトA
cd /project-a
cctop                 # project-aの.cctop/設定で監視

# プロジェクトB
cd /project-b  
cctop                 # project-bの.cctop/設定で監視（独立）
```

### **npm インストール体験**
```bash
# ローカルインストール
npm install cctop
# → "Run cctop to initialize .cctop/ and start monitoring"

# 初回実行
cctop
# → .cctop/作成 + 監視開始
```

## 📊 期待効果

### **システム基盤確立**
- プロジェクト毎の独立した設定環境
- 設定とコードの一体管理によるポータビリティ向上
- 予想通りの動作による学習コスト削減

### **開発効率向上**
- 初回実行での即座な利用開始
- 複雑な設定手順の排除
- プロジェクト間での設定干渉の完全回避

### **運用負荷軽減**
- シンプルな設定管理による保守性向上
- バックアップ・移行の簡素化
- トラブルシューティングの容易化

## 🔗 関連機能

- **FUNC-000**: SQLiteデータベース基盤（データベース作成）
- **FUNC-101**: 階層的設定管理（config.json構造）
- **FUNC-102**: ファイル監視上限管理（設定値の利用）
- **FUNC-104**: CLI引数統合（コマンドライン処理）

## 📝 移行・廃止情報

### **統合元機能**
- **FUNC-100**: ローカル・グローバル設定管理機能 → **廃止**
- **FUNC-103**: postinstall自動初期化機能 → **廃止**

### **主な変更点**
- **グローバル設定**: 完全削除（~/.cctop/使用禁止）
- **postinstall**: 簡素化（メッセージのみ、実際の初期化は初回実行時）
- **統合効果**: 設定管理の一元化・複雑性の排除

---

**理念**: 「実行場所で設定が決まる」シンプルで予想通りの動作を実現し、プロジェクト毎の独立した監視環境を提供する。