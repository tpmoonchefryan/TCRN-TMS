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
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.8-blue">
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen">
</p>

---

## � 待办事项

- **适配器和 Webhook 开发**
  - 对接 Bilibili 直播开放平台，支持更多集成功能（自动更新观众信息、记录会籍有效期、消费记录等）
  - 对接中国内地物流公司开放平台，未来支持更多会员回馈相关功能

---

## �📖 目录

- [待办事项](#-待办事项)
- [项目简介](#-项目简介)
- [功能亮点](#-功能亮点)
- [核心模块](#-核心模块)
- [系统架构](#-系统架构)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [生产环境部署](#-生产环境部署)
- [PII 代理服务部署](#-pii-代理服务部署)
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

- **隐私优先架构**：PII（个人身份信息）存储在独立的加密微服务中
- **多租户隔离**：每个租户拥有独立的 PostgreSQL Schema，实现完全数据隔离
- **三语言支持**：完整的中文、英文、日文界面本地化
- **VTuber 专属功能**：棉花糖（匿名问答）、可定制艺人主页、会员追踪

---

## ✨ 功能亮点

### 🔐 隐私优先 PII 架构

所有敏感客户数据（真实姓名、电话号码、地址、邮箱）存储在独立的 PII 代理服务中：

- **令牌化访问**：本地数据库仅存储 `rm_profile_id` 令牌
- **AES-256-GCM 加密**：静态数据使用租户独立 DEK 加密
- **mTLS 认证**：服务间通信采用双向 TLS 认证
- **短期 JWT**：PII 检索使用 5 分钟有效期的访问令牌

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

| 状态 | 描述 | 优先级 |
|------|------|--------|
| **Deny（拒绝）** | 明确禁止 | 最高 |
| **Grant（授予）** | 明确允许 | 中等 |
| **Unset（未设定）** | 未配置 | 最低 |

**功能型角色**：`ADMIN`、`TALENT_MANAGER`、`VIEWER`、`TALENT_SELF`、`MODERATOR`、`SUPPORT`、`ANALYST`

### 🍡 棉花糖匿名问答系统

灵感来自日本"棉花糖"服务的完整匿名提问箱系统：

- **智能验证码**：三种模式（始终/从不/自动），带信任评分
- **内容审核**：多语言脏话过滤器，带风险评分
- **外部屏蔽词**：屏蔽 URL、域名和关键词模式
- **表情反应**：粉丝可对已审核消息进行表情反应
- **导出功能**：支持导出消息为 CSV/JSON/XLSX

### 📊 MFR 报表生成

生成全面的**会员反馈报表**：

- 包含 PII 的会员档案（通过安全检索）
- 平台身份（YouTube、Bilibili 等）
- 会员状态和到期追踪
- 异步生成，带进度追踪
- 通过 MinIO 预签名 URL 直接下载

### 🔍 全面审计日志

三种类型的日志，自动 PII 脱敏：

| 日志类型 | 用途 | 保留期 |
|----------|------|--------|
| **变更日志** | UI 触发的业务变更 | 60 天（生产） |
| **技术事件日志** | 系统事件和错误 | 60 天（生产） |
| **集成日志** | 外部 API 调用和 Webhook | 60 天（生产） |

Loki 集成支持跨所有日志的全文搜索。

---

## 📦 核心模块

### 客户管理

| 功能 | 描述 |
|------|------|
| **个人档案** | 真实姓名、昵称、联系方式、出生日期 |
| **企业档案** | 公司名称、注册号、税号 |
| **平台身份** | YouTube、Bilibili、Twitch、Twitter UID，带历史追踪 |
| **会员记录** | 类别、类型、等级，支持自动续费 |
| **外部 ID** | 将客户映射到外部系统（CRM、工单系统） |
| **批量导入** | CSV 导入，带验证和错误报告 |
| **批量操作** | 批量更新标签/状态/会员 |

### 主页管理

为艺人提供拖拽式主页编辑器：

- **组件库**：Hero、关于、社交链接、图库、时间线、棉花糖组件
- **主题系统**：5 种预设（默认、深色、可爱、专业、极简）+ 自定义颜色
- **版本历史**：回滚到任意已发布版本
- **自定义域名**：支持艺人自有域名，带 DNS 验证
- **SEO 优化**：自动生成 meta 标签和 Open Graph 支持

### 安全管理

| 功能 | 描述 |
|------|------|
| **屏蔽词** | 关键词和正则表达式模式，用于内容过滤 |
| **IP 规则** | 白名单/黑名单，支持 CIDR |
| **请求限流** | 基于 Redis 的端点级限流 |
| **UA 检测** | 屏蔽已知机器人/爬虫 User-Agent |
| **技术指纹** | 隐性水印，用于数据泄露追踪 |

### 邮件服务

集成腾讯云 SES：

- **模板系统**：多语言模板（中/英/日），带变量替换
- **队列处理**：BullMQ Worker，带重试和限流
- **预置模板**：密码重置、登录验证、会员提醒

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
              │         隔离的 PII 环境                    │                  │
              │  ┌─────────────────┐  ┌─────────────────┐  │                  │
              │  │  PII 代理       │  │  PII 数据库     │  │                  │
              │  │  服务 :5100     │──│  PostgreSQL     │  │                  │
              │  │  (AES-256-GCM)  │  │  (加密存储)     │  │                  │
              │  └─────────────────┘  └─────────────────┘  │                  │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
                                    └─────────────────────────────────────────┘
```

### 数据流

1. **Web UI** → **API 网关**（NestJS）处理所有业务操作
2. **API** 验证 JWT 并检查 Redis 权限快照
3. 非 PII 数据存储在租户特定的 PostgreSQL Schema 中
4. PII 检索：API 签发短期 JWT → PII 代理 → 加密存储
5. 后台任务由 BullMQ Worker 处理
6. 文件存储在 MinIO，通过预签名 URL 下载

---

## 🛠️ 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端** | Next.js | 16.1.1 |
| | React | 19.1.1 |
| | TypeScript | 5.8.3 |
| | Tailwind CSS | 3.4.17 |
| | Zustand | 5.0.5 |
| **后端** | NestJS | 11.1.6 |
| | Prisma ORM | 6.14.0 |
| | BullMQ | 5.66.5 |
| **数据库** | PostgreSQL | 16 |
| | Redis | 7 |
| **存储** | MinIO | Latest |
| **消息** | NATS JetStream | 2 |
| **可观测性** | OpenTelemetry | - |
| | Prometheus | - |
| | Grafana Loki | 2.9.0 |
| | Grafana Tempo | - |
| **部署** | Docker | - |
| | Kubernetes | - |

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
docker-compose up -d postgres redis minio nats loki tempo pii-postgres pii-service

# 4. 配置环境变量
cp .env.sample .env.local
# 编辑 .env.local 填入你的配置

# 5. 初始化数据库
cd packages/database
pnpm db:apply-migrations
pnpm db:sync-schemas
pnpm db:seed
cd ../..

# 6. 启动开发服务器
pnpm dev
```

### 访问地址

| 服务 | URL |
|------|-----|
| Web 界面 | http://localhost:3000 |
| API 接口 | http://localhost:4000 |
| API 文档 | http://localhost:4000/api/docs |
| MinIO 控制台 | http://localhost:9001 |
| NATS 监控 | http://localhost:8222 |

### 默认凭证

**AC（平台管理员）租户：**
| 字段 | 值 |
|------|-----|
| 租户代码 | AC |
| 用户名 | ac_admin |
| 密码 | (在种子文件中设置，见 `00-ac-tenant.ts`) |

---

## 🌐 生产环境部署

本节介绍如何将 TCRN TMS 主应用部署到云服务器。

### 基础设施要求

| 组件 | 最低配置 | 推荐配置 |
|------|----------|----------|
| **应用服务器** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| **PostgreSQL** | 2 vCPU, 4GB RAM, 50GB SSD | 4 vCPU, 8GB RAM, 100GB SSD |
| **Redis** | 1 vCPU, 1GB RAM | 2 vCPU, 2GB RAM |
| **MinIO** | 2 vCPU, 2GB RAM, 100GB SSD | 4 vCPU, 4GB RAM, 500GB SSD |

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

# PII 服务（生产环境建议独立服务器）
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true

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
```

#### 方式二：Kubernetes（生产环境推荐）

适用于：高可用、自动扩展、企业级部署

```bash
# 1. 创建命名空间和密钥
kubectl create namespace tcrn-tms
kubectl apply -f infra/k8s/secrets/

# 2. 部署基础设施
kubectl apply -f infra/k8s/postgres/
kubectl apply -f infra/k8s/redis/
kubectl apply -f infra/k8s/minio/
kubectl apply -f infra/k8s/nats/

# 3. 等待基础设施就绪
kubectl wait --for=condition=ready pod -l app=postgres -n tcrn-tms --timeout=300s

# 4. 部署应用
kubectl apply -f infra/k8s/deployments/

# 5. 配置 Ingress
kubectl apply -f infra/k8s/ingress/

# 6. 运行数据库迁移（一次性任务）
kubectl apply -f infra/k8s/jobs/db-migrate.yaml
```

**Kubernetes 特性：**

- **滚动更新**：`maxUnavailable: 0` 实现零停机部署
- **水平 Pod 自动扩展（HPA）**：基于 CPU/内存自动扩展
- **Pod 中断预算（PDB）**：更新期间保持最小副本数
- **健康检查**：所有服务配置就绪和存活探针

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
- [ ] 配置 PII 服务 URL（参见下一节）
- [ ] 配置邮件服务凭证
- [ ] 实施备份策略
- [ ] 配置监控和告警

---

## 🔒 PII 代理服务部署

出于安全合规要求，PII 代理服务必须部署在与主应用**独立的服务器**上。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                      主应用服务器                                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │   Web UI    │   │   API       │   │   Worker    │               │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘               │
│                           │                  │                      │
│                           │   JWT + mTLS     │                      │
└───────────────────────────┼──────────────────┼──────────────────────┘
                            │                  │
                            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PII 代理服务器（隔离环境）                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PII 代理服务                              │   │
│  │   - JWT 验证                                                 │   │
│  │   - AES-256-GCM 加密/解密                                   │   │
│  │   - 租户独立 DEK 管理                                       │   │
│  │   - 审计日志                                                 │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                    PII 数据库                                │   │
│  │   - 静态加密                                                 │   │
│  │   - 网络隔离                                                 │   │
│  │   - 禁止直接外部访问                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 服务器要求

| 组件 | 规格 |
|------|------|
| **操作系统** | Ubuntu 22.04 LTS 或更高版本 |
| **CPU** | 2+ vCPU |
| **内存** | 4GB+ |
| **存储** | 50GB+ SSD（加密） |
| **网络** | 与主服务器的私有网络或 VPN |

### 步骤 1：准备 PII 服务器

```bash
# SSH 连接到 PII 服务器
ssh pii-server

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 安装必要工具
sudo apt install -y openssl ufw
```

### 步骤 2：配置防火墙

```bash
# 允许 SSH
sudo ufw allow ssh

# 仅允许主应用服务器访问 PII 服务端口
sudo ufw allow from 主服务器IP to any port 5100

# 启用防火墙
sudo ufw enable
```

### 步骤 3：生成 mTLS 证书

```bash
# 创建证书目录
mkdir -p ~/pii-certs && cd ~/pii-certs

# 生成 CA 证书
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
    -subj "/C=CN/ST=State/L=City/O=YourOrg/CN=TCRN-TMS-CA"

# 为 PII 服务生成服务器证书
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
    -subj "/C=CN/ST=State/L=City/O=YourOrg/CN=pii.your-domain.com"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt

# 为主应用生成客户端证书
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
    -subj "/C=CN/ST=State/L=City/O=YourOrg/CN=main-app"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out client.crt

# 将客户端证书复制到主应用服务器
scp ca.crt client.crt client.key main-server:/path/to/certs/
```

### 步骤 4：部署 PII 服务

```bash
# 创建部署目录
mkdir -p ~/pii-service && cd ~/pii-service

# 创建环境变量文件
cat > .env << 'EOF'
# PII 数据库
PII_POSTGRES_USER=pii_admin
PII_POSTGRES_PASSWORD=在此生成强密码
PII_POSTGRES_DB=pii_vault
PII_DATABASE_URL=postgresql://pii_admin:${PII_POSTGRES_PASSWORD}@pii-postgres:5432/pii_vault

# 加密
PII_MASTER_KEY=在此生成64字符十六进制密钥
PII_KEY_VERSION=v1

# JWT 验证（必须与主应用一致）
JWT_SECRET=与主应用相同的JWT密钥

# mTLS
MTLS_ENABLED=true
MTLS_CA_CERT=/certs/ca.crt
MTLS_SERVER_CERT=/certs/server.crt
MTLS_SERVER_KEY=/certs/server.key

# 服务器
PORT=5100
NODE_ENV=production
EOF

# 创建 docker-compose 文件
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  pii-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${PII_POSTGRES_USER}
      POSTGRES_PASSWORD: ${PII_POSTGRES_PASSWORD}
      POSTGRES_DB: ${PII_POSTGRES_DB}
    volumes:
      - pii_data:/var/lib/postgresql/data
    networks:
      - pii-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PII_POSTGRES_USER} -d ${PII_POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pii-service:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5100:5100"
    environment:
      - DATABASE_URL=${PII_DATABASE_URL}
      - PII_MASTER_KEY=${PII_MASTER_KEY}
      - PII_KEY_VERSION=${PII_KEY_VERSION}
      - JWT_SECRET=${JWT_SECRET}
      - MTLS_ENABLED=${MTLS_ENABLED}
      - MTLS_CA_CERT=${MTLS_CA_CERT}
      - MTLS_SERVER_CERT=${MTLS_SERVER_CERT}
      - MTLS_SERVER_KEY=${MTLS_SERVER_KEY}
      - PORT=${PORT}
      - NODE_ENV=${NODE_ENV}
    volumes:
      - ~/pii-certs:/certs:ro
    depends_on:
      pii-postgres:
        condition: service_healthy
    networks:
      - pii-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5100/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  pii-network:
    driver: bridge

volumes:
  pii_data:
EOF

# 复制 PII 服务源码或从镜像仓库拉取
# 方式 A：从源码构建
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cp -r tcrn-tms/apps/pii-service/* .

# 方式 B：拉取预构建镜像
# 修改 docker-compose.yml 使用 image: your-registry/pii-service:latest

# 部署
docker-compose up -d

# 初始化 PII 数据库
docker-compose exec pii-service pnpm db:push
```

### 步骤 5：配置主应用

在主应用服务器上更新环境变量：

```bash
# 添加到 .env 或 .env.local
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true
PII_SERVICE_CA_CERT=/path/to/certs/ca.crt
PII_SERVICE_CLIENT_CERT=/path/to/certs/client.crt
PII_SERVICE_CLIENT_KEY=/path/to/certs/client.key
```

### 步骤 6：验证部署

```bash
# 在 PII 服务器上 - 检查服务健康状态
curl -k https://localhost:5100/health

# 在主服务器上 - 测试 PII 连接（使用 mTLS）
curl --cacert /path/to/ca.crt \
     --cert /path/to/client.crt \
     --key /path/to/client.key \
     https://pii.your-domain.com:5100/health
```

### 安全检查清单

- [ ] PII 服务器位于独立的物理/虚拟机器上
- [ ] 防火墙仅允许特定 IP 地址
- [ ] 已生成并配置 mTLS 证书
- [ ] 主加密密钥安全存储（考虑使用 HashiCorp Vault）
- [ ] 数据库静态加密（磁盘加密）
- [ ] PII 数据库无直接互联网访问
- [ ] 启用所有 PII 访问的审计日志
- [ ] 定期备份加密数据
- [ ] 制定证书轮换计划（建议每年）

### DEK（数据加密密钥）轮换

```bash
# 为租户生成新的 DEK
curl -X POST https://pii.your-domain.com:5100/admin/rotate-dek \
  --cacert /path/to/ca.crt \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-uuid"}'
```

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

| 类别 | 端点 | 描述 |
|------|------|------|
| **认证** | `POST /auth/login` | 使用凭证登录 |
| | `POST /auth/refresh` | 刷新访问令牌 |
| | `POST /auth/logout` | 登出并使令牌失效 |
| **客户** | `GET /customers` | 获取客户列表（分页） |
| | `POST /customers` | 创建客户档案 |
| | `POST /customers/{id}/request-pii-access` | 获取 PII 访问令牌 |
| **组织** | `GET /organization/tree` | 获取组织结构 |
| | `POST /subsidiaries` | 创建分级目录 |
| | `POST /talents` | 创建艺人 |
| **棉花糖** | `GET /public/marshmallow/{path}/messages` | 获取公开消息 |
| | `POST /public/marshmallow/{path}/submit` | 提交匿名问题 |
| | `POST /marshmallow/messages/{id}/approve` | 审核通过消息 |
| **报表** | `POST /reports/mfr/jobs` | 启动 MFR 生成 |
| | `GET /reports/mfr/jobs/{id}` | 获取任务状态 |
| | `GET /reports/mfr/jobs/{id}/download` | 获取下载 URL |
| **日志** | `GET /logs/changes` | 查询变更日志 |
| | `GET /logs/events` | 查询系统事件 |
| | `GET /logs/search` | Loki 全文搜索 |

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

| 数据类型 | 保护方式 |
|----------|----------|
| 密码 | bcrypt 哈希（cost factor 12） |
| PII | AES-256-GCM 加密 |
| 会话 | 短有效期 JWT |
| API 通信 | 要求 TLS 1.2+ |
| 服务间通信 | mTLS 认证 |

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

- **文档**：[docs/](./docs/)
- **问题反馈**：[GitHub Issues](https://github.com/tpmoonchefryan/tcrn-tms/issues)
- **讨论区**：[GitHub Discussions](https://github.com/tpmoonchefryan/tcrn-tms/discussions)
