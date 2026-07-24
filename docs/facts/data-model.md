# 数据模型事实基线

> 治理记录:`TCRN-TMS-STORY-014` / `TCRN-TMS-STORY-015`(Epic `TCRN-TMS-EPIC-004`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 分母门 `TCRN-TMS-GATE-001`

## 结论先行

1. **88 个 Prisma model,88 个 `@@map`,零遗漏、零重名。** 该分母由**四个独立提取器**逐条互钉、九次变异全部见红,**满足 `GATE-001` 三条件**。
2. **租户隔离不由 `tenantId` 列承载,而由 schema-per-tenant 承载。** 88 个 model 中 11 个带 `tenantId`,其中 9 个在 `public` 库(租户*元数据*);70 个业务 model 住在 `tenant_template` 内,**只有 2 个带 `tenantId`**。任何按 `tenantId` 过滤来推断隔离强度的说法都是范畴错误。
3. **零 Prisma `enum` 是刻意的,不是缺失。** 取值域落在三处:`VarChar` 列 + `packages/shared` 的 TS 枚举 + `system_dictionary` 字典表。
4. **迁移与 schema 之间当前没有任何漂移门。** 58 个迁移在 CI 中被真实应用,却**从未与 `schema.prisma` 比对**。表级门可离线建立(已建、已见红);**列级门离线不可得**。
5. **迁移数是 58,不是 59。**

## 两条订正

### 一、迁移数 58,不是 59

`prisma/migrations/` 下 59 个条目 = **58 个迁移目录 + 1 个 `migration_lock.toml`**。

```bash
find prisma/migrations -maxdepth 1 -mindepth 1 -type d | wc -l   # 58  ← 正确
ls prisma/migrations | wc -l                                     # 59  ← 错误,含锁文件
```

先前记录的 59 把锁文件数了进去。**这正是单源分母会出的事**:`ls | wc -l` 与「迁移数」差一个文件,没有第二源永远看不见。`TCRN-TMS-STORY-015` 的 scope 注解里写的 59 是链上不可变记录,以本文件为准。

### 二、`README.md` 的可判伪性示例前提为假

`docs/facts/README.md` 曾用「租户隔离由 `tenantId` 承载」当作**好的可判伪断言**的示例。该断言形式上可数,**但前提是错的**。已订正,并在该处留下记录:**可判伪 ≠ 正确**。

## 分母互钉:四个独立提取器

| #   | 提取器                                        | 读的字节                                           | 生产者               |
| --- | --------------------------------------------- | -------------------------------------------------- | -------------------- |
| A   | `schema.prisma` 块解析                        | `prisma/schema.prisma`                             | 本次编写的解析器     |
| B   | 生成 client 的 `$<Model>Payload`              | `src/generated/prisma/models/*.ts`(88 文件,已入库) | Prisma 代码生成器    |
| C   | 迁移 SQL 重放                                 | `prisma/migrations/*/migration.sql`(58 份)         | 历年手写 SQL         |
| D   | `prisma migrate diff --from-empty` 渲染的 DDL | 同 A,经 Prisma 引擎                                | Prisma Rust 迁移引擎 |

A 与 D 同源不同引擎(捕解析错误),B 是另行提交的生成物(捕陈旧),**C 血统完全独立**(手写 SQL,捕 schema 与迁移的真实分歧)。

### 逐条互钉结果

| 对账                            | 交集    | 分歧  | 内容 sha256                  |
| ------------------------------- | ------- | ----- | ---------------------------- |
| A ∩ B model 名                  | 88      | **0** | `d9c63a86564ef51d…` 两侧相同 |
| A ∩ B **逐字段**(1439 字段)     | 88 全等 | **0** | `ff0f247d8b31a537…`          |
| A ∩ C 限定表名                  | 88      | **0** | `9ace8e88f86c8e2e…`          |
| A ∩ C ∩ D 裸表名                | 88      | **0** | `a63b5d9705cd1aed…` 三侧相同 |
| A ∩ D **逐列**物理列名(1261 列) | 88 全等 | **0** | `4dc9252bf67c4db7…`          |

补充恒等式:A 的 178 个关系字段 ↔ D 渲染的 89 条外键,恰 2:1。

### 红证:九次变异全部见红,其中四次计数不变

| #   | 变异                           | 提取器       | 计数变化  | 判定           |
| --- | ------------------------------ | ------------ | --------- | -------------- |
| 1   | 删一个 model                   | A            | 88→87     | RED            |
| 2   | 只改一个 `@@map`               | A 表名哈希   | **88→88** | RED(哈希变)    |
| 3   | 注入一个 `tenantId`            | A 租户列计数 | 11→12     | RED            |
| 4   | 破坏生成 client 的一个 Payload | B            | 88→87     | RED            |
| 5   | 从 Payload 删一个标量字段      | B 逐字段     | **88→88** | RED(1 分歧)    |
| 6   | 改一条 `CREATE TABLE` 表名     | A↔C 互钉     | **88→88** | RED(各 1 分歧) |
| 7   | 清空一个 `migration.sql`       | C            | 88→86     | RED            |
| 8   | 删一个 model(经引擎)           | D            | 88→87     | RED            |
| 9   | 只改一个 `@@map`(经引擎)       | D 表名哈希   | **88→88** | RED(哈希变)    |

**四次计数完全不变、只有内容哈希或逐条互钉抓到** —— 「只比计数的门是假门」在数据模型域的第三至第六个独立实例。

### GATE-001 三条件

| 条件                   | 状态                  |
| ---------------------- | --------------------- |
| 分母已登记             | **已满足**            |
| 两个独立提取器逐条互钉 | **已满足(超额:四个)** |
| 提取器已见红           | **已满足(九次)**      |

**88 现在可用于覆盖率声称。**

> **但分母已定钉 ≠ 门已接线。** 四个提取器是一次性脚本、**尚未入仓**,CI 不会重跑。故:「88 是对的」**已证**;「88 会一直是对的」**未证**。落库与接线是本 Epic 的残项。

## 汇总

| 指标                               | 数量                          |
| ---------------------------------- | ----------------------------- |
| model / `@@map` / 缺 `@@map`       | 88 / 88 / **0**               |
| Prisma `enum`                      | **0**                         |
| `public` / `tenant_template` model | 18 / 70                       |
| 标量字段(= 物理列)                 | 1261                          |
| 关系字段 / 外键 / 索引             | 178 / 89 / 259(唯一 71)       |
| 带 `tenantId` 的 model             | **11**                        |
| 单列主键                           | **88 / 88**(复合 0、无主键 0) |
| 主键 `String @db.Uuid`             | 87                            |
| 软删除列(`deletedAt`/`isDeleted`)  | **0**                         |
| `isActive`                         | 33                            |
| `version Int` 乐观锁               | 37                            |
| `schema.prisma` 行数               | 2412                          |

## 租户隔离的真实形态

`datasource` 声明 `schemas = ["public", "tenant_template"]`(`schema.prisma:13`)。88 个 model 各带一个 `@@schema`,划分为 18 / 70。

带 `tenantId` 的 11 个中,9 个在 `public`(平台级表按租户分行的**元数据**),2 个在 `tenant_template`(`WebhookDeliveryOutbox`、`EventBackboneOutbox` —— 跨租户投递队列,需自带标识)。

**其余 68 个 `tenant_template` model 没有任何租户列**,靠所在 schema 区分租户。

迁移侧的对应指纹:**7 个迁移**含 `format('CREATE TABLE ... %I.<表>')` 形态的动态 per-tenant DDL(共 9 处),把同一份 DDL 扇出到每个已存在的租户 schema。

> **对前端重建的含义:** 请求里的租户标识决定的是**连哪个 schema**,不是**加哪个 WHERE 条件**。任何「前端传 tenantId 做过滤」的设计都与后端隔离模型不符。

## 建模约定

| 约定                      | 覆盖    | 说明                                                                 |
| ------------------------- | ------- | -------------------------------------------------------------------- |
| 单列主键                  | 88 / 88 | 复合主键 0                                                           |
| 主键 `@db.Uuid`           | 87 / 88 | 例外:`PlatformToolDefinition.code`(业务码作主键)                     |
| 主键名为 `id`             | 86 / 88 | 例外:`TenantCapabilityState.tenantId`、`PlatformToolDefinition.code` |
| `version Int`             | 37      | 写路径的并发控制点                                                   |
| `isActive`                | 33      | **停用**语义                                                         |
| `deletedAt` / `isDeleted` | **0**   | **全库无墓碑式软删除**                                               |
| `ownerType` + `ownerId`   | 16      | 配置实体的层级归属(平台/子公司/艺人继承链)                           |
| 零关系字段的 model        | 21      | 靠应用层而非 FK 关联                                                 |

### 「删除」是停用,不是消失

`packages/shared/src/types/db-schema.ts:47-49` 的 `SoftDeletableEntity` 唯一成员是 `is_active`,不是 `deleted_at`。与 Prisma 侧「0 个墓碑列、33 个 `isActive`」一致。

> **对前端重建的含义:** 「删掉的东西还能查到」是正常行为,不是缺陷。

### 「0 个 enum」的含义

取值域落在三处:`VarChar` 列(DB 层不约束)、`packages/shared` 的 TS 枚举、`system_dictionary` / `system_dictionary_item` 字典表。

> **对前端重建的含义:** 下拉选项的权威来源**不是** DB schema。哪些取值来自 TS 常量、哪些来自字典表,是逐字段的判断,**本次未逐字段测**。

## 一份无人看守的平行类型面

`packages/shared/src/types/db-schema.ts` 是**手工维护**的 DB 行形状类型,与 Prisma 生成的 client 并存。

| 指标                                   | 数量                |
| -------------------------------------- | ------------------- |
| model 形状的 `interface`               | 51                  |
| 能对上 Prisma model 名的               | **51 / 51**(零孤儿) |
| **没有对应 interface 的 Prisma model** | **37 / 88**         |

37 个缺口全部是较新的域(公开主页、平台工具、租户能力、SSO、outbox、邮件、字典)。**没有任何门保证这 51 个仍与 Prisma 一致** —— 它是一份会静默陈旧的平行真值,重建时不应把它当作 schema 的权威表述。

## 迁移与漂移门(STORY-015)

### 迁移内容实测

| 指标                                          | 数量                  |
| --------------------------------------------- | --------------------- |
| 迁移目录                                      | **58**                |
| 静态 `CREATE TABLE` / `DROP TABLE` / `RENAME` | 90 / 2 / 0            |
| 重放后存活表                                  | **88** = schema 的 88 |
| 动态 per-tenant DDL(`%I` 扇出)                | 9 处 / 7 个迁移       |
| 不创建任何表的迁移                            | 35 / 58               |
| `ADD` / `ALTER` / `DROP COLUMN`               | 23 / 42 / 18          |

### 现有漂移门:没有

| 候选                                                            | 实况                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `prisma migrate diff --from-migrations`                         | 未接线,且**离线不可跑**(需影子库;`prisma.config.ts` 未定义 `shadowDatabaseUrl`) |
| `apply-migrations.ts` 的 “drift-watch”                          | **同名不同物** —— 统计活库重放时的可忽略冲突,需 `PrismaClient`                  |
| `verify-schema-rollout.ts` / `verify-tenant-template-parity.ts` | 需活库;测的是租户 schema 铺开与模板一致性                                       |
| `apps/api/scripts/` 的 20 个 `verify-*`                         | 与数据层无关                                                                    |
| `ci.yml`                                                        | 跑 `db:generate` 但**之后没有 `git diff --exit-code`** —— 生成物陈旧不会变红    |
| `isolation-test.yml`                                            | 起了 postgres 并跑 `db:migrate:deploy`,**迁移被真实应用却从未与 schema 比对**   |

### 表级门:可离线建立,已见红

三方裸表名内容 sha256 相同(`a63b5d9705cd1aed…`),红证见变异 #6 / #7 / #9。**可立刻接 CI,零数据库依赖。**

### 列级门:离线不可得,且已实测漏检

在 `schema.prisma` 的 `Talent` 上注入 `nicknameDRIFT` 字段、**不动任何迁移**:

| 提取器         | 变异后             | 判定                                  |
| -------------- | ------------------ | ------------------------------------- |
| A↔C 表级对账   | 88 表 / **0 分歧** | **GREEN — 漏检**                      |
| D 引擎渲染列数 | 1261→**1262**      | 跟着 schema 一起动,**原理上无法自检** |

原因是结构性的:C 只做正则级表名重放,不解释 83 处列操作;D 与被检对象同源。**要检出列级漂移必须真正重放 58 份迁移 SQL,这需要 PostgreSQL 影子库。**

> 这条记录的价值不在于「建了个门」,而在于**门的边界被实测钉住**:表级绿,列级盲。不写下来,下一个人会以为表级绿就等于 schema 与迁移一致。

## 一次自捕的提取器缺陷

提取器 B 初版对 21 个**零关系** model 报出字段分歧。根因:Prisma 对无关系的 model 生成单行 `objects: {}`,而解析器只认多行块,把 `scalars` / `composites` 两个**结构键**误当成关系字段名收了进去。

两条教训:

1. **是逐字段互钉抓到的,不是计数** —— 两侧 model 数始终 88 = 88。
2. **提取器自己也会假绿。** 修法不只是改解析,而是让两个分支在遇到无法识别的块形状时 **`throw`** —— **一个看不懂时返回空集的提取器,比没有提取器更危险。**

## 复现命令

```bash
cd packages/database

find prisma/migrations -maxdepth 1 -mindepth 1 -type d | wc -l   # 58
grep -c "^model " prisma/schema.prisma                            # 88
grep -c "@@map"   prisma/schema.prisma                            # 88
grep -c "^enum "  prisma/schema.prisma                            # 0
ls src/generated/prisma/models/*.ts | wc -l                       # 88

# 提取器 D:完全离线,不连任何数据库
pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | grep -c "^CREATE TABLE"   # 88
```

> **不要跑 `prisma migrate diff --from-migrations ...`。** 仓根存在 `.env` / `.env.local` 且 `prisma.config.ts` 会加载它们;该命令需要影子库,可能连上真实 `DATABASE_URL` 并在其上建删数据库。

## 未测边界

1. **任何活库。** 全部结论来自仓库字节,离线不可测真实数据库。
2. **列级 schema↔迁移一致性** —— 表级门已实测漏检。
3. **索引与约束的迁移一致性** —— 互钉只做到表名与列名。
4. **动态 per-tenant DDL 的等价性** —— 7 个迁移的 `%I` 扇出与 `tenant_template` 静态 DDL 是否等价未测;**若分歧,老租户与新租户的表结构会不同,而所有离线门都看不见**。
5. **枚举取值域的来源归属** —— 未逐字段测。
6. **`db-schema.ts` 那 51 个 interface 的字段级正确性** —— 只对了名字,没对字段。
7. **四个提取器脚本未入仓、未接 CI** —— 本次互钉与红证是一次性观测,不是持续保证。
