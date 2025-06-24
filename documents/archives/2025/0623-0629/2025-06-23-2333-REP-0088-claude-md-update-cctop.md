---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0623-0629
- 元パス: documents/records/reports/
- 検索キーワード: CLAUDE.md更新, cctopプロジェクト, 文書管理, プロジェクト移行, TimeBoxからcctop, 全面改訂, chokidarファイル監視, SQLite3イベント永続化, InkUI, ClassicUI, RDD開発原則, プロジェクト概要更新, 技術スタック更新, ディレクトリ構造, ESMモジュール問題, ink-v5-v6問題, プロジェクト名変更, ファイル監視ツール, リアルタイム監視

---

# REP-0088: CLAUDE.md更新作業 - cctopプロジェクト向け全面改訂

**作成日**: 2025年6月23日  
**カテゴリー**: 文書管理  
**タグ**: `#claude-md` `#documentation` `#cctop` `#project-update`

## 概要

CLAUDE.mdをTimeBoxプロジェクトからcctopプロジェクト向けに全面改訂する作業記録。

## 背景

- CLAUDE.mdには古いTimeBoxプロジェクトの名残が多数存在
- プロジェクトはcctop（Code Change Top）として独立
- ファイル監視ツールとしての現状に合わせた文書更新が必要

## 現状調査結果

### プロジェクト概要
- **名前**: cctop（Code Change Top）
- **バージョン**: v4.0.0
- **概要**: リアルタイムファイル監視・分析ツール
- **開発方式**: RDD（実動作駆動開発）

### 主要変更点

#### 削除した内容（TimeBox関連）
1. TaskGrid機能の説明
2. Quick Switch島間ナビゲーション
3. island-SPAアーキテクチャ
4. PHP/Composerバックエンドセットアップ
5. 本番サーバーデプロイメント情報
6. Web UI関連の設定

#### 追加した内容（cctop固有）
1. chokidarによるファイル監視機能
2. SQLite3によるイベント永続化
3. Ink UI / Classic UIの説明
4. cctop実行コマンド
5. RDD開発原則
6. 現在の技術スタック情報

## 更新ドラフト構成

### 維持した部分
- Dominant原則（P040、階層性原則、DDD1、DDD2）
- 5エージェント権限システム
- 言語設定
- プロトコル管理システム
- 各種プロセス（incident対応、デバッグ、文書管理等）

### 大幅改訂した部分
1. **プロジェクト概要**
   - cctopの機能説明に全面更新
   - アーキテクチャ図を簡潔化

2. **開発コマンド**
   - `cctop` / `cctop ink` / `cctop classic`
   - `npm run dev` / `npm test` / `npm run test:rdd`

3. **技術スタック**
   - chokidar@3.5.3
   - sqlite3@5.1.6  
   - ink@5.2.1（注：package.jsonはink@6.0.0だが、ESM問題でv5使用中）

## 技術的考慮事項

### Ink v5 vs v6問題
- package.jsonではink@6.0.0が記載
- 実際はESモジュール問題でv5を使用
- CLAUDE.mdには実使用バージョン（v5）を記載

### ディレクトリ構造
```
cctop/
├── bin/cctop        # メインエントリーポイント
├── src/             
│   ├── core/        # DB、監視機能
│   ├── ui/          # Ink、Classic UI
│   └── utils/       
└── test/            
```

## 結論

CLAUDE.mdをcctopプロジェクトの現状に合わせて全面改訂完了。TimeBoxプロジェクトの名残を除去し、ファイル監視ツールとしての明確な位置づけを反映した。