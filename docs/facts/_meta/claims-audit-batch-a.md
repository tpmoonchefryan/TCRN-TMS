# 声称审计 · 批 A(AC 平台管理)

> 治理记录:`TCRN-TMS-STORY-021`(Epic `TCRN-TMS-EPIC-006`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-003`

## 范围与方法

审计对象:`docs/user-guide/platform-admin/README.md` 的「Main AC Surfaces」清单(10 条声称)。

尺子是机器产出的,不是读文档:

1. AC 实际路由 = `find apps/web/src/app/ac -name page.tsx`(**24 条**)
2. 每条路由实际渲染什么 = 在其 `page.tsx` 内检索 `Unavailable`
3. AC 导航实际可达什么 = `apps/web/src/platform/routing/AcShell.tsx` 的 `navItems` 数组(**10 个目的地** + 角色管理经 `buildAcRoleManagementPath`)

三者交叉才能判定「exposes」这个动词 —— 单看路由存在会把不可用页判为真,单看导航会把 `/integration-management` 这种未入导航但活着的页判为假。

## 逐条判定

原文:「The AC admin console currently exposes route families for:」

| #   | 声称                                 | 路由                                       | 导航           | 渲染                                          | 判定     |
| --- | ------------------------------------ | ------------------------------------------ | -------------- | --------------------------------------------- | -------- |
| 1   | Tenant management                    | `/ac/[tenantId]/tenants`                   | ✓              | 有内容                                        | **证实** |
| 2   | User management                      | `/ac/[tenantId]/user-management`           | ✓              | 有内容                                        | **证实** |
| 3   | **Interface and webhook management** | 两条路由存在                               | **✗ 不在导航** | **均渲染 `AcBusinessRouteUnavailableScreen`** | **证伪** |
| 4   | API client management                | `/ac/[tenantId]/api-clients`               | ✓              | 有内容                                        | **证实** |
| 5   | API registry and gateway readiness   | `/api-registry` + `/api-gateway-readiness` | ✓ 两者         | 有内容                                        | **证实** |
| 6   | Builder registry                     | `/ac/[tenantId]/builder-registry`          | ✓              | 有内容                                        | **证实** |
| 7   | Platform tool connections            | `/ac/[tenantId]/platform-tools`            | ✓              | 有内容                                        | **证实** |
| 8   | Runtime flags                        | `/ac/[tenantId]/runtime-flags`             | ✓              | 有内容                                        | **证实** |
| 9   | Observability                        | `/ac/[tenantId]/observability`             | ✓              | 有内容                                        | **证实** |
| 10  | System dictionary                    | `/ac/[tenantId]/system-dictionary`         | ✓              | 有内容                                        | **证实** |

**9 证实 / 1 证伪。**

### 证伪项的完整证据

- `apps/web/src/app/ac/[tenantId]/interface-management/page.tsx` 与 `apps/web/src/app/ac/[tenantId]/webhook-management/page.tsx` 的函数体各只有一条 `return <AcBusinessRouteUnavailableScreen … />`。
- `AcShell.tsx` 的 `navItems` 的 10 个 href 中**不含**这两条路由。
- 提交 `e04063b5`(`fix(web): hide unavailable AC business routes`)是这一状态的来源。
- tenant 侧同名路由仍为真 —— **原文缺 scope 限定**是它出错的机制,不是笔误。

## 审计中新发现的两条缺陷(不在原清册内)

### A-1 死父路由下的活子路由

`/ac/[tenantId]/interface-management` 渲染不可用屏,但其子路由 `/ac/[tenantId]/interface-management/adapters/new` **渲染真实的 `InterfaceAddAdapterScreen`**(`workspaceKind="ac"`)。

父不可达、子未入导航,该页因而**只能通过直接输入 URL 到达**。这与同文件下方「If a direct URL is rejected, re-enter from the visible navigation」的指引直接冲突:此处直接 URL 不会被拒绝,反而是唯一入口。

判定:**真缺陷**。要么子路由也应关闭,要么父路由的关闭是不完整的。

### A-2 清单不完整

`/ac/[tenantId]/integration-management` 路由存在且**有真实内容**,但既不在导航的 10 项中,也不在文档的 10 条声称中。

同一文档的「Current Limitations」一节却提到 “AC tenant, user-management, **integration**, and operations visible states” —— 即文档自己在下文承认了它在上文清单里遗漏的面。

判定:**清单不完整**,且文档内部不自洽。

## 判定汇总

| 类别             | 数量 |
| ---------------- | ---- |
| 证实             | 9    |
| 证伪             | 1    |
| 审计新发现的缺陷 | 2    |

## 未测边界

- 本批只判定了「面是否存在且可达」,属 `source` 级证据。
- **未测**这些页面在真实权限下的行为 —— 一个在导航里可见的入口,对某个角色可能仍然 403。那需要 `runtime` 级证据,属 `TCRN-TMS-EPIC-003` 的运行期 403 负证范围。
- **未审**同文档「Best Practice」「Example Scenario」两节 —— 它们是操作建议而非事实声称,归 `prose` 类,须先裁定可证伪性。
- **未审**批 A 的另两份文档(`tenant-admin`、`user-and-role-management`,共 18 条声称)。
