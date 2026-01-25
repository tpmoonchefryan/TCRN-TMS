<p align="center">
  <strong>English</strong> |
  <a href="./API.zh-CN.md">简体中文</a> |
  <a href="./API.ja.md">日本語</a>
</p>

# TCRN TMS - API Documentation

## Base URL

```
{baseUrl}/api/v1
```

## Authentication

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
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

### TOTP Verification (if required)

```http
POST /auth/totp/verify
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "code": "123456"
}
```

### Refresh Token

```http
POST /auth/refresh
Cookie: refresh_token=<token>
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <access_token>
```

---

## Customers

### List Customers

```http
GET /customers?talentId=<uuid>&page=1&pageSize=20
Authorization: Bearer <access_token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| talentId | uuid | Required. Filter by talent |
| page | number | Page number (default: 1) |
| pageSize | number | Items per page (default: 20, max: 100) |
| search | string | Search by nickname |
| tags | string | Comma-separated tags |
| statusId | uuid | Filter by status |
| profileType | string | 'individual' or 'company' |
| isActive | boolean | Filter by active status |

**Response (200):**
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

### Get Customer by ID

```http
GET /customers/:id
Authorization: Bearer <access_token>
```

### Get Customer with PII

```http
GET /customers/:id/pii
Authorization: Bearer <access_token>
X-PII-Access-Reason: "Customer support inquiry #12345"
```

**Response (200):**
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

### Create Customer

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

### Update Customer

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

### Deactivate Customer

```http
POST /customers/:id/deactivate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reasonId": "uuid"
}
```

### Reactivate Customer

```http
POST /customers/:id/reactivate
Authorization: Bearer <access_token>
```

### External Identifiers

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

## Talents

### List Talents

```http
GET /talents?subsidiaryId=<uuid>
Authorization: Bearer <access_token>
```

### Get Talent

```http
GET /talents/:id
Authorization: Bearer <access_token>
```

---

## Organization

### Get Organization Tree

```http
GET /organization/tree
Authorization: Bearer <access_token>
```

**Response (200):**
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

## Homepage Management

### Get Talent Homepage

```http
GET /talents/:talentId/homepage
Authorization: Bearer <access_token>
```

**Response (200):**
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
    "seoTitle": "My Homepage",
    "homepageUrl": "https://tcrn.app/p/talent-path"
  }
}
```

### Save Homepage Draft

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
        "props": { "displayName": "Talent Name", "bio": "..." },
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

### Publish Homepage

```http
POST /talents/:talentId/homepage/publish
Authorization: Bearer <access_token>
```

**Response (200):**
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

### Unpublish Homepage

```http
POST /talents/:talentId/homepage/unpublish
Authorization: Bearer <access_token>
```

### Get Homepage Versions

```http
GET /talents/:talentId/homepage/versions?page=1&pageSize=20
Authorization: Bearer <access_token>
```

### Restore Version

```http
POST /talents/:talentId/homepage/versions/:versionId/restore
Authorization: Bearer <access_token>
```

### Update Homepage Settings

```http
PATCH /talents/:talentId/homepage/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "seoTitle": "My Homepage",
  "seoDescription": "Welcome to my page",
  "customDomain": "talent.example.com",
  "version": 1
}
```

### Custom Domain Verification

```http
POST /talents/:talentId/homepage/domain/verify
Authorization: Bearer <access_token>
```

---

## Reports

### Create Report Job

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

**Response (202):**
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

### Get Report Job Status

```http
GET /reports/:jobId
Authorization: Bearer <access_token>
```

### Download Report

```http
GET /reports/:jobId/download
Authorization: Bearer <access_token>
```

Returns a presigned URL for downloading the report file.

### Search for Report Preview

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

## Export

### Create Export Job

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

### Get Export Job Status

```http
GET /exports/:jobId
Authorization: Bearer <access_token>
```

### Download Export

```http
GET /exports/:jobId/download
Authorization: Bearer <access_token>
```

---

## Email Templates (AC Admin Only)

### List Email Templates

```http
GET /email-templates
Authorization: Bearer <access_token>
```

### Get Email Template

```http
GET /email-templates/:code
Authorization: Bearer <access_token>
```

### Create Email Template

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

### Update Email Template

```http
PATCH /email-templates/:code
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "subjectEn": "Updated Subject",
  "bodyHtmlEn": "<p>Updated content</p>"
}
```

### Preview Email Template

```http
POST /email-templates/:code/preview
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "language": "en",
  "variables": {
    "userName": "John Doe",
    "actionLink": "https://example.com"
  }
}
```

---

## Marshmallow (Admin)

### Get Marshmallow Config

```http
GET /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
```

### Update Marshmallow Config

```http
PATCH /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isEnabled": true,
  "greetingMessage": "Welcome!",
  "minLength": 10,
  "maxLength": 500,
  "captchaMode": "auto"
}
```

### List Messages

```http
GET /talents/:talentId/marshmallow/messages?status=pending&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### Moderate Message

```http
PATCH /marshmallow/messages/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "moderationStatus": "approved",
  "moderationReason": "string"
}
```

### Reply to Message

```http
POST /marshmallow/messages/:id/reply
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "replyContent": "Thank you!",
  "isPublic": true
}
```

### Batch Action

```http
POST /marshmallow/messages/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "messageIds": ["uuid1", "uuid2"],
  "action": "approve"
}
```

### Export Messages

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

## External Blocklist

### List External Blocklist Entries

```http
GET /external-blocklist?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### Create External Blocklist Entry

```http
POST /external-blocklist
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ownerType": "tenant",
  "ownerId": "uuid",
  "pattern": "spam_word",
  "patternType": "keyword",
  "action": "reject",
  "severity": "high"
}
```

### Update External Blocklist Entry

```http
PATCH /external-blocklist/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isActive": false
}
```

### Batch Toggle

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

## Security APIs

### Generate Fingerprint

```http
POST /security/fingerprint
Authorization: Bearer <access_token>
```

### List Blocklist Entries

```http
GET /blocklist-entries?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### Create Blocklist Entry

```http
POST /blocklist-entries
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pattern": "bad_word",
  "patternType": "keyword",
  "nameEn": "Bad Word",
  "action": "reject",
  "severity": "high",
  "scope": ["marshmallow"]
}
```

### Test Blocklist Pattern

```http
POST /blocklist-entries/test
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "testContent": "This contains bad_word in it",
  "pattern": "bad_word",
  "patternType": "keyword"
}
```

### List IP Access Rules

```http
GET /ip-access-rules?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### Create IP Rule

```http
POST /ip-access-rules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ruleType": "blacklist",
  "ipPattern": "192.168.1.0/24",
  "scope": "global",
  "reason": "Suspicious activity"
}
```

### Check IP Access

```http
POST /ip-access-rules/check
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ip": "192.168.1.100"
}
```

---

## Platform Configuration (AC Admin Only)

### Get Platform Config

```http
GET /platform/config/:key
Authorization: Bearer <access_token>
```

### Set Platform Config

```http
PUT /platform/config/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": { "domain": "tcrn.app" }
}
```

### List All Platform Configs

```http
GET /platform/config
Authorization: Bearer <access_token>
```

---

## Public APIs

### Get Talent Homepage

```http
GET /public/homepage/:talentPath
```

### Get Marshmallow Config (Public)

```http
GET /public/marshmallow/:talentPath/config
```

### Get Public Messages

```http
GET /public/marshmallow/:talentPath/messages?cursor=<string>&limit=20
```

### Submit Marshmallow Message

```http
POST /public/marshmallow/:talentPath/messages
Content-Type: application/json

{
  "content": "Your question here...",
  "isAnonymous": true,
  "senderName": "Anonymous",
  "turnstileToken": "cloudflare_token",
  "fingerprint": "device_fingerprint",
  "honeypot": ""
}
```

### Toggle Reaction

```http
POST /public/marshmallow/messages/:messageId/reactions
Content-Type: application/json

{
  "type": "heart",
  "fingerprint": "device_fingerprint"
}
```

### Mark Message as Read

```http
POST /public/marshmallow/messages/:messageId/read
Content-Type: application/json

{
  "fingerprint": "device_fingerprint"
}
```

---

## Logs

### List Change Logs

```http
GET /logs/changes?objectType=customer_profile&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### List Tech Event Logs

```http
GET /logs/events?severity=error&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### List Integration Logs

```http
GET /logs/integrations?direction=outbound&page=1&pageSize=20
Authorization: Bearer <access_token>
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid username or password |
| AUTH_ACCOUNT_LOCKED | 403 | Account temporarily locked |
| AUTH_TOTP_REQUIRED | 403 | TOTP verification required |
| AUTH_TOKEN_EXPIRED | 401 | Access token expired |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Version conflict (optimistic locking) |
| VALIDATION_ERROR | 400 | Input validation failed |
| RATE_LIMITED | 429 | Too many requests |
| PII_SERVICE_UNAVAILABLE | 503 | PII service temporarily unavailable |
| CAPTCHA_REQUIRED | 403 | CAPTCHA verification required |
| CAPTCHA_FAILED | 403 | CAPTCHA verification failed |
| CONTENT_BLOCKED | 403 | Content blocked by profanity filter |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global API | 100 req | 60s |
| Admin API | 50 req | 60s |
| Login Attempt | 5 req | 300s |
| Marshmallow Submit | 5 req | 3600s |
| Password Reset | 3 req | 3600s |
| Public Homepage | 60 req | 60s |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
