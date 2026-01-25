<p align="center">
  <a href="./API.md">English</a> |
  <a href="./API.zh-CN.md">简体中文</a> |
  <strong>日本語</strong>
</p>

# TCRN TMS - API ドキュメント

## ベース URL

```
{baseUrl}/api/v1
```

## 認証

### ログイン

```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "displayName": "string"
    },
    "requireTotp": false
  }
}
```

### TOTP 検証（必要な場合）

```http
POST /auth/totp/verify
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "code": "123456"
}
```

### トークン更新

```http
POST /auth/refresh
Cookie: refresh_token=<token>
```

### ログアウト

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 現在のユーザー取得

```http
GET /auth/me
Authorization: Bearer <access_token>
```

---

## カスタマー管理

### カスタマー一覧

```http
GET /customers?talentId=<uuid>&page=1&pageSize=20
Authorization: Bearer <access_token>
```

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|------------|-----|------|
| talentId | uuid | 必須。タレントでフィルター |
| page | number | ページ番号（デフォルト: 1） |
| pageSize | number | 1ページあたりの件数（デフォルト: 20、最大: 100） |
| search | string | ニックネームで検索 |
| tags | string | カンマ区切りのタグ |
| statusId | uuid | ステータスでフィルター |
| profileType | string | 'individual' または 'company' |
| isActive | boolean | アクティブ状態でフィルター |

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nickname": "string",
      "profileType": "individual",
      "tags": ["VIP", "Active"],
      "isActive": true,
      "createdAt": "2026-01-18T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### カスタマー詳細取得

```http
GET /customers/:id
Authorization: Bearer <access_token>
```

### カスタマー PII 情報取得

```http
GET /customers/:id/pii
Authorization: Bearer <access_token>
X-PII-Access-Reason: "カスタマーサポート問い合わせ #12345"
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "string",
    "profileType": "individual",
    "pii": {
      "realName": "山田太郎",
      "email": "taro@example.com",
      "phone": "+81-90-1234-5678"
    }
  }
}
```

### カスタマー作成

```http
POST /customers
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "talentId": "uuid",
  "profileStoreId": "uuid",
  "profileType": "individual",
  "nickname": "string",
  "primaryLanguage": "ja",
  "tags": ["tag1", "tag2"],
  "source": "import",
  "notes": "string",
  "pii": {
    "realName": "山田太郎",
    "email": "taro@example.com",
    "phone": "+81-90-1234-5678"
  }
}
```

### カスタマー更新

```http
PATCH /customers/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "nickname": "string",
  "tags": ["tag1", "tag2"],
  "notes": "string",
  "expectedVersion": 1
}
```

### カスタマー無効化

```http
POST /customers/:id/deactivate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reasonId": "uuid"
}
```

### カスタマー再有効化

```http
POST /customers/:id/reactivate
Authorization: Bearer <access_token>
```

### 外部識別子管理

```http
GET /customers/:id/external-ids
Authorization: Bearer <access_token>
```

```http
POST /customers/:id/external-ids
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "platformCode": "YOUTUBE",
  "externalId": "UC..."
}
```

```http
DELETE /customers/:id/external-ids/:externalIdId
Authorization: Bearer <access_token>
```

---

## タレント管理

### タレント一覧

```http
GET /talents?subsidiaryId=<uuid>
Authorization: Bearer <access_token>
```

### タレント詳細取得

```http
GET /talents/:id
Authorization: Bearer <access_token>
```

---

## 組織構造

### 組織ツリー取得

```http
GET /organization/tree
Authorization: Bearer <access_token>
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "JP_DIVISION",
      "nameEn": "Japan Division",
      "path": "/JP_DIVISION/",
      "depth": 1,
      "children": [
        {
          "id": "uuid",
          "code": "JP_VTUBER",
          "type": "subsidiary",
          "children": [
            {
              "id": "uuid",
              "code": "TALENT_MIKO",
              "type": "talent"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## ホームページ管理

### タレントホームページ取得

```http
GET /talents/:talentId/homepage
Authorization: Bearer <access_token>
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "talentId": "uuid",
    "isPublished": true,
    "publishedVersion": {
      "id": "uuid",
      "versionNumber": 3,
      "content": { "version": "1.0", "components": [...] },
      "theme": { "preset": "dark", "colors": {...} },
      "publishedAt": "2026-01-20T00:00:00Z"
    },
    "draftVersion": {
      "id": "uuid",
      "versionNumber": 4,
      "content": { "version": "1.0", "components": [...] },
      "theme": { "preset": "dark", "colors": {...} }
    },
    "customDomain": null,
    "seoTitle": "マイホームページ",
    "homepageUrl": "https://tcrn.app/p/talent-path"
  }
}
```

### ホームページ下書き保存

```http
PUT /talents/:talentId/homepage/draft
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": {
    "version": "1.0",
    "components": [
      {
        "id": "uuid",
        "type": "ProfileCard",
        "props": { "displayName": "タレント名", "bio": "..." },
        "order": 0,
        "visible": true
      }
    ]
  },
  "theme": {
    "preset": "dark",
    "colors": { "primary": "#5599FF" }
  }
}
```

### ホームページ公開

```http
POST /talents/:talentId/homepage/publish
Authorization: Bearer <access_token>
```

**レスポンス (200):**
```json
{
  "success": true,
  "data": {
    "publishedVersion": {
      "id": "uuid",
      "versionNumber": 5,
      "publishedAt": "2026-01-25T00:00:00Z"
    },
    "homepageUrl": "https://tcrn.app/p/talent-path",
    "cdnPurgeStatus": "success"
  }
}
```

### ホームページ非公開

```http
POST /talents/:talentId/homepage/unpublish
Authorization: Bearer <access_token>
```

### ホームページバージョン履歴取得

```http
GET /talents/:talentId/homepage/versions?page=1&pageSize=20
Authorization: Bearer <access_token>
```

### バージョン復元

```http
POST /talents/:talentId/homepage/versions/:versionId/restore
Authorization: Bearer <access_token>
```

### ホームページ設定更新

```http
PATCH /talents/:talentId/homepage/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "seoTitle": "マイホームページ",
  "seoDescription": "私のページへようこそ",
  "customDomain": "talent.example.com",
  "version": 1
}
```

### カスタムドメイン検証

```http
POST /talents/:talentId/homepage/domain/verify
Authorization: Bearer <access_token>
```

---

## レポート

### レポートジョブ作成

```http
POST /reports
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reportType": "mfr",
  "talentId": "uuid",
  "filters": {
    "platformCodes": ["BILIBILI", "YOUTUBE"],
    "membershipClassCodes": ["SUBSCRIPTION"],
    "dateFrom": "2026-01-01",
    "dateTo": "2026-01-31"
  },
  "options": {
    "includePii": true,
    "language": "ja",
    "format": "xlsx"
  }
}
```

**レスポンス (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "pending",
    "createdAt": "2026-01-18T00:00:00Z"
  }
}
```

### レポートジョブ状態取得

```http
GET /reports/:jobId
Authorization: Bearer <access_token>
```

### レポートダウンロード

```http
GET /reports/:jobId/download
Authorization: Bearer <access_token>
```

レポートファイルダウンロード用の署名付き URL を返します。

### レポートプレビュー検索

```http
POST /reports/search
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "talentId": "uuid",
  "filters": {...}
}
```

---

## エクスポート

### エクスポートジョブ作成

```http
POST /exports
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "type": "CUSTOMER_EXPORT",
  "talentId": "uuid",
  "format": "xlsx",
  "filters": {...}
}
```

### エクスポートジョブ状態取得

```http
GET /exports/:jobId
Authorization: Bearer <access_token>
```

### エクスポートダウンロード

```http
GET /exports/:jobId/download
Authorization: Bearer <access_token>
```

---

## メールテンプレート（AC 管理者のみ）

### メールテンプレート一覧

```http
GET /email-templates
Authorization: Bearer <access_token>
```

### メールテンプレート取得

```http
GET /email-templates/:code
Authorization: Bearer <access_token>
```

### メールテンプレート作成

```http
POST /email-templates
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "custom_notification",
  "category": "business",
  "subjectEn": "Notification",
  "subjectZh": "通知",
  "subjectJa": "お知らせ",
  "bodyHtmlEn": "<p>Hello {{userName}}</p>",
  "bodyHtmlZh": "<p>你好 {{userName}}</p>",
  "bodyHtmlJa": "<p>こんにちは {{userName}}</p>",
  "variables": ["userName", "actionLink"]
}
```

### メールテンプレート更新

```http
PATCH /email-templates/:code
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "subjectJa": "更新された件名",
  "bodyHtmlJa": "<p>更新されたコンテンツ</p>"
}
```

### メールテンプレートプレビュー

```http
POST /email-templates/:code/preview
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "language": "ja",
  "variables": {
    "userName": "山田太郎",
    "actionLink": "https://example.com"
  }
}
```

---

## マシュマロ（管理側）

### マシュマロ設定取得

```http
GET /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
```

### マシュマロ設定更新

```http
PATCH /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isEnabled": true,
  "greetingMessage": "ようこそ！",
  "minLength": 10,
  "maxLength": 500,
  "captchaMode": "auto"
}
```

### メッセージ一覧

```http
GET /talents/:talentId/marshmallow/messages?status=pending&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### メッセージ審査

```http
PATCH /marshmallow/messages/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "moderationStatus": "approved",
  "moderationReason": "string"
}
```

### メッセージ返信

```http
POST /marshmallow/messages/:id/reply
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "replyContent": "ありがとうございます！",
  "isPublic": true
}
```

### 一括操作

```http
POST /marshmallow/messages/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "messageIds": ["uuid1", "uuid2"],
  "action": "approve"
}
```

### メッセージエクスポート

```http
POST /marshmallow/export
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "talentId": "uuid",
  "format": "xlsx",
  "filters": {
    "status": "approved",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-01-31"
  }
}
```

---

## 外部ブロックリスト

### 外部ブロックリスト一覧

```http
GET /external-blocklist?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### 外部ブロックリスト作成

```http
POST /external-blocklist
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ownerType": "tenant",
  "ownerId": "uuid",
  "pattern": "スパムワード",
  "patternType": "keyword",
  "action": "reject",
  "severity": "high"
}
```

### 外部ブロックリスト更新

```http
PATCH /external-blocklist/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isActive": false
}
```

### 一括切り替え

```http
POST /external-blocklist/batch-toggle
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ids": ["uuid1", "uuid2"],
  "isActive": true
}
```

---

## セキュリティ API

### フィンガープリント生成

```http
POST /security/fingerprint
Authorization: Bearer <access_token>
```

### ブロックリスト一覧

```http
GET /blocklist-entries?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### ブロックリスト作成

```http
POST /blocklist-entries
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pattern": "禁止ワード",
  "patternType": "keyword",
  "nameEn": "Bad Word",
  "action": "reject",
  "severity": "high",
  "scope": ["marshmallow"]
}
```

### ブロックリストテスト

```http
POST /blocklist-entries/test
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "testContent": "このテキストには禁止ワードが含まれています",
  "pattern": "禁止ワード",
  "patternType": "keyword"
}
```

### IP アクセスルール一覧

```http
GET /ip-access-rules?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### IP ルール作成

```http
POST /ip-access-rules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ruleType": "blacklist",
  "ipPattern": "192.168.1.0/24",
  "scope": "global",
  "reason": "不審なアクティビティ"
}
```

### IP アクセスチェック

```http
POST /ip-access-rules/check
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ip": "192.168.1.100"
}
```

---

## プラットフォーム設定（AC 管理者のみ）

### プラットフォーム設定取得

```http
GET /platform/config/:key
Authorization: Bearer <access_token>
```

### プラットフォーム設定

```http
PUT /platform/config/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": { "domain": "tcrn.app" }
}
```

### 全プラットフォーム設定一覧

```http
GET /platform/config
Authorization: Bearer <access_token>
```

---

## パブリック API

### タレントホームページ取得

```http
GET /public/homepage/:talentPath
```

### マシュマロ設定取得（パブリック）

```http
GET /public/marshmallow/:talentPath/config
```

### パブリックメッセージ取得

```http
GET /public/marshmallow/:talentPath/messages?cursor=<string>&limit=20
```

### マシュマロメッセージ送信

```http
POST /public/marshmallow/:talentPath/messages
Content-Type: application/json

{
  "content": "あなたの質問...",
  "isAnonymous": true,
  "senderName": "匿名",
  "turnstileToken": "cloudflare_token",
  "fingerprint": "device_fingerprint",
  "honeypot": ""
}
```

### リアクション切り替え

```http
POST /public/marshmallow/messages/:messageId/reactions
Content-Type: application/json

{
  "type": "heart",
  "fingerprint": "device_fingerprint"
}
```

### メッセージ既読マーク

```http
POST /public/marshmallow/messages/:messageId/read
Content-Type: application/json

{
  "fingerprint": "device_fingerprint"
}
```

---

## ログ

### 変更ログ一覧

```http
GET /logs/changes?objectType=customer_profile&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### システムイベントログ一覧

```http
GET /logs/events?severity=error&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### 連携ログ一覧

```http
GET /logs/integrations?direction=outbound&page=1&pageSize=20
Authorization: Bearer <access_token>
```

---

## エラーコード

| コード | HTTP ステータス | 説明 |
|--------|----------------|------|
| AUTH_INVALID_CREDENTIALS | 401 | ユーザー名またはパスワードが無効 |
| AUTH_ACCOUNT_LOCKED | 403 | アカウントが一時的にロック |
| AUTH_TOTP_REQUIRED | 403 | TOTP 検証が必要 |
| AUTH_TOKEN_EXPIRED | 401 | アクセストークンが期限切れ |
| FORBIDDEN | 403 | 権限不足 |
| NOT_FOUND | 404 | リソースが見つかりません |
| CONFLICT | 409 | バージョン競合（楽観的ロック） |
| VALIDATION_ERROR | 400 | 入力検証エラー |
| RATE_LIMITED | 429 | リクエストが多すぎます |
| PII_SERVICE_UNAVAILABLE | 503 | PII サービスが一時的に利用不可 |
| CAPTCHA_REQUIRED | 403 | CAPTCHA 検証が必要 |
| CAPTCHA_FAILED | 403 | CAPTCHA 検証に失敗 |
| CONTENT_BLOCKED | 403 | コンテンツが不適切語フィルターでブロック |

---

## レート制限

| エンドポイント | 制限 | 時間枠 |
|---------------|------|--------|
| グローバル API | 100 回 | 60 秒 |
| 管理 API | 50 回 | 60 秒 |
| ログイン試行 | 5 回 | 300 秒 |
| マシュマロ送信 | 5 回 | 3600 秒 |
| パスワードリセット | 3 回 | 3600 秒 |
| パブリックホームページ | 60 回 | 60 秒 |

レスポンスにはレート制限ヘッダーが含まれます：
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
