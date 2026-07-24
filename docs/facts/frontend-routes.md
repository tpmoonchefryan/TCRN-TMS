# 前端路由与域事实基线

> 治理记录:`TCRN-TMS-STORY-016`~`019`(Epic `TCRN-TMS-EPIC-005`)· 分解裁定 minutes `TCRN-TMS-MIN-001`
>
> 这是前端重建 Initiative 最直接消费的一份事实。

## 结论先行

1. **66 条路由**,全部由 `apps/web/src/app/**/page.tsx` 的文件位置决定。仓内**没有路由组 `(group)`、没有 `route.ts`、没有 `middleware.ts`**,只有 3 个 `layout.tsx`。
2. **66 条中 9 条是纯 `redirect()`**,不渲染界面;真正承载界面的是 57 条。
3. **66 条路由中只有 1 条带真正的 RBAC 权限门**,而且它写在屏组件里而不是路由层。其余 65 条的门只有四种 —— 会话门、租户 tier 门、模块能力门、艺人生命周期门 —— **没有一种读 RBAC 权限码**。
4. **`GET /users/me/permissions` 在整个 `apps/web` 里一次都没被调用**(实测 0 命中)。
5. **两条 Studio 资产 IDE 路由完全没有前端门**,访问控制全部落在后端 401 上。
6. **398 条后端 handler 中 109 条在前端没有任何调用点**(路径级匹配)。
7. **运行期证据极度匮乏**:`pnpm test:e2e` 只跑 3 个 spec 共 11 个 test,触达 **10 / 66** 条路由,且注入 sessionStorage 绕过登录、打桩后端。Storybook 只有 **1 个** `.stories.tsx`。

## 一、路由分母(STORY-016)

### 提取约定

| 约定 | 本仓实况 |
|---|---|
| 动态段 `[param]` 进 URL | 归一化为 `{param}`(与 API 事实对齐) |
| catch-all `[...path]` | 仅 1 条(`/p/[...path]`) |
| 路由组 `(group)` 不进 URL | **本仓 0 个**(规则已实现以防未来引入) |
| `layout.tsx` 不是路由 | 3 个:root、`ac/[tenantId]`、`tenant/[tenantId]` |
| `route.ts` / `not-found.tsx` / `error.tsx` | **0 个** |
| `middleware.ts` | **`apps/web` 内不存在** —— 这一条对权限门是决定性的 |

### 双源互钉与红证

| 提取器 | 计数 | 内容 sha256(前 16) | 差异 |
|---|---|---|---|
| A:文件系统 `find` | 66 | `72d57e3a0c0dc3dd` | — |
| B:git 索引 `git ls-files` | 66 | `72d57e3a0c0dc3dd` | **逐行零差异** |

红证两次(在仓外副本上,working tree 未触碰):

| 变异 | 计数 | 哈希 | 判定 |
|---|---|---|---|
| 删一个 `page.tsx` | **65** | 变 | RED |
| 目录改名 `security` → `security-RENAMED` | **66** | **`deac9c89…`** | **RED(仅哈希检出)** |

第二次又是「计数纹丝不动、只有内容哈希暴露」—— 该教训的第七个独立实例。

### 分母仍不满足 GATE-001

| 条件 | 状态 |
|---|---|
| 已登记 | **满足** |
| 两个独立提取器逐条互钉 | **形式满足、实质存疑** —— `find` 与 `git ls-files` **共享同一语义前提**(「路由 == 一个 `page.tsx`」)。若前提本身错了,两源会一起错。真正独立的第三源是 Next 构建产物的路由清单,**未测** |
| 提取器已见红 | **满足(带限定)** —— 红证取自仓外副本,不是真实工作树上的门 |

**故登记表中「单源 · 未定钉」保留。本文件不作任何前端覆盖率百分比声称**;文中的 `10/66`、`56 条未触达` 是对已实测集合的直接计数。

### 分区计数

| 分区 | 条数 | shell |
|---|---|---|
| `/ac/**` | **24** | `AcShell` |
| `/tenant/**` | **29** | `PrivateShell` |
| `/studio/**` | **4** | **无 shell** |
| `/homepage-editor/**` | 2 | 无(两条都是 `redirect()`) |
| `/login`、`/login/sso/callback` | 2 | 无 |
| 公开消费页 | 4 | 无 |
| 根 `/` | 1 | 无(`redirect('/login')`) |
| **合计** | **66** | |

## 二、域与后端映射(STORY-017)

`apps/web/src/domains/` 下 **28** 个目录、**188** 个文件、**132,159** 行。

### 28 这个域计数高估了结构复杂度

三个「域」是门面,全部转发到同一个 **9,546 行**的 `IntegrationManagementScreen`,靠 `surface` 属性分叉服务 5 条路由:

| 门面域 | 实况 |
|---|---|
| `api-client-management` | screen 13 行转发器,`copy.ts` 与 `api.ts` **各只有 1 行 `export *`** |
| `webhook-management` | screen 19 行转发器,同构 |
| `interface-management` 的主 screen | 19 行转发器(该域真正的代码是另一个屏 `InterfaceAddAdapterScreen`,657 行) |

> **对重建的含义:** 它们不是三个域,是一个域的三个入口。

### 3 个域不服务任何路由

| 域 | 行数 | 实况 |
|---|---|---|
| `homepage-management` | 2,557 | `HomepageManagementScreen`(894 行)**零生产导入方** —— 路由不可达的死代码,只有 526 行自测在测它 |
| `public-presence` | 826 | 纯组件库 + 仓内**唯一**的 `.stories.tsx` |
| `event-backbone` | 63 | 只有 45 行 api,无屏无页面 |

### 规模极不均

最大 `config-dictionary-settings`(32 文件 / 25,071 行)对最小 `event-backbone`(2 文件 / 63 行):文件数差 16 倍,行数差 **398 倍**。

### 109 条 handler 在前端零调用点

**方法**:扫描 `apps/web/src` 全部非测试文件的 `/api/v1/...` 字面量(含跨行模板串),与 `api-handlers.json` 的 398 条路径逐段匹配。提取器产出 276 个调用点,与独立 grep 计数完全一致。已见红(改一条路径 → 109→110)。

**可信度**:109 是**路径级、方法不敏感**的结果,可信度较高。方法敏感版本为 164 但**不采信** —— 276 个调用点只有 194 个能嗅探到方法。

整族零调用的:

- `Customer - Import`(8)与 `Customer - Export`(5)—— **客户导入/导出后端完整、前端不存在**
- `System - PII`(5)、`System - System Roles`(5)、`System - Event Backbone`(4)
- `System - Permissions`(3,含 `GET /users/me/permissions`)—— 与「前端无 RBAC 门」互相印证

> 这不等于「这些 API 没用」—— 它们可能被外部集成、Worker 或脚本消费。**它等于「当前前端 66 条路由的任何代码路径都到不了它们」。**

## 三、权限门的真实形态(STORY-018)

### 没有 middleware,没有服务端守卫

所有门都是**客户端 React 组件**,挂在两个 `layout.tsx` 上。

| 门 | 类型 | 实现 | 覆盖 |
|---|---|---|---|
| 会话门 | 认证 | `PrivateShell.tsx:227-250`、`AcShell.tsx:257-285` | 53 条 |
| 租户 tier 门 | 授权(粗) | `AcShell.tsx:319`(`!isAcTenantTier` → denied) | `/ac/**` 24 条 |
| 反向 tier 门 | 授权(粗) | `PrivateShell.tsx:217-219` | `/tenant/**` 29 条 |
| 模块能力门 | 授权(**能力码,非权限码**) | `PrivateShell.tsx:308-319`、`:357-368`;判定表 `module-capability-routing.ts:12-41` | 7 条 |
| 艺人生命周期门 | 业务状态 | `TalentBusinessAccessGate.tsx:195-200` | 8 条 |
| **RBAC 前置门** | **授权(权限码)** | `CustomerCreateScreen.tsx:230` + `:617-620` | **1 条** |
| 后端 403 事后态 | 授权(被动) | `ApiRegistryScreen.tsx:123` 等 | 3 条 |

**AC 侧没有任何能力门**(`AcShell.tsx` 内 `isSessionCapabilityEnabled` 出现 0 次)。

### 唯一一条 RBAC 前置门

`/tenant/{tenantId}/talent/{talentId}/customers/new`:`CustomerCreateScreen` 挂载时先发 `POST /permissions/check`,`denied` 时**整屏替换为拒绝态而不渲染表单**。

> **它写在屏组件里,不在路由层** —— 不会随 `layout.tsx` 自动扩散。**重建时若照搬路由层结构而漏掉这个屏内逻辑,这条门会静默消失。**

全仓问后端「我有没有这个权限」的地方只有 2 个 helper、3 个调用点,另外两个都只是**字段级**(控制按钮显隐),不是路由级门。

### 一处脆弱实现,重建不应照搬

`/ac/{t}/runtime-flags` 用**错误文案里是否含 `permission` 字样**来决定显示 denied 还是 error(`RuntimeFlagsScreen.tsx:235`)—— 按错误消息字符串判定授权结果。

### 11 条无门路由,其中 2 条是缺口

无门的 11 条里 9 条属设计上公开(登录页、4 条公开消费页、redirect 页)。**两条是实质缺口**:

| 路由 | 实况 |
|---|---|
| `/studio/public-presence/{tenantId}/assets/component/{assetId}` | `PublicPresenceAuthoringIdeScreen` 用 `useSession().request` 发认证请求,但**页面本身不检查会话、不重定向登录、不检查 tier、不检查能力**。未登录访问会渲染出 IDE 外壳然后收到后端 401 |
| `/studio/public-presence/{tenantId}/assets/template/{assetId}` | 同上 |

**另一处结构性绕过**:`/tenant/{t}/talent/{id}/homepage/editor` `redirect()` 到 `/studio/...`,而 `resolveTalentWorkspaceRoute` 的正则钉死 `^/tenant/`(`workspace-paths.ts:298`),`/studio` 下又无 layout —— **`public_presence.homepage` 能力门在跳转后不再生效**。

### 不可用态屏:全仓只有两条

| 路由 | 组件 |
|---|---|
| `/ac/{tenantId}/interface-management` | `AcBusinessRouteUnavailableScreen surface="interfaces"` |
| `/ac/{tenantId}/webhook-management` | `AcBusinessRouteUnavailableScreen surface="webhooks"` |

实测 `AcBusinessRouteUnavailableScreen` 恰被 2 个 `page.tsx` 引用,**无第三条**。其余含「不可用」字样的位置全部是加载失败/空数据错误态,或条件性拒绝态(能力未开通、艺人未发布),不是路由级不可用。

### AC 侧 vs tenant 侧

去前缀后:**共有 14 条、AC 独有 10 条、tenant 独有 15 条。** 14 条共有里行为不同的有 4 条:

| 相对路径 | AC 侧 | tenant 侧 |
|---|---|---|
| `/interface-management` | **不可用屏** | 真界面 |
| `/webhook-management` | **不可用屏** | 真界面 |
| `(index)` | → `/tenants` | → `/organization-structure` |
| `/integration-management` | redirect **跳进不可用屏** | redirect 跳进真界面 |

**一处不对称**:`/ac/{t}/interface-management` 是不可用屏,但其子路由 `/ac/{t}/interface-management/adapters/new` **渲染真实的 `InterfaceAddAdapterScreen`**。父路由说「AC 不提供业务适配器」,子路由却给了新建表单。**该子路由能否真的建出适配器,须 runtime 级证据,未测。**

## 四、运行期证据现状(STORY-019)

| 项 | 数量 |
|---|---|
| 在跑的 e2e spec | **3**(共 11 个 test) |
| UI evidence spec | 1(27 行,只跑 axe) |
| `.stories.tsx` | **1** |
| 退役 spec | 9(`retired-browser-tests/`,不被任何 package script 引用) |
| `apps/web` 单元测试文件 | 91 |

### 触达 10 / 66 条路由

**56 条路由从未被任何在跑的浏览器测试打开过** —— 包括全部 4 条公开消费页、全部 4 条 Studio 路由、全部 6 条角色/用户编辑路由、以及两条 AC 不可用屏路由本身。

### 这些证据的质量上限

三个 spec 都做了两件削弱证据力的事:

1. **注入会话绕过认证**:`page.addInitScript` 直接往 `sessionStorage` 塞构造的 session。**登录流程、token 校验、会话恢复从未被执行。**
2. **打桩后端**:5 处 `page.route(` 拦截。虽然 `webServer` 起了真 API,被测断言走的是拦截后的响应。

> **结论:当前不存在任何一条运行期证据,能支撑「某页面的权限门真的挡住了没权限的人」。**

### 退役套件:净效果可测,理由未记录

commit `3630a0a3`(`chore: align runtime and browser validation baseline`)删掉该目录下 **71 个文件**,含 `private/private-shell-visual-qa.spec.ts`(**3,681 行**)、`auth/login-ui-qa.spec.ts`、`global.setup.ts` 等,并把根 `test:e2e` 改钉到 `tests/e2e/*`。目录内无 README,commit message 未给理由。

> **被删的 3,681 行 `private-shell-visual-qa.spec.ts` 覆盖的正是 `PrivateShell.tsx` —— 承载全部租户侧门逻辑的那个文件。门还在,证明门的浏览器证据没了。**

## 五、证据层级边界

### `source` 级 · 封顶 `probable`

66 条路由存在与 URL 模板、渲染入口组件、所处 shell、门的分布、28 个域的规模、109 条无调用 handler —— **全部只有源码支撑,不得标 `proven`**。

> 源码说 `page.tsx` 返回 `<XScreen/>`,不代表运行期真的渲染出 X —— 中间隔着 hydration、`useEffect` 早退、错误边界、依赖后端响应的条件分支。**「文件在那里」和「用户看得到」是两个断言。**

### 需 `runtime` 级才能升 `proven` —— 本次全部未测

- 任何「门真的挡住了未授权访问」的断言,**尤其是那条唯一的 RBAC 前置门**。
- 「AC 的 interface-management 打开后用户看到的确实是不可用屏」—— 现有唯一相关证据是组件单测,测的是组件不是路由。
- 「`/studio/.../assets/*` 未登录访问的真实结果」。
- 「66 条路由每一条都能打开而不 500」—— 56 条从未被浏览器打开过。

### `doc` 级 · 已被 `source` 推翻一条

`docs/user-guide/platform-admin/README.md:11` 的 "Interface and webhook management." 对 AC 作用域为假。已于 `TCRN-TMS-STORY-021` 订正。

## 复现命令

```bash
find apps/web/src/app -name 'page.tsx' | wc -l            # 66
find apps/web/src/app -type d -name '(*)' | wc -l         # 0
find apps/web/src/app -name 'layout.tsx' | wc -l          # 3
git ls-files apps/web | grep -c middleware                # 0
ls -d apps/web/src/domains/*/ | wc -l                     # 28
grep -rn "users/me/permissions" apps/web/src | wc -l      # 0
grep -rln "AcBusinessRouteUnavailableScreen" apps/web/src/app | wc -l   # 2
ls tests/e2e/*.spec.ts | wc -l                            # 3
git ls-files | grep -c '\.stories\.tsx$'                  # 1
```
