# Bugs - バグ対応記録

**作成日**: 2025年6月14日  
**更新日**: 2025年6月18日（5エージェント体制移行）  
**管理者**: Builder Agent（実装）/ Validator Agent（検証）  
**目的**: バグ記録と追跡

## 📋 概要

このディレクトリは、TimeBoxingプロジェクトのバグを体系的に管理します。

**注**: 2025年6月16日にactive/archiveサブディレクトリを廃止し、すべてのバグレポートを直接bugs/ディレクトリに配置する体制に移行しました。解決済みバグは`documents/archives/bugs/`へ移動します。

## 🔄 ディレクトリ運用方針

### フラット管理構造（2025年6月16日〜）
- **bugs/**: 現在対応中のバグをすべて直接配置
- **archive/bugs/**: 解決済みバグ（`documents/archives/bugs/`に移動）
- **目的**: シンプルな構造で管理効率化

### 解決済みバグのアーカイブ移動
```bash
# 解決完了時の必須手順
mv documents/records/bugs/[解決済みバグ].md documents/archives/bugs/
```

## 🔢 バグ番号体系（BUG-）

### 命名規則
```
BUG-YYYYMMDD-XXX-title.md
```

- **BUG**: バグ記録の識別子
- **YYYYMMDD**: バグ発見日（例: 20250615）
- **XXX**: 3桁の通し番号（001から開始、全体通し番号）
- **title**: バグの簡潔な説明（kebab-case）

### 命名例
- `BUG-20250615-001-timebox-timer-abnormal.md`
- `BUG-20250615-002-taskgrid-vision-sync-failure.md`
- `BUG-20250616-003-quick-switch-focus-loss.md`

### 旧形式からの移行
現在の形式：
- `timebox-timer-abnormal-behavior-2025-06-15.md`
- `taskgrid-input-focus-conflict-2025-06-14.md`

移行後：
- `BUG-20250615-001-timebox-timer-abnormal.md`
- `BUG-20250614-002-taskgrid-input-focus-conflict.md`

※ 既存ファイルは段階的に番号付きに移行

## 📊 バグ一覧

### Activeバグ
| ファイル名 | 発見日 | ステータス |
|-----------|--------|----------|
| BUG-20250101-001-report-template.md | - | テンプレート |
| BUG-20250614-001-logout-visionstore-null-error.md | 2025-06-14 | 調査中 |
| BUG-20250614-002-timebox-empty-task-display-visionstore.md | 2025-06-14 | 調査中 |
| BUG-20250614-003-timebox-reload-data-loss-detailed-plan.md | 2025-06-14 | 計画中 |
| BUG-20250614-004-timebox-reload-data-loss.md | 2025-06-14 | 調査中 |
| BUG-20250615-001-specification-gaps-analysis.md | 2025-06-15 | 分析中 |
| BUG-20250615-002-taskgrid-timebox-vision-sync-failure.md | 2025-06-15 | 修正中 |
| BUG-20250615-003-timebox-longpress-completed-failure.md | 2025-06-15 | 調査中 |
| BUG-20250615-004-timebox-regression-comprehensive-plan.md | 2025-06-15 | 計画中 |
| BUG-20250615-005-timebox-timer-abnormal-behavior.md | 2025-06-15 | 調査中 |
| BUG-20250615-006-vision-sync-new-implementation.md | 2025-06-15 | 実装中 |

### Archiveバグ
| ファイル名 | 発見日 | 解決日 |
|-----------|--------|--------|
| taskgrid-input-focus-conflict-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| taskgrid-save-load-row-deletion-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| taskgrid-timebox-sync-failure-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| taskgrid-timebox-vision-sync-mismatch-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| timebox-dom-null-error-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| timebox-empty-task-display-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| timebox-empty-task-still-displayed-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| timebox-performance-slow-2025-06-14.md | 2025-06-14 | 2025-06-14 |
| timebox-task-list-time-reset-on-pause.md | - | - |

## 📁 ファイル構成

### ディレクトリ構造
```
documents/records/bugs/
├── README.md                          # このファイル（管理方針・使用方法）
├── BUG-20250101-001-report-template.md  # バグ記録テンプレート
└── [未解決バグファイル]              # 現在対応中のバグ（直接配置）

※ 解決済みバグは documents/archives/bugs/ へ移動
```

### カテゴリー別プレフィックス（新旧両方対応）
- **UI/UX**: `ui-` で始まるファイル（表示・操作性の問題）
- **機能**: `feature-` で始まるファイル（機能動作の問題）
- **パフォーマンス**: `perf-` で始まるファイル（速度・効率の問題）
- **セキュリティ**: `security-` で始まるファイル（セキュリティ関連）
- **データ**: `data-` で始まるファイル（データ処理・同期の問題）

### バグ記録の移動
- **新規バグ**: `bugs/`直下にBUG番号付きで作成
- **解決後**: `documents/archives/bugs/`に移動（番号は保持）

### バグ修正のワークフロー（5エージェント体制）
1. **発見・記録**: 任意のエージェントがバグを発見し記録
2. **Builder実装**: 
   - バグレポートを基に根本原因分析
   - 修正コード実装
   - 初期動作確認
   - `passage/handoffs/pending/validator/`に検証依頼作成
3. **Validator検証**:
   - 修正内容の品質検証
   - テストケース作成・実行
   - 承認または差し戻し判定
   - `passage/handoffs/completed/from-validator/`に結果記録
4. **完了処理**:
   - バグレポート更新（解決済みステータス）
   - `documents/archives/bugs/`へ移動

## 🔍 記録すべき内容

各バグファイルには以下を含める：

1. **発生日時**: バグが発見された日時
2. **症状**: 具体的にどのような問題が発生したか
3. **再現手順**: 問題を再現するための手順
4. **影響範囲**: ユーザーへの影響度・重要度
5. **根本原因**: H013原則に基づく原因分析
6. **修正内容**: 実装した修正の詳細
7. **テスト結果**: 修正後の検証結果
8. **関連課題**: 同時に発見・修正した関連問題

## 📊 バグ対応の原則

### 5エージェント体制での役割分担
1. **Builder Agent（バグ修正実装）**
   - バグの根本原因分析
   - 修正コードの実装
   - 技術的解決策の提案
   - 修正後の初期動作確認

2. **Validator Agent（修正検証）**
   - 修正内容の品質検証
   - テストケースの作成・実行
   - リグレッションテスト
   - 修正の最終承認

3. **Inspector Agent（監視・記録）**
   - バグ発生パターンの統計分析
   - 修正履歴の監視
   - 品質メトリクスの収集

4. **Clerk Agent（文書管理）**
   - バグレポートの文書管理
   - 関連文書の更新
   - アーカイブ管理

5. **エージェント間連携**
   - Builder→Validator: passage/handoffs/を通じた検証依頼
   - Validator→Builder: 検証結果フィードバック
   - Inspector: 全体の統計・監視

### H013原則の適用
- **対症療法禁止**: 症状を隠すだけの修正は禁止
- **根本原因特定**: 真の原因を必ず特定する
- **包括的修正**: 同じ原因による他の問題も同時解決
- **技術的負債防止**: 将来の問題を生まない修正

### 対応レベル
1. **Critical**: サービス停止・データ損失
2. **High**: 主要機能の停止
3. **Medium**: 一部機能の不具合
4. **Low**: 軽微な表示問題

## 🎯 目的

1. **学習**: バグパターンの蓄積と分析
2. **品質向上**: 同種のバグの予防
3. **効率化**: 類似問題の迅速な解決
4. **ナレッジ共有**: チーム全体での知識共有

## 🔍 バグとインシデントの明確な区別

### 📋 バグ（Bug）の定義
**コード・システム・機能の技術的問題**

#### 対象範囲
- **表示問題**: UI要素が正しく表示されない
- **動作不良**: 機能が期待通り動作しない
- **パフォーマンス**: 処理速度・メモリ使用量の問題
- **データ問題**: 保存・読み込み・同期の失敗
- **互換性**: ブラウザ・デバイス間の動作差異

#### 具体例
- Quick Switchが動作しない
- TaskGridで入力できない
- タイマーが正しく表示されない
- データが保存されない
- ページ読み込みが異常に遅い

### 🚨 インシデント（Incident）の定義
**プロセス・手順・メタルールの違反問題**

#### 対象範囲
- **プロセス違反**: 定められた手順を守らない
- **品質管理違反**: H013等の原則を無視
- **権限違反**: Agent権限外の操作
- **記録漏れ**: 必須記録の忘れ・遅延
- **判断ミス**: 不適切な技術選択・対応

#### 具体例
- バグ修正時にH013原則を適用しなかった
- status/{agent}.md更新を忘れた
- 対症療法的な修正を実装した
- Agent権限外のファイルを編集した
- チェックリストを参照せずに作業した

### 🔄 境界ケースの判定

#### バグ扱い（bugs/ディレクトリ）
- **純粋な技術問題**: コード・設定・環境の問題
- **正しいプロセス**: H013準拠で適切に対応されている
- **權限内作業**: Agent権限範囲内での問題解決

#### インシデント扱い（meta/incidents/）
- **プロセス違反**: 技術問題であってもプロセス違反が伴う
- **権限違反**: Agent権限外での技術作業
- **原則違反**: H013・H014等のDominant原則違反
- **記録違反**: バグ対応の記録を怠る・適切でない

### 📊 判定フローチャート
```
技術的問題発生
↓
プロセス遵守？ → No → インシデント
↓ Yes
権限内作業？ → No → インシデント  
↓ Yes
適切な記録？ → No → インシデント
↓ Yes
バグ（純粋な技術問題）
```

## 🔗 関連文書

- **技術的負債防止**: `meta/protocols/p028-technical-debt-prevention.md`
- **用語定義**: `documents/rules/meta/protocols/p000-terminology.md`
- **インシデント記録**: `documents/records/incidents/`
- **バグ記録プロトコル**: `documents/rules/meta/protocols/p011-coder-bug-recording-protocol.md`
- **Builder権限**: `documents/agents/status/builder.md`
- **Validator権限**: `documents/agents/status/validator.md`

---
**注意**: このディレクトリはBuilder Agent（バグ修正実装）とValidator Agent（修正検証）が技術的問題解決の記録を行うためのものです。メタプロセス問題は`meta/incidents/`に記録してください。