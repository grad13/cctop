# HO-20250627-001: FUNC-207 色カスタマイズ機能実装依頼

**作成日**: 2025年6月27日  
**作成者**: Architect Agent  
**依頼先**: Builder Agent  
**優先度**: High  
**期限**: 3日以内  

## 📋 実装依頼概要

**FUNC-207 表示色カスタマイズ機能**の完全実装を依頼します。PIL-000から正式にActive機能として昇格したため、実装作業に移行してください。

## 🎯 実装対象機能

### **基本機能**
- `current-theme.json`による色設定管理
- `themes/`ディレクトリプリセット管理
- 全表示要素への色適用（table/status_bar/event_filters/message_area）
- ColorManagerクラス実装

### **技術仕様**
- **仕様書**: `documents/visions/functions/FUNC-207-display-color-customization.md`
- **実装ガイド**: `documents/visions/supplementary/CG-004-color-customization-implementation.md`
- **関連機能**: FUNC-202（CLI Display Integration）との統合

## 🔧 実装要件

### **Phase 1: 基本実装（1日目）**
1. **ColorManagerクラス実装**
   - `current-theme.json`読み込み機能
   - 色名→ANSI色コード変換
   - フォールバック機能（無効色対応）

2. **ディレクトリ構造準備**
   ```
   .cctop/
   ├── current-theme.json
   └── themes/
       ├── default.json
       ├── high-contrast.json
       ├── colorful.json
       └── minimal.json
   ```

### **Phase 2: 統合実装（2日目）**
1. **FUNC-202統合**
   - 既存表示ロジックへの色適用
   - display integrationとの連携

2. **プリセットテーマ実装**
   - 4種類のプリセット作成
   - テーマ切り替え機能

### **Phase 3: 完成・テスト（3日目）**
1. **エラーハンドリング**
   - ファイル破損時の復旧
   - 無効設定時のデフォルト値適用

2. **動作確認**
   - 全表示要素の色適用確認
   - テーマ切り替え動作確認

## 📊 実装指針

### **設計原則**
- **FUNC-202との協調**: 既存表示システムを拡張、置き換えない
- **設定ファイル分離**: config.jsonとcurrent-theme.jsonの完全分離
- **高速読み込み**: 起動時パフォーマンス重視

### **実装アプローチ**
- **段階的統合**: 既存コードへの最小限の変更
- **後方互換性**: 色設定がない場合のデフォルト動作保持
- **拡張性**: 将来の色設定項目追加への対応

## 🧪 テスト要件

### **単体テスト**
- [ ] ColorManager.loadTheme()の正常読み込み
- [ ] 無効な色名でのフォールバック動作
- [ ] ファイル不在時のデフォルト値適用

### **統合テスト**
- [ ] FUNC-202との統合動作
- [ ] 全表示要素への色適用確認
- [ ] テーマ切り替え後の再描画確認

### **視覚確認テスト**
- [ ] default/high-contrast/colorful/minimal各テーマ表示
- [ ] イベントタイプ別色分け確認
- [ ] ステータスエリア・フィルタキー色確認

## 📁 必要ファイル

### **新規作成**
- `src/color/ColorManager.js`
- `src/color/ThemeLoader.js`
- `.cctop/themes/*.json`（4ファイル）

### **修正対象**
- `src/display/` 配下の表示関連ファイル
- `src/config/` 配下の設定管理ファイル

## 🔗 関連資料

- **機能仕様**: [FUNC-207](../../documents/visions/functions/FUNC-207-display-color-customization.md)
- **実装ガイド**: [CG-004](../../documents/visions/supplementary/CG-004-color-customization-implementation.md)
- **連携機能**: [FUNC-202](../../documents/visions/functions/FUNC-202-cli-display-integration.md)

## 💡 実装ヒント

### **FUNC-202統合のポイント**
- ColorManagerをFUNC-202のdisplay systemに注入
- 表示コンポーネントレベルでの色適用
- 既存のANSI escape sequence処理との協調

### **パフォーマンス最適化**
- 起動時の一回読み込み（themes/参照なし）
- 色変換結果のキャッシュ
- ファイル監視による動的リロード（将来機能）

## ✅ 完了判定基準

1. **機能動作**: 全プリセットテーマの切り替え・表示確認
2. **統合確認**: FUNC-202との無矛盾動作
3. **エラーハンドリング**: 異常系での適切な復旧動作
4. **テスト完了**: 上記テスト要件の全項目クリア

## 📝 報告要請

実装完了時は以下を含む報告をValidatorと共有してください：
- 実装したファイル一覧
- FUNC-202との統合方法
- テスト結果サマリー
- 既知の課題・改善点

---

**期待成果**: cctopの視覚体験を個人・環境・チームに最適化する色カスタマイズ機能の完全実装