---
**アーカイブ情報**
- アーカイブ日: 2025-06-16（手動移行）
- アーカイブ週: 2025/0609-0615
- 元パス: documents/records/daily/
- 検索キーワード: JWT 401エラー根本原因調査, ログアウト後guest access問題, JWT保存ロジック不正修正, Authorization ヘッダー形式問題, response.json() token抽出修正, ゲストログイン処理修正, 段階的ログ分析手法

---

# JWT 401エラー根本原因調査

**作成日時**: 2025年06月12日 10:35
**目的**: ログアウト後再guest access時の401エラー継続問題の根本原因特定
**ステータス**: 調査中

## 問題の概要

### 現象
- ログアウト後に再度guest accessしても401エラーが継続
- サーバー側でのJWTテスト（curl）では正常動作
- ブラウザからの実際のリクエストでは401エラー

### 仮説
1. **JWT内容の差異**: ブラウザとcurlで生成されるJWTが異なる
2. **ヘッダー送信問題**: Authorization ヘッダーが適切に送信されていない
3. **署名検証タイミング**: サーバー側での検証時の微妙な差異
4. **キャッシュ問題**: ブラウザ側でのJWT/API応答キャッシュ

## 調査計画

### Stage 1: ブラウザ側JWT内容確認
### Stage 2: 実際のHTTPリクエスト分析
### Stage 3: サーバー側受信内容確認
### Stage 4: 署名検証プロセス詳細分析
### Stage 5: 根本原因特定と対策

---

## 調査実行ログ

### Stage 1: ブラウザ側JWT内容確認

実行時刻: 2025-06-12 10:40

**結果**: ✅ 根本原因特定完了

#### 問題発見
```
JWT from localStorage: {"status":"ok","token":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."}
```

#### 原因
- **誤**: guest APIレスポンス全体（`{"status":"ok","token":"..."}`）をJWTとして保存
- **正**: tokenプロパティの値のみ（`"eyJ0eXAi..."`）を保存すべき

#### 影響
- Authorization ヘッダーが `Bearer {"status":"ok","token":"..."}`となる
- サーバー側でJWT形式として認識できず401エラー

#### 根本原因
**ゲストログイン処理でのJWT保存ロジックが不正**

### 修正内容

実行時刻: 2025-06-12 10:45

#### 修正箇所
`src/frontend/components/utils/guest.js:12-15`

#### Before (問題のあるコード)
```javascript
const data = await response.text();
localStorage.setItem('jwt', data);
```

#### After (修正後のコード)  
```javascript
const data = await response.json();
if (data && data.token) {
  localStorage.setItem('jwt', data.token);
} else {
  throw new Error('Invalid response: missing token');
}
```

#### 修正効果
- JWT保存時にtokenプロパティの値のみを保存
- Authorization ヘッダーが正しい形式 `Bearer eyJ0eXAi...` になる
- サーバー側でJWT形式として正常に認識される

### 調査完了

**結果**: ✅ 根本原因特定・修正完了
**所要時間**: 約10分
**手法**: 段階的なログ追加による詳細分析
