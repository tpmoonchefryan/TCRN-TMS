<p align="center">
  <a href="./API.md">English</a> |
  <strong>简体中文</strong> |
  <a href="./API.ja.md">日本語</a>
</p>

# TCRN TMS - API 文档

## 基础 URL

```
{baseUrl}/api/v1
```

## 认证

### 登录

```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**响应 (200):**
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

### TOTP 验证（如需要）

```http
POST /auth/totp/verify
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "code": "123456"
}
```

### 刷新令牌

```http
POST /auth/refresh
Cookie: refresh_token=<token>
```

### 登出

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### 获取当前用户

```http
GET /auth/me
Authorization: Bearer <access_token>
```

---

## 客户管理

### 客户列表

```http
GET /customers?talentId=<uuid>&page=1&pageSize=20
Authorization: Bearer <access_token>
```

**查询参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| talentId | uuid | 必填。按艺人筛选 |
| page | number | 页码（默认: 1） |
| pageSize | number | 每页数量（默认: 20，最大: 100） |
| search | string | 按昵称搜索 |
| tags | string | 逗号分隔的标签 |
| statusId | uuid | 按状态筛选 |
| profileType | string | 'individual' 或 'company' |
| isActive | boolean | 按活跃状态筛选 |

**响应 (200):**
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

### 获取客户详情

```http
GET /customers/:id
Authorization: Bearer <access_token>
```

### 获取客户 PII 信息

```http
GET /customers/:id/pii
Authorization: Bearer <access_token>
X-PII-Access-Reason: "客户支持查询 #12345"
```

**响应 (200):**
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

### 创建客户

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

### 更新客户

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

### 停用客户

```http
POST /customers/:id/deactivate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reasonId": "uuid"
}
```

### 重新激活客户

```http
POST /customers/:id/reactivate
Authorization: Bearer <access_token>
```

### 外部标识管理

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

## 艺人管理

### 艺人列表

```http
GET /talents?subsidiaryId=<uuid>
Authorization: Bearer <access_token>
```

### 获取艺人详情

```http
GET /talents/:id
Authorization: Bearer <access_token>
```

---

## 组织架构

### 获取组织树

```http
GET /organization/tree
Authorization: Bearer <access_token>
```

**响应 (200):**
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

## 主页管理

### 获取艺人主页

```http
GET /talents/:talentId/homepage
Authorization: Bearer <access_token>
```

**响应 (200):**
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
    "seoTitle": "我的主页",
    "homepageUrl": "https://tcrn.app/p/talent-path"
  }
}
```

### 保存主页草稿

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
        "props": { "displayName": "艺人名称", "bio": "..." },
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

### 发布主页

```http
POST /talents/:talentId/homepage/publish
Authorization: Bearer <access_token>
```

**响应 (200):**
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

### 取消发布主页

```http
POST /talents/:talentId/homepage/unpublish
Authorization: Bearer <access_token>
```

### 获取主页版本历史

```http
GET /talents/:talentId/homepage/versions?page=1&pageSize=20
Authorization: Bearer <access_token>
```

### 恢复历史版本

```http
POST /talents/:talentId/homepage/versions/:versionId/restore
Authorization: Bearer <access_token>
```

### 更新主页设置

```http
PATCH /talents/:talentId/homepage/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "seoTitle": "我的主页",
  "seoDescription": "欢迎访问我的页面",
  "customDomain": "talent.example.com",
  "version": 1
}
```

### 自定义域名验证

```http
POST /talents/:talentId/homepage/domain/verify
Authorization: Bearer <access_token>
```

---

## 报表

### 创建报表任务

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

**响应 (202):**
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

### 获取报表任务状态

```http
GET /reports/:jobId
Authorization: Bearer <access_token>
```

### 下载报表

```http
GET /reports/:jobId/download
Authorization: Bearer <access_token>
```

返回用于下载报表文件的预签名 URL。

### 报表预览搜索

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

## 导出

### 创建导出任务

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

### 获取导出任务状态

```http
GET /exports/:jobId
Authorization: Bearer <access_token>
```

### 下载导出文件

```http
GET /exports/:jobId/download
Authorization: Bearer <access_token>
```

---

## 邮件模板（仅 AC 管理员）

### 邮件模板列表

```http
GET /email-templates
Authorization: Bearer <access_token>
```

### 获取邮件模板

```http
GET /email-templates/:code
Authorization: Bearer <access_token>
```

### 创建邮件模板

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

### 更新邮件模板

```http
PATCH /email-templates/:code
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "subjectEn": "更新后的主题",
  "bodyHtmlEn": "<p>更新后的内容</p>"
}
```

### 预览邮件模板

```http
POST /email-templates/:code/preview
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "language": "zh",
  "variables": {
    "userName": "张三",
    "actionLink": "https://example.com"
  }
}
```

---

## 棉花糖（管理端）

### 获取棉花糖配置

```http
GET /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
```

### 更新棉花糖配置

```http
PATCH /talents/:talentId/marshmallow/config
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isEnabled": true,
  "greetingMessage": "欢迎！",
  "minLength": 10,
  "maxLength": 500,
  "captchaMode": "auto"
}
```

### 消息列表

```http
GET /talents/:talentId/marshmallow/messages?status=pending&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### 审核消息

```http
PATCH /marshmallow/messages/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "moderationStatus": "approved",
  "moderationReason": "string"
}
```

### 回复消息

```http
POST /marshmallow/messages/:id/reply
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "replyContent": "谢谢！",
  "isPublic": true
}
```

### 批量操作

```http
POST /marshmallow/messages/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "messageIds": ["uuid1", "uuid2"],
  "action": "approve"
}
```

### 导出消息

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

## 外部屏蔽词

### 外部屏蔽词列表

```http
GET /external-blocklist?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### 创建外部屏蔽词

```http
POST /external-blocklist
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ownerType": "tenant",
  "ownerId": "uuid",
  "pattern": "垃圾词",
  "patternType": "keyword",
  "action": "reject",
  "severity": "high"
}
```

### 更新外部屏蔽词

```http
PATCH /external-blocklist/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "isActive": false
}
```

### 批量切换状态

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

## 安全 API

### 生成指纹

```http
POST /security/fingerprint
Authorization: Bearer <access_token>
```

### 屏蔽词列表

```http
GET /blocklist-entries?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### 创建屏蔽词

```http
POST /blocklist-entries
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "pattern": "敏感词",
  "patternType": "keyword",
  "nameEn": "Sensitive Word",
  "action": "reject",
  "severity": "high",
  "scope": ["marshmallow"]
}
```

### 测试屏蔽词

```http
POST /blocklist-entries/test
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "testContent": "这段话包含敏感词",
  "pattern": "敏感词",
  "patternType": "keyword"
}
```

### IP 访问规则列表

```http
GET /ip-access-rules?ownerType=tenant&ownerId=<uuid>
Authorization: Bearer <access_token>
```

### 创建 IP 规则

```http
POST /ip-access-rules
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ruleType": "blacklist",
  "ipPattern": "192.168.1.0/24",
  "scope": "global",
  "reason": "可疑活动"
}
```

### 检查 IP 访问

```http
POST /ip-access-rules/check
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ip": "192.168.1.100"
}
```

---

## 平台配置（仅 AC 管理员）

### 获取平台配置

```http
GET /platform/config/:key
Authorization: Bearer <access_token>
```

### 设置平台配置

```http
PUT /platform/config/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": { "domain": "tcrn.app" }
}
```

### 列出所有平台配置

```http
GET /platform/config
Authorization: Bearer <access_token>
```

---

## 公开 API

### 获取艺人主页

```http
GET /public/homepage/:talentPath
```

### 获取棉花糖配置（公开）

```http
GET /public/marshmallow/:talentPath/config
```

### 获取公开消息

```http
GET /public/marshmallow/:talentPath/messages?cursor=<string>&limit=20
```

### 提交棉花糖消息

```http
POST /public/marshmallow/:talentPath/messages
Content-Type: application/json

{
  "content": "你的问题...",
  "isAnonymous": true,
  "senderName": "匿名",
  "turnstileToken": "cloudflare_token",
  "fingerprint": "device_fingerprint",
  "honeypot": ""
}
```

### 切换表情反应

```http
POST /public/marshmallow/messages/:messageId/reactions
Content-Type: application/json

{
  "type": "heart",
  "fingerprint": "device_fingerprint"
}
```

### 标记消息已读

```http
POST /public/marshmallow/messages/:messageId/read
Content-Type: application/json

{
  "fingerprint": "device_fingerprint"
}
```

---

## 日志

### 变更日志列表

```http
GET /logs/changes?objectType=customer_profile&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### 系统事件日志列表

```http
GET /logs/events?severity=error&page=1&pageSize=20
Authorization: Bearer <access_token>
```

### 集成日志列表

```http
GET /logs/integrations?direction=outbound&page=1&pageSize=20
Authorization: Bearer <access_token>
```

---

## 错误代码

| 代码 | HTTP 状态 | 说明 |
|------|-----------|------|
| AUTH_INVALID_CREDENTIALS | 401 | 用户名或密码无效 |
| AUTH_ACCOUNT_LOCKED | 403 | 账户已被临时锁定 |
| AUTH_TOTP_REQUIRED | 403 | 需要 TOTP 验证 |
| AUTH_TOKEN_EXPIRED | 401 | 访问令牌已过期 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源未找到 |
| CONFLICT | 409 | 版本冲突（乐观锁） |
| VALIDATION_ERROR | 400 | 输入验证失败 |
| RATE_LIMITED | 429 | 请求过于频繁 |
| PII_SERVICE_UNAVAILABLE | 503 | PII 服务暂时不可用 |
| CAPTCHA_REQUIRED | 403 | 需要验证码验证 |
| CAPTCHA_FAILED | 403 | 验证码验证失败 |
| CONTENT_BLOCKED | 403 | 内容被敏感词过滤器拦截 |

---

## 速率限制

| 端点 | 限制 | 时间窗口 |
|------|------|----------|
| 全局 API | 100 次 | 60 秒 |
| 管理 API | 50 次 | 60 秒 |
| 登录尝试 | 5 次 | 300 秒 |
| 棉花糖提交 | 5 次 | 3600 秒 |
| 密码重置 | 3 次 | 3600 秒 |
| 公开主页 | 60 次 | 60 秒 |

响应中包含速率限制头信息：
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
