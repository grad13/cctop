# P006: ドキュメントファイル命名規則

**作成日**: 2025年6月12日 23:00  
**作成者**: Clerk Agent  
**ステータス**: 確立済み  
**参照URL**: P015（インシデント管理総合プロトコル）

## 疑問点・決定事項
- [x] 英語のみ使用の原則確立
- [x] kebab-case形式の統一
- [x] 拡張子.mdの必須化
- [x] 廃止ディレクトリの削除（2025年6月17日）
- [x] 通し番号システムとの整合性確保

---

## 🎯 基本原則

### 1. 言語
- **英語のみ使用** - 日本語ファイル名は禁止
- 簡潔で意味が明確な英単語を選択

### 2. 形式
- **小文字とハイフン** - `kebab-case`形式を使用
- アンダースコア（_）は使用しない
- 数字は必要に応じて使用可（例: `01-task-completion.md`）

### 3. 拡張子
- Markdownファイルは必ず`.md`拡張子を使用

## 📋 接頭辞一覧（documents全体）

| 接頭辞 | ディレクトリ | 番号体系 | 例 |
|--------|-------------|----------|-----|
| **P-XXX** | protocols/ | 3桁連番 | `p006-file-naming-convention.md` |
| **DDD-X** | dominants/ | 1桁連番 | `ddd1-agent-role-mandatory-system.md` |
| **CHK-XXX** | checklists/ | 3桁連番 | `chk001-task-completion.md` |
| **BUG-YYYYMMDD-XXX** | bugs/ | 日付+3桁 | `BUG-20250617-001-report-template.md` |
| **REP-XXXX** | reports/ | 4桁連番 | `REP-0043-numbering-system.md` |
| **INC-YYYYMMDD-XXX** | incidents/ | 日付+3桁 | `INC-20250617-001-example.md` |

**重要**: 全documents内で接頭辞は一意であり、番号の再利用は禁止

## 📋 ディレクトリ別命名規則

### specifications/
- **形式**: `[機能名]-[内容].md`
- **例**: `vision-data-model.md`, `wrappers-security.md`
- **避ける**: 同じ単語の繰り返し（×`specification`を含める）

### roadmaps/
- **形式**: `[機能名]/[内容].md`
- **例**: `timebox/features.md`, `quick-switch/transition-improvements.md`
- **避ける**: ディレクトリ名の繰り返し（×`timebox-features.md`）

### status/
- **形式**: `[agent].md` （coder.md, clerk.md, inspector.md）
- **例**: `coder.md`
- **注意**: エージェント名のみ、追加情報は含めない

### meta/
- **protocols/**: `pXXX-[内容].md` （P番号 + kebab-case）
- **checklists/**: `chkXXX-[内容].md` （CHK番号 + kebab-case）
- **例**: `p006-file-naming-convention.md`, `chk001-task-completion.md`
- **注意**: P番号・CHK番号は通し番号

### dominants/
- **形式**: `dddX-[内容].md` （DDD番号 + kebab-case）
- **例**: `ddd0-hierarchical-improvement-principle.md`, `ddd1-agent-role-mandatory-system.md`
- **注意**: DDD番号は最高位原則の通し番号、極少数精鋭

### records/
- **incidents/**: `INC-YYYYMMDD-XXX-title.md` （P015参照）
- **bugs/**: `bugXXX-[内容].md` （BUG番号 + kebab-case）
- **reports/**: `REP-XXXX-title.md`
- **experiments/**: `EXP-XXXX-title.md`

### archive/
- **形式**: 元のファイル名を保持し、必要に応じて日付を追加
- **例**: `2025-06/landing-page-specification.md`

## ⚠️ 避けるべきパターン

### 1. 畳語（重複表現）
- ❌ `timebox-feature-specification.md`
- ✅ `timebox-features.md`
- ❌ `data-format-specification.md`
- ✅ `data-format.md`

### 2. 冗長な表現
- ❌ `quick-switch-specification.md`（ディレクトリ名と重複）
- ✅ `features.md`（ディレクトリ: quick-switch/）

### 3. 日本語
- ❌ `問題意識.md`
- ✅ `problem-awareness.md`

### 4. 日付を含む場合の冗長性
- ❌ `sr-auth-policy-specification-2025-05-20.md`
- ✅ `sr-auth-policy-2025-05-20.md`

## 🔄 既存ファイルの移行

### 移行手順
1. 新規則に従ってファイル名を決定
2. `git mv`を使用してリネーム
3. 影響を受ける全ドキュメントのリンクを更新
4. 関連文書のリンクを更新

### 移行の優先順位
1. 日本語ファイル名 → 最優先で英語化
2. 畳語を含むファイル名 → 簡潔化
3. その他の規則違反 → 順次対応

## 📝 例外

### 特殊ファイル
- `README.md` - 各ディレクトリの説明ファイル
- `GUIDELINES.md` - ドキュメント管理ガイドライン
- `status/{agent}.md` - 各エージェントの作業状況

これらは大文字を使用し、特別な役割を示す。

## 🔍 命名前のチェックリスト

新規ファイル作成時は以下を確認：

- [ ] 英語のみ使用しているか？
- [ ] kebab-case形式になっているか？
- [ ] 同じ単語を繰り返していないか？
- [ ] ディレクトリ名と重複していないか？
- [ ] 意味が明確で簡潔か？
- [ ] 拡張子は`.md`か？

## 📊 適用状況

### 2025年6月12日実施
- 日本語ファイル名8件を英語化完了
- 畳語を含むファイル名9件を簡潔化完了
- 全関連ドキュメントのリンク更新完了

---

## 更新履歴

- 2025年6月17日 23:05: 廃止ディレクトリ（hypotheses/, daily/）の記載を削除、現行ディレクトリへ更新（Clerk Agent）
- 2025年6月17日 14:00: P026メタデータ標準に更新（Clerk Agent）
- 2025年6月12日 23:00: 初版作成、即日施行（Clerk Agent）