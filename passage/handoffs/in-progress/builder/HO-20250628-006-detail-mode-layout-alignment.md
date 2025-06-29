# HO-20250628-006: Detail Mode Layout Alignment Fix

**Type**: Bug Fix / UI Improvement  
**Priority**: Medium  
**From**: Builder  
**To**: Builder  
**Created**: 2025-06-28 05:30 JST  
**Status**: Pending  

## Context

詳細モード（FUNC-401/402/403）の実装は完了し機能しているが、画面の枠線（ボーダー）の幅がまだ揃っていない。

## Current Issues

1. **上段（FUNC-402）と下段（FUNC-403）の幅不一致**
   - 上段: 76文字幅に設定したが、実際の表示でズレている
   - 下段: 76文字幅に設定したが、右端の縦線が揃わない

2. **具体的な問題箇所**
   - AggregateDisplayRenderer（FUNC-402）の各行のpadding計算
   - HistoryDisplayRenderer（FUNC-403）の各行のpadding計算
   - 境界線「├─ Event History (Latest 50) ─┤」の長さ

## Requirements

1. **統一幅の決定**
   - 全体で統一する幅を決定（推奨: 78文字または80文字）
   - ターミナルの標準幅を考慮

2. **修正対象ファイル**
   - `src/ui/interactive/AggregateDisplayRenderer.js`
   - `src/ui/interactive/HistoryDisplayRenderer.js`

3. **修正内容**
   - 各行の文字数を正確にカウント
   - padEnd()の引数を調整して右端を揃える
   - 全ての枠線（┌─┐│├┤└─┘）が垂直に揃うように

## Technical Notes

- chalkによる色付けは表示幅に影響しない（ANSIエスケープシーケンス）
- 日本語文字は含まれないので、単純な文字数カウントでOK
- padEnd()とpadStart()の組み合わせで調整

## Acceptance Criteria

- [ ] 詳細モード表示時、全ての縦線が完全に揃っている
- [ ] 上段と下段の幅が完全に一致している
- [ ] どのデータを表示しても枠線がズレない

## References

- FUNC-402: `documents/visions/specifications/FUNC-402-aggregate-display-module.md`
- FUNC-403: `documents/visions/specifications/FUNC-403-history-display-module.md`