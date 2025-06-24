---
**アーカイブ情報**
- アーカイブ日: 2025-06-23
- アーカイブ週: 2025/0616-0622
- 元パス: documents/records/reports/
- 検索キーワード: Validator用コンテナ環境, Apple Container, dangerously-skip-permissions, テスト隔離環境, ヘッドレスブラウザ, Puppeteer Xvfb, E2Eテスト環境, コンテナ内テスト実行, 完全隔離環境, テスト権限拡張, ローカルサーバー起動, 統合テスト環境, CI/CD補完, 実装保留提案, 将来的拡張

---

# REP-0023: Validator用コンテナ環境の提案

**作成日**: 2025年6月16日 23:33  
作成者: Clerk Agent  
ステータス: 提案・保留  

## 1. 概要

Validator Agentがフルテスト環境を実現するために、Apple Containerと`--dangerously-skip-permissions`を活用した隔離環境の構築案。現時点では実装を見送るが、将来的な拡張の可能性として記録する。

## 2. 背景

### 2.1 現状の制約
- Validatorはsrc/への読み取り専用アクセスのみ
- npm/composerコマンドの実行に制限
- ローカルサーバー起動を含む統合テストが困難
- E2Eテストでのブラウザ操作が制限される

### 2.2 理想的な要件
- 完全なテスト環境の構築・実行
- 依存関係の自由なインストール
- ローカルサーバーの起動・管理
- ブラウザを使用したE2Eテスト

## 3. 提案内容

### 3.1 基本構成
```bash
# Validator専用の隔離環境起動
claude --dangerously-skip-permissions --agent=validator

# 環境の特徴
- フルシステム権限（コンテナ内のみ）
- 本番コードは読み取り専用マウント
- テスト結果は共有ディレクトリに出力
```

### 3.2 アーキテクチャ
```
Host System
├── workspace/              # 本番コード（読み取り専用マウント）
├── container/
│   ├── validator-env/      # Validator専用環境
│   │   ├── node_modules/   # テスト用依存関係
│   │   ├── vendor/         # PHP依存関係
│   │   └── temp/           # 一時ファイル
│   └── shared/
│       └── test-results/   # テスト結果（ホストと共有）
```

## 4. 技術的課題と解決策

### 4.1 ブラウザテストの課題
**課題**: コンテナ内でのGUIブラウザ起動は困難

**解決策の選択肢**:
1. **ヘッドレスブラウザ（推奨）**
   ```javascript
   const browser = await puppeteer.launch({
     headless: true,
     args: ['--no-sandbox', '--disable-setuid-sandbox']
   });
   ```

2. **仮想ディスプレイ（Xvfb）**
   ```bash
   xvfb-run -a npm run test:e2e
   ```

3. **ホストブラウザ接続**
   ```javascript
   const browser = await puppeteer.connect({
     browserWSEndpoint: 'ws://host.docker.internal:9222/...'
   });
   ```

### 4.2 パフォーマンスの考慮
- メモリ使用量: ブラウザプロセスで1GB以上
- CPU使用率: E2Eテスト実行時に高負荷
- ディスクI/O: node_modules等で大量のファイルアクセス

## 5. 段階的実装案

### Phase 1: 基礎検証（1-2日）
1. コンテナ環境の基本セットアップ
2. 単体テストの実行確認
3. パフォーマンス測定

### Phase 2: 統合テスト対応（3-5日）
1. ローカルサーバー起動の自動化
2. データベース接続の設定
3. APIテストの実装

### Phase 3: E2Eテスト対応（1週間）
1. ヘッドレスブラウザの設定
2. 基本的なE2Eテストの実装
3. CI/CDとの連携設計

## 6. メリット・デメリット

### 6.1 メリット
- **完全な隔離**: 本番環境への影響ゼロ
- **再現性**: クリーンな環境で毎回テスト
- **並列実行**: 複数のValidatorインスタンス可能
- **依存関係の自由**: 任意のツールをインストール可能

### 6.2 デメリット
- **複雑性**: セットアップと保守が複雑
- **リソース**: 追加のメモリ・ストレージ必要
- **学習コスト**: コンテナ技術の理解が必要
- **デバッグ**: 問題発生時の調査が困難

## 7. 代替案との比較

### 7.1 通常権限での運用（現在の方針）
```yaml
ローカルValidator:
  - ユニットテスト: ✅ 実行可能
  - 統合テスト: ⚠️ 制限あり
  - E2Eテスト: ❌ 実行困難

CI/CD:
  - すべてのテスト: ✅ 完全実行
```

### 7.2 コンテナ環境
```yaml
ローカルValidator（コンテナ）:
  - ユニットテスト: ✅ 完全実行
  - 統合テスト: ✅ 完全実行
  - E2Eテスト: ✅ ヘッドレスで実行

CI/CD:
  - すべてのテスト: ✅ 完全実行（変更なし）
```

## 8. 実装判断基準

以下の条件が揃った場合、実装を検討：

1. **テストの複雑化**: 現在の権限では実行不可能なテストが増加
2. **開発速度の低下**: CI/CD待ちがボトルネックに
3. **チーム拡大**: 複数のValidatorが並行作業する必要性
4. **技術的成熟**: コンテナ運用の経験値向上

## 9. 結論

現時点では、以下の理由により実装を保留：
- 現在のテスト要件は通常権限で対応可能
- セットアップの複雑性に対してメリットが限定的
- CI/CDでの補完により、必要十分な品質保証が可能

ただし、プロジェクトの成長に伴い、再評価の価値がある。特に、ローカルでの完全なE2Eテスト実行が必要になった場合は、本提案の実装を検討すべきである。

## 10. 参考情報

### Apple Container関連
- **実装記事**: [Claude Code on Apple Container - Zenn](https://zenn.dev/schroneko/articles/claude-code-on-apple-container)
  - Apple Containerを使用したClaude Codeの実行方法
  - 具体的なセットアップ手順とベストプラクティス

- **公式発表**: [Apple supercharges its tools and technologies for developers](https://www.apple.com/newsroom/2025/06/apple-supercharges-its-tools-and-technologies-for-developers/)
  - Appleによる開発者向けツールの強化発表
  - コンテナ技術への取り組みの概要

- **GitHubリポジトリ**: [apple/container](https://github.com/apple/container)
  - Apple Container の公式リポジトリ
  - 技術仕様とAPIドキュメント

### 関連技術
- Docker/Podman
- Puppeteer/Playwright
- GitHub Codespaces/Dev Containers
- WSL2（Windows環境の場合）

### 類似事例
- VSCode Dev Containers
- GitHub Actions のコンテナ実行
- CircleCI のDocker Executor

---

## 参照URL

**関連レポート**:
- REP-0021: Validator環境設計書（現在のテスト環境設計）

**Apple Container関連**:
- [本文中に記載済みのリンク参照]

---

## 疑問点・決定事項

### 決定事項
1. **実装判断**: 現時点では実装を保留
2. **代替案**: 通常権限での運用＋CI/CDでの補完
3. **ヘッドレスブラウザ**: E2Eテストの推奨アプローチ
4. **再評価基準**: テスト要件の複雑化、開発速度の低下、チーム拡大、技術的成熟

### 疑問点（将来的な検討事項）
1. **パフォーマンス影響**: コンテナオーバーヘッドの実測値
2. **メンテナンスコスト**: コンテナ環境の保守負担
3. **ホストブラウザ接続**: 技術的実現性とセキュリティ
4. **他プロジェクトへの展開**: 汎用性とカスタマイズ
5. **自動化の限界**: どこまで自動化するべきか

---
以上