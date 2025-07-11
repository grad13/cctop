# FUNC-105: ローカル設定・初期化機能

**作成日**: 2025年6月26日 19:30  
**更新日**: 2025年6月30日 16:00  
**作成者**: Architect Agent  
**Version**: 0.3.0.0  
**関連仕様**: FUNC-101, FUNC-106, FUNC-107, FUNC-108

## 📊 機能概要

初回実行時のセットアップ自動化およびローカル設定の管理を行う機能。

**ユーザー価値**: 
- 初回実行時のセットアップ簡略化
- プロジェクト固有の設定管理
- ゼロコンフィグでの開始

## 🎯 機能境界

### ✅ **実行する**
- `.cctop/`ディレクトリの自動作成
- デフォルト設定ファイルの生成
- 監視対象ディレクトリの初期化
- ユーザーガイドメッセージの表示

### ❌ **実行しない**
- グローバル設定の管理
- 設定ファイルの編集UI
- 既存設定のマイグレーション

## 📋 必要な仕様

### **初期化動作**

#### **1. デフォルト動作**
- カレントディレクトリの`.cctop/`を使用
- 存在しない場合は自動作成してから監視開始
- 作成時に初期設定ファイルも生成

#### **2. ディレクトリ構造**
```
.cctop/
├── config/                   # 設定ファイル用
│   ├── shared-config.json    # 共通設定（FUNC-101）
│   ├── daemon-config.json    # Daemon設定（FUNC-106）
│   └── cli-config.json       # CLI設定（FUNC-107）
├── themes/                   # カラーテーマ集（FUNC-108）
│   ├── current-theme.json    # 現在適用中の色設定
│   ├── default.json          # デフォルトテーマ
│   ├── high-contrast.json    # 高コントラストテーマ
│   └── custom/               # ユーザーカスタムテーマ
├── data/                     # データファイル用
│   ├── activity.db           # メインデータベース
│   ├── activity.db-wal       # SQLite WALファイル
│   └── activity.db-shm       # SQLite共有メモリ
├── logs/                     # ログファイル用
│   ├── daemon.log            # Daemonログ
│   └── cli.log               # CLIログ
├── runtime/                  # 実行時ファイル用
│   ├── daemon.pid            # DaemonプロセスID
│   └── daemon.sock           # Unixソケット
├── temp/                     # 一時ファイル用
└── .gitignore                # Git除外設定
```

### **設定ファイル仕様**

#### **3層設定アーキテクチャ**
- **shared-config.json**: 共通設定（FUNC-101で管理）
- **daemon-config.json**: Daemon専用設定（FUNC-106で管理）
- **cli-config.json**: CLI専用設定（FUNC-107で管理）
- **current-theme.json**: 色テーマ設定（FUNC-108で管理）

#### **.gitignore内容**
```
# cctop monitoring data
data/
logs/
runtime/
temp/

# User customizations
themes/custom/
```

### **初回実行時のメッセージ**

```
Created configuration in ./.cctop/
Configuration files:
  - .cctop/config/shared-config.json (common settings)
  - .cctop/config/daemon-config.json (daemon settings)
  - .cctop/config/cli-config.json (display settings)
  - .cctop/themes/current-theme.json (color theme)
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

#### postinstall.js内容
```javascript
// グローバル設定ディレクトリの初期化
const globalConfigDir = getGlobalConfigDir();
if (!fs.existsSync(globalConfigDir)) {
  createDefaultGlobalConfig(globalConfigDir);
  console.log(`Created global config in ${globalConfigDir}`);
}
```

### **手動セットアップ**

```bash
# 既存プロジェクトでの初期化
cctop init

# 別の場所で監視したい場合
cctop init /path/to/project

# ディレクトリ構造の確認
cctop init --dry-run
```

## 🎯 機能要件

### **初期化処理要件**
1. **ディレクトリ作成**: `.cctop/`以下の全ディレクトリ構造の自動作成
2. **設定ファイル生成**: 3層設定ファイルの作成
   - shared-config.json（共通設定）
   - daemon-config.json（Daemon設定）
   - cli-config.json（CLI設定）
3. **テーマ初期化**: デフォルトテーマの配置
   - default.json, high-contrast.json
   - current-theme.jsonの生成
4. **Git設定**: .gitignoreの自動生成
5. **権限設定**: 適切なファイル権限の設定

### **コマンド仕様**
1. **initコマンド**: 明示的な初期化実行
2. **自動初期化**: 監視開始時の自動セットアップ
3. **postinstall**: npm install後の自動セットアップ
4. **再実行保護**: 既存設定の保護
5. **dry-runモード**: 実際の作成前に確認

### **エラーハンドリング**
1. **権限エラー**: 書き込み権限がない場合の適切なエラーメッセージ
2. **既存ファイル**: 既存設定ファイルの保護と警告
3. **ディスク容量**: 容量不足時の警告

## 📊 期待効果

### **ユーザー体験向上**
- ゼロコンフィグでの即座利用開始
- 初回実行時のシームレスな体験
- 明確なセットアップガイド
- v0.3.0.0の3層設定アーキテクチャへのスムーズな移行

### **運用効率向上**
- プロジェクト毎の独立した設定管理
- 設定ファイルのバージョン管理可能
- チーム間での設定共有容易化

---

**核心価値**: 初回利用時の障壁を取り除き、v0.3.0.0の高度な設定管理をシームレスに開始