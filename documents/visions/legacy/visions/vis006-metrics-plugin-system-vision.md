# v006: Metrics Plugin System Vision

**Document ID**: v006-metrics-plugin-system-vision  
**Created**: 2025-06-23 02:35  
**Updated**: 2025-06-23 03:00  
**Author**: Architect Agent  
**Status**: Active  
**Parent**: v004-cctop-core-features-vision
**Purpose**: メトリクス抽出プラグインシステムの詳細ビジョンと設計

## 🎯 ビジョンステートメント

**「カスタマイズ可能なファイルメトリクス抽出」** - ユーザーが自由にファイルメトリクスを定義・抽出し、自動的にDB保存・可視化できるプラグインシステムを構築する。

## 🏗️ メトリクスプラグインアーキテクチャ

### 基本フロー
```
[File Change] → [chokidar] → [Plugin Manager] → [Metrics Plugins] → [DB Storage] → [View]
                                    ↓                    ↓
                             Plugin Loader         User-defined JS
                                                  Metrics Extractors
```

### システム設計原則
1. **シンプルなインターフェース**: JavaScriptで簡単にメトリクス抽出ロジックを記述
2. **自動適用**: ファイルタイプに応じて適切なプラグインを自動選択
3. **非同期処理**: メトリクス抽出がメインプロセスをブロックしない
4. **エラー耐性**: プラグインエラーがシステム全体に影響しない
5. **拡張性**: 新しいファイルタイプ・メトリクスを簡単に追加可能

## 📊 標準メトリクスプラグイン

### 1. All Files Metrics（全ファイル共通）
```javascript
// plugins/metrics/all-files.js
module.exports = {
  name: 'all-files-metrics',
  version: '1.0.0',
  filePatterns: ['*'],  // すべてのファイルに適用
  
  async extractMetrics(filePath, fileContent, stats) {
    return {
      // 基本メトリクス
      file_size: stats.size,
      line_count: fileContent.split('\n').length,
      
      // 追加メトリクス
      character_count: fileContent.length,
      last_modified: stats.mtime.getTime(),
      is_binary: this.isBinary(fileContent),
      encoding: this.detectEncoding(fileContent)
    };
  },
  
  // ヘルパーメソッド
  isBinary(content) {
    return /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content.substring(0, 8000));
  },
  
  detectEncoding(content) {
    // 簡易的なエンコーディング検出
    return 'utf-8'; // 実際にはより高度な検出ロジック
  }
};
```

### 2. Markdown Metrics
```javascript
// plugins/metrics/markdown.js
module.exports = {
  name: 'markdown-metrics',
  version: '1.0.0',
  filePatterns: ['*.md', '*.markdown'],
  
  async extractMetrics(filePath, fileContent) {
    const lines = fileContent.split('\n');
    
    return {
      // Markdownセクション数
      section_count: this.countSections(lines),
      h1_count: this.countHeaders(lines, 1),
      h2_count: this.countHeaders(lines, 2),
      h3_count: this.countHeaders(lines, 3),
      
      // リンク・画像統計
      link_count: this.countLinks(fileContent),
      image_count: this.countImages(fileContent),
      
      // コードブロック統計
      code_block_count: this.countCodeBlocks(fileContent),
      inline_code_count: this.countInlineCode(fileContent),
      
      // リスト統計
      bullet_list_count: this.countBulletLists(lines),
      numbered_list_count: this.countNumberedLists(lines),
      
      // テーブル数
      table_count: this.countTables(lines),
      
      // 単語数（日本語対応）
      word_count: this.countWords(fileContent)
    };
  },
  
  countSections(lines) {
    return lines.filter(line => /^#{1,6}\s/.test(line)).length;
  },
  
  countHeaders(lines, level) {
    const pattern = new RegExp(`^#{${level}}\\s`);
    return lines.filter(line => pattern.test(line)).length;
  },
  
  countLinks(content) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    return (content.match(linkPattern) || []).length;
  },
  
  countImages(content) {
    const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
    return (content.match(imagePattern) || []).length;
  },
  
  countCodeBlocks(content) {
    const codeBlockPattern = /```[\s\S]*?```/g;
    return (content.match(codeBlockPattern) || []).length;
  },
  
  countInlineCode(content) {
    const inlineCodePattern = /`[^`]+`/g;
    return (content.match(inlineCodePattern) || []).length;
  },
  
  countWords(content) {
    // 英語単語
    const englishWords = content.match(/\b\w+\b/g) || [];
    // 日本語文字（漢字・ひらがな・カタカナ）
    const japaneseChars = content.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/g) || [];
    return englishWords.length + japaneseChars.length;
  }
};
```

### 3. Python Metrics
```javascript
// plugins/metrics/python.js
module.exports = {
  name: 'python-metrics',
  version: '1.0.0',
  filePatterns: ['*.py'],
  
  async extractMetrics(filePath, fileContent) {
    const lines = fileContent.split('\n');
    
    return {
      // 関数・クラス統計
      function_count: this.countFunctions(lines),
      class_count: this.countClasses(lines),
      method_count: this.countMethods(lines),
      
      // import統計
      import_count: this.countImports(lines),
      from_import_count: this.countFromImports(lines),
      
      // デコレータ統計
      decorator_count: this.countDecorators(lines),
      
      // コメント・docstring統計
      comment_lines: this.countCommentLines(lines),
      docstring_count: this.countDocstrings(fileContent),
      
      // 複雑度指標
      max_indentation_level: this.getMaxIndentation(lines),
      average_line_length: this.getAverageLineLength(lines),
      
      // 型ヒント統計
      type_hint_count: this.countTypeHints(lines),
      
      // テスト関連
      test_function_count: this.countTestFunctions(lines),
      assert_count: this.countAsserts(lines)
    };
  },
  
  countFunctions(lines) {
    const functionPattern = /^\s*def\s+\w+\s*\(/;
    return lines.filter(line => functionPattern.test(line)).length;
  },
  
  countClasses(lines) {
    const classPattern = /^\s*class\s+\w+/;
    return lines.filter(line => classPattern.test(line)).length;
  },
  
  countMethods(lines) {
    // クラス内のdefをカウント（インデントあり）
    const methodPattern = /^\s+def\s+\w+\s*\(/;
    return lines.filter(line => methodPattern.test(line)).length;
  },
  
  countImports(lines) {
    const importPattern = /^\s*import\s+/;
    return lines.filter(line => importPattern.test(line)).length;
  },
  
  countFromImports(lines) {
    const fromImportPattern = /^\s*from\s+.+\s+import\s+/;
    return lines.filter(line => fromImportPattern.test(line)).length;
  },
  
  countDecorators(lines) {
    const decoratorPattern = /^\s*@\w+/;
    return lines.filter(line => decoratorPattern.test(line)).length;
  },
  
  countTypeHints(lines) {
    const typeHintPattern = /:\s*[A-Z]\w*(\[.*?\])?/;
    return lines.filter(line => typeHintPattern.test(line)).length;
  },
  
  countTestFunctions(lines) {
    const testPattern = /^\s*def\s+test_\w+\s*\(/;
    return lines.filter(line => testPattern.test(line)).length;
  }
};
```

### 4. JavaScript/TypeScript Metrics（追加）
```javascript
// plugins/metrics/javascript.js
module.exports = {
  name: 'javascript-metrics',
  version: '1.0.0',
  filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx'],
  
  async extractMetrics(filePath, fileContent) {
    const lines = fileContent.split('\n');
    
    return {
      // 関数統計
      function_count: this.countFunctions(lines),
      arrow_function_count: this.countArrowFunctions(lines),
      async_function_count: this.countAsyncFunctions(lines),
      
      // クラス・オブジェクト統計
      class_count: this.countClasses(lines),
      interface_count: this.countInterfaces(lines),
      type_count: this.countTypes(lines),
      enum_count: this.countEnums(lines),
      
      // エクスポート統計
      export_count: this.countExports(lines),
      default_export_count: this.countDefaultExports(lines),
      
      // インポート統計
      import_count: this.countImports(lines),
      require_count: this.countRequires(lines),
      
      // React特有（JSX）
      component_count: this.countReactComponents(lines),
      hook_usage_count: this.countHookUsage(lines)
    };
  }
};
```

### 5. CSS/Styling Metrics（追加）
```javascript
// plugins/metrics/css.js
module.exports = {
  name: 'css-metrics',
  version: '1.0.0',
  filePatterns: ['*.css', '*.scss', '*.sass', '*.less'],
  
  async extractMetrics(filePath, fileContent) {
    return {
      // セレクタ統計
      selector_count: this.countSelectors(fileContent),
      class_selector_count: this.countClassSelectors(fileContent),
      id_selector_count: this.countIdSelectors(fileContent),
      
      // ルール統計
      rule_count: this.countRules(fileContent),
      media_query_count: this.countMediaQueries(fileContent),
      
      // プロパティ統計
      property_count: this.countProperties(fileContent),
      color_count: this.countColors(fileContent),
      
      // 複雑度
      nesting_depth: this.getMaxNestingDepth(fileContent),
      specificity_average: this.calculateAverageSpecificity(fileContent)
    };
  }
};
```

## 🔌 プラグイン管理システム

### プラグインローダー
```javascript
class MetricsPluginLoader {
  constructor(pluginDir = './plugins/metrics') {
    this.pluginDir = pluginDir;
    this.plugins = new Map();
    this.fileTypeMap = new Map(); // 拡張子 → プラグインのマッピング
  }
  
  async loadPlugins() {
    const pluginFiles = await fs.readdir(this.pluginDir);
    
    for (const file of pluginFiles) {
      if (!file.endsWith('.js')) continue;
      
      try {
        const plugin = require(path.join(this.pluginDir, file));
        this.validatePlugin(plugin);
        this.registerPlugin(plugin);
      } catch (error) {
        console.error(`Failed to load plugin ${file}:`, error);
      }
    }
  }
  
  validatePlugin(plugin) {
    const required = ['name', 'version', 'filePatterns', 'extractMetrics'];
    for (const field of required) {
      if (!plugin[field]) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }
  }
  
  registerPlugin(plugin) {
    this.plugins.set(plugin.name, plugin);
    
    // ファイルパターンの登録
    for (const pattern of plugin.filePatterns) {
      if (!this.fileTypeMap.has(pattern)) {
        this.fileTypeMap.set(pattern, []);
      }
      this.fileTypeMap.get(pattern).push(plugin);
    }
  }
}
```

### メトリクス抽出エンジン
```javascript
class MetricsExtractor {
  constructor(pluginLoader, dbManager) {
    this.pluginLoader = pluginLoader;
    this.dbManager = dbManager;
  }
  
  async extractMetrics(filePath, stats) {
    const applicablePlugins = this.getApplicablePlugins(filePath);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const allMetrics = {};
    
    // 各プラグインでメトリクスを抽出
    for (const plugin of applicablePlugins) {
      try {
        const metrics = await plugin.extractMetrics(filePath, fileContent, stats);
        Object.assign(allMetrics, this.prefixMetrics(metrics, plugin.name));
      } catch (error) {
        console.error(`Plugin ${plugin.name} failed for ${filePath}:`, error);
      }
    }
    
    return allMetrics;
  }
  
  getApplicablePlugins(filePath) {
    const plugins = [];
    const fileName = path.basename(filePath);
    
    // ファイルパターンマッチング
    for (const [pattern, pluginList] of this.fileTypeMap) {
      if (this.matchesPattern(fileName, pattern)) {
        plugins.push(...pluginList);
      }
    }
    
    return plugins;
  }
  
  matchesPattern(fileName, pattern) {
    if (pattern === '*') return true;
    
    // 簡易的なワイルドカードマッチング
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(fileName);
  }
  
  prefixMetrics(metrics, pluginName) {
    // メトリクス名の衝突を避けるためプレフィックスを付ける
    const prefixed = {};
    for (const [key, value] of Object.entries(metrics)) {
      prefixed[`${pluginName}.${key}`] = value;
    }
    return prefixed;
  }
}
```

## 💾 データベーススキーマ拡張

### メトリクステーブル
```sql
-- ファイルメトリクス格納テーブル
CREATE TABLE file_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    event_id INTEGER NOT NULL,  -- eventsテーブルへの外部キー
    metric_name TEXT NOT NULL,
    metric_value TEXT,          -- 柔軟性のためTEXT型
    metric_type TEXT,           -- 'integer', 'float', 'string', 'boolean'
    plugin_name TEXT NOT NULL,
    extracted_at INTEGER NOT NULL,
    
    FOREIGN KEY (event_id) REFERENCES events(id),
    INDEX idx_file_metrics_path (file_path),
    INDEX idx_file_metrics_name (metric_name)
);

-- メトリクス定義テーブル（メタデータ）
CREATE TABLE metric_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT UNIQUE NOT NULL,
    plugin_name TEXT NOT NULL,
    description TEXT,
    data_type TEXT,
    unit TEXT,              -- 'bytes', 'count', 'percentage', etc.
    category TEXT,          -- 'size', 'complexity', 'quality', etc.
    created_at INTEGER NOT NULL
);

-- 最新メトリクスビュー（高速アクセス用）
CREATE VIEW latest_file_metrics AS
SELECT 
    fm.file_path,
    fm.metric_name,
    fm.metric_value,
    fm.metric_type,
    fm.plugin_name,
    fm.extracted_at
FROM file_metrics fm
INNER JOIN (
    SELECT file_path, metric_name, MAX(extracted_at) as max_extracted
    FROM file_metrics
    GROUP BY file_path, metric_name
) latest ON fm.file_path = latest.file_path 
    AND fm.metric_name = latest.metric_name 
    AND fm.extracted_at = latest.max_extracted;
```

## 📊 メトリクス可視化

### CLI表示フォーマット
```
┌─ File Metrics: src/main.py ───────────────────────────┐
│ Basic Metrics                                         │
│ ├─ file_size: 2,456 bytes                           │
│ ├─ line_count: 145                                   │
│ └─ character_count: 2,456                           │
│                                                       │
│ Python Metrics                                        │
│ ├─ function_count: 12                               │
│ ├─ class_count: 3                                   │
│ ├─ method_count: 18                                 │
│ ├─ import_count: 8                                  │
│ ├─ decorator_count: 5                               │
│ ├─ type_hint_count: 23                              │
│ └─ test_function_count: 6                           │
│                                                       │
│ Code Quality                                          │
│ ├─ comment_lines: 32 (22%)                          │
│ ├─ docstring_count: 15                              │
│ └─ max_indentation_level: 4                         │
└───────────────────────────────────────────────────────┘
```

### 統計ダッシュボード
```
┌─ Metrics Dashboard ────────────────────────────────────┐
│ Project Statistics (Last 24 hours)                    │
├───────────────────────────────────────────────────────┤
│ Total Files: 156 | Changed: 23 | New Metrics: 1,247  │
│                                                       │
│ Top Changed Files by Complexity                       │
│ 1. src/core/engine.py     (functions: +5, size: +450)│
│ 2. tests/test_parser.py   (tests: +8, asserts: +24) │
│ 3. docs/api.md           (sections: +3, links: +12) │
│                                                       │
│ Language Distribution                                 │
│ Python:    45% ████████████████████                 │
│ JavaScript: 30% ████████████                        │
│ Markdown:   15% ██████                              │
│ Other:      10% ████                                │
│                                                       │
│ Trend: Code Quality ↑ 12% | Test Coverage ↑ 5%      │
└───────────────────────────────────────────────────────┘
```

## 🚀 プラグイン開発ガイド

### 最小限のプラグイン例
```javascript
// plugins/metrics/simple-example.js
module.exports = {
  name: 'simple-metrics',
  version: '1.0.0',
  filePatterns: ['*.txt'],
  
  async extractMetrics(filePath, fileContent) {
    return {
      uppercase_count: (fileContent.match(/[A-Z]/g) || []).length,
      lowercase_count: (fileContent.match(/[a-z]/g) || []).length,
      digit_count: (fileContent.match(/[0-9]/g) || []).length
    };
  }
};
```

### 高度なプラグイン機能
```javascript
// 非同期処理・外部ツール連携の例
module.exports = {
  name: 'advanced-metrics',
  version: '1.0.0',
  filePatterns: ['*.js', '*.ts'],
  
  // 初期化処理
  async init() {
    this.cache = new Map();
    this.astParser = require('@babel/parser');
  },
  
  // メトリクス抽出
  async extractMetrics(filePath, fileContent) {
    // キャッシュチェック
    const cached = this.getCached(filePath, fileContent);
    if (cached) return cached;
    
    // AST解析
    const ast = await this.parseAST(fileContent);
    
    // 複雑度計算
    const complexity = await this.calculateComplexity(ast);
    
    // 結果をキャッシュ
    const metrics = {
      cyclomatic_complexity: complexity.cyclomatic,
      cognitive_complexity: complexity.cognitive,
      maintainability_index: complexity.maintainability
    };
    
    this.cache.set(this.getCacheKey(filePath, fileContent), metrics);
    return metrics;
  },
  
  // クリーンアップ
  async destroy() {
    this.cache.clear();
  }
};
```

## 🎯 成功指標

### 機能面
- **標準プラグイン**: 5種類以上のファイルタイプ対応
- **メトリクス種類**: 50種類以上の有用なメトリクス
- **カスタムプラグイン**: ユーザー作成プラグイン10個以上
- **処理性能**: 1ファイルあたり < 100ms

### 技術面
- **プラグイン起動時間**: < 50ms
- **メモリ使用量**: < 5MB/plugin
- **エラー分離**: プラグインエラーの100%隔離
- **API安定性**: 後方互換性維持

### ユーザビリティ
- **プラグイン作成時間**: 基本的なものは10分以内
- **ドキュメント充実度**: 全APIの説明・サンプル完備
- **デバッグ容易性**: 詳細なエラーメッセージ
- **設定の簡便性**: ゼロコンフィグで動作

## 🎨 拡張可能性とユースケース

### チーム固有のメトリクス例
```javascript
// plugins/metrics/team-custom.js
module.exports = {
  name: 'team-custom-metrics',
  version: '1.0.0',
  filePatterns: ['*.js', '*.ts'],
  
  async extractMetrics(filePath, fileContent) {
    return {
      // TODO/FIXMEコメント追跡
      todo_count: (fileContent.match(/\/\/\s*TODO/gi) || []).length,
      fixme_count: (fileContent.match(/\/\/\s*FIXME/gi) || []).length,
      
      // チーム独自のコーディング規約チェック
      console_log_count: (fileContent.match(/console\.log/g) || []).length,
      debugger_count: (fileContent.match(/debugger/g) || []).length,
      
      // 特定のパターン検出
      deprecated_api_usage: this.countDeprecatedAPIs(fileContent),
      security_concern_patterns: this.findSecurityPatterns(fileContent)
    };
  }
};
```

### プロジェクト特有の測定項目
- **APIエンドポイント数**: RESTful APIルート定義のカウント
- **データベースクエリ数**: SQL/ORMクエリの検出
- **国際化キー数**: i18nキーの使用状況
- **テストカバレッジ関連**: describe/it/testブロックの統計
- **ドキュメントコメント率**: JSDoc/TSDocの充実度

### 設定ファイル統合例
```json
// cctop-config.json
{
  "plugins": [
    // 標準プラグイン
    "./plugins/metrics/all-files.js",
    "./plugins/metrics/markdown.js",
    "./plugins/metrics/python.js",
    "./plugins/metrics/javascript.js",
    "./plugins/metrics/css.js",
    
    // カスタムプラグイン
    "./plugins/metrics/team-custom.js",
    "./plugins/metrics/api-endpoints.js",
    "./plugins/metrics/i18n-usage.js"
  ],
  
  // プラグイン設定
  "pluginConfig": {
    "team-custom-metrics": {
      "deprecatedAPIs": ["oldFunction", "legacyMethod"],
      "securityPatterns": ["eval(", "innerHTML"]
    }
  }
}
```

---

**Core Message**: メトリクスプラグインシステムにより、cctopは単なるファイル監視から、カスタマイズ可能なコード分析プラットフォームへと進化する。チーム固有のニーズに合わせて自由に拡張でき、プロジェクトの品質向上に直接貢献する。