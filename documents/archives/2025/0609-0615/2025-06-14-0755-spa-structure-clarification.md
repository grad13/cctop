---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: daily記録, 2025-06-14作業, 0755 spa structure clarification, 作業ログ, 技術作業, プロジェクト記録, 開発履歴, 実装記録

---

# SPA構造の整理と簡素化提案

**作成日時**: 2025年6月14日 07:55

## 現状の問題点

1. **重複ファイル**: work.html、index.html、landing.htmlが似た役割
2. **ディレクトリ混在**: public/とassets/の重複
3. **アーキテクチャの不明瞭さ**: SPAとiframeのハイブリッドが理解しにくい

## 提案する構造

### 1. ファイル統廃合
```
削除:
- src/frontend/work.html（未使用）
- src/frontend/public/（Vite自動生成）

統一:
- src/frontend/pages/index.html → src/frontend/index.html（Viteエントリー）
- 全アセットをassets/に統一
```

### 2. 明確なアーキテクチャ説明
```
TimeBoxing = Shell SPA + iframe islands

Shell SPA (app.js):
- 認証管理
- ナビゲーション（Quick Switch）
- 共通ヘッダー
- VisionStore（データ管理）

iframe islands:
- TaskGrid（独立したタスク管理UI）
- TimeBox（独立したタイマーUI）
- Account（独立したアカウント管理UI）
```

### 3. 簡素化後のファイル構造
```
src/frontend/
├── index.html          # Viteエントリー（landing.htmlへリダイレクト）
├── app.js             # Shell SPAコントローラー
├── assets/            # 全静的アセット
├── components/        # 共有コンポーネント
├── islands/           # 各島のHTML/JS/CSS
├── lib/              # 共有ライブラリ
└── pages/
    └── landing/       # 認証画面
```

## 実装手順

1. work.htmlの削除
2. public/favicon.icoをassets/favicon/に移動
3. public/ディレクトリの削除
4. vite.config.jsの調整（必要に応じて）
5. ドキュメントの更新

## 利点

- **シンプル**: 重複ファイルがなくなる
- **明確**: Shell SPA + iframeの役割が明確
- **保守性**: ファイル構造が理解しやすい