# CCTop データベース配置設計

**作成日**: 2025-06-22  
**作成者**: Inspector Agent  
**目的**: データベースディレクトリ配置の設計意図と根拠

## 📁 グローバル配置設計

### 配置仕様
- **ディレクトリ**: `~/.cctop/`
- **データベースファイル**: `activity.db`
- **完全パス**: `~/.cctop/activity.db`

### 設計根拠

#### 1. Claude Code使用ケース対応
**問題**: プロジェクトローカル配置での重複問題
```
parent-project/
├── sub-project/
│   └── .cctop/cctop.db  # 重複データ
└── .cctop/cctop.db      # 重複データ
```

**解決**: グローバル配置による統一管理
- 上下関係のディレクトリでcctop実行時も同一データベース
- ファイル活動の重複記録を回避
- Claude Codeの典型的な作業パターンに対応

#### 2. ユーザビリティの向上
- **一元管理**: 全プロジェクトの活動履歴を統合表示
- **横断分析**: プロジェクト間での活動パターン分析が可能
- **データの永続性**: プロジェクト削除後も履歴が保持

#### 3. 運用上の利点
- **バックアップ容易**: 1箇所のディレクトリ管理のみ
- **設定の一元化**: 将来の`~/.cctoprc`との整合性
- **権限管理**: ホームディレクトリでの統一的な権限管理

## 🔧 実装仕様

### デフォルト設定
```javascript
// src/cctop-service.js
this.dbPath = options.dbPath || require('os').homedir() + '/.cctop/activity.db';

// bin/cctop
.option('-d, --database <path>', 'database path', require('os').homedir() + '/.cctop/activity.db')
```

### カスタマイズ対応
```bash
# プロジェクト固有データベース（必要に応じて）
./bin/cctop -d ~/projects/my-project/activity.db

# 複数環境での分離
./bin/cctop -d ~/.cctop/development.db
./bin/cctop -d ~/.cctop/production.db
```

## 📊 ディレクトリ構成

### 標準構成
```
~/.cctop/
├── activity.db          # メインデータベース
├── activity.db-wal      # WALファイル（自動生成）
├── activity.db-shm      # 共有メモリファイル（自動生成）
└── .cctoprc             # グローバル設定（Phase 4実装予定）
```

### 権限設定
- **ディレクトリ**: 755 (rwxr-xr-x)
- **データベースファイル**: 644 (rw-r--r--)
- **設定ファイル**: 600 (rw-------)

## 🔄 マイグレーション

### 既存プロジェクトローカルからの移行
```bash
# 既存データがある場合の移行手順
if [ -f "./.cctop/cctop.db" ]; then
  mkdir -p ~/.cctop
  cp ./.cctop/cctop.db ~/.cctop/activity.db
  echo "Migrated local database to global location"
fi
```

## ⚠️ 注意事項

### セキュリティ考慮
- **個人情報**: ファイルパス情報が含まれるため、適切な権限設定が必要
- **バックアップ**: 定期的なバックアップ推奨
- **アクセス制御**: 他ユーザーからの読み取り防止

### パフォーマンス影響
- **ディスク容量**: 全プロジェクトの履歴蓄積によるディスク使用量増加
- **検索性能**: データ量増加に伴う検索性能への影響（インデックス最適化で対応）

---

**設計判断**: Claude Codeの使用パターンを重視し、重複回避とユーザビリティを優先してグローバル配置を採用