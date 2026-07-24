# 权限矩阵事实基线

> 治理记录:`TCRN-TMS-STORY-010`~`013`(Epic `TCRN-TMS-EPIC-003`)· 分解裁定 minutes `TCRN-TMS-MIN-001`
>
> **本文件手写,非生成物。** 计数均由 [复现命令](#复现命令) 实测;不确定处显式写「未测」。

## 结论先行

1. **catalog 与 handler 装饰器零分歧,但这不是门抓出来的。** 302 条静态权限引用中,引用未定义资源 **0** 条、引用不支持动作 **0** 条。原因是 `RequirePermissions` 在**装饰器求值期**调用 `resolveRbacPermission`(`apps/api/src/common/decorators/require-permissions.decorator.ts:36-42`),未定义资源在模块加载时即抛错。这是加载期的结构性保证,不是一道会红的门。

2. **本 Story 命名的「三方对账」第三方不成立。** `packages/database/prisma/seeds/_rbac-contract.ts:3-18` 直接 import 并 re-export catalog 的三个常量 —— seed 是 catalog 的**转发层**,不是独立来源。catalog↔seed 的静态漂移**在结构上不可能发生**,任何以此命名的门必然永绿。

   > 这是「同源的两份不是两个来源」这条教训的第三个独立实例(前两个:RBAC 改名后计数 46→46 不变、分母哈希手算与生成器算出两个值)。

3. **替代第三方**:`apps/api/src/modules/api-registry/api-registry.authority.json`(396 条 operation,签入仓内,每条带 `requiredPermissions`)。与 `api-handlers.json` 交集 396 条**权限集合逐条完全一致(0 分歧)**,facts 多出 2 条,authority 无多余条目。

4. **62 条「无权限非 public」中只有 7 条是真正零授权**,其余 55 条各有可指认的替代控制。

5. **运行期 403 负证覆盖 11 / 302 ≈ 3.6%,且 10 / 11 不在 CI。**

## 权威层级声明

| 断言族 | 层级 | 本文件的置信上限 |
|---|---|---|
| catalog 资源与动作集合 | `source`(TS 常量) | `probable` |
| handler 静态权限引用 | `api-contract`(controller 装饰器) | `proven` |
| authority snapshot 权限 | `api-contract`(签入契约工件) | `proven` |
| 运行期确实返回 403 | `runtime` | 仅 §403 表内 11 个端点,其余**未测** |

**静态存在装饰器不构成运行期强制的证明。** 本文件不为任何未列入 §403 表的端点声称运行期强制。

---

## 真缺陷:7 条零授权的分级目录端点

`apps/api/src/modules/subsidiary/subsidiary.controller.ts` 全文**无 `@RequirePermissions`、无 `@UseGuards`、无 AC 门**;`subsidiary.module.ts` 无模块级 guard;`subsidiary.service.ts` 无权限或作用域校验(三处实测均为 0 命中)。

`PermissionGuard` 在无权限声明时直接放行(`apps/api/src/common/guards/permission.guard.ts:49-51`),故这些端点**只要求有效 JWT,不经任何 RBAC**。

**后果:任意持有效 JWT 的租户用户可创建、改名、移动、停用、恢复分级目录。**

| fact id | 方法 | 路径 | 位置 |
|---|---|---|---|
| `TMS-F-API-148` | `GET` | `/subsidiaries` | `subsidiary.controller.ts:528` |
| `TMS-F-API-321` | `POST` | `/subsidiaries` | `subsidiary.controller.ts:588` |
| `TMS-F-API-149` | `GET` | `/subsidiaries/{subsidiaryId}` | `subsidiary.controller.ts:643` |
| `TMS-F-API-220` | `PATCH` | `/subsidiaries/{subsidiaryId}` | `subsidiary.controller.ts:704` |
| `TMS-F-API-326` | `POST` | `/subsidiaries/{subsidiaryId}/move` | `subsidiary.controller.ts:757` |
| `TMS-F-API-322` | `POST` | `/subsidiaries/{subsidiaryId}/deactivate` | `subsidiary.controller.ts:802` |
| `TMS-F-API-327` | `POST` | `/subsidiaries/{subsidiaryId}/reactivate` | `subsidiary.controller.ts:857` |

catalog 早已为 `subsidiary` 备好 `read` / `write` / `delete` / `admin` 四个动作(`catalog.ts:311-326`),**四个全部未被任何 handler 引用**。定义与强制之间的落差在此处最大。

> **本 Initiative 只记录,不修复。** 加权限是产品行为变更,超出事实基线的范围,须另立工作项并由 Owner 裁定其优先级。

---

## STORY-010 对账

### 各源计数

| 源 | 单位 | 计数 |
|---|---|---|
| `packages/shared/src/rbac/catalog.ts` | 资源 | **46** |
| 同上 | module | **12** |
| 同上 | (资源,动作)对 `RBAC_POLICY_DEFINITIONS` | **140** |
| 同上 | 角色模板 `RBAC_ROLE_TEMPLATES` | **1**(仅 `INITIAL_ADMIN`) |
| `docs/facts/api-handlers.json` | 带权限的 handler | **302** |
| 同上 | 权限引用条数 | **302**(每条 handler 恰 1 条) |
| 同上 | 涉及资源(去重) | **40** |
| 同上 | 原始(资源:动作)对 | **95** |
| `_rbac-contract.ts` | 每 schema upsert 行 | **327** = 46 + 140 + 1 + 140 |
| `api-registry.authority.json` | operation | **396** |

### 分母互钉状态:仍未定钉

RBAC 资源 46 的第二提取器可用运行期求值 `packages/shared/dist/index.js` 的 `RBAC_RESOURCES`,与正则提取器逐条零分歧。

**但这不构成 `TCRN-TMS-GATE-001` 意义上的互钉** —— `dist` 是 `catalog.ts` 的编译产物,同源。它能抓构建漂移,抓不到 catalog 本身错了。真正独立的第二源是活库 `resource` 表,需 DB,**未测**。

故 `_meta/denominator-registry.md` 中 RBAC 一行保持「单源 · 未定钉」。

### 差异逐条

**catalog 有定义、无任何静态 handler 引用的资源:6 个**

| 资源码 | 位置 | 判定 |
|---|---|---|
| `config.dictionary` | `catalog.ts:483` | 经 `CONFIG_ENTITY_RESOURCE_MAP` 动态到达,非孤儿 |
| `config.customer_status` | `catalog.ts:499` | 同上 |
| `config.platform_registry` | `catalog.ts:531` | 同上 |
| `public_presence.audit` | `catalog.ts:676` | 全仓零引用,**孤儿** |
| `public_presence.ai_patch` | `catalog.ts:692` | 全仓零引用,**孤儿** |
| `subsidiary` | `catalog.ts:311` | 零引用 **且**对应 7 条 handler 零授权 —— 孤儿 + 真缺陷 |

**`admin` 动作在 API 面上基本是死的**:46 个资源里 38 个声明了 `admin`,全仓只有 4 条 handler 用到(`integration.adapter`、`integration.consumer`、`platform.runtime_flag`、`report.mfr`)。140 条 policy 对中 56 条无静态引用,其中 34 条是 `:admin`。

---

## STORY-011 62 条的判定

`JwtAuthGuard`、`TenantContextGuard`、`PermissionGuard` 均为全局 `APP_GUARD`(`app.module.ts:155-166`),故这 62 条**都要求有效 JWT**(仅 `@Public()` 绕过),但**都不经 RBAC**。

| 类 | 名称 | 条数 | 替代控制 | 判定 |
|---|---|---|---|---|
| A | 自助身份端点(`/users/me`、`/auth` 会话) | 20 | `@CurrentUser()` 自身作用域 | 正常 |
| B | 包装/动态权限装饰器(提取器盲点) | 11 | 装饰器确实存在,只是提取器看不见 | **事实基线缺陷** |
| C | AC 租户层级门(非 RBAC) | 10 | `ensureAcTenant` / `checkAcTenantAccess` | 待裁 |
| D | 系统字典读,无任何门 | 3 | 无 | 待裁 |
| E | 自省/自身有效权限端点 | 6 | 返回值以 `user.id` 为界 | 正常 |
| F | 组织树读(懒加载不做可见性过滤) | 4 | 仅全量读传 `userId` | 待裁 |
| G | **分级目录 CRUD,零授权** | **7** | **无** | **真缺陷** |
| H | 根信息端点 | 1 | JWT | 正常 |

### B 类:一处事实基线自身的缺陷

`apps/api/scripts/api-registry-script-utils.mjs:552-563` 只匹配字面量 `RequirePermissions(...)`,看不见:

- `@RequireConfigEntityPermission(...)` —— 8 处(`config.controller.ts`)
- `@RequirePlatformConfigPermission(...)` —— 3 处(`global-config.controller.ts`)

其兜底标志 `dynamicPermissionResolver` 检测的是 `RequireResolvedPermissions` 字面量,而 controller 写的是包装名 —— **实测 398 条中该标志为 `true` 的数量:0**。

**已处置**:`scripts/facts-generate-api.mjs` 现保留该字段并输出到 facts,使这个盲点在数据里可被识别而非静默变成「无权限」。字段本身当前恒为 `false`,提取器侧的修复不在本 Story 范围。

**修正后的真实数字:静态受控 313 条,真实「无权限非 public」51 条。**

### C / D / F 为何是「待裁」而非缺陷

- **C**:控制存在但粒度粗 —— AC 租户内**任何**已认证用户都过门,无角色区分。是否可接受属产品裁定。
- **D**:三条系统字典读对任意租户的任意已认证用户可读。「参考数据是否本就该全员可读」是产品裁定。
- **F**:`/organization/tree` 向服务层传 `userId` 做访问过滤(源码注释即 `Pass user ID for access filtering`),而 `/tree/root`、`/tree/children`、`/path/{subpath}` **均不传**。同一棵树的全量读与懒加载读采用不同可见性规则 —— 这是一次可判伪的不一致;懒加载能否实际绕过过滤属运行期问题,**未测**。

**执行者不私裁产品问题。** 三类均转 Owner。

---

## STORY-012 运行期 403 负证

现存负证覆盖 **11 个端点**,分布:

| 文件 | 端点数 | 进 CI |
|---|---|---|
| `apps/api/test/integration/rbac-contract.integration.spec.ts` | 5 | ✗ |
| `apps/api/test/integration/observability-adapters.integration.spec.ts` | 4 | ✗ |
| `apps/api/test/integration/platform-tools.integration.spec.ts` | 1 | ✗ |
| `apps/api/src/modules/builder-registry/builder-registry.http.spec.ts` | 1 | ✓(身份为桩) |

前 5 条还断言 `error.code === PERM_ACCESS_DENIED` 与具体 `resource:action`,不只是状态码。

### 边界声明

- **覆盖 11 / 302 ≈ 3.6%**,其余 291 条的运行期强制**未测**。
- **10 / 11 不在 CI**:`apps/api/vitest.config.ts:11-16` 把 `test/integration/**` 从单测排除,`.github/workflows/ci.yml` 只跑 `pnpm test:unit`。唯一进 CI 的那条,其 `PermissionSnapshotService` 是 `vi.fn` 桩。
- **本次未跑任何需 DB 的测试**(本机 `localhost:5432` / `6379` 不可达),故这 10 条的**当前红绿状态:未测**。
- **一条未测的隐患**:5 条最好的负证依赖角色码 `CONTENT_MANAGER` / `CUSTOMER_MANAGER` / `VIEWER`,而 `RBAC_ROLE_TEMPLATES` 只定义 `INITIAL_ADMIN`(实测 length === 1)。推论是在干净重播的库上它们会在 `beforeAll` 因 `Role not found` **直接爆而不是变红** —— 需 DB 才能证实。

### 403 不等于 RBAC 拒绝

已从统计中剔除的非 RBAC 403:公开路径未认证、限流 `RATE_LIMIT_EXCEEDED`、`TALENT_NOT_PUBLISHED`。**按状态码统计负证会高估覆盖率。**

---

## STORY-013 漂移门现状

| 门 | 能跑 | 实测 | 检查什么 |
|---|---|---|---|
| `require-permissions.contract.spec.ts` | ✓ 无 DB,进 CI | **绿** | catalog ↔ controller 装饰器 |
| `role-capability-packs.spec.ts` | ✓ 无 DB,进 CI | **绿** | catalog ↔ 能力包 |
| `packages/database/scripts/__tests__/seed-ac-rbac-contract.spec.ts` | ✗ **孤儿** | 从未运行 | seed 顺序 |
| `sync-rbac-contract.ts` | ✗ 需 DB | 未测 | catalog → 活库(**修复器,不是门**) |
| `audit-permission-snapshots.ts` | ✗ 需 DB+Redis | 未测 | 活库 → Redis 快照(唯一针对快照漂移的工具) |

### 三条结论

1. **仓内没有、也不可能有 catalog ↔ seed 漂移门**(seed 是 re-export)。
2. **20 个 `verify-*` 脚本无一与 RBAC 相关。**
3. **一道从不执行的门**:`packages/database` 没有 `test` 脚本,该目录下两个 RBAC spec 从未被任何 runner 拾取 —— 「门只保护它读过的字节」的反面是:**一道从不执行的门保护 0 字节。**

---

## 复现命令

```sh
pnpm --filter @tcrn/shared build   # dist 求值前置

grep -cE '^  resource\($' packages/shared/src/rbac/catalog.ts
# -> 46

node -e "const f=require('./docs/facts/api-handlers.json').facts;const p=f.flatMap(x=>x.requiredPermissions);console.log(f.filter(x=>x.requiredPermissions.length).length, new Set(p).size)"
# -> 302 95

node -e "const f=require('./docs/facts/api-handlers.json').facts;console.log(f.filter(x=>!x.requiredPermissions.length&&!x.isPublic&&!x.excluded).length)"
# -> 62

grep -rhoE '@Require(ConfigEntity|PlatformConfig)Permission' --include='*.controller.ts' apps/api/src | wc -l
# -> 11
```

## 未测清单(不得据此声称)

- 活库 `resource` / `policy` / `role_policy` 行与 catalog 的一致性(需 DB)。
- Redis 权限快照与活库的一致性(需 DB + Redis)。
- 291 条带权限 handler 中除 §403 表 11 条外的运行期强制。
- 组织树懒加载路径能否绕过全量路径的可见性过滤。
- `rbac-contract.integration.spec.ts` 在干净重播库上是否会在 `beforeAll` 爆掉。
