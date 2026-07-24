# TMS 事实分母登记表

> 治理记录:`TCRN-TMS-STORY-002`(Epic `TCRN-TMS-EPIC-001`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-001`

## 规则

**任何覆盖率的分母必须先登记在本表,且必须经两个独立提取器逐条互钉。** 单源分母不采信。

哈希钉的是**归一化后排序的清单内容**,不是提取器工件本身 —— 工件含 `generatedAt` 时间戳,重跑必不字节一致(见 `TCRN-TMS-GATE-002` 的确定性风险)。清单内容哈希则可复现。

## 已定钉分母

| 分母 | 计数 | 内容 sha256 | 提取器 A | 提取器 B | 互钉结果 |
|---|---|---|---|---|---|
| API handler | **398** | `77e420714dbb881e…` | `apps/api/scripts/write-api-registry-controller-inventory.mjs` 工件 | codegraph `nodes.kind='route'` ∩ `*.controller.ts` | **逐条零分歧** |
| 前端页面路由 | **66** | `72d57e3a0c0dc3dd…` | `find apps/web/src/app -name page.tsx` | 待接第二源 | 单源 · **未定钉** |
| Prisma model | **88** | `18f070ff04d4a4ed…` | `schema.prisma` 的 `^model` | 生成 client + 迁移 SQL 重放 + 引擎渲染 DDL(**三个**) | **逐条零分歧 · 已定钉** |
| RBAC 资源 | **46** | `690da6e4ed6bf3c5…` | `catalog.ts` 的 `resource(` 调用 | 待接第二源(装饰器/seed) | 单源 · **未定钉** |

**API handler(398)与 Prisma model(88)已满足 GATE-001**,可用于覆盖率声称。前端页面路由(66)与 RBAC 资源(46)仍是单源,不得支撑任何覆盖率声称。

> RBAC 资源曾试过以运行期求值 `packages/shared/dist/index.js` 作第二源,逐条零分歧 —— 但 `dist` 是 `catalog.ts` 的编译产物,**同源**,只能抓构建漂移、抓不到 catalog 本身错了。真正独立的第二源是活库 `resource` 表,需 DB,未测。故该行保持未定钉。

> **已定钉 ≠ 门已接线。** Prisma model 的四个提取器是一次性脚本、尚未入仓,CI 不会重跑。「88 是对的」已证,「88 会一直是对的」未证。

## 已废止的分母

**codegraph 原始 `route` 节点总数 436 —— 废止。** 实测构成:

| 来源 | 条数 |
|---|---|
| `*.controller.ts`(真 API 面) | **398** |
| `apps/api/scripts/` 内字符串字面量 | 33 |
| spec 测试文件 | 3 |
| `bootstrap.ts` | 2 |

以 436 为分母会把脚本、测试与引导路由计入产品 API 面,覆盖率自第一天起为假。

**另一条范畴错误:codegraph 的 `route` 节点全部来自 `apps/api`(前端为 0)。** 前端页面路由与 API handler 是两个不可互换的集合,任何「page.tsx 与 route 节点对账」的说法都是范畴错误。

## API handler 分母的互钉方法

两个提取器的路径参数写法不同(工件用 OpenAPI 风格 `{param}`,codegraph 用 Nest 风格 `:param` 与 `*key`)。归一化规则:

**规范归一化由 `scripts/facts-generate-api.mjs` 的 `normPath` 单一定义**,本文件不重复实现 —— 两处实现是两个会分歧的真值(下一节即为实例)。

```
:param  -> {param}
*key    -> {key}
去尾斜杠;若结果为空则回落为 "/"      ← 这一步是必需的,见下
方法名一律大写
```

归一化前:两源各 398 条,但 243 条互不匹配(纯写法差异)。
归一化后:**交集 398 条,A-only 0 条,B-only 0 条。**

### 一次自捕的归一化缺陷(务必保留)

本表初版记录的分母哈希是 `6eb22cd3…`,与生成器实际产出的 `77e42071…` 不符。定位结果:初版归一化的「去尾斜杠」把根路径 `/` 剥成了**空串**,于是根 handler 被记成 `"GET "`(带尾空格)而非 `"GET /"`。整个 398 条集合只有这一条不同,计数完全一致,**只有内容哈希暴露了它**。

三条教训:

1. **一个分母哈希若不是由那个将来要跑的生成器算出来的,它钉不住任何东西。** 手算一次、生成器算一次,就是两个会漂移的真值。
2. **计数相同不等于集合相同** —— 这与 RBAC 改名那次(46→46)是同一个教训的第二个独立实例。
3. 边界值(空路径、根路径)是归一化函数最容易出错的地方,须专门测。

## 已发现的接线缺陷

证据脚本把工件写到**当前工作目录**(仓根),而非指定的 artifacts 目录。一次批量试跑在仓根产生 74 个未跟踪 JSON。接线进 CI 前必须为每个脚本约定输出路径,否则 CI 与本地都会被污染。
