# 用語集

**作成日**: 2025年6月10日 nodata  
**場所**: documents/visions/specifications/terminology/  
**更新日**: 2025年6月22日

このプロジェクトで使用される専門用語の定義

## cctopプロジェクト固有の用語

### cctop
Claude Code リアルタイムファイル監視システム。ファイルシステムの変更をリアルタイムで監視・記録・分析するCLIツール。

### RDD (Running-Driven Development)
実動作駆動開発。テストの成功ではなく、実環境での動作を最優先とする開発手法。cctop v3開発で採用。

### file-monitor-binary
cctopの中核となるファイル監視バイナリ。Inspectorエージェントの最重要保護対象。

### Stream Mode / Unique Mode
cctopの表示モード：
- **Stream Mode**: すべてのイベントを時系列で表示
- **Unique Mode**: 同一ファイルのイベントを集約して表示

### Hot Files
頻繁に変更されるファイルのランキング。統計機能で提供される重要指標。

### Object Fingerprint
ファイルの一意識別子。inode番号、ファイルサイズ、内容ハッシュなどから生成。

### Event Types
監視対象のファイルイベント種別：
- **add**: ファイル追加
- **change**: ファイル変更
- **unlink**: ファイル削除
- **addDir/unlinkDir**: ディレクトリ操作

### Cache Layers
cctopの4層キャッシュアーキテクチャ：
- **EventType Cache**: イベントタイプ別高速キャッシュ
- **Background Cache**: 非同期バックグラウンド処理
- **Statistics Cache**: 統計情報のTTL付きキャッシュ
- **Persistent Cache**: SQLite永続化キャッシュ

## 技術用語

### SR (Smooth Registration)
Zero Friction（メール登録不要で即座にアプリ体験可能）とSeamless Upgrade（ゲストデータの本登録への100%継承）を特徴とする認証方式

### DAG (Directed Acyclic Graph)
有向非巡回グラフ。このプロジェクトではタスクの階層構造を表現するために使用

### JWT (JSON Web Token)
認証トークンの形式。このプロジェクトではゲスト認証と本登録ユーザー認証の両方で使用

### Wrappers
セキュリティ境界として機能する薄いPHP層。公開ディレクトリに配置され、実際の実装（backend）への単純な転送を行う。フロントエンドは必ずwrappersを経由してAPIにアクセスする。

---

最終更新: 2025年6月17日