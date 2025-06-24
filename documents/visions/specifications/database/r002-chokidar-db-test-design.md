# [chokidar] → [DB] テスト設計計画書

**Document ID**: r002-chokidar-db-test-design  
**Date**: 2025-06-22  
**Created**: 2025-06-22 23:55  
**Author**: Builder Agent  
**Status**: Active  
**Purpose**: cctop v4.0.0の最重要部分である[chokidar] → [DB]接続の完全なテスト設計

## 🎯 設計目的

cctop v4.0.0の成功は**[chokidar] → [DB]の確実な動作**にかかっている。この部分が不安定では、後続のすべての機能（表示・統計・フィルタリング）が無意味になる。RDD方式に基づき、この部分を100%確実にするテスト設計を行う。

## 📊 chokidar → cctop イベント変換仕様

### イベント変換テーブル

| chokidar出力 | cctop記録 | 条件 | 説明 |
|-------------|----------|------|------|
| `add` | `Find` | 初期スキャン中 | 既存ファイル発見 |
| `add` | `Create` | リアルタイム監視中 | 新規ファイル作成 |
| `addDir` | なし | 初期スキャン中 | 既存ディレクトリ発見（記録しない） |
| `addDir` | `Create` | リアルタイム監視中 | 新規ディレクトリ作成 |
| `change` | `Modify` | 常時 | ファイル変更（初期スキャンでは発生しない） |
| `unlink` | `Delete` | 常時 | ファイル削除 |
| `unlinkDir` | `Delete` | 常時 | ディレクトリ削除 |
| `ready` | なし | 1回のみ | 初期スキャン完了シグナル（記録しない） |
| `error` | `error` | 常時 | エラーイベント |
| `raw` | `raw` | 常時 | 生FSイベント（デバッグ用） |

### 必須メタデータ仕様

| メタデータ項目 | データ型 | 説明 | 取得方法 | 条件・制約 | テスト要件 |
|-------------|---------|------|---------|----------|----------|
| `file_size` | INTEGER | ファイルサイズ（bytes） | `fs.statSync().size` | 正確なバイト数、必須 | Buffer.byteLength()と一致 |
| `line_count` | INTEGER | ファイル行数 | 改行文字カウント | テキストのみ、バイナリはnull | 手動カウントと一致 |
| `block_count` | INTEGER | ディスクブロック数 | `fs.statSync().blocks` | Unix系のみ、Windowsはnull | 実際のブロック使用量 |
| `timestamp` | INTEGER | イベント発生時刻 | `Date.now()` | Unix ms、±50ms精度 | chokidarイベント時刻との差分 |
| `file_path` | TEXT | 絶対パス | `path.resolve()` | 正規化済み、必須 | 実際のファイルパスと完全一致 |
| `inode` | INTEGER | inode番号 | `fs.statSync().ino` | Unix系のみ、Windowsはnull | 移動前後での一致確認 |

#### 詳細取得ロジック

**file_size（ファイルサイズ）**
- **目的**: ファイル変更の検出・統計情報
- **取得**: `fs.statSync(filePath).size`
- **検証**: 作成時のcontent長と一致確認
- **エラー処理**: ファイル削除済みの場合は最後の既知サイズ

**line_count（行数）**
- **目的**: テキストファイルの変更量把握
- **取得**: ファイル読み込み→改行文字（\n）カウント
- **判定**: MIMEタイプまたは拡張子でテキスト判定
- **制約**: バイナリファイル・大ファイル（>10MB）はnull

**block_count（ブロック数）**
- **目的**: ストレージ効率・実際の使用量監視
- **取得**: `fs.statSync(filePath).blocks`
- **単位**: 512バイトブロック（Unix標準）
- **用途**: スパースファイル・圧縮の検出

**timestamp（タイムスタンプ）**
- **目的**: イベント発生順序・時系列分析
- **取得**: chokidarイベント受信時の`Date.now()`
- **精度**: ±50ms以内（chokidarイベント発生との差分）
- **形式**: Unix milliseconds（13桁）

**file_path（ファイルパス）**
- **目的**: ファイル識別・移動検出
- **取得**: `path.resolve(relativePath)`
- **正規化**: 絶対パス・シンボリックリンク解決
- **文字コード**: UTF-8

**inode（inode番号）**
- **目的**: ファイル移動・リネーム検出
- **取得**: `fs.statSync(filePath).ino`
- **用途**: unlink→addペアでの同一ファイル判定
- **制約**: Unix系（Linux/macOS）のみ、Windows環境はnull

## 📋 テスト設計原則

### 1. **信頼性最優先**
- chokidarが検出したイベントの**100%記録保証**
- **データ整合性**：chokidarイベント ↔ DB記録の完全な1対1対応
- **タイミング精度**：イベント発生時刻の正確な記録（±50ms以内）

### 2. **実用性重視**
- **大量ファイル処理**：1000+ファイルでの安定動作
- **高速連続操作**：rapid fire操作での取りこぼし防止
- **長時間運用**：24時間連続監視での安定性

### 3. **RDD方式適用**
- **統合テスト最優先**：実際の動作シナリオ重視
- **E2E重視**：ユーザー体験に直結するテスト
- **モック最小化**：可能な限り実装コンポーネント使用

## 🎯 成功基準

### **Phase 1: 基本確実性**（必須）
- [ ] 基本5操作（Create/Find/Modify/Delete）すべてで100%記録成功
- [ ] chokidarイベント数 === DB記録数（完全一致）
- [ ] timestamp精度±50ms以内
- [ ] 10ファイル高速作成で取りこぼしゼロ
- [ ] 必須メタデータ6項目すべて正確記録

### **Phase 2: 実用性検証**（重要）
- [ ] 1000ファイル監視で10秒以内処理
- [ ] メモリ使用量200MB以下維持
- [ ] CPU使用率5%以下（アイドル時）
- [ ] 複雑な競合状態でも整合性維持

### **Phase 3: 堅牢性確保**（本格運用前）
- [ ] DB接続断→復旧での整合性維持
- [ ] 24時間連続運用での安定性
- [ ] 各種エラー状況での適切な処理

## 📁 テストファイル構成

```
test/integration/chokidar-db/
├── basic-operations.test.js      # Phase 1: 基本操作
├── metadata-integrity.test.js    # Phase 1: メタデータ完全性
├── data-integrity.test.js        # Phase 1: データ整合性
├── performance.test.js           # Phase 2: パフォーマンス
├── error-handling.test.js        # Phase 3: エラー処理
└── fixtures/
    ├── sample-files/             # テスト用ファイル
    └── helpers/
        ├── test-operations.js    # 共通操作ヘルパー
        └── db-verification.js    # DB検証ヘルパー
```

## 🚀 実装手順

### 1. **Phase 1実装**（1-2日）
基本機能→メタデータ→データ整合性の順で実装

### 2. **Phase 2実装**（2-3日）
パフォーマンステスト→複雑な競合状態

### 3. **Phase 3実装**（2-3日）
エラー処理→長時間運用テスト

---

## 📝 まとめ

この設計により、cctop v4.0.0の基盤となる**[chokidar] → [DB]接続**の完全な信頼性を確保する。

**次のステップ**: この仕様をa008に統合し、実装準備を整える。