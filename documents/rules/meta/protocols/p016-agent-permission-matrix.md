# P016: Agent権限マトリックス＆協調システム

**作成日**: 2025年6月15日  
**更新日**: 2025年6月18日（5エージェント体制確立）  
**作成者**: Clerk Agent  
**状態**: 有効  
**カテゴリー**: 権限管理・エージェント協調  
**参照URL**: 
- documents/rules/dominants/ddd1-agent-role-mandatory-system.md（Agent役割必須システム）
- 旧H039: エージェント協調システム（H026/H028/H029/H033統合版）  

## 🎯 目的

5エージェント体制（Builder, Validator, Architect, Clerk, Inspector）の権限を明確化し、Read/Write/Create/Delete/Moveの各操作レベルで管理する。さらに、エージェント間の協調システムにより、競合や認識齟齬を90%以上削減する。

## 📊 権限タイプ定義

| 権限 | 記号 | 説明 |
|------|------|------|
| Read | R | ファイル・ディレクトリの読み取り |
| Write | W | 既存ファイルの編集・更新 |
| Create | C | 新規ファイル・ディレクトリ作成 |
| Delete | D | ファイル・ディレクトリ削除 |
| Move | M | ファイル・ディレクトリ移動・改名 |

## 🔐 Agent権限マトリックス

### 主要ディレクトリ権限

| ディレクトリ | Builder | Validator | Architect | Clerk | Inspector | 備考 |
|-------------|---------|-----------|-----------|-------|-----------|------|
| **src/** | RWCDM | R | RWC | R | - | ソースコード（Builder実装、Architect設計、Validator検証） |
| **documents/** | RWC | RWC | RWC | RWCDM | R | ドキュメント全般（記録系共同編集） |
| **documents/agents/status/{agent}.md** | 各自RWCDM | 各自RWCDM | 各自RWCDM | 各自RWCDM | 各自RWCDM | 各エージェント専用 |
| **documents/records/** | RWCDM | RWCDM | RWCDM | RWCDM | RWCDM | 全Agent共同編集可（記録系一元化） |
| **documents/records/incidents/** | RWCDM | RWCDM | RWCDM | RWCDM | RWCDM | インシデント記録 |
| **documents/records/reports/** | RWCDM | RWCDM | RWCDM | RWCDM | RWCDM | 分析レポート・実施履歴 |
| **documents/records/bugs/** | RWCDM | RWCDM | RWC | RWCDM | RWCDM | バグ記録（Builder/Validator主管） |
| **documents/rules/meta/** | R | R | RWC | RWCDM | R | メタ管理（Clerk主管、Architect設計） |
| **documents/visions/specifications/** | RWC | RWC | RWCDM | RWC | R | 仕様書（Architect主管） |
| **documents/visions/blueprints/** | RWC | RWC | RWCDM | RWC | R | 設計図・ロードマップ（Architect主管） |
| **passage/handoffs/** | RWCDM | RWCDM | RWCDM | RWCDM | R | エージェント間受け渡し（REP-0022・REP-0075） |
| **passage/externals/** | R | R | R | RWCDM | R | 外部システム連携（Clerk管理） |
| **surveillance/** | - | - | - | R | RWCDM | 監視システム（Inspector専用） |
| **surveillance/docs/** | - | - | - | R | RWCDM | Inspector仕様書専用 |
| **tests/**, **cypress/** | RWC | RWCDM | RWC | R | R | テスト関連（Validator主管） |
| **db/** | RW | RW | RW | R | R | データベース |
| **dist/**, **build/** | R | RWCDM | R | R | R | ビルド成果物（Validator管理） |
| **.git/** | R | R | R | R | R | Git（読み取り専用） |
| **CLAUDE.md** | R | R | R | RWCDM | R | Clerk専用編集権限（DDD1） |
| **package.json等** | RWCDM | RWC | RWC | R | R | ルートのコード関連（Builder実装） |
| **externals/** | R | R | R | R | R | 外部入力（Web記事、画像等） |

### 特殊権限・制限

#### Builder Agent
- ✅ 機能実装・コード作成に必要な全src/編集権限
- ✅ 開発関連設定ファイル（package.json, composer.json等）編集
- ✅ handoffs/システムによるValidator連携
- ✅ documents/records/へのバグ記録・実装記録権限
- ❌ 本番デプロイ実行禁止（Validator専用）
- ❌ documents/rules/meta/編集禁止
- ❌ 品質ゲート最終判定禁止

#### Validator Agent
- ✅ 品質検証・テスト・デプロイの全権限
- ✅ src/読み取り専用（検証目的）
- ✅ tests/, cypress/, dist/, build/管理権限
- ✅ 本番デプロイ実行権限
- ✅ 品質ゲート最終判定権限
- ✅ documents/records/へのテスト・検証記録権限
- ❌ src/直接編集禁止（緊急時以外）
- ❌ documents/rules/meta/編集禁止

#### Architect Agent
- ✅ システム設計・アーキテクチャ決定権限
- ✅ documents/visions/specifications/主管権限
- ✅ documents/visions/blueprints/主管権限
- ✅ src/への設計観点での編集権限（実装はBuilder）
- ✅ documents/rules/meta/への設計関連提案権限
- ✅ handoffs/システムによる他エージェント連携
- ❌ 実装詳細の決定禁止（Builder責任）
- ❌ CLAUDE.md編集禁止

#### Clerk Agent
- ✅ CLAUDE.md唯一の編集権限者（DDD1）
- ✅ 全documentsサブディレクトリの管理権限
- ✅ handoffs/システム管理権限
- ✅ 各agentのstatus切り出し権限
- ❌ src/等のコード編集禁止

#### Inspector Agent
- ✅ surveillance/内での全権限（コード・文書含む）
- ✅ surveillance/docs/への仕様書作成権限
- ❌ documents/visions/specifications/への書き込み禁止
- ❌ documentsでのpatternsコマンド使用禁止（P013）
- ❌ Git書き込み操作禁止

## 📝 運用ルール

### 1. 権限確認
- セッション開始時に自身の権限を確認
- 権限外アクセスは即座に停止

### 2. 共同編集エリア
- documents/records/: 全Agent完全編集可（記録系一元化）
- documents/visions/specifications/, blueprints/: Architect主管、Builder/Validator/Clerk共同編集可
- handoffs/: 全Agent（タスク受け渡し、Inspector読み取りのみ）

### 3. 専用エリア
- documents/agents/status/{agent}.md: 各Agent専用
- documents/rules/meta/: Clerk専用（体系系管理、Architect設計提案可）
- surveillance/: Inspector専用
- CLAUDE.md: Clerk専用（DDD1）
- src/: Builder主管（Architect設計編集可、Validator読み取り）
- tests/, dist/, build/: Validator主管
- documents/visions/specifications/, blueprints/: Architect主管

### 4. 読み取り専用
- .git/: 全Agent読み取りのみ
- externals/: 全Agent読み取りのみ（外部入力資料）

## ⚠️ 違反時の対応

1. **権限外アクセス検出**: 即座に作業停止
2. **適切なAgent誘導**: 正しい権限を持つAgentに依頼
3. **インシデント記録**: 重大な違反はインシデントとして記録

## 🔄 権限変更手順

権限変更が必要な場合：
1. Clerk Agentが変更提案を作成
2. 変更理由と影響範囲を明記
3. 本プロトコルを更新
4. 各Agent statusファイルに反映

## 🔍 疑問点・決定事項

### 疑問点
- externals/ディレクトリの将来的な権限変更は必要か？
- Architectエージェントの実装タスクへの関与度の境界は？

### 決定事項  
- records/ディレクトリを全Agent共同編集可に設定（2025年6月15日）
- CLAUDE.md編集権限をClerk専用として明確化（DDD1遵守）
- surveillance/docs/をInspector専用仕様書エリアとして確立（2025年6月15日）
- 5エージェント体制確立（Builder/Validator/Architect/Clerk/Inspector）（2025年6月18日）

---

## 🤝 エージェント協調システム（H039統合）

### 1. 独立状態管理（H026実装済み）
- ✅ `documents/agents/status/{agent}.md`による個別管理
- 競合発生率: 0件維持
- エージェント別可視性: 100%

### 2. 情報伝播システム（H028統合）

#### 重要変更事項の伝播ルール
- **用語定義変更**: specifications/terminology/terms-and-rules.md更新時は全Agent通知
- **権限変更**: 本プロトコル更新時は即座に各status/{agent}.mdに反映
- **重大インシデント**: 全Agentのstatus/{agent}.mdに警告記載

#### 伝播チェックリスト
```
□ 変更の影響範囲を特定
□ 影響を受ける全Agentのstatus/{agent}.mdに記載
□ 次回セッション開始時の確認項目として明記
□ 重要度に応じて警告レベル設定（通常/重要/緊急）
```

### 3. セッション継続時確認（H029統合）

#### 必須確認プロセス（2分以内）
1. **前回からの重要変更確認**（30秒）
   - protocols/の更新確認
   - 他Agent status/{agent}.mdの重要変更確認
   - CLAUDE.md更新確認

2. **権限・ファイル最新性確認**（30秒）
   - 本プロトコル（P016）の権限確認
   - 作業対象ファイルの最新性確認
   - 削除・移動されたファイルの確認

3. **インシデント・警告確認**（60秒）
   - 新規インシデント確認
   - 他Agentからの警告・通知確認
   - 未解決問題の状況確認

### 4. エージェント特性別協調
- ✅ P037で解決済み（記録システム）
- Builder: 実装中の並行記録・handoffs活用
- Validator: 検証結果の体系的記録
- Architect: 設計決定の文書化・記録
- Inspector: 自己監視による記録
- Clerk: 並行記録による即時性

### 5. エージェント間連携プロトコル
- **handoffs/pending/**: タスク受け渡しディレクトリ
- **to-builder/**: Builderへの実装依頼
- **to-validator/**: Validatorへの検証依頼
- **to-architect/**: Architectへの設計依頼
- **to-clerk/**: Clerkへの文書管理依頼
- **to-inspector/**: Inspectorへの監視依頼
- **completed/**: 完了タスクアーカイブ
- **ステータス同期**: 各自status/{agent}.mdで進捗管理

## 📊 協調効果測定

### 成功指標
1. **協調効率**: エージェント間タスク連携時間30%短縮
2. **競合削減**: ファイル編集競合0件維持
3. **情報共有**: 重要変更事項伝播率90%以上
4. **認識一致**: セッション継続時認識齟齬90%削減

### 測定方法
- 週次: 競合発生件数カウント
- 日次: 情報伝播チェックリスト実施率
- セッション毎: 継続時確認プロセス実施記録

**関連文書**:
- DDD1: Agent役割必須システム
- P013: patterns命令使用禁止プロトコル（全エージェント版）
- P037: エージェント適応型記録システム
- P030: 統合状況管理プロトコル（セッション開始時プロセス）
- REP-0022: エージェント間ハンドオフシステム

## 更新履歴
- 2025年6月17日: P014への参照をP013（統合版）に修正（P042指摘対応、Clerk Agent）
- 2025年6月18日: handoffs/ディレクトリがワークスペースrootに存在することを明確化
- 2025年6月18日: 5エージェント体制確立、Coder参照完全削除、Architect権限追加