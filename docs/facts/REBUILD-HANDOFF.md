# 前端重建交接包

> 治理记录:`TCRN-TMS-STORY-027` / `TCRN-TMS-STORY-028`(Epic `TCRN-TMS-EPIC-007`)· Initiative `TCRN-TMS-INIT-001` · 分解裁定 minutes `TCRN-TMS-MIN-001`
>
> 这是 `TCRN-TMS-INIT-001`(事实基线重建)交给后续前端重建 Initiative 的唯一入口。

## 一、重建准入判据

判据不是「facts 无缺口」—— 那不可达。判据是**三门已关且缺口已登记**。

| 门                                     | 状态          | 关闭 minutes       | 绿覆盖到哪里                                         |
| -------------------------------------- | ------------- | ------------------ | ---------------------------------------------------- |
| `TCRN-TMS-GATE-001` 分母红证门         | **satisfied** | `TCRN-TMS-MIN-002` | 仅 API handler(398)。前端 66 与 RBAC 46 仍单源未定钉 |
| `TCRN-TMS-GATE-002` 派生再生成确定性门 | **satisfied** | `TCRN-TMS-MIN-003` | 仅 API handler 一条派生链                            |
| `TCRN-TMS-GATE-003` 断言忠实门         | **satisfied** | `TCRN-TMS-MIN-004` | 仅已逐条判定的范围;163 条中多数未判                  |

**三门皆绿,但每一道的绿都有明确边界。** 引用任何一道门的绿时必须一并转述其边界 —— 这是本 Initiative 反复付学费的地方。

**准入结论:前端重建可以开工。** 但开工前须开一道 `owner_intent_required` 准入门,引本文件与上述三份 minutes 作证据 —— 该门属重建 Initiative,不挂本 Initiative。

## 二、重建必须知道的六件事

按对重建决策的影响排序。每条都有可复核的证据。

### 1. 租户隔离是 schema-per-tenant,不是 `tenantId` 过滤

70 个业务 model 住在 `tenant_template` schema 内,**其中 68 个没有任何租户列**。请求里的租户标识决定的是**连哪个 schema**,不是**加哪个 WHERE 条件**。

> 任何「前端传 tenantId 做过滤」的设计都与后端隔离模型不符。详见 [`data-model.md`](data-model.md)。

### 2. 前端几乎没有 RBAC 门

66 条路由中**只有 1 条**带真正的 RBAC 前置门(`/tenant/{t}/talent/{tid}/customers/new`),而且**写在屏组件里不在路由层**。`GET /users/me/permissions` 在整个 `apps/web` **零调用**。

> **重建时若照搬路由层结构而漏掉那个屏内逻辑,这条门会静默消失。** 详见 [`frontend-routes.md`](frontend-routes.md)。

### 3. 「删除」是停用,不是消失

全库 **0 个** `deletedAt` / `isDeleted` 墓碑列,33 个 `isActive`。

> 「删掉的东西还能查到」是正常行为,不是缺陷。删除交互须按停用设计。

### 4. 下拉选项的权威来源不是 DB schema

**0 个 Prisma `enum`。** 取值域分散在三处:`VarChar` 列(DB 不约束)、`packages/shared` 的 TS 枚举、`system_dictionary` 字典表(**运行期可配置**)。

> 哪些字段的取值来自哪一处,是逐字段的判断,**本次未逐字段测**。重建前须逐个确认,不能假定统一来源。

### 5. 28 个前端域高估了结构复杂度

三个「域」(`api-client-management`、`webhook-management`、半个 `interface-management`)是门面,全部转发到同一个 **9,546 行**的 `IntegrationManagementScreen`。另有 3 个域不服务任何路由,其中 894 行的 `HomepageManagementScreen` 是**路由不可达的死代码**。

> 重建时它们不是三个域,是一个域的三个入口。

### 6. 109 条后端 handler 前端零调用

客户导入(8)、客户导出(5)、PII 服务配置(5)、system-roles(5)整族在前端不可达。

> 这不等于「这些 API 没用」——可能被外部集成或 Worker 消费。**它等于「当前前端的任何代码路径都到不了它们」**。重建时须逐族裁定:补界面、还是确认为非前端消费。

## 三、缺口登记册

分两类:**重建须保留**(重建不解决它,得带着走)与**重建可消除**(重建本身就是解法)。

### A. 重建须保留 —— 与前端无关或超出前端范围

| #   | 缺口                                                                                                           | 证据                                                               |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A1  | **7 条分级目录端点零授权** —— 任意持有效 JWT 的租户用户可增删改移 subsidiary;catalog 已备好四个动作全未引用    | [`permissions.md`](permissions.md)                                 |
| A2  | 运行期 403 负证只覆盖 **11 / 302**,且 **10/11 不在 CI**                                                        | 同上                                                               |
| A3  | **列级 schema↔迁移漂移门离线不可得**,已实测表级门对列级漂移漏检                                                | [`data-model.md`](data-model.md)                                   |
| A4  | 7 个迁移的 `%I` 动态扇出与模板静态 DDL 是否等价**未测** —— 若分歧,老租户与新租户表结构不同,所有离线门都看不见  | 同上                                                               |
| A5  | 139 条缺 `@ApiResponse`(22/60 controller)、10 条缺 `@ApiOperation`(9 条集中在 homepage 模块)                   | [`api-metadata-gaps.md`](api-metadata-gaps.md)                     |
| A6  | 11 个 `OKL-*` 停在 `unverified`,逐条重新取证未排期                                                             | [`_meta/claims-audit-batch-bc.md`](_meta/claims-audit-batch-bc.md) |
| A7  | `packages/shared/src/types/db-schema.ts` 是无门看守的平行类型面,只覆盖 88 个 model 中的 51 个                  | [`data-model.md`](data-model.md)                                   |
| A8  | `packages/database` 无 `test` 脚本,该目录下两个 RBAC spec **从未被任何 runner 执行过**                         | [`permissions.md`](permissions.md)                                 |
| A9  | `pnpm format:check` 全仓 **179 个文件**不合规(本 Initiative 前为 194,已减 15);该命令**未接入任何 CI workflow** | 实测 `pnpm format:check` 与 `.github/workflows/`                   |

### B. 重建可消除 —— 重建本身就是解法

| #   | 缺口                                                                                                    | 证据                                                             |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| B1  | 两条 Studio 资产 IDE 路由**完全无前端门**,访问控制全落后端 401                                          | [`frontend-routes.md`](frontend-routes.md)                       |
| B2  | 从 `/tenant/.../homepage/editor` 跳到 `/studio` 后**能力门不再生效**(正则钉死 `^/tenant/`)              | 同上                                                             |
| B3  | `/ac/{t}/runtime-flags` 按**错误文案是否含 `permission` 字样**判定授权结果 —— 脆弱实现,不应照搬         | 同上                                                             |
| B4  | AC 的 `interface-management` 父路由关闭、子路由 `adapters/new` 仍渲染真实表单,只能靠直接输入 URL 到达   | [`_meta/claims-audit-batch-a.md`](_meta/claims-audit-batch-a.md) |
| B5  | `/ac/{t}/integration-management` 有内容但既不在导航也不在文档清单                                       | 同上                                                             |
| B6  | 894 行 `HomepageManagementScreen` 路由不可达死代码                                                      | [`frontend-routes.md`](frontend-routes.md)                       |
| B7  | **56 / 66 条路由从未被任何在跑的浏览器测试打开过**;现有 3 个 e2e 注入 sessionStorage 绕过登录并打桩后端 | 同上                                                             |

## 四、事实基线的使用规矩

1. **引用 fact 时连同其 `authority_tier` 一起引用。** `source` 级封顶 `probable` —— 「文件在那里」和「用户看得到」是两个断言。
2. **任何覆盖率声称须先查 [`_meta/denominator-registry.md`](_meta/denominator-registry.md) 的互钉状态。** 当前只有 API handler(398)与 Prisma model(88)已定钉;前端 66 与 RBAC 46 **不得支撑覆盖率声称**。
3. **偏离某条 fact 是一次显式决策,不是事故。** 重建时若决定不复刻某个现状行为,应记录为决策并说明理由 —— 这正是建这份基线的目的。
4. **门只保护它读过的字节。** 三道门覆盖的是它们各自的检查对象,不是「facts 都是对的」。

## 五、可复现入口

```bash
pnpm facts:check     # 三道门:API 事实确定性 + 声称清册确定性 + 仓内链接存在性
```

生成器与检查器:

- `scripts/facts-generate-api.mjs` —— 398 条 handler 事实(`--check` 校验确定性)
- `scripts/facts-generate-claims-inventory.mjs` —— 163 条文档声称清册
- `scripts/facts-check-repo-links.mjs` —— 仓内相对路径存在性
- `scripts/facts-mutation-red-proof.mjs` —— 分母提取器的变异红证

已接入 `.github/workflows/ci.yml` 的 `lint` 作业。

## 六、这份基线自己犯过的错(务必读)

本 Initiative 在自己的产物里抓到过五处缺陷,全部已修并留档。它们是使用这份基线时最该警惕的失效模式:

| #   | 缺陷                                                              | 教训                                            |
| --- | ----------------------------------------------------------------- | ----------------------------------------------- |
| 1   | 分母哈希手算与生成器算出两个值(根路径 `/` 被尾斜杠剥成空串)       | **哈希必须由将来实际运行的生成器算出**          |
| 2   | `api-handlers.md` 全表 302 行权限列渲染成 `[object Object]`       | 产物要真的读一遍,不能只信生成成功               |
| 3   | `README.md` 用作「好的可判伪断言」的示例**前提为假**              | **可判伪 ≠ 正确**                               |
| 4   | 声称清册生成器初版依赖 gitignore 的中间文件,干净检出跑不起来      | 生成器必须自足                                  |
| 5   | 门的红证首次尝试是**假阴性**(正则漏了 markdown 加粗,变异从未生效) | **未先证明生效的变异,其绿与门坏掉的绿不可区分** |

另有一条贯穿全程、共出现**七个独立实例**的教训:

> **只比计数的门是假门。** RBAC 资源改名(46→46)、Prisma `@@map` 改名(88→88)、生成 client 删字段(88→88)、迁移表名改动(88→88)、引擎渲染改名(88→88)、前端目录改名(66→66)、分母哈希手算差异(398→398)—— 七次计数纹丝不动,全部靠**排序清单的内容哈希**或**逐条互钉**抓到。
