# API handler 与 OpenAPI 基线对账

> 治理记录:`TCRN-TMS-STORY-007`(Epic `TCRN-TMS-EPIC-002`)· 分解裁定 minutes `TCRN-TMS-MIN-001`

## 结论

**398 条 handler = 396 条已入基线 + 1 条正确排除 + 1 条未解释缺口。**

`apps/api/openapi-baseline/` 的三份基线文件**没有任何多余条目** —— 基线里的每一条都对应一个真实 handler。

## 基线新鲜度:标注陈旧,内容不旧

三份基线文件的 mtime 均为 **2026-06-13**,而末次提交为 **2026-07-08**。这个日期差曾被列为漂移风险。

**实测结果:路径与方法层面零漂移。** 基线并集 396 条全部命中当前 handler,反向零多余。

> 边界声明:本次只对账**路径 × 方法**。请求体、响应体、参数与 schema 层面的漂移**未测**,不得以本结论外推。

## 归一化

handler 的 `pathTemplate` **不含全局前缀**,基线路径含。前缀来源:`apps/api/src/bootstrap.ts:158` 的 `app.setGlobalPrefix('api/v1')`。

对账前须给 handler 路径补 `/api/v1`。未补前缀时两侧交集为 **0** —— 这个全 0 结果本身是归一化错误的信号,不是「完全不一致」的证据。

## 逐条差额

| 类别 | 条数 | 明细 |
|---|---|---|
| 交集 | **396** | —— |
| 仅基线有 | **0** | —— |
| 仅 handler 有 | **2** | 见下 |

### 已解释:`GET /api/v1/internal/domain-check`

- fact `TMS-F-API-082`,`apps/api/src/modules/homepage/controllers/internal-domain.controller.ts:26`
- **`excluded: true`**(全仓唯一一个显式排除的 handler)
- 判定:**不在基线是正确的**,非缺口。

### 未解释:`GET /api/v1`

- fact `TMS-F-API-019`,`apps/api/src/app.controller.ts:12`(`AppController.getInfo`)
- `excluded: false`、`isPublic: false`、tag 为 `Public - Health`
- 判定:**真缺口**。该 handler 既未被排除也未标记为内部,却不在任何一份基线中。

处置转 `TCRN-TMS-STORY-009`(API 元数据缺口单)一并判定:是导出脚本漏了根路径,还是该 handler 本应被标记排除。

## 复现

```bash
node scripts/facts-generate-api.mjs
```

随后以 `docs/facts/api-handlers.json` 的 `facts[]` 对 `apps/api/openapi-baseline/*.json` 的 `paths` 做集合比对,handler 侧补 `/api/v1` 前缀。
