# TMS 事实分母登记表

> 治理记录:`TCRN-TMS-STORY-002`(Epic `TCRN-TMS-EPIC-001`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-001`

## 规则

**任何覆盖率的分母必须先登记在本表,且必须经两个独立提取器逐条互钉。** 单源分母不采信。

哈希钉的是**归一化后排序的清单内容**,不是提取器工件本身 —— 工件含 `generatedAt` 时间戳,重跑必不字节一致(见 `TCRN-TMS-GATE-002` 的确定性风险)。清单内容哈希则可复现。

## 已定钉分母

| 分母 | 计数 | 内容 sha256 | 提取器 A | 提取器 B | 互钉结果 |
|---|---|---|---|---|---|
| API handler | **398** | `6eb22cd3ab63b68a…` | `apps/api/scripts/write-api-registry-controller-inventory.mjs` 工件 | codegraph `nodes.kind='route'` ∩ `*.controller.ts` | **逐条零分歧** |
| 前端页面路由 | **66** | `72d57e3a0c0dc3dd…` | `find apps/web/src/app -name page.tsx` | 待接第二源 | 单源 · **未定钉** |
| Prisma model | **88** | `18f070ff04d4a4ed…` | `schema.prisma` 的 `^model` | 待接第二源(migrations) | 单源 · **未定钉** |
| RBAC 资源 | **46** | `690da6e4ed6bf3c5…` | `catalog.ts` 的 `resource(` 调用 | 待接第二源(装饰器/seed) | 单源 · **未定钉** |

只有 API handler 分母当前**已满足 GATE-001**。其余三个已登记但仍是单源,须在对应 Epic 内补第二提取器方可用于任何覆盖率声称。

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

```
:param  -> {param}
*key    -> {key}
去尾斜杠、压缩空白
```

归一化前:两源各 398 条,但 243 条互不匹配(纯写法差异)。
归一化后:**交集 398 条,A-only 0 条,B-only 0 条。**

## 已发现的接线缺陷

证据脚本把工件写到**当前工作目录**(仓根),而非指定的 artifacts 目录。一次批量试跑在仓根产生 74 个未跟踪 JSON。接线进 CI 前必须为每个脚本约定输出路径,否则 CI 与本地都会被污染。
