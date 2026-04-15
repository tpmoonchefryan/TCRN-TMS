<p align="center">
  <a href="./README.md">English</a> |
  <strong>简体中文</strong> |
  <a href="./README.ja.md">日本語</a>
</p>

<h1 align="center">TCRN TMS - 艺人管理系统</h1>

<p align="center">
  <strong>专为 VTuber/VUP 经纪公司设计的综合 CRM 平台</strong>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-PolyForm%20NC-blue">
  <img alt="Node" src="https://img.shields.io/badge/node-20%2B-green">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.9-blue">
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen">
</p>

---

## 📋 待办事项

- **适配器和 Webhook 开发**
  - 对接 Bilibili 直播开放平台，支持更多集成功能（自动更新观众信息、记录会籍有效期、消费记录等）
  - 对接中国内地物流公司开放平台，未来支持更多会员回馈相关功能

---

## 📖 目录

- [待办事项](#-待办事项)
- [项目简介](#-项目简介)
- [功能亮点](#-功能亮点)
- [核心模块](#-核心模块)
- [系统架构](#-系统架构)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [生产环境部署](#-生产环境部署)
- [自定义域名配置](#-自定义域名配置)
- [外部 PII Platform 集成](#-外部-pii-platform-集成)
- [API 参考](#-api-参考)
- [安全机制](#-安全机制)
- [许可证](#-许可证)

---

## 🎯 项目简介

**TCRN TMS（艺人管理系统）** 是一个专为 VTuber（虚拟主播）和 VUP（虚拟 UP 主）经纪公司设计的综合 CRM 平台。它提供从客户档案管理到对外互动页面的一站式解决方案。

### 适用人群

- **VTuber/VUP 经纪公司**：大规模管理艺人、客户和粉丝互动
- **独立创作者**：通过可定制主页建立专业形象
- **艺人经理**：追踪会员、处理匿名问答（棉花糖）、生成报表
- **企业团队**：多租户架构，细粒度 RBAC 权限控制

### 核心优势

- **隐私优先架构**：PII 流程已外置到独立的 `TCRN_PII_PLATFORM`，不再由本仓库内置运行时承载
- **多租户隔离**：每个租户拥有独立的 PostgreSQL Schema，实现完全数据隔离
- **三语言支持**：完整的中文、英文、日文界面本地化
- **VTuber 专属功能**：棉花糖（匿名问答）、可定制艺人主页、会员追踪

---

## ✨ 功能亮点

### 🔐 隐私优先 PII 边界

敏感客户字段通过外部 `TCRN_PII_PLATFORM` 集成处理：

- **Adapter 控制能力开启**：只有 effective `integration_adapter` 才能表达 PII 能力是否启用
- **只允许写透，不允许回读**：创建/编辑可以 server-to-server 写入 PII，但 TMS 不把数据读回
- **门户查看**：用户在外部平台完成 SSO 与权限检查后查看 PII
- **档案隔离边界保留**：`profileStoreId` 继续作为 talent 之间客户档案隔离/共享边界

### 🏢 多租户组织架构

```
平台（AC 租户）
└── 普通租户（公司/经纪公司）
    └── 分级目录（部门/团队）
        └── 艺人（独立创作者）
```

- **Schema 级隔离**：每个租户拥有专用 PostgreSQL Schema（`tenant_xxx`）
- **层级权限**：设置和规则从租户 → 分级目录 → 艺人级联传递
- **跨租户管理**：平台管理员可管理所有租户

### 🛡️ 三态 RBAC 权限系统

与传统的授权/拒绝系统不同，TCRN TMS 实现了三态模型：

| 状态                | 描述     | 优先级 |
| ------------------- | -------- | ------ |
| **Deny（拒绝）**    | 明确禁止 | 最高   |
| **Grant（授予）**   | 明确允许 | 中等   |
| **Unset（未设定）** | 未配置   | 最低   |

**功能型角色**：`ADMIN`、`TALENT_MANAGER`、`VIEWER`、`TALENT_SELF`、`MODERATOR`、`SUPPORT`、`ANALYST`

### 🍡 棉花糖匿名问答系统

灵感来自日本"棉花糖"服务的完整匿名提问箱系统：

- **智能验证码**：三种模式（始终/从不/自动），带信任评分
- **内容审核**：多语言脏话过滤器，带风险评分
- **外部屏蔽词**：屏蔽 URL、域名和关键词模式
- **表情反应**：粉丝可对已审核消息进行表情反应
- **导出功能**：支持导出消息为 CSV/JSON/XLSX

<p align="center">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_externalpage.png" alt="Marshmallow 预览" width="600">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_streamermode.png" alt="Marshmallow 预览2" width="600">
  <img src=".github/readme-assets/marshmallow/marshmallow_preview_audit.png" alt="Marshmallow 预览3" width="1200">
</p>

### 📊 MFR 报表生成

生成全面的**会员反馈报表**：

- 通过 `customerId[] + 请求元数据` 将 PII 报表请求移交给平台侧生成
- 平台身份（YouTube、Bilibili 等）
- 会员状态和到期追踪
- 异步生成，带进度追踪
- 通过 MinIO 预签名 URL 直接下载

### 🔍 全面审计日志

三种类型的日志，自动 PII 脱敏：

| 日志类型         | 用途                    | 保留期        |
| ---------------- | ----------------------- | ------------- |
| **变更日志**     | UI 触发的业务变更       | 60 天（生产） |
| **技术事件日志** | 系统事件和错误          | 60 天（生产） |
| **集成日志**     | 外部 API 调用和 Webhook | 60 天（生产） |

Loki 集成支持跨所有日志的全文搜索。

---

## 📦 核心模块

### 客户管理

| 功能         | 描述                                               |
| ------------ | -------------------------------------------------- |
| **个人档案** | 真实姓名、昵称、联系方式、出生日期                 |
| **企业档案** | 公司名称、注册号、税号                             |
| **平台身份** | YouTube、Bilibili、Twitch、Twitter UID，带历史追踪 |
| **会员记录** | 类别、类型、等级，支持自动续费                     |
| **外部 ID**  | 将客户映射到外部系统（CRM、工单系统）              |
| **批量导入** | CSV 导入，带验证和错误报告                         |
| **批量操作** | 批量更新标签/状态/会员                             |

### 主页管理

为艺人提供拖拽式主页编辑器：

- **组件库**：Hero、关于、社交链接、图库、时间线、棉花糖组件
- **主题系统**：5 种预设（默认、深色、可爱、专业、极简）+ 自定义颜色
- **版本历史**：回滚到任意已发布版本
- **直播状态集成**：实时 Bilibili/YouTube 直播状态显示，支持封面图
- **个人名片**：增强的个性化设置，支持本地头像上传和自定义布局
- **自定义域名**：支持艺人自有域名，带 DNS 验证和灵活的 SSL 选项：
  - **自动签发 (Let's Encrypt)**：自动证书配置和续期
  - **自托管代理**：使用 Nginx/Caddy 配置自有 SSL 证书（[配置指南](#self-hosted-proxy-setup)）
  - **Cloudflare for SaaS**：边缘 SSL，带全球 CDN（[配置指南](#cloudflare-for-saas-setup)）
- **SEO 优化**：自动生成 meta 标签和 Open Graph 支持
- **示例页面**：[https://web.prod.tcrn-tms.com/p/joi_channel](https://web.prod.tcrn-tms.com/p/joi_channel)

### 安全管理

| 功能         | 描述                                 |
| ------------ | ------------------------------------ |
| **屏蔽词**   | 关键词和正则表达式模式，用于内容过滤 |
| **IP 规则**  | 白名单/黑名单，支持 CIDR             |
| **请求限流** | 基于 Redis 的端点级限流              |
| **UA 检测**  | 屏蔽已知机器人/爬虫 User-Agent       |
| **技术指纹** | 隐性水印，用于数据泄露追踪           |

### 邮件服务

集成腾讯云 SES：

- **模板系统**：多语言模板（中/英/日），带变量替换
- **队列处理**：BullMQ Worker，带重试和限流
- **预置模板**：密码重置、登录验证、会员提醒
- **当前支持边界**：这是默认运行时中唯一已完整接线的外发集成能力。`NATS JetStream` 目前只是内部异步基础设施，不应被描述为官方对外集成契约。

### 性能优化

生产级性能特性：

| 特性           | 实现方式                             |
| -------------- | ------------------------------------ |
| **动态导入**   | 7+ 大型组件通过 `dynamic.tsx` 懒加载 |
| **列表虚拟化** | `@tanstack/react-virtual` 处理长列表 |
| **图片优化**   | `next/image` 配置远程模式            |
| **记忆化**     | 高频组件使用 `React.memo`            |

### 可访问性

符合 WCAG 2.1 AA 标准：

- **减少动画**：尊重系统 `prefers-reduced-motion` 偏好设置
- **键盘导航**：所有交互元素支持完整键盘操作
- **屏幕阅读器**：全局使用语义化 HTML 和 ARIA 标签

### 错误处理

三级错误边界架构：

```
app/error.tsx              → 全局兜底
app/(business)/error.tsx   → 业务区域兜底
app/(admin)/admin/error.tsx → 管理区域兜底
```

### 表单验证

基于 Zod 的端到端类型安全验证：

- **145+ Zod Schemas**：覆盖认证、客户、棉花糖、主页模块
- **后端**：`ZodValidationPipe` 自动请求验证
- **前端**：`useZodForm` hook 管理表单状态
- **Swagger 集成**：从 Zod schemas 自动生成 API 文档

---

## 🏗️ 系统架构

```
                                    ┌─────────────────────────────────────────┐
                                    │             云服务提供商                 │
                                    │  ┌─────────────────────────────────┐   │
                                    │  │           负载均衡器             │   │
                                    │  └─────────────┬───────────────────┘   │
                                    │                │                        │
               ┌─────────────────────┼────────────────┼────────────────────┐  │
               │                     │                │                    │  │
               ▼                     ▼                ▼                    ▼  │
        ┌─────────────┐       ┌─────────────┐  ┌─────────────┐     ┌─────────┐│
        │   Next.js   │       │   NestJS    │  │   Worker    │     │  MinIO  ││
        │   (Web UI)  │──────▶│   (API)     │  │  (BullMQ)   │     │  (S3)   ││
        │   :3000     │       │   :4000     │  │             │     │  :9000  ││
        └─────────────┘       └──────┬──────┘  └──────┬──────┘     └─────────┘│
                                     │                │                       │
                              ┌──────┴──────┬─────────┴────┐                  │
                              │             │              │                  │
                              ▼             ▼              ▼                  │
                       ┌───────────┐ ┌───────────┐  ┌───────────┐             │
                       │PostgreSQL │ │   Redis   │  │   NATS    │             │
                       │   :5432   │ │   :6379   │  │   :4222   │             │
                       └───────────┘ └───────────┘  └───────────┘             │
                              │                                               │
                              │ mTLS                                          │
                              ▼                                               │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
              │      外部 TCRN PII Platform               │                  │
              │  ┌─────────────────┐  ┌─────────────────┐  │                  │
              │  │  门户 + API     │  │  PII 存储       │  │                  │
              │  │  （独立项目）   │──│  + 报表生成     │  │                  │
              │  │                 │  │  （独立运维）   │  │                  │
              │  └─────────────────┘  └─────────────────┘  │                  │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
                                    └─────────────────────────────────────────┘
```

### 数据流

1. **Web UI** → **API 网关**（NestJS）处理所有业务操作
2. **API** 验证 JWT 并检查 Redis 权限快照
3. 非 PII 数据存储在租户特定的 PostgreSQL Schema 中
4. 当 effective `TCRN_PII_PLATFORM` 启用时，客户创建/编辑会携带 `customerId` 向平台执行写透
5. PII 查看通过门户跳转 + SSO 完成，TMS 不回读 PII
6. 后台任务由 BullMQ Worker 处理
7. 文件存储在 MinIO，通过预签名 URL 下载

---

## 🛠️ 技术栈

| 层级         | 技术                   | 版本    |
| ------------ | ---------------------- | ------- |
| **前端**     | Next.js                | 16.1.1  |
|              | React                  | 19.1.1  |
|              | TypeScript             | 5.9.3   |
|              | Tailwind CSS           | 3.4.17  |
|              | Zustand                | 5.0.5   |
|              | TanStack React Virtual | 3.13.18 |
| **后端**     | NestJS                 | 11.1.6  |
|              | Prisma ORM             | 6.14.0  |
|              | BullMQ                 | 5.66.5  |
| **数据库**   | PostgreSQL             | 16      |
|              | Redis                  | 7       |
| **存储**     | MinIO                  | Latest  |
| **消息**     | NATS JetStream         | 2       |
| **可观测性** | OpenTelemetry          | -       |
|              | Prometheus             | -       |
|              | Grafana Loki           | 2.9.0   |
|              | Grafana Tempo          | -       |
| **部署**     | Docker                 | -       |
|              | Kubernetes             | -       |

以上基础设施的当前运行状态如下：

- `NATS JetStream` 是当前本地与生产 Compose 栈中的真实运行依赖。
- `NATS JetStream` 当前承担的是内部异步 plumbing。除非某条业务流已经真实接线到它，否则不要把它描述成生产可用的对外集成接口。
- `Grafana Loki` 的 Compose 服务当前改为可选 profile 服务，并保留真实 query/push helper；当前默认事实源仍是租户 PostgreSQL 日志表。`/api/v1/logs/search*` 读取 Loki，`LOKI_ENABLED=false` 时会返回空结果；API / worker 侧的 Loki push helper 目前还不是默认生产路径。
- `Grafana Tempo` 与 API 侧 OpenTelemetry 初始化代码当前属于 `observability` 可选 Compose profile 下的预留能力；分布式追踪默认并未在当前运行时启用。若要在本地显式启用，请先执行 `docker compose --profile observability up -d loki tempo`，再设置 `OTEL_ENABLED=true`，并将 `OTEL_EXPORTER_OTLP_ENDPOINT` 指向 Tempo 这类 trace backend。metrics 仍默认关闭；只有在显式提供独立的 `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`（指向单独的 OTLP metrics collector）时才会启用，不应把该 metrics endpoint 直接指向 Tempo。
- `Prometheus` 目前仍是路线图中的预留项，不在当前默认 Compose 部署里。
- 仓库内置的 `pii-health-check` Worker 探针已随独立 PII runtime 一并退役。
- 如需对外部 `TCRN_PII_PLATFORM` 做依赖健康监控，应在该平台或其 adapter / operator 监控中实现，而不是继续假定本仓库内置周期探测。

---

## 🚀 快速开始

### 环境要求

- Node.js 20+（推荐 LTS 版本）
- pnpm 9.15.4+
- Docker 和 Docker Compose
- PostgreSQL 16+（或使用 Docker）
- Redis 7+（或使用 Docker）

### 开发环境配置

```bash
# 1. 克隆仓库
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms

# 2. 安装依赖
pnpm install

# 3. 启动基础设施服务
# 默认只启动核心运行依赖
docker compose up -d postgres redis minio nats

# 可选：仅在需要调试 Loki/Tempo/OTEL 链路时启动本地观测服务
docker compose --profile observability up -d loki tempo

# 4. 配置环境变量
cp .env.sample .env.local
# 编辑 .env.local 填入你的配置

# 5. 初始化数据库
cd packages/database
pnpm db:apply-migrations
pnpm db:sync-schemas
pnpm db:seed
cd ../..

# 5b. 如需演练 PII 流程，请在系统内配置真实外部 `TCRN_PII_PLATFORM` adapter
# 本仓库已不再提供本地独立 PII 服务启动与迁移入口

# 6. 启动开发服务器
pnpm dev
```

### 访问地址

| 服务         | URL                            |
| ------------ | ------------------------------ |
| Web 界面     | http://localhost:3000          |
| API 接口     | http://localhost:4000          |
| API 文档     | http://localhost:4000/api/docs |
| MinIO 控制台 | http://localhost:9001          |
| NATS 监控    | http://localhost:8222          |

### 默认凭证

**AC（平台管理员）租户：**
| 字段 | 值 |
|------|-----|
| 租户代码 | AC |
| 用户名 | ac_admin |
| 密码 | (在种子文件中设置，见 `00-ac-tenant.ts`) |

### 测试与验证边界

- 仓库根目录的 `pnpm test:e2e` 运行的是 Playwright 浏览器套件，不是 API 的 Vitest integration runner。
- 根目录的 `pnpm test:integration` 实际等价于 `pnpm --filter @tcrn/api test:integration`，使用 `vitest.integration.config.ts` 运行 API integration suite。
- 根目录的 `pnpm test:isolation` 实际等价于 `pnpm --filter @tcrn/api test:isolation`，使用同一套 Vitest integration 配置运行 API isolation suite。
- 对包含 schema 变更的发布，应把 `db:verify-schema-rollout` 与常规运行时健康检查一起执行，不要把 Playwright E2E 当作 direct schema rollout verification 的替代品。

---

## 🌐 生产环境部署

本节介绍如何将 TCRN TMS 主应用部署到云服务器。

### 基础设施要求

| 组件           | 最低配置                   | 推荐配置                   |
| -------------- | -------------------------- | -------------------------- |
| **应用服务器** | 2 vCPU, 4GB RAM            | 4 vCPU, 8GB RAM            |
| **PostgreSQL** | 2 vCPU, 4GB RAM, 50GB SSD  | 4 vCPU, 8GB RAM, 100GB SSD |
| **Redis**      | 1 vCPU, 1GB RAM            | 2 vCPU, 2GB RAM            |
| **MinIO**      | 2 vCPU, 2GB RAM, 100GB SSD | 4 vCPU, 4GB RAM, 500GB SSD |

### 部署方式

#### 方式一：Docker Compose（单服务器）

适用于：小型部署、测试环境

```bash
# 1. 准备服务器
ssh your-server
sudo apt update && sudo apt install -y docker.io docker-compose-plugin

# 2. 克隆并配置
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms
cp .env.sample .env

# 3. 配置生产环境变量
cat > .env << 'EOF'
# 数据库
POSTGRES_USER=tcrn_prod
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=tcrn_tms
DATABASE_URL=postgresql://tcrn_prod:${POSTGRES_PASSWORD}@postgres:5432/tcrn_tms

# Redis
REDIS_URL=redis://redis:6379

# 安全
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
FINGERPRINT_SECRET_KEY=$(openssl rand -hex 32)
FINGERPRINT_KEY_VERSION=v1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(openssl rand -hex 32)
MINIO_ENDPOINT=http://minio:9000

# 外部 PII Platform
# 通过 tenant / subsidiary / talent 级 `TCRN_PII_PLATFORM` integration adapter 配置
# 本仓库不再需要 repo-owned PII runtime 环境变量

# 应用
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com

# 邮件（腾讯云 SES）
TENCENT_SES_SECRET_ID=your-secret-id
TENCENT_SES_SECRET_KEY=your-secret-key
TENCENT_SES_REGION=ap-hongkong
TENCENT_SES_FROM_ADDRESS=noreply@your-domain.com
EOF

# 4. 构建并部署
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# 5. 初始化数据库
docker-compose exec api pnpm db:apply-migrations
docker-compose exec api pnpm db:sync-schemas
docker-compose exec api pnpm db:seed

# 6. 对包含 schema 变更的发布执行 rollout 验证
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration 20260324000001_add_export_job \
  --require-table export_job \
  --require-column export_job.updated_at \
  --require-index export_job_status_idx \
  --json
```

`db:verify-schema-rollout` 是只读校验工具。省略 `--schema` 时，会自动校验 `tenant_template` 和 `public.tenant` 中全部 active tenant schema。

凡是新增或修补 schema artifact 的发布，都应将它与常规运行时健康检查一起执行。
如果发布会移除 tenant artifact，也应按需传入 `--require-absent-table`、`--require-absent-column`、`--require-absent-index`。启用 `--infer-artifacts-from-migrations` 时，当前已支持自动推导 migration SQL 中的 `DROP TABLE`、`DROP COLUMN`、`DROP INDEX` tenant artifact。

发布 artifact 模板：

```bash
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration <migration_folder_name> \
  --require-table <table_name> \
  --require-column <table_name.column_name> \
  --require-index <index_name> \
  [--require-absent-table <table_name>] \
  [--require-absent-column <table_name.column_name>] \
  [--require-absent-index <index_name>] \
  [--schema <tenant_schema>] \
  --json
```

- 对本次发布必须证明的每个 artifact，重复传入 `--require-table`、`--require-column`、`--require-index`、`--require-absent-table`、`--require-absent-column` 和 `--require-absent-index`。
- 若要覆盖 `tenant_template` 与全部 active tenant schema 的全量扫描，请省略 `--schema`；只有在需要单租户定点补充证明时才加入 `--schema`。
- 该命令应与 Playwright 或浏览器检查分开执行。它是数据库 rollout 状态的直接校验步骤，不是 UI smoke 的替代品。
- 若在排查 tenant migration replay drift 时需要更严格的 apply 行为，可使用 `pnpm --filter @tcrn/database db:apply-migrations -- --fail-on-drift-watch-skips`。这不会改变默认 replay 语义，但会把 drift-watch skip family 提升为失败退出码。

直接从 migration SQL 推导 artifact 的示例：

```bash
pnpm --filter @tcrn/database db:verify-schema-rollout -- \
  --migration 20260330000001_add_marshmallow_export_job \
  --infer-artifacts-from-migrations \
  --json
```

#### 方式二：Kubernetes（生产环境推荐）

当前状态：

- 本节旧的通用 Kubernetes 指引已不再是当前生产切换的事实来源
- 当前 active 的 production-first 路径已经收口为更保守的 first cut：
  - 单机 `K3s`
  - 同机外置 PostgreSQL
  - 单副本 `web/api/worker`
  - 本地开发仍保持 Docker Compose + 本地应用进程

这次 first-cut 生产重部署，不要再沿用这里旧的“in-cluster PostgreSQL / HPA / 多副本默认存在”的假设。

请改以这些文件为准：

- `infra/k8s/README.md`
- `.context/plans/2026-04-11-single-node-k3s-fresh-redeploy-cutover-checklist.md`

当前 first-cut 的 operator 入口：

```bash
# 1. 只读 cluster 预检
scripts/k8s-preflight-cluster.sh

# 2. 用保留的生产 env 文件创建 runtime secret
scripts/k8s-create-runtime-secret.sh /path/to/production.env

# 3. 若 GHCR 镜像仍是 private，创建 pull secret
GHCR_USERNAME=... GHCR_TOKEN=... scripts/k8s-create-registry-secret.sh

# 4. apply first-cut baseline
IMAGE_TAG=... \
APP_HOST=web.prod.tcrn-tms.com \
TLS_SECRET_NAME=... \
INGRESS_CLASS_NAME=traefik \
REGISTRY_SECRET_NAME=ghcr-pull-secret \
scripts/k8s-deploy-production.sh

# 5. 执行 first-install bootstrap
IMAGE_TAG=... REGISTRY_SECRET_NAME=ghcr-pull-secret scripts/k8s-run-db-bootstrap.sh

# 6. 对含 schema 变更的发布执行 optional rollout verify
IMAGE_TAG=... \
ROLLOUT_MIGRATIONS=20260330000001_add_marshmallow_export_job \
REGISTRY_SECRET_NAME=ghcr-pull-secret \
scripts/k8s-run-db-verify-schema-rollout.sh

# 7. 切换后 smoke checks
APP_HOST=web.prod.tcrn-tms.com scripts/k8s-smoke-production.sh
```

这条路径是刻意保守的。当前不宣称已经支持：

- 多节点 HA
- HPA
- 多副本 web
- first-cut 中把 PostgreSQL 放回 K3s 内部

### SSL/TLS 配置

```nginx
# Nginx 反向代理配置示例
server {
    listen 443 ssl http2;
    server_name app.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 环境检查清单

- [ ] PostgreSQL 启用 TLS
- [ ] Redis 启用认证
- [ ] MinIO 启用 HTTPS
- [ ] 生成 JWT 密钥（至少 32 字符）
- [ ] 配置指纹密钥
- [ ] 已在目标层级启用外部 `TCRN_PII_PLATFORM` adapter
- [ ] 已验证外部门户与 SSO 可达
- [ ] 配置邮件服务凭证
- [ ] 实施备份策略
- [ ] 配置监控和告警

---

## 🌍 自定义域名配置

TCRN TMS 支持两种公开页自定义域名模式。

<a id="self-hosted-proxy-setup"></a>

### 自托管代理配置

当客户希望自行管理 SSL 证书与反向代理时，使用该模式。

前置要求：

- 一台可公网访问的服务器，安装 Nginx 或 Caddy
- 有效的 SSL 证书和私钥
- 可修改自定义域名的 DNS
- 明确目标公开页面路径，例如 `/p/joi_channel`

Nginx 示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    location / {
        proxy_pass https://YOUR_TCRN_DOMAIN/p/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    location /ask {
        proxy_pass https://YOUR_TCRN_DOMAIN/m/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }
}
```

Caddy 示例：

```caddyfile
your-domain.com {
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key

    handle {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /p/YOUR_TALENT_PATH{uri}
        }
    }

    handle /ask* {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /m/YOUR_TALENT_PATH{uri}
        }
    }
}
```

请替换：

- `your-domain.com` 为客户自有域名
- `YOUR_TCRN_DOMAIN` 为平台公开域名
- `YOUR_TALENT_PATH` 为艺人 slug

<a id="cloudflare-for-saas-setup"></a>

### Cloudflare for SaaS 配置

当平台通过 Cloudflare 边缘托管证书时，使用该模式。

平台侧步骤：

1. 在 Cloudflare 中启用 `SSL/TLS -> Custom Hostnames`。
2. 配置指向 TCRN TMS 公开入口的 fallback origin。
3. 域名验证完成后，调用 API 创建 custom hostname。

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "hostname": "talent.customer.com",
    "ssl": {
      "method": "txt",
      "type": "dv"
    }
  }'
```

客户侧步骤：

1. 添加平台提供的 CNAME 记录。
2. 添加 TCRN TMS 页面中提示的 TXT 验证记录。
3. 等待 DNS 生效与证书签发。
4. 验证 `https://your-domain.com` 是否能打开预期公开页面。

---

## 🔒 外部 PII Platform 集成

TCRN TMS 已不再提供 repo-owned 独立 PII runtime。敏感字段由外部部署、独立运维的 `TCRN_PII_PLATFORM` 处理，再与 TMS 集成。

### Canonical Rules

- 只有 code=`TCRN_PII_PLATFORM` 的 effective `integration_adapter` 才是 PII 能力启用真源。
- `profileStoreId` 继续保留在 TMS 中，作为 talent 之间客户档案隔离/共享边界。
- TMS 只持有 non-PII 客户主档与跨系统 `customerId`。
- 外部平台负责敏感字段存储、门户查看和 PII 报表生成。

### 运行时流程

1. 在本仓库之外部署并运维外部 PII Platform。
2. 在平台侧与 TMS 中配置 SSO、权限和 adapter 凭证。
3. 在需要暴露 PII 入口的 tenant / subsidiary / talent 层级启用 `TCRN_PII_PLATFORM` adapter。
4. TMS 中的客户创建/编辑仅在 adapter 生效时显示 PII 区块，并以 `customerId` 为键执行覆盖式写透。
5. 客户查看通过 `Retrieve PII Data` 门户跳转完成；TMS 不再回读 PII。
6. PII 报表通过 `customerId[] + 请求元数据` 交给平台侧生成；报表二进制不回流 TMS。

### 运维检查清单

- [ ] 外部 PII Platform 已部署，且终端用户可达
- [ ] 平台门户 SSO 登录与权限校验正常
- [ ] 目标层级已启用 `TCRN_PII_PLATFORM` adapter
- [ ] 客户创建/编辑写透成功，并符合覆盖式更新语义
- [ ] `Retrieve PII Data` 能正确跳转到外部门户
- [ ] PII 报表可通过平台侧 handoff 正常生成

### 本地开发说明

本仓库已不再包含：

- `apps/pii-service`
- `docker-compose.pii.prod.yml`
- `pii-migrate`
- repo-owned PII Dockerfile 与本地 PII bootstrap 脚本

本地开发只需要启动 TMS 主运行时。若要演练 PII 功能，请连接真实外部平台环境，并在正确层级启用 adapter。

---

## 📚 API 参考

### 基础 URL

```
{baseUrl}/api/v1
```

### 认证

所有需要认证的端点需要 JWT 令牌：

```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantCode": "AC", "username": "admin", "password": "..."}'

# 响应包含 accessToken 并设置 refreshToken Cookie
```

### 主要端点

| 类别       | 端点                                      | 描述                 |
| ---------- | ----------------------------------------- | -------------------- |
| **认证**   | `POST /auth/login`                        | 使用凭证登录         |
|            | `POST /auth/refresh`                      | 刷新访问令牌         |
|            | `POST /auth/logout`                       | 登出并使令牌失效     |
| **客户**   | `GET /customers`                          | 获取客户列表（分页） |
|            | `POST /customers`                         | 创建客户档案         |
|            | `POST /customers/{id}/pii-portal-session` | 创建 PII 门户会话    |
| **组织**   | `GET /organization/tree`                  | 获取组织结构         |
|            | `POST /subsidiaries`                      | 创建分级目录         |
|            | `POST /talents`                           | 创建艺人             |
| **棉花糖** | `GET /public/marshmallow/{path}/messages` | 获取公开消息         |
|            | `POST /public/marshmallow/{path}/submit`  | 提交匿名问题         |
|            | `POST /marshmallow/messages/{id}/approve` | 审核通过消息         |
| **报表**   | `POST /reports/mfr/jobs`                  | 启动 MFR 生成        |
|            | `GET /reports/mfr/jobs/{id}`              | 获取任务状态         |
|            | `GET /reports/mfr/jobs/{id}/download`     | 获取下载 URL         |
| **日志**   | `GET /logs/changes`                       | 查询变更日志         |
|            | `GET /logs/events`                        | 查询系统事件         |
|            | `GET /logs/search`                        | Loki 全文搜索        |
| **合规**   | `GET /compliance/data-map`                | 数据映射报告         |
|            | `GET /compliance/privacy-impact`          | 隐私影响评估         |

### 响应格式

**成功：**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

**错误：**

```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "用户名或密码错误",
  "statusCode": 401
}
```

---

## 🔐 安全机制

### 密码策略

- 至少 12 个字符
- 至少 1 个大写字母
- 至少 1 个小写字母
- 至少 1 个数字
- 至少 1 个特殊字符
- 90 天过期提醒

### 双因素认证

基于 TOTP 的 2FA，带恢复码：

- 设置时生成 10 个一次性恢复码
- 恢复码以 SHA256 哈希存储
- 租户管理员可强制所有用户启用 2FA

### 数据保护

| 数据类型   | 保护方式                      |
| ---------- | ----------------------------- |
| 密码       | bcrypt 哈希（cost factor 12） |
| PII        | AES-256-GCM 加密              |
| 会话       | 短有效期 JWT                  |
| API 通信   | 要求 TLS 1.2+                 |
| 服务间通信 | mTLS 认证                     |

### 安全响应头

所有响应包含：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

---

## 📄 许可证

本项目采用 **PolyForm Noncommercial License 1.0.0** 许可证。

商业使用需要单独的许可协议。如需企业授权/SaaS 服务购买，请联系 ryan.lan_home@outlook.com。

---

## 📞 支持

- **文档**：公开访客文档见本 README 与 [SECURITY.md](./SECURITY.md)
- **问题反馈**：[GitHub Issues](https://github.com/tpmoonchefryan/tcrn-tms/issues)
- **讨论区**：[GitHub Discussions](https://github.com/tpmoonchefryan/tcrn-tms/discussions)
