# codegraph 路由提取的过滤约定

> 治理记录:`TCRN-TMS-STORY-005`(Epic `TCRN-TMS-EPIC-001`)· 分解裁定 minutes `TCRN-TMS-MIN-001`

## 结论先行

codegraph 的 `nodes.kind='route'` 在本仓返回 **436** 条,其中只有 **398** 条是真实的 API handler。**直接使用 436 会使一切覆盖率从第一天起为假。**

这**不是 codegraph 的缺陷,不向上游报告**。它是模式提取的固有限制:提取器无法区分「一个路由装饰器」和「一个内容恰好是路由装饰器文本的字符串字面量」。责任在使用方过滤,不在提取方。

## 438 减到 398:逐条实况

| 文件 | 条数 | 实况 | 判定 |
|---|---|---|---|
| `*.controller.ts`(60 个文件) | **398** | 真实 `@Get/@Post/...` 装饰器 | **采用** |
| `apps/api/scripts/export-swagger-evidence.mjs` | 30 | 数组 `requiredSourceSnippets` 的字符串元素,内容形如 `"@Get('definitions')"` —— 是检查器要比对的**断言文本**,不是路由定义 | 排除 |
| `apps/api/scripts/write-webhook-delivery-inventory-baseline.mjs` | 3 | 同上模式 | 排除 |
| `apps/api/src/config/swagger-runtime-flag-family.contract.spec.ts` | 3 | 测试文件内的字符串 | 排除 |
| `apps/api/src/bootstrap.ts` | 2 | `app.use('/api/docs', …)` —— 真实的 Express 中间件挂载,但不是 API handler | 排除 |

合计 436 = 398 + 30 + 3 + 3 + 2。

注意最后一行的细微差别:`bootstrap.ts` 的两条**是**真实路由挂载,只是不属于「产品 API handler」这个分母的定义域。排除它们是分母定义问题,不是误判问题。

## 本仓过滤规则

```sql
select name, file_path from nodes
where kind = 'route'
  and file_path like '%.controller.ts'
```

即:**只采信来自 `*.controller.ts` 的 route 节点。**

## 使用 codegraph 作分母源的两条硬前置

### 一、必须先 sync

`.codegraph/codegraph.db` 是快照,不重新索引就不反映源码变化。已实测(见 [`red-proof.md`](red-proof.md)):向控制器注入一个真实新路由后,codegraph 仍报 398,查询注入的路由名返回 0 条 —— 而解析源码的提取器报 399。

**任何以 codegraph 为源的门,`sync` 必须是门自身流程的一部分**,不能依赖人记得跑。

### 二、不得单独作为分母源

codegraph 只能作为**互钉的第二源**。API handler 分母的第一源是 `apps/api/scripts/write-api-registry-controller-inventory.mjs` 的工件(直接解析源码,无快照滞后)。

## 一个范畴错误的警告

**codegraph 的 `route` 节点全部来自 `apps/api`,`apps/web` 为 0 条。**

Next.js 的页面路由不被 codegraph 识别为 `route`,必须由 `apps/web/src/app/**/page.tsx` 的文件路径推导。前端路由(66)与 API handler(398)是**两个不可互换的集合**,任何「page.tsx 与 route 节点对账」的表述都是范畴错误。
