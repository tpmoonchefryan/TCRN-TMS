<p align="center">
  <a href="./ARCHITECTURE.md">English</a> |
  <strong>简体中文</strong> |
  <a href="./ARCHITECTURE.ja.md">日本語</a>
</p>

# TCRN TMS - 架构文档

## 系统概述

TCRN TMS 是一个基于微服务架构的多租户艺人管理系统。

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            负载均衡器 / CDN                              │
│                        (Cloudflare / AWS CloudFront)                    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Web 前端      │         │   API 网关      │         │   公开页面       │
│   (Next.js)     │         │   (NestJS)      │         │  (Next.js SSR)  │
│   :3000         │         │   :4000         │         │  /p/* /m/*      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
          │  PostgreSQL 16  │ │    Redis 7      │ │  PII 服务       │
          │  (多租户)       │ │  (缓存/队列)    │ │  (mTLS)         │
          └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                 │                 │
                    │                 ▼                 │
                    │         ┌─────────────────┐       │
                    │         │  BullMQ Workers │       │
                    │         │  (后台任务)     │       │
                    │         └─────────────────┘       │
                    │                                   │
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │     MinIO       │                 │  PII PostgreSQL │
          │  (对象存储)     │                 │  (加密存储)     │
          └─────────────────┘                 └─────────────────┘
```

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端 | Next.js 15, React 19, TypeScript | 管理界面、公开页面 |
| API | NestJS 10, TypeScript | REST API、认证 |
| 数据库 | PostgreSQL 16 | 多租户数据存储 |
| 缓存/队列 | Redis 7 | 会话缓存、BullMQ 队列 |
| 对象存储 | MinIO | 报表、导出、上传 |
| PII 服务 | 独立 NestJS | 隔离的 PII 数据处理 |
| Worker | Node.js, BullMQ | 后台任务处理 |
| 可观测性 | OpenTelemetry, Tempo, Prometheus | 链路追踪、指标 |

## 多租户架构

### 基于 Schema 的隔离

每个租户拥有独立的 PostgreSQL Schema：

```
public/              # 全局元数据
  - tenant           # 租户注册表
  - global_config    # 系统级配置
  - email_template   # 邮件模板（共享）

tenant_template/     # 模板 Schema（用于创建新租户）
  - system_user
  - customer_profile
  - marshmallow_message
  - talent_homepage
  - ...

tenant_<code>/       # 每租户 Schema
  - tenant_ac        # 平台管理租户
  - tenant_demo
  - ...
```

### 租户识别

```typescript
// 请求上下文包含租户信息
interface RequestContext {
  tenantId: string;
  tenantSchemaName: string;
  userId: string;
  permissions: string[];
}

// 数据库查询使用 Schema 前缀
const result = await prisma.$queryRawUnsafe(`
  SELECT * FROM "${tenantSchema}".customer_profile
  WHERE id = $1
`, customerId);
```

## 安全架构

### 认证流程

```
┌──────────┐    POST /auth/login     ┌──────────┐
│  客户端  │ ─────────────────────▶  │   API    │
└──────────┘                         └──────────┘
     │                                     │
     │         访问令牌 (JWT)               │
     │  ◀─────────────────────────────────  │
     │         刷新令牌 (Cookie)            │
     │                                     │
     │    后续请求携带                      │
     │    Authorization: Bearer <token>    │
     │  ─────────────────────────────────▶ │
     │                                     │
```

### PII 数据分离

```
┌─────────────────┐                 ┌─────────────────┐
│   主 API        │    mTLS/JWT    │   PII 服务      │
│                 │ ──────────────▶│                 │
│  customer_id    │                │  PII 数据库     │
│  rm_profile_id  │ ◀──────────────│  (加密存储)     │
│  (令牌)         │    PII 数据    │                 │
└─────────────────┘                 └─────────────────┘
```

### 技术指纹

```typescript
// 用于水印的指纹生成
interface FingerprintPayload {
  userId: string;
  tenantId: string;
  timestamp: number;
  env: string;
  sessionId: string;
}

// 响应头包含指纹
X-TCRN-FP: <encrypted_fingerprint>
X-TCRN-FP-Version: 1
```

### 内容安全

```
┌─────────────────────────────────────────────────────┐
│                    安全层                            │
├─────────────────────────────────────────────────────┤
│  1. 速率限制 (基于 Redis，按 IP/端点)                │
│  2. 验证码验证 (Cloudflare Turnstile)               │
│  3. UA 检测 (机器人/爬虫屏蔽)                        │
│  4. 敏感词过滤 (多语言，风险评分)                    │
│  5. IP 黑名单 (白名单/黑名单规则)                    │
│  6. 内容屏蔽词 (关键词/正则匹配)                     │
└─────────────────────────────────────────────────────┘
```

## 权限系统 (RBAC)

### 三态权限模型

```
┌───────────────────────────────────────────────────┐
│                   权限状态                          │
├───────────────────────────────────────────────────┤
│  GRANT  │  明确授予                                │
│  DENY   │  明确拒绝（最高优先级）                   │
│  UNSET  │  未设置，继承父级                         │
├───────────────────────────────────────────────────┤
│  优先级: DENY > GRANT > UNSET                      │
└───────────────────────────────────────────────────┘
```

### 层级结构

```
租户
  └── 子公司（可嵌套）
        └── 艺人

用户角色分配:
  用户 ─── 角色 ─── 作用域 (租户/子公司/艺人)
```

### 功能角色

| 角色 | 描述 |
|------|------|
| ADMIN | 完全管理权限 |
| TALENT_MANAGER | 管理艺人和客户 |
| VIEWER | 只读权限 |
| TALENT_SELF | 艺人自我管理 |
| MODERATOR | 内容审核 |
| SUPPORT | 客户支持权限 |
| ANALYST | 分析和报表 |

### 权限快照 (Redis)

```
Key: perm:{tenant_id}:{user_id}:{scope_type}:{scope_id}
Value: {
  "customer.profile": ["read", "write"],
  "customer.pii": ["read"],
  "homepage.publish": ["execute"],
  ...
}
```

## 后台任务

### 队列架构 (BullMQ)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Redis                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │
│  │ import  │ │ report  │ │ export  │ │ email   │ │ marsh-  │ │ log   │  │
│  │ queue   │ │ queue   │ │ queue   │ │ queue   │ │ mallow  │ │ queue │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘  │
└─────────────────────────────────────────────────────────────────────────┘
           │          │          │          │          │          │
           ▼          ▼          ▼          ▼          ▼          ▼
     ┌─────────────────────────────────────────────────────────────────┐
     │                        Worker 进程                               │
     │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
     │  │ Import  │ │ Report  │ │ Export  │ │ Email   │ │Marshmallow│  │
     │  │ Worker  │ │ Worker  │ │ Worker  │ │ Worker  │ │ Export   │   │
     │  │ (c:1)   │ │ (c:1)   │ │ (c:1)   │ │ (c:1)   │ │ Worker   │   │
     │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
     └─────────────────────────────────────────────────────────────────┘
```

### 任务类型

| 队列 | 任务类型 | 描述 |
|------|----------|------|
| import | CUSTOMER_IMPORT | 从 CSV/JSON 批量导入客户 |
| report | MFR_REPORT | 会员粉丝报表生成 |
| export | CUSTOMER_EXPORT | 客户数据导出 |
| export | MARSHMALLOW_EXPORT | 棉花糖消息导出 |
| email | SEND_EMAIL | 异步邮件发送 |
| log | TECH_EVENT | 异步事件日志 |
| log | INTEGRATION_LOG | 异步集成日志 |

### 邮件服务集成

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   API 服务器    │ ──────▶ │  Email 队列     │ ──────▶ │  Email Worker   │
│  sendEmail()    │         │  (BullMQ)       │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                                                 │
                     ┌───────────────────────────────────────────┤
                     │                                           │
                     ▼                                           ▼
           ┌─────────────────┐                         ┌─────────────────┐
           │  PII 服务       │                         │  腾讯云 SES     │
           │  (获取邮箱)     │                         │  (发送邮件)     │
           └─────────────────┘                         └─────────────────┘
```

## 可观测性

### OpenTelemetry 配置

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  API 服务器  │───▶│  OTel Agent  │───▶│  Grafana     │
│              │    │  Collector   │    │  Tempo       │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Prometheus  │───▶ Grafana
                    └──────────────┘
```

### 采样策略

| 路径模式 | 采样率 | 原因 |
|----------|--------|------|
| 认证/PII | 10% | 安全敏感 |
| 报表 | 50% | 便于调试 |
| 外部页面 | 0.5% | 高流量 |
| 其他 API | 1% | 平衡覆盖率与成本 |
| 错误（任意） | 100% | 始终捕获 |
| 慢请求 (>2s) | 100% | 性能问题 |

## 外部页面架构

### 主页构建器

```
TalentHomepage
  ├── theme: 'default' | 'dark' | 'soft' | 'cute' | 'minimal'
  ├── components: [
  │     { type: 'ProfileCard', props: {...} },
  │     { type: 'SocialLinks', props: {...} },
  │     { type: 'ImageGallery', props: {...} },
  │     { type: 'VideoEmbed', props: {...} },
  │     { type: 'RichText', props: {...} },
  │     { type: 'LinkButton', props: {...} },
  │     { type: 'MarshmallowWidget', props: {...} },
  │     { type: 'Divider', props: {...} },
  │     { type: 'Spacer', props: {...} }
  │   ]
  └── versions: [
        { version: 1, status: 'archived', snapshot: {...} },
        { version: 2, status: 'published', snapshot: {...} },
        { version: 3, status: 'draft', snapshot: {...} }
      ]
```

### 主页发布流程

```
┌──────────┐    PUT /draft     ┌──────────┐    POST /publish   ┌──────────┐
│  编辑器  │ ────────────────▶ │  草稿    │ ─────────────────▶ │ 已发布   │
│  (React) │                   │  版本    │                    │  版本    │
└──────────┘                   └──────────┘                    └──────────┘
     │                              │                               │
     │  自动保存 (5秒防抖)          │                               │
     │  LocalStorage (即时)         │                               │
     │                              │                               │
     └──────────────────────────────┘                               │
                                                                    │
                    ┌───────────────────────────────────────────────┤
                    │                                               │
                    ▼                                               ▼
           ┌─────────────────┐                            ┌─────────────────┐
           │  CDN 缓存清除   │                            │  公开页面       │
           │  (Cloudflare)   │                            │  /p/{path}      │
           └─────────────────┘                            └─────────────────┘
```

### 棉花糖（匿名问答）

```
提交流程:
  1. 客户端 → 速率限制检查 (IP + 艺人, 60次/分钟)
  2. 客户端 → 蜜罐字段验证
  3. 客户端 → 验证码验证 (Cloudflare Turnstile)
     └── 自动模式: 基于信任评分决策
  4. 客户端 → 敏感词过滤 (多语言, 风险评分)
  5. 客户端 → 屏蔽词匹配
  6. 创建消息 (待审核)
  7. 通过邮件通知艺人 (如已配置)

审核流程:
  1. 艺人查看待审核消息
  2. 通过 / 拒绝 / 标记
  3. 可选: 回复 (公开/私密)
  4. 已通过的消息对公众可见
```

### 信任评分系统

```
┌─────────────────────────────────────────────────────┐
│                   信任评分因素                        │
├─────────────────────────────────────────────────────┤
│  + 成功完成的验证码                                  │
│  + 一致的设备指纹                                    │
│  + 消息历史（已通过）                                │
│  - 验证码失败次数                                    │
│  - 同一 IP 多个指纹                                  │
│  - UA 变化                                          │
│  - 被拦截的消息                                      │
├─────────────────────────────────────────────────────┤
│  trusted (80+)    → 无需验证码                       │
│  neutral (50-79)  → 有时需要验证码                   │
│  suspicious (20-49) → 始终需要验证码                 │
│  blocked (<20)    → 拒绝所有提交                     │
└─────────────────────────────────────────────────────┘
```

## 部署架构

### Kubernetes 部署

```yaml
Deployments:
  - tcrn-api (2+ 副本, HPA)
  - tcrn-web (2+ 副本)
  - tcrn-worker (1-2 副本)
  - tcrn-pii-service (2+ 副本, 隔离)

Services:
  - ClusterIP 用于内部通信
  - LoadBalancer 用于外部访问

ConfigMaps & Secrets:
  - 环境配置
  - TLS 证书
  - API 密钥
```

### Docker 服务（开发环境）

| 服务 | 端口 | 用途 |
|------|------|------|
| PostgreSQL | 5432 | 主数据库 |
| Redis | 6379 | 缓存与队列 |
| MinIO | 9000/9001 | 对象存储 |
| NATS | 4222/8222 | 事件流 |
| Loki | 3100 | 日志聚合 |
| Tempo | 3200/4317/4318 | 分布式追踪 |
| PII PostgreSQL | (内部) | PII 数据库 |
| PII Service | 5100 | PII API |

### 零停机部署

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

## 数据流示例

### 客户创建

```
1. API 收到 POST /customers
2. 验证输入 (Valibot)
3. 检查权限
4. 创建 customer_profile（不含 PII）
5. 调用 PII 服务存储 PII → 获取 rm_profile_id
6. 更新客户的 rm_profile_id
7. 记录变更日志 (ChangeLog)
8. 返回响应
```

### 报表生成

```
1. API 收到 POST /reports (MFR)
2. 验证权限
3. 创建 ReportJob (status: pending)
4. 加入 BullMQ 'report' 队列
5. Worker 领取任务
6. 按筛选条件查询客户
7. 对于 PII 字段 → 批量调用 PII 服务
8. 流式写入 Excel (ExcelJS)
9. 上传到 MinIO
10. 更新 ReportJob (status: completed, fileUrl)
11. 返回预签名下载 URL
```

### 邮件发送

```
1. API 调用 emailService.send()
2. 任务加入 BullMQ 'email' 队列
3. Worker 领取任务
4. 从数据库加载邮件模板
5. 如果是业务邮件 → 从 PII 服务获取收件人
6. 使用变量渲染模板
7. 通过腾讯云 SES 发送
8. 记录结果（成功/失败）
9. 失败时重试（3次，指数退避）
```

### 主页发布

```
1. 用户在编辑器中点击"发布"
2. POST /talents/:id/homepage/publish
3. 验证草稿存在
4. 更新版本状态为 'published'
5. 更新主页的 published_version_id 指针
6. 触发 CDN 缓存清除（异步）
7. 创建新的空草稿版本
8. 返回成功及主页 URL
```
