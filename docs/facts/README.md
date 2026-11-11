# TMS 事实基线(facts)

> 治理记录:Initiative `TCRN-TMS-INIT-001` · 分解裁定 minutes `TCRN-TMS-MIN-001`

## 这里是什么

TMS 的**事实基线**:一组可判伪、带可复现证据绑定的断言,描述系统**当前实际是什么**。

前端重建以此为输入。重建时偏离某条 fact 是一次显式决策,不是一次事故。

## 这里不是什么

- **不是产品规格。** 规格说「应该是什么」,facts 说「现在是什么」。
- **不是用户指南。** `docs/user-guide/` 是面向用户的操作说明,其忠实性由 `TCRN-TMS-EPIC-006` 单独审计,**不作为 facts 的输入源**。
- **不是链的副本。** 治理链(`.tcrn-workspace/TCRN-TMS/`)只放裁定与验收;facts 正文只住在本目录。

## 权威序

两个来源冲突时,**高层级胜**,不由执行者私下仲裁:

| 层级           | 来源                              | 可支撑的最高置信度    |
| -------------- | --------------------------------- | --------------------- |
| `runtime`      | 实际运行观测(实调、DOM 测量、e2e) | `proven`              |
| `schema`       | Prisma schema 与迁移              | `proven`              |
| `api-contract` | OpenAPI 基线、controller 装饰器   | `proven`              |
| `source`       | 其余源码                          | `probable`            |
| `doc`          | 现有文档                          | **`unverified` 封顶** |

`doc` 层级证据**不能单独支撑 `proven`**。这条把 TMS README 已有的口头声明(「以源码实现和当前 UI 证据为准」)落成机制。

## 一条 fact 的格式

```yaml
id: TMS-F-<域>-<序号> # 稳定标识,永不复用
statement: <单句可判伪断言>
domain: <所属域>
authority_tier: runtime | schema | api-contract | source | doc
evidence:
  - kind: source | route | schema | rbac | artifact | test | ui-observation
    locator: <file:line | 归一化路由 | model 名 | 工件条目键>
    digest: <可选,内容 sha256 前 16 位>
confidence: proven | probable | unverified | disputed
status: active | superseded | retired
superseded_by: <fact id,可选>
decided_by: <minutes id,仅当经 conference 裁定>
```

### 可判伪性

`statement` 必须能被**一次具体观测**推翻。

- 不合格:「系统支持多租户」——无法指出什么观测能推翻它。
- 合格:「88 个 Prisma model 中 11 个带 `tenantId` 字段」——数一遍即可证伪。

> **本节示例本身被证伪过一次,记录在此。** 初版写的是「租户隔离由 `tenantId` 字段在 Prisma 层承载,88 个 model 中 N 个带该字段」。它形式上可判伪(能数),**但它的前提是错的**:TMS 的租户隔离由 **schema-per-tenant** 承载,不是 `tenantId` 列 —— 70 个 `tenant_template` model 中只有 2 个带 `tenantId`,其余 68 个**没有任何租户列**(详见 [`data-model.md`](data-model.md))。
>
> 教训:**可判伪 ≠ 正确。** 一条断言可以完美地可数、可测、可证伪,同时把因果关系说反。可判伪性保证的是「错了能被发现」,不是「它是对的」——这正是本目录要逐条验证而不是逐条相信的理由。

### 证据非空

`confidence: proven` 要求至少一条 `evidence`,且其 `locator` 可解析。**门只保护它读过的字节** —— 没有 locator 的断言一律 `unverified`。

### 冲突不私裁

两个来源冲突时置 `confidence: disputed` 并开 conference;裁定后填 `decided_by`。执行者不得自行仲裁。

## 覆盖率的规矩

任何覆盖率声称必须满足三条,缺一不可:

1. 分母已登记在 [`_meta/denominator-registry.md`](_meta/denominator-registry.md);
2. 该分母**经两个独立提取器逐条互钉**(不是只比总数);
3. 该提取器**已见红**,红证记录在 [`_meta/red-proof.md`](_meta/red-proof.md)。

已实测的两个反例说明这三条为何必要:

- RBAC 资源改名后**计数不变**(46→46),只比计数的门会放行 → 故要求比对内容哈希。
- 注入真实路由后 **codegraph 陈旧索引看不见**(仍报 398),而解析源码的提取器检出 399 → 故要求双源互钉。

## 交接

前端重建 Initiative 的唯一入口是 [`REBUILD-HANDOFF.md`](REBUILD-HANDOFF.md) —— 准入判据、六条必知事实、缺口登记册与使用规矩都在那里。

## 目录结构

```
docs/facts/
├── README.md                        ← 本文件(规范)
├── REBUILD-HANDOFF.md               ← 前端重建交接包(准入判据 + 缺口登记册)
├── api-handlers.md / .json          ← 398 条 handler 事实(生成物)
├── api-openapi-reconciliation.md    ← 与 OpenAPI 基线对账
├── api-metadata-gaps.md             ← API 元数据缺口单
├── permissions.md                   ← 权限矩阵事实
├── data-model.md                    ← 88 个 model 与迁移事实
├── frontend-routes.md               ← 66 条路由与 28 域事实
└── _meta/
    ├── evidence-script-grading.md   ← 106 个证据脚本的可运行性分级
    ├── denominator-registry.md      ← 分母登记表(含已废止的 436)
    ├── red-proof.md                 ← 变异红证记录
    └── red-proof-results.json       ← 红证机器可读结果
```

域级 fact 文档随各 Epic 推进逐步加入本目录。

## 三层落点

| 层                    | 放什么                                  | 不放什么            |
| --------------------- | --------------------------------------- | ------------------- |
| `docs/facts/`(本目录) | fact 正文,随代码同 PR 变更              | 过程、裁定          |
| 治理链                | 裁定、验收、状态变迁                    | fact 正文           |
| 知识卡                | 跨 Initiative 会被再检索的结论,限个位数 | fact 正文、单次结论 |
