---
**アーカイブ情報**
- アーカイブ日: 2025-06-17（統合移行）
- アーカイブ週: 2025/0616-0622
- 元パス: documents/rules/meta/hypotheses/
- 検索キーワード: H036Monitor作業検出型記録リマインダーシステム, Monitor記録忘れ作業タイミング検出不足解決, chokidar監視monitor変更検知5分後チェック, 技術集中記録失念自動警告促進, status更新なし警告統計記録遵守率, 監視作業特化アイドル時間考慮, 自己監視哲学監視する者監視される, 記録習慣確立現実的タイミング調整

---

# H036: Monitor作業検出型記録リマインダーシステム

**作成日**: 2025年6月14日  
**ステータス**: 検証中  
**検証期間**: 2025年6月14日〜21日（1週間）  
**背景**: Monitor Agent H025連続違反問題の現実的解決策

## 🎯 仮説

**Monitor Agentの記録忘れ問題は、「作業タイミングの検出不足」が原因。monitor/ディレクトリ変更を検知し、作業後の記録を自動的に促すシステムにより、自然で現実的な記録習慣を確立できる。**

## 📋 問題分析

### Monitor Agent特有の課題
1. **作業タイミングの不明確性**: ユーザー指示と実際の作業開始に時間差
2. **アイドル時間の存在**: 統計監視は継続的だが、能動的作業は断続的
3. **技術集中による記録失念**: 統計・監視作業中の記録意識の低下

### H025（並行記録）がMonitorに不適切な理由
- **作業パターンの特殊性**: 一時的な集中作業→長時間のアイドル
- **並行記録の困難性**: 技術作業中の記録は認知負荷が高い
- **強制力の限界**: 作業頻度が不定期のため、定期チェックが非現実的

## 🔧 提案システム：作業検出型リマインダー

### 基本コンセプト
```
monitor/ディレクトリ変更検知 → 作業フラグON → 5分後チェック → status更新なし → 警告
```

### 技術実装

#### 1. monitor/self-watch.js
```javascript
const chokidar = require('chokidar');
const fs = require('fs');

let monitorWorkDetected = false;
let lastStatusUpdate = 0;

// monitor/ディレクトリの変更を監視
chokidar.watch('monitor/', {ignored: /node_modules/}).on('change', (path) => {
    console.log(`🔧 Monitor作業検出: ${path}`);
    monitorWorkDetected = true;
    
    // 5分後にstatus更新をチェック
    setTimeout(checkStatusUpdate, 5 * 60 * 1000);
});

function checkStatusUpdate() {
    if (!monitorWorkDetected) return;
    
    const statusPath = 'documents/agents/status/monitor.md';
    const currentUpdate = fs.statSync(statusPath).mtime.getTime();
    
    if (currentUpdate <= lastStatusUpdate) {
        console.log('⚠️  Monitor記録忘れ警告: 作業後のstatus更新がありません');
        console.log('   documents/agents/status/monitor.mdを更新してください');
        
        // 統計として記録
        logRecordingFailure();
    }
    
    monitorWorkDetected = false;
}
```

#### 2. npm scripts統合
```json
{
  "scripts": {
    "monitor": "node monitor/self-watch.js & npm run server",
    "monitor-safe": "node monitor/self-watch.js & node monitor/file-monitor.js & npm run server"
  }
}
```

#### 3. 統計連携
- **記録忘れ統計**: 作業検出数 vs status更新数の比較
- **ビジュアライザー統合**: 記録遵守率のグラフ化
- **自己改善ループ**: 統計を見て記録習慣を改善

## 📊 システムの利点

### 1. **現実的なタイミング**
- アイドル時間は警告なし
- 実際の作業時のみリマインダー
- Monitor特性に合わせたタイミング調整

### 2. **技術的親和性**
- Monitorが得意な監視技術を活用
- 既存のchokidar依存関係を利用
- 統計システムとの自然な統合

### 3. **段階的な圧力**
- 即座の強制力なし（Coderのpre-commitと差別化）
- コンソール警告による意識喚起
- 統計化による長期的な改善圧力

### 4. **自己監視の哲学**
- 「監視する者が監視される」メタ構造
- Monitor自身の監視能力向上
- 自己改善のための統計活用

## 🔍 検証方法

### 成功指標
1. **記録遵守率**: 作業検出後のstatus更新率 80%以上
2. **警告頻度**: 週間警告回数 3回以下
3. **実用性**: Monitor主観的な負担度 2以下（5段階）
4. **統計品質**: 記録内容の有用性・詳細度向上

### 観察項目
- 作業検出の精度（false positive/negative）
- 警告タイミングの適切性
- 記録内容の質的変化
- Monitor作業効率への影響

### 週次評価
- **毎週金曜**: 記録遵守率・警告状況レビュー
- **統計分析**: ビジュアライザーでの記録パターン確認
- **改善調整**: タイミング・警告方法の最適化

## 🎯 期待される効果

### 短期効果（1週間）
- Monitor記録忘れの大幅減少
- 作業タイミングでの記録意識向上
- 技術的なリマインダーによるストレス軽減

### 長期効果（1ヶ月〜）
- 自然な記録習慣の定着
- 統計を活用した自己改善サイクル確立
- Monitor作業品質の可視化と向上

## ⚠️ リスク・制約

### 技術的リスク
- chokidar監視の誤検知（エディタ一時ファイル等）
- 大量ファイル変更時の重複警告
- システムリソース使用量

### 運用リスク
- 警告の慣れによる無視
- false positiveによる記録疲れ
- 他システムとの競合

## 🔄 H025・H035との関係

| 項目 | H025（旧） | H035（Coder用） | H036（Monitor用） |
|------|------------|-----------------|-------------------|
| 対象 | 全エージェント | Coder | Monitor |
| 記録方式 | 並行記録 | 節目記録 | 作業検出型 |
| 強制力 | 原則のみ | pre-commit | 警告＋統計 |
| 特性考慮 | なし | コード作業 | 監視作業 |
| 実装可能性 | 困難 | 現実的 | 現実的 |

## 📝 関連文書

- **H025**: 即時記録プロトコル（置き換え対象）
- **H035**: 節目記録プロトコル（Coder特化版）
- **H032**: 違反エスカレーションシステム（補完関係）
- **INC-20250614-017**: Monitor 3連続違反事例
- **H019**: 統計監視システム（技術基盤）

## 🚀 実装計画

### Phase 1: 基本システム構築（即座）
1. monitor/self-watch.js作成
2. npm scriptsへの統合
3. 基本的な作業検出・警告機能

### Phase 2: 統計連携（1-2日後）
1. 記録遵守率の統計化
2. ビジュアライザーへの統合
3. 長期的な改善指標設定

### Phase 3: 最適化（1週間後）
1. 検証結果に基づく調整
2. 誤検知対策の実装
3. 他エージェントへの展開検討

---

**検証責任者**: Clerk Agent  
**実装対象**: Monitor Agent  
**技術基盤**: chokidar、既存統計システム  
**開始日**: 2025年6月14日  
**次回評価**: 2025年6月21日