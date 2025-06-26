# PIL-005: Activity Log Analytics

**作成日**: 2025年6月26日 18:55  
**更新日**: 2025年6月26日 18:55  
**作成者**: Architect Agent  
**ステータス**: Draft  
**対象バージョン**: v0.3.1.0候補
**カテゴリ**: Analytics & Reporting Experiments  

## 概要

**「振り返る監視」**を実現するファイルアクティビティの集約・分析機能。開発者が一日・一週間・プロジェクト期間の作業を振り返り、開発パターンを理解するためのログ分析とレポート生成を提供する。

### ユーザー価値
- **作業振り返り**: 一日の作業内容・変更ファイルの確認
- **開発パターン分析**: よく変更するファイル・時間帯の把握  
- **チーム共有**: 作業実績の可視化・レポート生成

## 機能仕様

### 基本動作

#### ログ出力・集約
- **時間範囲指定**: --today, --week, --month, --since, --until
- **ファイルフィルタ**: --files, --exclude, --type  
- **出力形式**: テキスト・JSON・CSV・チャート

#### 分析機能
- **統計情報**: 変更回数・ファイル数・時間分布
- **パターン発見**: 頻繁変更ファイル・作業時間帯
- **トレンド分析**: 日次・週次の変化傾向

#### レポート生成
- **サマリーレポート**: 期間指定での概要表示
- **詳細ログ**: タイムスタンプ付き全変更履歴
- **可視化**: アスキーアート・チャート生成

## コマンドライン操作

### 時間範囲指定
```bash
# 時間範囲
cctop --logs --today
cctop --logs --week  
cctop --logs --month
cctop --logs --since="2025-06-01"
cctop --logs --until="2025-06-26"
cctop --logs --since="09:00" --until="17:00"

# 相対指定
cctop --logs --last=3days
cctop --logs --last=2weeks
```

### フィルタ・分析
```bash
# ファイルフィルタ
cctop --logs --files="src/**"
cctop --logs --exclude="*.log"
cctop --logs --type=modified

# 分析・統計
cctop --logs --summary
cctop --logs --stats
cctop --logs --timeline
cctop --logs --heatmap

# 出力形式
cctop --logs --format=json
cctop --logs --format=csv
cctop --logs --export=/path/to/report.json
```

### 実用例
```bash
# 今日の作業確認
cctop --logs --today --summary
>> Modified: 23 files, Created: 2 files, Peak: 14:30-15:30

# 問題調査（特定時間の詳細）
cctop --logs --since="14:00" --until="15:00" --verbose
>> 14:15:23 src/api.js     Modified  2.1KB → 2.3KB
   14:16:01 src/utils.js   Modified  0.8KB → 1.1KB

# 週次レポート生成
cctop --logs --week --export=weekly_report.json
>> Weekly report exported to weekly_report.json
```

## 技術仕様

### 依存関係
- **PIL-004**: バックグラウンド監視（ログデータ生成元）
- **FUNC-000**: SQLiteデータベース（監視データの蓄積）
- **FUNC-101**: 階層的設定管理（分析設定・出力設定）

### データソース
- **SQLiteデータベース**: 蓄積された監視イベントデータ
- **デーモンログ**: PIL-004で生成される構造化ログ
- **設定ファイル**: フィルタ・分析設定の保存

### 分析アルゴリズム

#### 統計計算
- **変更頻度**: ファイル別・時間別の変更回数集計
- **時間分布**: 作業時間帯・ピーク時間の分析
- **ファイルタイプ**: 拡張子別の変更パターン

#### パターン検出
- **ホットスポット**: 頻繁に変更されるファイル特定
- **作業リズム**: 開発者の作業パターン分析
- **異常検出**: 通常と異なる変更パターンの検出

## 設定項目

### config.json設定（FUNC-101統合）
```json
{
  "analytics": {
    "enabled": true,
    "defaultTimeRange": "today",
    "timezone": "Asia/Tokyo",
    "workingHours": {"start": "09:00", "end": "18:00"},
    "excludePatterns": ["*.tmp", "node_modules/**"],
    "reportFormats": ["text", "json"],
    "chartGeneration": false
  }
}
```

### 主要設定
- **enabled**: ログ分析機能の有効/無効
- **defaultTimeRange**: デフォルトの時間範囲
- **timezone**: タイムゾーン設定（ログタイムスタンプ用）
- **workingHours**: 作業時間定義（統計計算用）
- **excludePatterns**: 分析から除外するファイルパターン
- **reportFormats**: デフォルトの出力形式
- **chartGeneration**: チャート生成機能の有効/無効

## 使用方法

### 日常的な使用パターン

#### **毎日の振り返り**
```bash
# 退社前の習慣
$ cctop --logs --today
>> 今日の作業: 34 changes, 12 files
   主な変更: src/main.js, src/api.js, README.md
```

#### **問題調査時**
```bash
# バグが発生した時間帯の調査
$ cctop --logs --since="13:00" --until="14:00"
>> 13:45:12 src/auth.js    Modified  
   13:47:33 src/config.js  Modified
   13:52:01 test/auth.test  Created
```

#### **プロジェクト管理**
```bash
# 週次進捗レポート
$ cctop --logs --week --summary --export=progress.json
>> Weekly progress exported for team review
```

## 制限事項

### データ制限
- **データ保持期間**: SQLiteデータベースの容量制限
- **分析対象**: PIL-004または通常cctopで監視されたデータのみ
- **リアルタイム性**: 過去データの分析、リアルタイム分析は不可

### 機能制限
- **複雑分析**: 高度な統計分析・機械学習は対象外
- **外部連携**: 他ツールとの直接連携は限定的
- **可視化**: 基本的なテキスト・アスキーアート表示のみ

## 拡張予定

### Phase 1実装（v0.3.1.0）
- **基本分析**: --today, --week, --summary
- **ファイルフィルタ**: --files, --exclude
- **出力形式**: text, json基本対応

### Phase 2拡張（v0.3.2.0）
- **時間分析**: --timeline, --heatmap
- **詳細統計**: ホットスポット検出・パターン分析
- **設定保存**: よく使う分析パターンの保存

### Phase 3連携（v0.4.0.0）
- **PIL-004統合**: デーモンモードとの完全連携
- **外部エクスポート**: Git連携・CI/CD統合
- **ダッシュボード**: Web UI での可視化機能

## 関連機能

- **PIL-004**: バックグラウンド監視（データ生成元）
- **FUNC-000**: SQLiteデータベース基盤（データストレージ）
- **FUNC-101**: 階層的設定管理（分析設定）
- **FUNC-203**: イベントタイプフィルタリング（データフィルタ）

## 参考資料

#### 類似機能の参考
- **git log**: コミット履歴・統計分析機能
- **GitHub Insights**: リポジトリアクティビティ分析
- **RescueTime**: 時間追跡・生産性分析ツール