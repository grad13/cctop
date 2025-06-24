# H013違反事例集

**作成日時**: 2025年06月13日 14:30

## 概要

このドキュメントは、H013（統合技術的負債防止原則）に違反した具体的な事例を記録し、学習と改善に活用するためのものです。

## 事例1: アカウント画面ヘッダー非表示問題（2025/06/13）

### 違反内容（対症療法）
```javascript
// ❌ CSSで強制的に非表示
header.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important;';

// ❌ MutationObserverで監視して非表示を維持
const observer = new MutationObserver((mutations) => {
  if (this.currentIsland === 'account') {
    const header = document.querySelector('.universal-header');
    if (header && (header.style.display !== 'none' || header.style.visibility !== 'hidden')) {
      header.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important;';
    }
  }
});
```

### 問題点
- 症状（ヘッダーが表示される）を強制的に隠しているだけ
- なぜヘッダーが表示されるのかの原因を特定していない
- Quick Switch機能が使えなくなる副作用を生んだ

### 正しい解決方法（根本修正）
```javascript
// ✅ iframe判定による条件付きCSS適用
const isInIframe = window.self !== window.top;

if (isInIframe) {
  const style = document.createElement('style');
  style.textContent = '#quick-switch-indicator { display: none !important; }';
  document.head.appendChild(style);
}

// ✅ CSSクラスによる制御
if (name === 'account') {
  workSPAContainer.classList.add('account-view');
}
```

### 学習ポイント
1. 「表示の度合いを強める」は典型的な対症療法
2. 副作用（Quick Switch無効化）の発生は設計レベルの問題を示唆
3. 条件付き処理により、異なる環境での適切な動作を実現

## 判別基準の再確認

### NGパターン（対症療法）
- 症状が消えるが、なぜその症状が起きたかを特定していない
- 「とりあえず動くように」という修正
- 条件分岐やフラグで症状を回避する修正
- 強制的に状態を変更する処理

### OKパターン（根本修正）
- 症状の発生原因を特定してから修正
- 原因となっているロジックやデータフローを修正
- 同じ原因による他の症状も同時に解決される修正
- 設計レベルでの整合性確保