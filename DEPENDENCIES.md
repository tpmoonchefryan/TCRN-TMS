# TCRN TMS - 依赖管理文档

> 最后更新: 2026-01-18  
> pnpm 镜像源: https://mirrors.cloud.tencent.com/npm/

## 版本固化策略

**重要**: 本项目所有依赖版本已固化（移除 `^` 和 `~` 前缀），以确保：
- 构建的可重复性和一致性
- 减少因依赖自动升级导致的意外问题
- 更好的版本控制和审计能力

## 核心依赖版本

### 根目录 (Monorepo 工具)

| 包名 | 版本 | 用途 |
|------|------|------|
| turbo | 2.7.5 | Monorepo 构建系统 |
| pnpm | 9.15.4 | 包管理器 |
| typescript | 5.9.3 | TypeScript 编译器 |
| vitest | 4.0.17 | 单元测试框架 |

### 代码质量工具

| 包名 | 版本 | 用途 |
|------|------|------|
| @commitlint/cli | 20.3.1 | Commit 消息规范检查 |
| @commitlint/config-conventional | 20.3.1 | Conventional Commits 配置 |
| prettier | 3.8.0 | 代码格式化 |
| lint-staged | 16.2.7 | Git Staged 文件检查 |
| husky | 9.1.7 | Git Hooks 管理 |

### 后端 (NestJS - apps/api)

#### 核心框架

| 包名 | 版本 | 用途 |
|------|------|------|
| @nestjs/common | 10.4.22 | NestJS 核心模块 |
| @nestjs/core | 10.4.22 | NestJS 核心运行时 |
| @nestjs/platform-express | 10.4.22 | Express 适配器 |
| @nestjs/config | 3.3.0 | 配置管理 |
| @nestjs/jwt | 10.2.0 | JWT 认证 |
| @nestjs/swagger | 8.1.1 | API 文档生成 |

#### 数据库与缓存

| 包名 | 版本 | 用途 |
|------|------|------|
| @prisma/client | 6.19.2 | Prisma ORM 客户端 |
| prisma | 6.19.2 | Prisma CLI |
| ioredis | 5.4.2 | Redis 客户端 |

#### 队列与任务

| 包名 | 版本 | 用途 |
|------|------|------|
| @nestjs/bullmq | 11.0.4 | BullMQ 集成 |
| bullmq | 5.34.8 | 任务队列 |
| @nestjs/schedule | 4.1.1 | 定时任务 |

#### 安全与认证

| 包名 | 版本 | 用途 |
|------|------|------|
| argon2 | 0.41.1 | 密码哈希（Argon2id） |
| otplib | 12.0.1 | TOTP 两步验证 |
| joi | 17.13.3 | 数据验证 |

#### 工具库

| 包名 | 版本 | 用途 |
|------|------|------|
| axios | 1.13.2 | HTTP 客户端 |
| date-fns | 4.1.0 | 日期处理 |
| exceljs | 4.4.0 | Excel 文件生成 |
| minio | 8.0.4 | 对象存储客户端 |
| uuid | 13.0.0 | UUID 生成 |
| zod | 3.24.1 | Schema 验证 |
| multer | 2.0.2 | 文件上传 |

### 前端 (Next.js - apps/web)

#### 核心框架

| 包名 | 版本 | 用途 |
|------|------|------|
| next | 14.2.35 | Next.js 框架 |
| react | 18.3.1 | React 库 |
| react-dom | 18.3.1 | React DOM 渲染 |

#### UI 组件库

| 包名 | 版本 | 用途 |
|------|------|------|
| @radix-ui/* | 最新 | Headless UI 组件 |
| lucide-react | 最新 | 图标库 |

#### 状态管理与表单

| 包名 | 版本 | 用途 |
|------|------|------|
| zustand | 5.0.3 | 状态管理 |
| react-hook-form | 7.54.3 | 表单管理 |
| @hookform/resolvers | 3.10.0 | 表单验证器 |

#### 样式

| 包名 | 版本 | 用途 |
|------|------|------|
| tailwindcss | 3.4.18 | CSS 框架 |
| tailwind-merge | 2.6.0 | Tailwind 类名合并 |
| tailwindcss-animate | 1.0.7 | 动画工具 |

#### 国际化

| 包名 | 版本 | 用途 |
|------|------|------|
| next-intl | 3.29.4 | Next.js 国际化 |

### 共享包 (packages/shared)

| 包名 | 版本 | 用途 |
|------|------|------|
| tsup | 8.4.0 | TypeScript 打包工具 |
| vitest | 2.1.9 | 测试框架 |
| vitest-mock-extended | 3.1.0 | 测试模拟工具 |

### 数据库包 (packages/database)

| 包名 | 版本 | 用途 |
|------|------|------|
| @prisma/client | 6.19.2 | Prisma 客户端 |
| prisma | 6.19.2 | Prisma CLI |

## Node.js 版本要求

- **最低版本**: Node.js 20.0.0+
- **推荐版本**: Node.js 20 LTS
- **pnpm 版本**: 9.0.0+

## 镜像源配置

### pnpm 配置

```bash
# 使用腾讯云镜像源
pnpm config set registry https://mirrors.cloud.tencent.com/npm/

# 验证配置
pnpm config get registry
```

### .npmrc 配置

项目根目录的 `.npmrc` 文件：

```ini
registry=https://mirrors.cloud.tencent.com/npm/
shamefully-hoist=true
strict-peer-dependencies=false
```

## 依赖升级流程

### 1. 检查过期依赖

```bash
# 检查所有工作区的过期依赖
pnpm outdated -r

# 检查特定工作区
pnpm --filter @tcrn/api outdated
```

### 2. 升级依赖

```bash
# 升级所有依赖到最新版本
pnpm update -r --latest

# 升级特定包
pnpm update package-name@latest -r
```

### 3. 固化版本

```bash
# 运行版本固化脚本
./scripts/pin-versions.sh
```

### 4. 测试验证

```bash
# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck

# 构建验证
pnpm build
```

### 5. 更新文档

- 更新本文档中的版本号
- 更新 CHANGELOG.md
- 提交 Git commit

## 依赖管理最佳实践

### ✅ 推荐做法

1. **定期更新**: 每月检查并更新依赖
2. **测试优先**: 更新后必须运行完整测试套件
3. **版本固化**: 使用精确版本号（无 `^` 或 `~`）
4. **小步快跑**: 分批更新，避免一次升级太多包
5. **文档同步**: 每次更新都要更新本文档

### ❌ 避免事项

1. 不要使用 `npm` 或 `yarn` 安装包（仅使用 pnpm）
2. 不要直接编辑 `pnpm-lock.yaml`
3. 不要跳过测试直接部署
4. 不要混用不同的包管理器
5. 不要在生产环境使用 `--force` 安装

## 已知问题与兼容性

### NestJS v10 vs v11

当前使用 NestJS v10.x，未来升级到 v11 需要注意：
- Breaking changes in decorators
- 可能需要更新中间件
- 参考官方迁移指南

### Vitest v4

已升级到 Vitest v4，相比 v2 主要变化：
- 更快的测试运行速度
- 改进的 TypeScript 支持
- 新的配置选项

### ESLint v9

当前使用 ESLint v8，v9 有重大变更：
- 新的配置格式（Flat Config）
- 某些插件可能不兼容
- 需要手动迁移配置文件

## 安全审计

### 运行安全审计

```bash
# pnpm 安全审计
pnpm audit

# 修复自动可修复的问题
pnpm audit --fix
```

### 检查许可证

```bash
# 生成依赖许可证报告
npx license-checker --summary
```

## 性能优化

### pnpm 性能配置

```bash
# 使用本地缓存
pnpm config set store-dir ~/.pnpm-store

# 启用并行下载
pnpm config set network-concurrency 10

# 使用 shamefully-hoist（提高兼容性）
pnpm config set shamefully-hoist true
```

### 构建性能

- 使用 Turbo 缓存加速构建
- 启用增量编译（TypeScript）
- 合理配置 `.gitignore` 和 `.prettierignore`

## 故障排查

### 依赖安装失败

```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install --no-frozen-lockfile
```

### 版本冲突

```bash
# 检查依赖树
pnpm list package-name

# 查看为什么安装了某个包
pnpm why package-name
```

### 类型错误

```bash
# 重新生成 Prisma 类型
pnpm --filter @tcrn/database db:generate

# 重新构建共享包
pnpm --filter @tcrn/shared build
```

## 相关资源

- [pnpm 官方文档](https://pnpm.io/)
- [Turbo 文档](https://turbo.build/)
- [NestJS 文档](https://docs.nestjs.com/)
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)

## 变更历史

### 2026-01-18
- ✅ 升级所有依赖到最新版本
- ✅ 固化所有依赖版本（移除 `^` 和 `~`）
- ✅ 配置腾讯云 npm 镜像源
- ✅ @commitlint/* 20.3.1
- ✅ vitest 4.0.17
- ✅ lint-staged 16.2.7
- ✅ turbo 2.7.5

---

© 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
