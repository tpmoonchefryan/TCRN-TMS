# API 元数据缺口单

> 治理记录:`TCRN-TMS-STORY-009`(Epic `TCRN-TMS-EPIC-002`)· 分解裁定 minutes `TCRN-TMS-MIN-001`

数据源:[`api-handlers.json`](api-handlers.json)(由 `scripts/facts-generate-api.mjs` 确定性生成)。分母 **398** 条 handler。

## 缺口总览

| 缺口 | 数量 | 占 398 | 判定 |
|---|---|---|---|
| 缺 `@ApiOperation` | 10 | 2.5% | 模块级约定缺失 |
| 缺 `@ApiResponse` | 139 | 34.9% | 全仓性约定缺失 |
| 两者皆缺 | 8 | 2.0% | —— |
| 不在任何 OpenAPI 文档 | 2 | 0.5% | 一条正确排除、一条隐式排除 |

## 缺 `@ApiOperation` 的 10 条:集中在一个模块

10 条中 **9 条**来自 `apps/api/src/modules/homepage/controllers/`:

| fact | 端点 | 位置 |
|---|---|---|
| `TMS-F-API-082` | `GET /internal/domain-check` | `internal-domain.controller.ts:26` |
| `TMS-F-API-128` | `GET /public/homepage/{path}` | `public-homepage.controller.ts:173` |
| `TMS-F-API-130` | `GET /public/homepage/{tenantCode}/{talentCode}` | `public-homepage.controller.ts:139` |
| `TMS-F-API-373` | `POST /talents/{talentId}/public-presence/publish` | `public-presence.controller.ts:263` |
| `TMS-F-API-374` | `POST …/publish/cancel` | `public-presence.controller.ts:306` |
| `TMS-F-API-375` | `POST …/publish/schedule` | `public-presence.controller.ts:285` |
| `TMS-F-API-376` | `POST …/review/approve` | `public-presence.controller.ts:241` |
| `TMS-F-API-377` | `POST …/review/request-changes` | `public-presence.controller.ts:220` |
| `TMS-F-API-378` | `POST …/review/submit` | `public-presence.controller.ts:198` |
| `TMS-F-API-379` | `POST …/public-presence/rollback-draft` | `public-presence.controller.ts:328` |

**判定:模块级约定缺失,不是零散疏漏。** 缺口 100% 落在 homepage 模块的三个 controller 内,其余 57 个 controller 零缺口。补齐应按模块一次做完,而非逐条。

## 缺 `@ApiResponse` 的 139 条:散布 22 个 controller

前列(条数 / controller):19 `IntegrationController`、18 `AuthController`、16 `ConfigController`、8 `UserController`、8 `RuntimeFlagsController`、7 `PlatformToolsController`、7 `PublicPresenceAssetController`、7 `PublicPresenceController`、6 `EventBackboneController`、5 `ApiRegistryController`、5 `BuilderRegistryController`、5 `SubsidiaryIntegrationAdapterController`。

**判定:全仓性约定缺失。** 涉及 22/60 个 controller、覆盖 35% 的 handler,不是个别遗漏。这条不适合作为「缺陷」逐条修,应作为一次约定性补齐或显式接受为已知限制。

## 不在任何 OpenAPI 文档的 2 条

### `TMS-F-API-082` `GET /internal/domain-check` —— 正确排除

`excluded: true`(全仓唯一显式排除的 handler)。不在基线是**正确的**。

### `TMS-F-API-019` `GET /`(`AppController.getInfo`)—— 隐式排除

根因已定位,非缺陷但需显式化:

- `AppController` 声明在根模块 `AppModule`(`apps/api/src/app.module.ts:151`)。
- `apps/api/src/bootstrap.ts` 构建三份 Swagger 文档,各自的 `include` 列举具体特性模块;公开文档为 `include: [PublicModule, HealthModule]`。
- **三份文档的 `include` 都不含 `AppModule`**,故该 handler 不出现在任何文档中。

**判定:被模块作用域隐式排除,而非被 `@ApiExcludeEndpoint` 显式排除。** 结果正确,机制不显式 —— 一个读文档的人无法从 handler 本身看出它为何缺席。

**建议**(不在本 Story 范围内执行):给它加显式排除标记,使「不该出现在文档里」成为一条读得出来的事实,而不是三份 `include` 列表的副作用。

## 未测边界

- 本单只覆盖**装饰器是否存在**,属 `api-contract` 级。
- **未测**已有 `@ApiResponse` 的响应描述是否与运行期实际响应一致 —— 那需要 `runtime` 级证据。
- **未测**这些缺口是否影响任何下游消费者(前端、SDK 生成、外部集成)。
