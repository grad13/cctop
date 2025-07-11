# FUNC-209: キーワード検索管理機能

**作成日**: 2025年7月9日 09:00  
**更新日**: 2025年7月9日  
**作成者**: Architect Agent  
**Version**: 1.0.0  
**関連仕様**: FUNC-000, FUNC-202, FUNC-208, FUNC-300, FUNC-301  

## 📊 機能概要

cctop CLIアプリケーションにおける包括的なキーワード検索機能を提供する。入力文字の正規化、複数キーワード検索、2段階検索処理、検索結果キャッシュ管理を統合し、効率的で使いやすい検索体験を実現する。

**ユーザー価値**:
- 直感的なキーワード検索体験
- 制御文字混入問題の解決
- 複数キーワードでの高精度検索
- 高速な検索レスポンス

## 🎯 機能境界

### ✅ **実行する**
- 入力文字の正規化処理（制御文字・空白・多言語対応）
- 複数キーワード検索（AND検索）
- 2段階検索処理（ローカル + データベース）
- 検索結果キャッシュ管理
- 段階的データ取得アルゴリズム
- 検索クエリ最適化

### ❌ **実行しない**
- キーボード入力処理（FUNC-300の責務）
- 検索結果の表示・描画（FUNC-202の責務）
- フィルタリング機能（FUNC-203/208の責務）
- データベース基盤管理（FUNC-000の責務）

## 📋 詳細仕様

### **入力文字正規化仕様**

#### **正規化処理の段階**
1. **制御文字処理**: ASCII制御文字（0x00-0x1F, 0x7F）をスペースに変換
2. **空白正規化**: 前後trim + 連続スペース→単一スペース
3. **多言語対応**: UTF-8文字（日本語・絵文字等）を完全サポート

#### **処理例**
| 入力 | 処理後 | 説明 |
|------|--------|------|
| `test\n` | `test` | 改行文字をスペース化後trim |
| `hello\tworld` | `hello world` | タブ文字をスペース化 |
| `  test   debug  ` | `test debug` | 前後trim + 連続スペース正規化 |
| `日本語　テスト` | `日本語 テスト` | 全角スペースも正規化対象 |

#### **実装関数例**
```javascript
function normalizeSearchText(text: string): string {
  // a. 制御文字をspaceに変換
  let normalized = text.replace(/[\x00-\x1F\x7F]/g, ' ');
  
  // b. 前後の空白を削除
  normalized = normalized.trim();
  
  // c. 連続するspaceを単一にする
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}
```

### **複数キーワード検索仕様**

#### **キーワード分離**
- **区切り文字**: スペース区切りで複数キーワードを分離
- **検索方式**: AND検索（全キーワードが含まれる必要がある）
- **対象フィールド**: ファイル名・ディレクトリパスの両方

#### **検索ロジック**
```javascript
// ローカル検索での複数キーワード対応
const keywords = normalizedText.split(' ').filter(k => k.length > 0);
filteredEvents = filteredEvents.filter(event => 
  keywords.every(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    return (event.filename || '').toLowerCase().includes(lowerKeyword) ||
           (event.directory || '').toLowerCase().includes(lowerKeyword);
  })
);
```

#### **検索例**
| 検索文字列 | 分離結果 | 検索動作 |
|------------|----------|----------|
| `test` | `["test"]` | 単一キーワード検索 |
| `test debug` | `["test", "debug"]` | AND検索（両方含む） |
| `日本語 テスト` | `["日本語", "テスト"]` | 多言語AND検索 |
| `🔍 file.md` | `["🔍", "file.md"]` | 絵文字も対応 |

### **2段階検索処理**

#### **第1段階: ローカル検索（リアルタイム）**
- **処理**: 文字入力ごとに現在表示中のイベントからJavaScriptで即座に検索
- **対象**: 画面に表示されているイベント（メモリ上のデータ）
- **フィードバック**: 即座に該当行をハイライト表示
- **検索対象フィールド**: ファイル名、ディレクトリパス
- **複数キーワード**: 正規化後のキーワード配列でAND検索実行

#### **第2段階: データベース検索（Shift+Enterキー）**
- **処理**: SQLiteデータベースから包括的に検索
- **トリガー**: Shift+Enterキー押下時
- **取得戦略**: フィルタを考慮した段階的取得
- **複数キーワード**: 各キーワードをAND条件でSQLクエリに適用

### **検索結果キャッシュ管理（将来拡張）**

#### **データ保持戦略**
- **検索結果キャッシュ**: 検索キーワードごとに結果を一時保持
- **キャッシュ容量**: 最大3つの検索結果を保持（LRU方式）
- **破棄タイミング**:
  - 新しい検索実行時（キーワード変更）
  - モード切替時（All↔Unique）
  - ESCキーでの検索モード終了時
  - メモリ使用量が閾値を超えた時

#### **段階的取得アルゴリズム（将来拡張）**

```javascript
// 段階的取得戦略（複数キーワード対応）
async function searchWithFilterConsideration(keywords, activeFilters) {
  const INITIAL_FETCH = 100;    // 初回取得数
  const MAX_FETCH = 1000;       // 最大取得数
  const TARGET_DISPLAY = 50;    // 表示目標数
  
  let offset = 0;
  let displayableEvents = [];
  
  while (displayableEvents.length < TARGET_DISPLAY && offset < MAX_FETCH) {
    // フィルタをSQL条件に含めて検索
    const events = await db.searchEvents({
      keywords: keywords,  // 配列対応
      filters: activeFilters,
      limit: INITIAL_FETCH,
      offset: offset
    });
    
    // フィルタ適用後の表示可能イベントを追加
    const filtered = events.filter(e => passesClientFilters(e));
    displayableEvents.push(...filtered);
    
    // 取得結果が少ない場合は終了
    if (events.length < INITIAL_FETCH) break;
    
    offset += INITIAL_FETCH;
  }
  
  return displayableEvents.slice(0, TARGET_DISPLAY);
}
```


### **データベース検索クエリ**

#### **複数キーワード対応**
```sql
-- 複数キーワードのAND検索クエリ例
SELECT e.*, f.file_path, f.file_name, m.*
FROM events e
JOIN files f ON e.file_id = f.file_id
LEFT JOIN measurements m ON e.event_id = m.event_id
WHERE 
  -- 各キーワードをAND条件で検索
  (f.file_name LIKE '%keyword1%' OR f.file_path LIKE '%keyword1%')
  AND (f.file_name LIKE '%keyword2%' OR f.file_path LIKE '%keyword2%')
ORDER BY e.event_timestamp DESC;
```

## 🔧 実装ガイドライン

### **必要な機能**

1. **入力文字正規化関数**
   - 制御文字をスペースに変換
   - 前後trim + 連続スペース正規化

2. **複数キーワード処理関数**
   - スペース区切りでキーワード分離
   - 各キーワードでのAND検索ロジック

### **他機能との連携**

- **FUNC-300**: 検索モード時の文字入力を受信
- **FUNC-202**: 正規化後の検索文字列を表示に提供

## 🧪 テスト要件

### **基本機能テスト**
- [ ] 制御文字（Enter、Tab等）の正規化
- [ ] 複数キーワードのAND検索
- [ ] 単一キーワード検索（下位互換性）

## 🔗 他機能との連携

- **FUNC-202**: 正規化後の検索文字列を表示
- **FUNC-300**: 検索モード時の文字入力処理

## 🎯 成功指標

- **制御文字混入問題の解決**: Enterキーが検索文字として表示されない
- **複数キーワード検索**: スペース区切りでAND検索が動作する
- **下位互換性**: 単一キーワード検索が引き続き動作する

## 📝 変更履歴

### v1.0.0 (2025-07-09)
- **初版リリース**: FUNC-202から検索機能を分離
- **入力文字正規化**: 制御文字混入問題の解決
- **複数キーワード検索**: スペース区切りAND検索