# HO-20250627-006: Test Suite FUNC Specification Compliance Fixes

**作成日**: 2025-06-27 03:30 JST  
**作成者**: Validator Agent  
**優先度**: High  
**推定作業時間**: 6-8時間  
**依頼種別**: Critical Test Compliance Update

## 📋 概要

現在のテストスイートとFUNC仕様（BP-001 + 全FUNC）との詳細適合性検証の結果、**重大な仕様適合性問題**と**テスト不足領域**を多数発見しました。テスト実装をFUNC仕様に完全準拠させる修正が必要です。

## 🚨 Critical Issues（即座修正要求）

### 1. **FUNC-104 CLI Interface: 仕様準拠率20%未満**
**問題**: FUNC-104で要求されている全CLIオプションの大部分が未実装

#### 未実装オプション（8個中7個）
```bash
# 監視制御関連（未実装）
--dir, -d <directory>     # 監視ディレクトリ指定
--timeout, -t <seconds>   # タイムアウト時間

# 出力制御関連（未実装）
--verbose, -v             # 詳細出力モード
--quiet, -q               # 静音モード

# システム管理関連（仕様不一致）
--check-limits            # FUNC-104要求（現在は--check-inotifyのみ）

# ヘルプ・情報関連（未実装）
--help, -h                # ヘルプメッセージ表示
--version                 # バージョン情報表示
```

#### 現在実装済みオプション（FUNC-104対象外）
```bash
--config                  # 設定ファイル指定（実装独自）
--watch                   # 監視パス指定（実装独自）
--db                      # データベースパス（実装独自）
--max-lines               # 最大行数（実装独自）
--check-inotify           # inotify確認（FUNC-104では--check-limits）
```

#### **修正要求**:
1. `bin/cctop`でのCLIパーサー完全書き換え
2. FUNC-104で定義された全オプションの実装
3. FUNC-104準拠のヘルプメッセージ表示
4. Single Source of Truth原則（他FUNCのCLI定義無視）の実装

### 2. **FUNC-206 Instant View: テスト完全欠如**
**問題**: FUNC-206（即時表示・プログレッシブローディング）のテストが1つも存在しない

#### 必要テスト（0個実装済み）
- 起動時間測定（目標100ms以内）
- Monitor起動状況の表示確認
- プログレッシブローディング動作
- FUNC-205ステータスエリア統合
- エラーリカバリー（DB接続失敗時のリトライ）
- Monitor終了制御（起動者記録ベース）

#### **修正要求**:
1. `test/func206/` ディレクトリ作成
2. 起動時間・進捗表示・エラーハンドリングの包括的テスト実装
3. FUNC-205連携テスト（ステータスメッセージ表示）

### 3. **FUNC-003 PIDファイル仕様: 実装ギャップ**
**問題**: FUNC-003で要求されるPIDファイル拡張仕様が部分実装

#### 仕様と実装の不一致
```javascript
// FUNC-003要求仕様
{
  "pid": 12345,
  "started_by": "viewer",      // "viewer" or "standalone"
  "started_at": 1719456789,
  "config_path": "/path/to/.cctop/config.json"
}

// 現在実装（推定）
{
  "pid": 12345,
  "startTime": "2025-06-27T...",  // 形式違い
  "version": "0.2.0.0"            // 仕様外フィールド
}
```

#### **修正要求**:
1. PIDファイル形式をFUNC-003仕様に完全準拠
2. 起動者記録ロジック（started_by）の実装
3. 終了制御ロジック（起動者ベース）の実装

## 🔍 High Priority Issues（品質向上要求）

### 4. **Database Schema v0.2.0.0: テスト部分カバレッジ**
**評価**: FUNC-000仕様カバレッジ70%（良好だが不完全）

#### カバー済み領域
- ✅ 5テーブル構成（events, event_types, files, measurements, aggregates）
- ✅ v0.2.0.0変更点（テーブル名変更、measurementsテーブル追加）
- ✅ 外部キー制約・インデックス基本確認
- ✅ WALモード設定・ファイル生成

#### 不足領域
- ❌ aggregatesテーブルの集計値計算テスト
- ❌ 大量データでのパフォーマンステスト
- ❌ データベース破損時の復旧テスト
- ❌ measurementsテーブルのinode履歴管理

#### **修正要求**:
1. aggregatesテーブルの集計ロジックテスト追加
2. パフォーマンス・ストレステスト強化
3. 異常系テスト（DB破損・ロック・権限エラー）

### 5. **FUNC-105 Local Setup: 実動作検証不足**
**評価**: 基本機能テスト60%（構造確認のみ、動作検証不足）

#### カバー済み領域
- ✅ .cctop/ディレクトリ自動作成
- ✅ config.json・.gitignore生成
- ✅ 複数プロジェクト独立性
- ✅ グローバル設定除去確認

#### 不足領域
- ❌ postinstallスクリプトの実動作確認
- ❌ 設定ファイル検証・バリデーション
- ❌ ディレクトリ権限・アクセス制御
- ❌ 初回実行メッセージの具体的確認

#### **修正要求**:
1. npm postinstallフロー実動作テスト
2. Schema Validation適用（config.json）
3. ファイルシステム権限テスト強化

## 🧪 Test Architecture Issues（設計改善要求）

### 6. **古いテスト命名規則**
**問題**: 一部テストが旧設計思想のままで現在のFUNC体系と不整合

#### 設計齟齬例
```javascript
// feature-2-database.test.js
test('Should create ~/.cctop directory...', async () => {
  // FUNC-105でグローバル設定は廃止済み
  // ローカル.cctop/のみ使用する設計変更
});
```

#### **修正要求**:
1. 廃止仕様テストの削除・更新
2. テスト名・コメントのFUNC仕様準拠化
3. データ駆動型テストのシナリオ更新

### 7. **テスト分離度不足**
**問題**: FUNC境界を跨ぐテストが多く、責務が曖昧

#### 問題例
- `feature-*-*.test.js`: 複数FUNC機能を統合テスト（分離度低）
- `func003-background-monitor.test.js`: 他FUNC依存が多い

#### **修正要求**:
1. 各FUNCの独立テスト強化
2. 統合テストと単体テストの明確分離
3. モック・スタブ活用による依存関係削減

## 🎯 Implementation Priority

### **Phase 1: Critical CLI Compliance（1-2日）**
1. FUNC-104 CLIオプション完全実装
2. bin/cctopパーサー書き換え
3. ヘルプメッセージFUNC-104準拠

### **Phase 2: Missing Test Implementation（2-3日）**
1. FUNC-206 Instant View包括的テスト作成
2. FUNC-003 PIDファイル仕様準拠修正
3. Database aggregatesテーブルテスト強化

### **Phase 3: Test Quality Enhancement（2-3日）**
1. FUNC-105実動作検証強化
2. 古いテスト設計齟齬修正
3. テスト分離度向上・境界明確化

## 📊 Expected Outcomes

### **成功指標**
- [ ] FUNC-104 CLI準拠率: 20% → 100%
- [ ] 全FUNC仕様カバレッジ: 60% → 90%+
- [ ] テスト実行時間: 現状維持（3分以内）
- [ ] 実動作検証率: 40% → 80%+

### **品質保証効果**
- FUNC仕様とテスト実装の完全同期
- リリース前品質検証の信頼性向上
- 仕様変更時の影響範囲明確化
- プロダクション問題の早期発見

## 📋 Success Criteria

1. **FUNC-104**: 全CLIオプションの動作確認完了
2. **FUNC-206**: 起動時間・進捗表示の自動テスト完了
3. **FUNC-003**: PIDファイル仕様準拠・終了制御確認完了
4. **総合**: 15個のFUNC仕様に対する90%以上のテスト カバレッジ達成

---

**Note**: この修正により、テストスイートがFUNC仕様書と完全同期し、本番リリース前の品質保証精度が大幅向上します。特にCLI Interface（FUNC-104）とInstant View（FUNC-206）の未実装テストは本番品質に直結する重要な修正です。