---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: インシデント切り出し調査, H004違反事例, ディレクトリ構造不整合, namespace問題PHPエラー, JWT認証有効期限問題, incidents移動対象特定, CLAUDE.md肥大化防止, 類似問題再発防止

---

# インシデント切り出し調査レポート

**作成日時**: 2025年6月13日 23:40
**調査目的**: documentsディレクトリ内の具体的なインシデント・違反事例を特定し、incidents/への移動対象を明確化

## 🔍 調査結果サマリー

### 既にincidents/に移動済み
1. **h004-wrong-path-hypothesis-2025-06-13.md** - 仮説ファイルを誤ったパスに作成（2025-06-13）
2. **h013-violation-examples.md** - アカウント管理画面ヘッダー非表示の対症療法事例（2025-06-13）

### 切り出し対象インシデント（未移動）

#### 1. H004違反事例（CLAUDE.md内）
**ファイル**: `/CLAUDE.md` 202-210行目
**発生日**: 2025年6月12日
**内容**:
- LEGACY_STATUS.md作成時にGUIDELINES.md更新忘れ → ユーザー指摘で発覚
- deployment-process.md作成時にGUIDELINES.md更新忘れ → 再度ユーザー指摘

#### 2. ディレクトリ構造不整合問題
**ファイル**: `documents/daily/2025-06-12-1100-inconsistency-check-report.md`
**発生日**: 2025年6月12日
**内容**: policies vs rules ディレクトリの混在による大規模な不整合
- documents/README.mdで`policies/`を参照するが実際は`rules/`が存在
- CLAUDE.mdでも同様の不整合
- 影響：多数のリンク切れ、ドキュメントナビゲーションの破綻

#### 3. namespace問題によるPHPエラー
**ファイル**: `documents/daily/2025-06-10-0800-daily-log.md` 137-211行目
**発生日**: 2025年6月10日
**内容**: 
- "Call to undefined function respond()"エラーが複数のAPIで発生
- namespace問題が原因（TBX namespace内の関数を適切に参照できず）
- 影響：API機能が完全に停止

#### 4. JWT認証の有効期限問題
**ファイル**: `documents/daily/2025-06-10-0800-daily-log.md` 217-230行目
**発生日**: 2025年6月10日
**内容**:
- JWTトークンの有効期限切れによる401エラー
- 3時間の有効期限が切れたトークンでの認証試行
- 影響：ユーザーが突然認証エラーに遭遇

## 📋 推奨アクション

1. **CLAUDE.md内の違反事例を個別ファイルに切り出し**
   - `h004-guidelines-update-violations-2025-06-12.md`として作成

2. **ディレクトリ構造不整合問題を切り出し**
   - `directory-structure-inconsistency-2025-06-12.md`として作成

3. **PHPのnamespace問題を切り出し**
   - `php-namespace-errors-2025-06-10.md`として作成

4. **JWT認証問題を切り出し**
   - `jwt-expiration-issue-2025-06-10.md`として作成

5. **CLAUDE.md内の違反事例記載を更新**
   - incidentsディレクトリへの参照に変更
   - 詳細はincidentsファイルを参照する形式に

## 🎯 期待効果

- インシデントの体系的な管理
- 過去の問題から学習しやすい構造
- CLAUDE.mdの肥大化防止
- 類似問題の再発防止に活用