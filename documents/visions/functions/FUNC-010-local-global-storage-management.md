# FUNC-010: ローカル・グローバル設定管理機能

**作成日**: 2025年6月25日 15:00  
**更新日**: 2025年6月25日 20:30  
**作成者**: Architect Agent  
**ステータス**: Active  
**Version**: 0.2.0.0

## 📊 機能概要

cctopの設定・データベースを現在ディレクトリ（.cctop/）またはユーザーホーム（~/.cctop/）で管理する選択式システム。

**ユーザー価値**: 
- ディレクトリ毎の独立した設定
- グローバル設定との切り替え
- 明示的な設定場所制御

## 🎯 機能境界

### ✅ **実行する**
- ローカル（.cctop/）をデフォルト使用
- --globalオプションでグローバル（~/.cctop/）使用
- --initオプションでローカル初期化
- 設定不在時の明確なエラー案内

### ❌ **実行しない**
- 自動的なホームディレクトリ作成（明示的指定時のみ）
- 設定の継承・マージ（シンプルな切り替えのみ）
- 複雑な優先順位システム

## 📋 必要な仕様

### **基本動作仕様**

#### **1. デフォルト動作**
- カレントディレクトリの`.cctop/`を使用
- 存在しない場合はエラーメッセージとともに初期化方法を案内
- 自動作成は行わない（明示的な意図を重視）

#### **2. オプション指定**
- `--init`: カレントディレクトリに`.cctop/`を初期化（作成のみ）
- `--global`: ホームディレクトリの`~/.cctop/`を使用（自動作成可）
- `--local`: 明示的にローカル`.cctop/`を指定

#### **3. ディレクトリ構造**
```
.cctop/
├── config.json      # 設定ファイル
├── activity.db      # イベントデータベース
├── plugins/         # プラグイン用
├── cache/           # 一時ファイル（オプション）
└── .gitignore       # Git除外設定
```

### **設定ファイル仕様**

設定ファイル（config.json）の詳細構造については、**FUNC-011（階層的設定管理機能）**を参照。

#### **.gitignore内容**
```
# cctop monitoring data
activity.db
activity.db-*
cache/
logs/
```

### **エラーメッセージ仕様**

#### **設定不在時のメッセージ**
```
❌ No cctop configuration found

You are not in a cctop-enabled directory.

To get started:
  cctop --init     # Initialize this directory
  cctop --global   # Use global configuration

Learn more: cctop --help
```

#### **初期化成功時のメッセージ**
```
✅ Initialized cctop in ./.cctop/
📝 Edit ./.cctop/config.json to customize settings
🚀 Run 'cctop' to start monitoring
```

## 🔧 実装ガイドライン

### **設定パス解決の実装方針**

1. **StoragePathResolver**: 設定ディレクトリパスを解決
   - デフォルト: カレントディレクトリの`.cctop/`
   - `--global`指定時: ホームディレクトリの`~/.cctop/`
   - 存在確認と初期化処理を分離

2. **ConfigManager**: 設定ファイル管理
   - config.jsonの読み込み・検証
   - データベースパスの相対パス解決
   - デフォルト設定の適用

3. **CLIインターフェース**: コマンドライン引数処理
   - `--init`: 初期化実行（作成して終了）
   - `--global/--local`: モード切り替え
   - エラー時の適切なメッセージ表示

## 🧪 テスト要件

1. **基本動作確認**
   - デフォルト動作（ローカル設定）のエラー処理
   - `--init`オプションによる初期化
   - `--global`オプションの動作
   - `--local`オプションの明示的指定

2. **設定管理確認**
   - config.json読み込み・デフォルト値適用
   - データベースパス解決（相対・絶対）
   - 設定不在時のエラーメッセージ

3. **実環境確認**
   - 複数ディレクトリでの独立動作

## 💡 使用シナリオ

### **基本的な使用フロー**
```bash
cd my-directory
cctop                 # エラー: 設定なし
cctop --init          # 初回: .cctop/作成のみ
cctop                 # 以降: ローカル設定で監視開始
```

### **グローバル設定の使用**
```bash
# ホームディレクトリの共通設定を使用
cctop --global          # 初回: ~/.cctop/作成
cd any-directory
cctop --global          # どのディレクトリでも同じ設定
```

## 🎯 成功指標

1. **明示的制御**: 設定場所を常にユーザーが制御
2. **シンプル**: 複雑な継承なし、明快な動作
3. **非侵襲的**: 意図しないディレクトリ作成なし