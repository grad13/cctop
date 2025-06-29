# PLAN-20250628-001: TypeScript Migration Plan

**作成日**: 2025-06-28  
**作成者**: Builder  
**ステータス**: 計画書作成完了・実行承認待ち  
**カテゴリ**: 🏗️ システム移行  
**優先度**: High  
**見積工数**: 10日間（段階的実行）

## 1. 概要

cctopプロジェクトを純粋なJavaScriptからTypeScriptへ段階的に移行する計画です。

### 1.1 背景
- 現在のプロジェクトは純粋なJavaScript（Node.js v24.2.0）
- コードベースが成長し、型安全性の必要性が増大
- similarity-ts分析により重複コードは最小限（1ペアのみ）

### 1.2 目的
- **型安全性**: 実行時エラーの削減
- **開発効率**: IDE支援による自動補完・リファクタリング
- **保守性**: 型がドキュメントとして機能
- **品質向上**: コンパイル時の型チェック

## 2. 現状分析

### 2.1 プロジェクト構造
```
cctop/
├── bin/
│   └── cctop (エントリーポイント)
├── src/
│   ├── core/
│   ├── database/
│   ├── interactive/
│   ├── ui/
│   └── utils/
└── test/
```

### 2.2 コード重複分析結果
```
Similarity: 92.58%, Score: 9.3 points
  ./src/utils/display-width.js:3-12 padEndWithWidth
  ./src/utils/display-width.js:14-23 padStartWithWidth
```

### 2.3 主要依存関係
- chokidar@3.5.3
- sqlite3@5.1.6
- chalk@4.1.2
- string-width@4.2.3

## 3. 移行戦略

### 3.1 基本方針
- **段階的移行**: .jsと.tsを共存させながら移行
- **ボトムアップ**: ユーティリティ→データ層→UI層→コア
- **型定義優先**: インターフェースを先に定義
- **既存テスト維持**: 全テストが通ることを保証

### 3.2 技術的決定事項

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## 4. 実行計画

### Phase 1: 環境構築（Day 1）
- [x] TypeScript、@types/nodeインストール済み
- [ ] tsconfig.json作成
- [ ] npm scripts追加（build, watch）
- [ ] .gitignore更新

### Phase 2: ユーティリティ移行（Day 2-3）
- [ ] src/utils/display-width.js → .ts（リファクタリング含む）
- [ ] src/utils/buffered-renderer.js → .ts
- [ ] src/utils/その他ユーティリティ → .ts

### Phase 3: データベース層（Day 4-5）
- [ ] 型定義作成（interfaces/database.ts）
  ```typescript
  interface FileInfo {
    id: number;
    path: string;
    inode: number;
    // ...
  }
  
  interface EventRecord {
    id: number;
    fileId: number;
    eventType: EventType;
    timestamp: number;
    // ...
  }
  ```
- [ ] src/database/*.js → .ts

### Phase 4: UI層（Day 6-8）
- [ ] src/ui/render/*.js → .ts
- [ ] src/ui/managers/*.js → .ts
- [ ] src/ui/interactive/*.js → .ts

### Phase 5: インタラクティブ機能（Day 8-9）
- [ ] src/interactive/*.js → .ts
- [ ] State Machine型定義

### Phase 6: コアアプリケーション（Day 9-10）
- [ ] bin/cctop → TypeScript化
- [ ] src/core/*.js → .ts
- [ ] エントリーポイント調整

## 5. リスクと対策

### 5.1 識別されたリスク
| リスク | 影響度 | 確率 | 対策 |
|--------|--------|------|------|
| ビルドステップ追加による複雑化 | 中 | 高 | npm scriptsで自動化 |
| 型定義が存在しない依存関係 | 低 | 中 | 自前で型定義作成 |
| 移行中の型整合性 | 中 | 中 | allowJsで段階的対応 |
| パフォーマンス劣化 | 低 | 低 | incrementalビルド使用 |

### 5.2 ロールバック計画
- 各Phaseはgitタグで管理
- 問題発生時は前のPhaseに戻る
- JavaScriptファイルは削除せず.oldとして保持

## 6. 成功基準

- [ ] 全ソースコードがTypeScript化される
- [ ] 既存テストが全て通る（0 failures）
- [ ] 型エラーが0になる
- [ ] ビルド時間 < 10秒
- [ ] IDE支援が有効に機能する

## 7. 具体的なリファクタリング例

### display-width.ts
```typescript
import stringWidth from 'string-width';

type PaddingDirection = 'start' | 'end';

function padWithWidth(
  str: string, 
  targetWidth: number, 
  direction: PaddingDirection = 'end'
): string {
  const currentWidth = stringWidth(str);
  const padding = targetWidth - currentWidth;
  
  if (padding <= 0) {
    return truncateWithEllipsis(str, targetWidth);
  }
  
  const spaces = ' '.repeat(padding);
  return direction === 'start' ? spaces + str : str + spaces;
}

export function padEndWithWidth(str: string, targetWidth: number): string {
  return padWithWidth(str, targetWidth, 'end');
}

export function padStartWithWidth(str: string, targetWidth: number): string {
  return padWithWidth(str, targetWidth, 'start');
}

export function truncateWithEllipsis(str: string, maxWidth: number): string {
  // 実装略
}
```

## 8. 実行承認チェックリスト

- [ ] 全体的な移行戦略に同意
- [ ] 10日間の工数見積もりが妥当
- [ ] Phase分割が適切
- [ ] リスク対策が十分

## 9. 次のアクション

承認後、即座に以下を実行：
1. tsconfig.json作成
2. npm scriptsの設定
3. Phase 1の完了
4. display-width.tsへの移行開始

---

**注**: この計画は段階的実行を前提としており、各Phaseの完了後に次のPhaseへ進みます。問題が発生した場合は、即座に報告し、計画の修正を行います。