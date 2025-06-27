# PIL-010: Advanced Statistics Module

**作成日**: 2025年6月28日 01:15  
**更新日**: 2025年6月28日 01:15  
**作成者**: Architect Agent  
**対象バージョン**: -  
**関連仕様**: FUNC-000, FUNC-001, PIL-008, PIL-009  

## 概要

PIL-008の基本統計を拡張し、より詳細で分析的な統計値を提供するモジュール。開発者の行動パターン分析・異常検知・生産性測定に有用な高度な統計機能を実装する。

## 🎯 機能境界

### PIL-010の責務
- **時系列分析**: 開発活動の時間パターン・頻度分析
- **変更パターン解析**: ファイル変更の特徴・トレンド分析
- **異常検知**: 通常と異なる活動パターンの検出
- **生産性指標**: 開発効率・集中度の数値化
- **相関分析**: ファイル間・時間帯間の関係性分析

### 他機能との境界
- **PIL-008**: 基本統計の上位拡張、PIL-008の表示領域を補完
- **PIL-009**: 履歴データを活用した統計計算、表示は独立
- **FUNC-000**: eventsテーブルからの詳細データ取得に依存
- **FUNC-001**: ファイルライフサイクルの統計的解析

### 責務外の除外事項
- **基本統計表示**: First/Max/Last/AvgはPIL-008が担当
- **履歴表示**: 個別イベント表示はPIL-009が担当
- **リアルタイム更新**: 統計計算の自動更新は対象外
- **データ保存**: 計算結果の永続化は対象外（表示時計算）

## 📋 技術仕様

### PIL-008との統合レイアウト
PIL-010は画面右側（35文字幅）にコンパクト表示され、PIL-008の基本統計（左側40文字幅）と並列表示される。

### 右側表示用コンパクト統計
```
Activity Hours                  
Peak: 14:00-16:00 (35%)         
Low:  02:00-06:00 (2%)          
                                
Change Pattern                  
Small: 65%  Medium: 28%         
Large: 7%   Hotspot: 8.5/10     
                                
Productivity                     
Focus: 4 sessions (42min avg)   
Efficiency: 7.2/10              
Flow State: 3.2h/day            
```

### 統計カテゴリ体系

#### 1. 時系列分析統計（Temporal Analytics）
```
┌─ Temporal Pattern Analysis ─────────────────┐
│ Activity Hours                               │
│ Most Active: 14:00-16:00 (35% of events)    │
│ Least Active: 02:00-06:00 (2% of events)    │
│                                              │
│ Day Pattern                                  │
│ Weekday: 145 events  Weekend: 23 events     │
│                                              │
│ Event Intervals                              │
│ Avg Interval: 12m 34s                       │
│ Burst Sessions: 8 (>10 events/10min)        │
│ Idle Periods: 15 (>2hours gap)              │
└──────────────────────────────────────────────┘
```

#### 2. 変更パターン解析（Change Pattern Analytics）
```
┌─ Change Pattern Analysis ──────────────────┐
│ Change Velocity                             │
│ Lines/Event: Avg=12.5, Max=145, Recent=8   │
│ Size Growth: +2.3KB/day trend              │
│                                             │
│ Change Types Distribution                   │
│ Small (<10 lines): 65%                     │
│ Medium (10-100): 28%                       │
│ Large (>100): 7%                           │
│                                             │
│ Modification Intensity                      │
│ Hotspot Score: 8.5/10 (High Activity)      │
│ Stability Score: 3.2/10 (Frequently Changed) │
└─────────────────────────────────────────────┘
```

#### 3. 異常検知統計（Anomaly Detection）
```
┌─ Anomaly Detection ─────────────────────────┐
│ Unusual Activity                            │
│ Last 24h: 2 burst sessions detected        │
│ Size Anomaly: +500% increase on 06/27      │
│                                             │
│ Pattern Breaks                              │
│ Weekend Work: 3 events (unusual)           │
│ Night Commits: 1 event after 23:00         │
│                                             │
│ Risk Indicators                             │
│ Rapid Changes: ⚠️  High Risk               │
│ Large Deletes: ✅ Normal                   │
└─────────────────────────────────────────────┘
```

#### 4. 生産性指標（Productivity Metrics）
```
┌─ Productivity Metrics ──────────────────────┐
│ Focus Sessions                              │
│ Deep Work: 4 sessions (>30min continuous)  │
│ Avg Session: 42 minutes                    │
│                                             │
│ Efficiency Indicators                       │
│ Code Churn: 15% (deleted/added ratio)      │
│ Commit Quality: 7.2/10 (size consistency)  │
│                                             │
│ Development Rhythm                          │
│ Peak Hours: 14:00-16:00 (2.1x baseline)    │
│ Flow State: 3.2 hours/day average          │
└─────────────────────────────────────────────┘
```

#### 5. 相関分析（Correlation Analytics）
```
┌─ Correlation Analysis ──────────────────────┐
│ File Relationships                          │
│ Co-modified Files: 12 (same session)       │
│ Dependency Chain: src/main.js → 8 files    │
│                                             │
│ Temporal Correlations                       │
│ Monday Effect: +40% activity vs average    │
│ Friday Pattern: Large commits (+65%)       │
│                                             │
│ Cross-Project Impact                        │
│ Cascade Events: 3 (change → 5+ files)      │
│ Isolation Score: 6.5/10 (moderate coupling) │
└─────────────────────────────────────────────┘
```

### 統計計算アルゴリズム

#### 時系列分析計算
```sql
-- 時間帯別活動分析
SELECT 
  CAST(strftime('%H', timestamp) AS INTEGER) as hour,
  COUNT(*) as event_count,
  ROUND(COUNT(*) * 100.0 / total.count, 1) as percentage
FROM events e
CROSS JOIN (SELECT COUNT(*) as count FROM events WHERE file_id = ?) total
WHERE file_id = ?
GROUP BY hour
ORDER BY event_count DESC;

-- イベント間隔分析
SELECT 
  AVG(interval_seconds) as avg_interval,
  COUNT(CASE WHEN interval_seconds < 600 THEN 1 END) as burst_events,
  COUNT(CASE WHEN interval_seconds > 7200 THEN 1 END) as idle_periods
FROM (
  SELECT 
    (julianday(timestamp) - julianday(LAG(timestamp) OVER (ORDER BY timestamp))) * 86400 as interval_seconds
  FROM events WHERE file_id = ? ORDER BY timestamp
);
```

#### 変更パターン計算
```sql
-- 変更サイズ分布
SELECT 
  CASE 
    WHEN line_delta < 10 THEN 'Small'
    WHEN line_delta < 100 THEN 'Medium'
    ELSE 'Large'
  END as change_size,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / total.count, 1) as percentage
FROM (
  SELECT ABS(m.line_count - LAG(m.line_count, 1, 0) OVER (ORDER BY e.timestamp)) as line_delta
  FROM events e 
  JOIN measurements m ON e.id = m.event_id 
  WHERE e.file_id = ?
) changes
CROSS JOIN (SELECT COUNT(*) as count FROM events WHERE file_id = ?) total
GROUP BY change_size;

-- 変更速度トレンド
SELECT 
  date(timestamp) as change_date,
  SUM(size_delta) as daily_growth,
  COUNT(*) as daily_events
FROM (
  SELECT 
    timestamp,
    m.file_size - LAG(m.file_size, 1, 0) OVER (ORDER BY e.timestamp) as size_delta
  FROM events e 
  JOIN measurements m ON e.id = m.event_id 
  WHERE e.file_id = ?
) daily_changes
GROUP BY change_date
ORDER BY change_date DESC
LIMIT 30;
```

#### 異常検知計算
```sql
-- バーストセッション検出（10分間で10+イベント）
WITH burst_windows AS (
  SELECT 
    timestamp,
    COUNT(*) OVER (
      ORDER BY timestamp 
      RANGE BETWEEN INTERVAL '10 minutes' PRECEDING AND CURRENT ROW
    ) as events_in_window
  FROM events WHERE file_id = ?
)
SELECT COUNT(*) as burst_sessions
FROM burst_windows 
WHERE events_in_window >= 10;

-- サイズ異常検出（前日比500%以上増加）
WITH daily_sizes AS (
  SELECT 
    date(timestamp) as change_date,
    MAX(m.file_size) as max_size
  FROM events e 
  JOIN measurements m ON e.id = m.event_id 
  WHERE e.file_id = ?
  GROUP BY change_date
)
SELECT 
  change_date,
  max_size,
  LAG(max_size) OVER (ORDER BY change_date) as prev_size,
  ROUND(max_size * 100.0 / LAG(max_size) OVER (ORDER BY change_date), 1) as growth_percent
FROM daily_sizes
WHERE growth_percent > 500;
```

## 🚀 実装仕様

### 実装要件
1. **AdvancedStatsCalculator クラス**
   - 複雑統計の計算エンジン
   - SQLクエリの最適化・キャッシュ管理
   - 統計結果の検証・品質保証

2. **TemporalAnalyzer モジュール**
   - 時系列パターンの分析・可視化
   - 活動時間・頻度の統計計算
   - 異常な活動パターンの検出

3. **ChangePatternAnalyzer モジュール**
   - 変更パターンの分類・分析
   - 変更速度・トレンド計算
   - ファイル安定性の評価

4. **AnomalyDetector モジュール**
   - 統計的異常値の検出
   - パターン破綻の識別
   - リスクスコアの計算

5. **ProductivityMeter モジュール**
   - 開発効率指標の計算
   - フォーカス時間の測定
   - 生産性トレンドの分析

6. **CorrelationAnalyzer モジュール**
   - ファイル間関係の分析
   - 時間的相関の計算
   - 依存関係の可視化

### 表示統合要件
- **PIL-008右側統合**: 基本統計（左側）と並列表示で画面幅活用
- **コンパクト表示**: 35文字幅でのコンパクトな統計表示
- **選択的表示**: Activity Hours・Change Pattern・Productivityの3カテゴリ優先
- **色分けシステム**: 正常(緑)・注意(黄)・警告(赤)の3段階
- **パフォーマンス制御**: 計算時間>2秒時は「計算中...」表示

### 設定可能項目
```json
{
  "advancedStats": {
    "enabled": true,
    "autoCalculate": false,
    "categories": {
      "temporal": true,
      "changePattern": true,
      "anomaly": true,
      "productivity": false,
      "correlation": false
    },
    "thresholds": {
      "burstMinEvents": 10,
      "burstTimeWindow": 600,
      "anomalySizeThreshold": 500,
      "focusMinDuration": 1800
    }
  }
}
```

## 🧪 テスト要件

### 計算精度テスト
1. **統計計算の正確性確認**
   - 既知データセットでの計算結果検証
   - 境界値・極値での動作確認
   - 大量データでの計算性能測定

2. **異常検知の感度テスト**
   - 既知の異常パターンでの検出確認
   - 偽陽性・偽陰性の発生率測定
   - 閾値調整による感度変化の検証

### パフォーマンステスト
1. **大量データ処理テスト**
   - 10,000+イベントでの計算時間測定
   - メモリ使用量の監視
   - SQLクエリの実行計画最適化

2. **リアルタイム性テスト**
   - 統計計算の応答時間測定
   - UI更新の遅延許容範囲確認
   - バックグラウンド計算の実装検討

## 制限事項

### 技術的制限
- **計算負荷**: 複雑統計は計算時間が長い（2-5秒）
- **メモリ消費**: 大量イベント処理時のメモリ使用量増加
- **SQLite制限**: 複雑なウィンドウ関数での性能劣化

### 機能制限
- **オンデマンド計算**: リアルタイム更新は対象外
- **単一ファイル分析**: 複数ファイル横断分析は将来機能
- **歴史データ**: 古いイベントの統計精度は保証外

## 🔗 関連機能との連携

### 必須連携機能
- **PIL-008**: 基本統計表示の拡張・補完
- **FUNC-000**: events・measurementsテーブルからの詳細データ取得
- **FUNC-001**: ファイルライフサイクル情報の統計的活用

### 任意連携機能
- **PIL-009**: 履歴表示との統計連動
- **FUNC-203**: イベントフィルタとの統計範囲連動
- **FUNC-300**: キー入力による統計カテゴリ切替

## 期待効果

### 開発者メリット
- **行動パターン可視化**: 自身の開発習慣の客観的把握
- **異常早期発見**: 問題となる変更パターンの即座検出
- **生産性改善**: データに基づく開発効率の向上

### プロジェクトメリット
- **コード品質向上**: 統計的な品質指標による改善指針
- **リスク管理**: 異常検知による早期警告システム
- **開発プロセス最適化**: データ駆動型の開発手法確立

## 参考資料

### 統計手法の参考
- **Git統計**: git log --stat, git shortlog パターン
- **IDE統計**: VSCode Time Tracker, WakaTime方式
- **システム監視**: htop, iostat統計表示方式
- **異常検知**: 統計的プロセス制御（SPC）手法