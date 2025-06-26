# block_count メタデータ仕様計画書

**Document ID**: r003-block-count-specification  
**Date**: 2025-06-22  
**Created**: 2025-06-23 00:10  
**Author**: Builder Agent  
**Status**: Active  
**Purpose**: cctop v4.0.0におけるblock_countメタデータの詳細仕様策定

## 🎯 設計目的

**block_count**は、Claude Codeの意味でのブロック（論理的コードブロック）数を記録し、コード構造の複雑度・変更量の定量化を可能にする。

## 📊 基本仕様

### **定義**
- **目的**: Claude Codeの意味でのブロック（論理的コードブロック）数測定
- **対象**: 関数・クラス・インターフェース・型定義・マークダウンセクション等
- **用途**: コード構造の複雑度・変更量の定量化

### **言語別取得方法**

| 言語・ファイル形式 | 検出対象 | 取得方法 |
|----------------|---------|---------|
| JavaScript/TypeScript | 関数・クラス・インターフェース・型・enum・オブジェクト定義 | 正規表現パターンマッチング |
| Python | 関数・クラス・トップレベル定数 | 正規表現パターンマッチング |
| Markdown | ヘッダー（#, ##, ###等） | ヘッダー行カウント |
| JSON | トップレベルキー | JSON.parse() → Object.keys() |
| その他 | 行数ベース推定 | 行数による段階的計算 |

## 🔧 実装仕様

### **基本ロジック**（先行研究ベース）
```javascript
class BlockCounter {
  count(filePath, content) {
    const ext = path.extname(filePath).toLowerCase()
    
    switch (ext) {
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return this.countJavaScript(content)
      
      case '.md':
      case '.mdx':
        return this.countMarkdown(content)
      
      case '.json':
        return this.countJSON(content)
      
      case '.py':
        return this.countPython(content)
      
      default:
        return this.countGeneric(content)
    }
  }
}
```

### **データベース保存**
- **型**: INTEGER
- **NULL許可**: あり（エラー時・ディレクトリ・バイナリファイル）
- **インデックス**: 不要（統計用途のみ）

## 📋 詳細仕様（先行研究準拠）

### **言語別検出ロジック**

#### **JavaScript/TypeScript**
```javascript
countJavaScript(content) {
  let blocks = 0
  
  // 関数宣言
  blocks += (content.match(/^(export\s+)?(async\s+)?function\s+\w+/gm) || []).length
  
  // アロー関数（const/let/var で始まる）
  blocks += (content.match(/^(export\s+)?(const|let|var)\s+\w+\s*=.*=>/gm) || []).length
  
  // クラス定義
  blocks += (content.match(/^(export\s+)?(abstract\s+)?class\s+\w+/gm) || []).length
  
  // インターフェース・型・enum定義
  blocks += (content.match(/^(export\s+)?(interface|type|enum)\s+\w+/gm) || []).length
  
  // オブジェクト定義
  blocks += (content.match(/^(export\s+)?(const|let|var)\s+\w+\s*=\s*{/gm) || []).length
  
  return Math.max(blocks, 1) // 最低1ブロック
}
```

#### **Markdown**
```javascript
countMarkdown(content) {
  // ヘッダー行をカウント
  const headers = content.match(/^#{1,6}\s+.+$/gm) || []
  return Math.max(headers.length, 1)
}
```

#### **JSON**
```javascript
countJSON(content) {
  try {
    const parsed = JSON.parse(content)
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.keys(parsed).length
    }
  } catch (error) {
    // パースエラーの場合は1ブロック
  }
  return 1
}
```

#### **Python**
```javascript
countPython(content) {
  let blocks = 0
  
  // 関数定義
  blocks += (content.match(/^def\s+\w+/gm) || []).length
  
  // クラス定義
  blocks += (content.match(/^class\s+\w+/gm) || []).length
  
  // トップレベル変数・定数
  blocks += (content.match(/^[A-Z_][A-Z0-9_]*\s*=/gm) || []).length
  
  return Math.max(blocks, 1)
}
```

#### **汎用（その他言語）**
```javascript
countGeneric(content) {
  const lines = content.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length === 0) return 0
  if (lines.length <= 20) return 1
  if (lines.length <= 50) return 2
  if (lines.length <= 100) return 3
  
  // 100行以上は50行毎に1ブロック追加
  return Math.floor(lines.length / 50) + 1
}
```

### **取得タイミング**
- **ファイルのみ**（ディレクトリは`null`）
- Find/Create/Modify イベントで取得
- Delete イベントでは取得不要（既存値使用）

### **エラー処理**
| 状況 | 処理 | 記録値 |
|------|------|--------|
| ファイル読み込み不可 | エラーログ出力 | `null` |
| バイナリファイル | 検出スキップ | `null` |
| 空ファイル | 正常処理 | `0` |
| ディレクトリ | 処理スキップ | `null` |

### **用途・活用方法**

#### **1. コード複雑度の定量化**
```
main.js: 15ブロック（関数8 + クラス3 + オブジェクト4）
utils.js: 8ブロック（関数7 + オブジェクト1）
→ main.jsの方が複雑
```

#### **2. 変更量の可視化**
```
変更前: config.js 3ブロック
変更後: config.js 7ブロック
→ +4ブロック（大幅な機能追加）
```

#### **3. 統計・分析**
- プロジェクト全体のコード規模
- ファイル別の複雑度分布
- 時系列でのコード成長量
- 言語別のブロック密度

## 🧪 テスト要件

### **言語別テスト**
- [ ] JavaScript: 関数・クラス・インターフェース・型・enum・オブジェクト検出
- [ ] TypeScript: 同上 + abstract class・export対応
- [ ] Python: 関数・クラス・定数検出  
- [ ] Markdown: ヘッダー（#〜######）検出
- [ ] JSON: トップレベルキー数取得

### **特殊ケーステスト**
- [ ] 空ファイル → 0ブロック
- [ ] 改行のみファイル → 0ブロック
- [ ] バイナリファイル → null
- [ ] 巨大ファイル（>10MB） → null
- [ ] 権限不足ファイル → null

### **検証方法**
```javascript
// テストケース例
const testCases = [
  {
    file: 'test.js',
    content: 'function hello() {}\nconst config = {}\nclass User {}',
    expected: 3 // 関数1 + オブジェクト1 + クラス1
  },
  {
    file: 'test.md', 
    content: '# Title\n## Section\n### Sub',
    expected: 3 // ヘッダー3個
  }
]
```

## 📈 分析・活用例

### **コード品質レポート**
- **プロジェクト全体**: 総ブロック数・ファイル数・複雑度分布
- **言語別分析**: JavaScript vs TypeScript vs Python のブロック密度
- **時系列変化**: 開発進捗に応じたコード成長量

### **開発活動検出**
- **大規模リファクタリング**: 短時間での大幅ブロック数変化
- **新機能追加**: 特定ファイルのブロック数増加パターン
- **コード整理**: ブロック数減少（統合・削除）の検出

## 🚀 実装優先度

### **Phase 1**（必須）
- 基本取得機能（JavaScript/TypeScript/Markdown/JSON/Python対応）
- エラー処理・null値対応
- データベース保存

### **Phase 2**（重要）
- 統計・分析機能
- コード品質レポート生成
- 変更量デルタ表示

### **Phase 3**（拡張）
- 追加言語対応（Go・Rust・C++等）
- 異常検出・アラート
- 時系列分析・トレンド

---

## 📝 まとめ

block_countにより、cctopは単なるファイル監視を超えて**コード構造分析ツール**としての価値を提供する。先行研究（product-v01）の実装を活用し、Claude Codeの意味でのブロック数を正確に測定・分析可能。

## 📊 先行研究バージョン比較

| バージョン | アプローチ | Block計算 | データ保存 | UI表示 | 完成度 |
|-----------|------------|-----------|------------|--------|--------|
| **product-v00** | WebUI主体 | sections用語 | 未確認 | Chart表示 | 部分的 |
| **product-v01** | 専用モジュール | 完全実装 | ファイル別 | CLI表示 | **最高** |
| **product-v02** | DB統合型 | 外部依存 | SQLite | 未確認 | 中程度 |
| **product-v03** | 統計のみ | 未実装 | メモリ内 | なし | 最小 |

### **主要実装ファイル**
- **product-v00**: `/src/web/config/metrics.json` (sections用語)
- **product-v01**: `/src/block-counter.js` (完全実装)  
- **product-v02**: `/src/database/schema.js` (DB統合)
- **product-v03**: block関連実装なし

### **採用判断**
**product-v01の実装を基盤採用**（最も完成度が高いため）

**参考実装**: `/VERSIONs/product-v01/src/block-counter.js`  
**参考仕様**: `/VERSIONs/product-v01/docs/specifications/config/block-detection-spec.md`  
**DB統合参考**: `/VERSIONs/product-v02/src/database/schema.js`

**次のステップ**: この仕様をr002およびa008に統合し、実装準備を整える。