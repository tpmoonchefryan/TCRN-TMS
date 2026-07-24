# 文档声称清册

> 治理记录:`TCRN-TMS-STORY-020`(Epic `TCRN-TMS-EPIC-006`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-003`
>
> **本文件由 `scripts/facts-generate-claims-inventory.mjs` 生成,请勿手改。**

## 范围

`docs/user-guide/` 与 `docs/wiki-draft/` 共 **24 个文件、975 行**,抽出 **163 条**候选声称(markdown 列表项)。

每条声称获得一个稳定 id `TMS-C-NNN`,供三批审计(`TCRN-TMS-STORY-021`~`023`)逐条判定引用。

> **id 稳定性的边界**:编号按文件名排序、行号顺序生成。**审计过程中修改文档会使其后所有 id 位移。** 故审计须以「一批一次重生成、批内引用当次 id」的方式进行,不可跨批沿用旧号。

## 按「什么证据能推翻它」分类

| 类别 | 条数 | 判定所需证据 |
|---|---|---|
| `prose` | 71 | 可证伪性未定,须逐条人判 |
| `permission` | 31 | 可对 RBAC 事实(46 资源)机械判定 |
| `ui-surface` | 29 | 需 source 级(页面存在)或 runtime 级(实际渲染)证据 |
| `proof-status` | 15 | **不是产品事实** —— 是旧证明流程的状态标注(G19 / OKL- / Clean 等) |
| `api-contract` | 13 | 可对 [api-handlers.md](../api-handlers.md) 的 398 条 handler 事实机械判定 |
| `data` | 4 | 可对 Prisma schema 事实(88 model)机械判定 |

**分类是启发式的**(关键词匹配),不是判定。它只决定每条声称该拿哪把尺子量;审计时须逐条复核归类本身是否正确。

### 两个需要立刻说清的类别

**`proof-status`(15 条)不是产品事实。** 这些行描述的是旧证明流程的状态(`Clean` / `Blocker-aware` / `Owner-accepted` / `Excluded` / `G19` / `OKL-*`),不是系统的行为。其支撑证据随旧 vault 于 2026-07-20 归档移出本仓,故 `OKL-*` 限制 ID 现为孤儿。处置见 `TCRN-TMS-STORY-024`。

**`prose`(71 条,占 44%)可证伪性未定。** 这是本清册最重要的发现:近半数声称无法从文本本身看出「什么观测能推翻它」。一条不可证伪的声称既不能被证实也不能被证伪 —— 审计只有两条诚实出路:改写成可证伪的形式,或标记为不可判定。**不得默认它为真。**

## 已知为假的声称(审计前即已实证)

两条在勘察阶段即被源码推翻。列此作为审计起点与尺子的校准样本。

**一、`docs/user-guide/platform-admin/README.md:11`**

声称 AC 控制台暴露 “Interface and webhook management.”。实况:`apps/web/src/app/ac/[tenantId]/interface-management/page.tsx` 与 `.../webhook-management/page.tsx` 均只渲染 `AcBusinessRouteUnavailableScreen`。该声称**对 AC scope 为假**;tenant 侧同名路由仍为真 —— 原文缺 scope 限定,这是 `ui-surface` 类最常见的失效方式。

**二、`docs/user-guide/public-presence/README.md:10`**

声称 “Homepage/studio/editor pages.”。实况:`apps/web/src/app` 下 `studio/editor` 零命中,实际路径为 `/studio/public-presence/[tenantId]/[talentId]`。但原文究竟是否在指一条路径,本身即有歧义 —— 这正是 `prose` 类的典型病症:**连「它错了没有」都要先裁定它在说什么。**

## 文件分布

| 文件 | 声称数 |
|---|---|
| `docs/user-guide/getting-started/README.md` | 16 |
| `docs/user-guide/platform-admin/README.md` | 16 |
| `docs/user-guide/troubleshooting/README.md` | 14 |
| `docs/wiki-draft/User-Guide.md` | 12 |
| `docs/user-guide/tenant-admin/README.md` | 11 |
| `docs/wiki-draft/Home.md` | 11 |
| `docs/wiki-draft/Architecture-Overview.md` | 10 |
| `docs/wiki-draft/Known-Limitations.md` | 9 |
| `docs/user-guide/public-presence/README.md` | 8 |
| `docs/user-guide/talent-workspace/README.md` | 8 |
| `docs/wiki-draft/Integrations-And-API.md` | 8 |
| `docs/user-guide/user-and-role-management/README.md` | 7 |
| `docs/wiki-draft/Admin-Console.md` | 7 |
| `docs/user-guide/account-and-security/README.md` | 6 |
| `docs/user-guide/README.md` | 6 |
| `docs/wiki-draft/Public-Presence.md` | 5 |
| `docs/user-guide/integrations/README.md` | 3 |
| `docs/user-guide/operations/README.md` | 3 |
| `docs/wiki-draft/User-And-Role-Management.md` | 3 |

## 全量清册

<!-- facts:links:ignore-start —— 以下是逐字引文,其中的相对路径以原文件为基准,不是本文件的引用 -->

### `docs/user-guide/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-001` | 55 | `prose` | Public Marshmallow visitor submission, captcha, feed, load-more, reaction, and recovery workflows. |
| `TMS-C-002` | 56 | `prose` | Password, TOTP, SSO success/linking, session revoke, email change, avatar upload, and other sensitive account mutations. |
| `TMS-C-003` | 57 | `data` | Tenant security create/import/delete/batch/test operations. |
| `TMS-C-004` | 58 | `prose` | System Dictionary destructive or maintenance operations. |
| `TMS-C-005` | 59 | `api-contract` | Adapter creation, webhook/API secret workflows, and advanced integration mutations. |
| `TMS-C-006` | 60 | `ui-surface` | Accessibility, keyboard, screen-reader, mobile, or focus claims for sensitive flows without exact proof. |

### `docs/user-guide/account-and-security/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-007` | 15 | `prose` | Review the visible labels and current account state before editing. |
| `TMS-C-008` | 16 | `prose` | Avoid using this guide as proof that a sensitive mutation is supported end to end. |
| `TMS-C-009` | 17 | `proof-status` | When a mutation is needed, require a focused proof run with cleanup/rollback evidence before promoting it to a normal operating procedure. |
| `TMS-C-010` | 37 | `proof-status` | Password rotation, TOTP setup/recovery, SSO linking, session revocation, email change, and avatar upload are excluded from accepted procedures. |
| `TMS-C-011` | 38 | `ui-surface` | Profile and security controls may be mixed in one page or flow. |
| `TMS-C-012` | 39 | `permission` | Accessibility claims remain limited where language metadata, landmarks, skip links, focus behavior, or status announcements are not proven. |

### `docs/user-guide/getting-started/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-013` | 9 | `prose` | A product or workspace name. |
| `TMS-C-014` | 10 | `ui-surface` | A left navigation menu for the active workspace. |
| `TMS-C-015` | 11 | `ui-surface` | Breadcrumbs for the current page family. |
| `TMS-C-016` | 12 | `ui-surface` | A language switcher when the route supports localization. |
| `TMS-C-017` | 13 | `ui-surface` | An account menu. |
| `TMS-C-018` | 30 | `permission` | Use AC only for platform-level administration across tenants. |
| `TMS-C-019` | 31 | `data` | Use tenant or subsidiary workspaces for operational setup, users, integrations, and organization data. |
| `TMS-C-020` | 32 | `permission` | Use talent scope for customer, report, settings, and public-presence work tied to one creator. |
| `TMS-C-021` | 33 | `ui-surface` | Use public visitor routes only to verify what unauthenticated audiences can see. |
| `TMS-C-022` | 43 | `permission` | AC is for platform administration, not ordinary tenant operations. |
| `TMS-C-023` | 44 | `permission` | Tenant is the business account; talent is the creator/public-presence scope inside that account. |
| `TMS-C-024` | 45 | `permission` | Admin preview is not the same as public visitor output. |
| `TMS-C-025` | 46 | `ui-surface` | A route that loads does not prove that submit, publish, export, or destructive actions are accepted. |
| `TMS-C-026` | 60 | `proof-status` | Full auth lifecycle beyond the G19 credential URL-safety boundary remains excluded pending bounded proof. |
| `TMS-C-027` | 61 | `ui-surface` | Some root redirects and wrong-tier route redirects remain outside the accepted login URL-safety slice. Use visible workspace navigation when possible. |
| `TMS-C-028` | 62 | `permission` | Login/root accessibility proof is current-state only and should not be described as fully accepted. |

### `docs/user-guide/integrations/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-029` | 40 | `proof-status` | Adapter creation and configuration need disposable integration fixture and cleanup proof. |
| `TMS-C-030` | 41 | `api-contract` | Webhook/API secret display, rotation, revoke, and deletion need redacted proof. |
| `TMS-C-031` | 42 | `ui-surface` | Keep secrets, auth headers, cookies, session ids, payload details, and customer-sensitive data out of screenshots and support tickets. |

### `docs/user-guide/operations/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-032` | 33 | `permission` | Runtime flag mutation requires a known affected scope and rollback proof. |
| `TMS-C-033` | 34 | `proof-status` | System Dictionary maintenance procedures are excluded pending bounded proof or owner disposition. |
| `TMS-C-034` | 35 | `prose` | Operational evidence must remain sanitized; do not retain secrets, tokens, raw payloads, or customer-sensitive diagnostics. |

### `docs/user-guide/platform-admin/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-035` | 9 | `prose` | Tenant management. |
| `TMS-C-036` | 10 | `prose` | User management. |
| `TMS-C-037` | 11 | `api-contract` | API client management. |
| `TMS-C-038` | 12 | `api-contract` | API registry and gateway readiness. |
| `TMS-C-039` | 13 | `prose` | Builder registry. |
| `TMS-C-040` | 14 | `prose` | Platform tool connections. |
| `TMS-C-041` | 15 | `prose` | Runtime flags. |
| `TMS-C-042` | 16 | `prose` | Observability. |
| `TMS-C-043` | 17 | `prose` | System dictionary. |
| `TMS-C-044` | 31 | `prose` | Is the tenant provisioned and healthy? |
| `TMS-C-045` | 32 | `prose` | Are platform integrations, registries, gateway readiness, and runtime flags in the expected state? |
| `TMS-C-046` | 33 | `data` | Do observability records show a platform-wide issue? |
| `TMS-C-047` | 34 | `prose` | Does a system dictionary change need platform-level governance? |
| `TMS-C-048` | 52 | `proof-status` | AC tenant, user-management, integration, and operations visible states are accepted only for the represented G06/G08/G09 proof slices. |
| `TMS-C-049` | 53 | `api-contract` | Adapter creation, webhook/API secrets, runtime-flag mutation, System Dictionary maintenance, and tenant-destructive operations require bounded proof b |
| `TMS-C-050` | 54 | `permission` | AC access must not be used as a shortcut around tenant/talent permission boundaries. |

### `docs/user-guide/public-presence/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-051` | 9 | `ui-surface` | Talent public page management. |
| `TMS-C-052` | 10 | `ui-surface` | Homepage/studio/editor pages. |
| `TMS-C-053` | 11 | `prose` | Preview surfaces. |
| `TMS-C-054` | 12 | `ui-surface` | Asset or page component editing. |
| `TMS-C-055` | 13 | `prose` | Marshmallow management and moderation entry points. |
| `TMS-C-056` | 41 | `proof-status` | Public Marshmallow submit/reaction writes remain excluded pending disposable fixture and cleanup proof. |
| `TMS-C-057` | 42 | `ui-surface` | Preview screenshots must be labeled as preview and must not be used as public-output proof. |
| `TMS-C-058` | 43 | `proof-status` | Marshmallow moderation/config/export procedures need API, redaction, cleanup, and accessibility proof before guide promotion. |

### `docs/user-guide/talent-workspace/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-059` | 9 | `prose` | Talent overview. |
| `TMS-C-060` | 10 | `ui-surface` | Customer-related pages. |
| `TMS-C-061` | 11 | `ui-surface` | Report pages. |
| `TMS-C-062` | 12 | `prose` | Settings. |
| `TMS-C-063` | 13 | `prose` | Public presence management. |
| `TMS-C-064` | 37 | `permission` | Keep talent work scoped to the selected creator; do not use tenant-wide or AC roles for day-to-day talent tasks. |
| `TMS-C-065` | 38 | `prose` | Any customer PII claim must respect the external PII platform boundary described in the README and reference chapter. |
| `TMS-C-066` | 39 | `proof-status` | Mutation claims outside the represented G13 customer/report/settings proof slices need row-specific proof before guide promotion. |

### `docs/user-guide/tenant-admin/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-067` | 9 | `prose` | Tenant overview and settings. |
| `TMS-C-068` | 10 | `prose` | Organization structure. |
| `TMS-C-069` | 11 | `permission` | User and role management. |
| `TMS-C-070` | 12 | `prose` | Tenant security settings. |
| `TMS-C-071` | 13 | `ui-surface` | Integration pages. |
| `TMS-C-072` | 14 | `permission` | Talent and subsidiary scope management. |
| `TMS-C-073` | 42 | `proof-status` | Tenant security management and destructive settings remain proof-gated under `OKL-G19-TENANT-SECURITY-001`. |
| `TMS-C-074` | 43 | `ui-surface` | Tenant root and wrong-tier redirect behavior remains outside any sensitive operation claim unless the exact route has proof. |
| `TMS-C-075` | 44 | `proof-status` | Security create/import/delete/batch/test procedures are excluded until focused proof or owner disposition exists. |
| `TMS-C-076` | 45 | `proof-status` | Tenant integration lifecycle procedures remain excluded unless a focused proof run closes the linked adapter/secret boundary. |
| `TMS-C-077` | 46 | `permission` | Tenant settings, security, and organization tables/repeated row actions need stronger accessible-name, keyboard, focus, and status-announcement proof  |

### `docs/user-guide/troubleshooting/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-078` | 21 | `permission` | Confirm the active workspace and scope. |
| `TMS-C-079` | 22 | `permission` | Confirm the assigned roles and inherited scope. |
| `TMS-C-080` | 23 | `proof-status` | Do not document the route as permission-clean until the hidden denied state is fixed or rechecked. |
| `TMS-C-081` | 31 | `ui-surface` | Re-enter through visible navigation. |
| `TMS-C-082` | 32 | `ui-surface` | Capture the exact route, workspace, viewport, and user. |
| `TMS-C-083` | 33 | `ui-surface` | Treat the failed route as unavailable until a source fix and recheck succeed. |
| `TMS-C-084` | 41 | `prose` | Describe it as a current grouped editor. |
| `TMS-C-085` | 42 | `ui-surface` | Prefer future UX that splits different form families into tabs, submenus, or action dialogs. |
| `TMS-C-086` | 43 | `prose` | Do not present the current grouping as the ideal workflow. |
| `TMS-C-087` | 51 | `prose` | Do not promote it into the guide as a normal procedure. |
| `TMS-C-088` | 52 | `proof-status` | Require source evidence, UI proof, cleanup/rollback evidence, and owner disposition before acceptance. |
| `TMS-C-089` | 60 | `permission` | Avoid accessibility-ready claims. |
| `TMS-C-090` | 61 | `ui-surface` | Record the page as current-state only. |
| `TMS-C-091` | 62 | `permission` | Recheck with a focused accessibility proof packet. |

### `docs/user-guide/user-and-role-management/README.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-092` | 27 | `prose` | Category filtering. |
| `TMS-C-093` | 28 | `prose` | Keyword search across labels, descriptions, categories, risk, resources, and actions. |
| `TMS-C-094` | 29 | `prose` | Grant, deny, and unset states. |
| `TMS-C-095` | 30 | `prose` | Optional advanced resource/action overrides where needed. |
| `TMS-C-096` | 54 | `permission` | Do not broaden permissions or grant wildcard roles to make a denied action disappear. |
| `TMS-C-097` | 55 | `permission` | Role editor UX should not be treated as final information architecture where metadata, permission editing, and assignment controls are mixed in one su |
| `TMS-C-098` | 56 | `permission` | Role deletion is disabled for audit history; use role governance procedures rather than deletion assumptions. |

### `docs/wiki-draft/Admin-Console.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-099` | 7 | `prose` | Tenant management. |
| `TMS-C-100` | 8 | `prose` | User management. |
| `TMS-C-101` | 9 | `api-contract` | Interface and webhook management. |
| `TMS-C-102` | 10 | `ui-surface` | API client, registry, gateway readiness, and builder registry pages. |
| `TMS-C-103` | 11 | `prose` | Platform tool connections. |
| `TMS-C-104` | 12 | `prose` | Runtime flags and observability. |
| `TMS-C-105` | 13 | `prose` | System dictionary. |

### `docs/wiki-draft/Architecture-Overview.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-106` | 16 | `permission` | AC tenant: platform-wide administration. |
| `TMS-C-107` | 17 | `prose` | Regular tenant: agency/company operations. |
| `TMS-C-108` | 18 | `permission` | Subsidiary: department or team scope. |
| `TMS-C-109` | 19 | `prose` | Talent: creator-specific work and public presence. |
| `TMS-C-110` | 20 | `data` | External PII platform: sensitive customer fields are delegated outside this repository-owned runtime. |
| `TMS-C-111` | 26 | `prose` | AC-owned questions cover tenant provisioning, platform-level policy, cross-tenant integration health, and global operational stewardship. |
| `TMS-C-112` | 27 | `prose` | Tenant-owned questions cover agency users, tenant settings, tenant integrations, and subsidiary organization. |
| `TMS-C-113` | 28 | `prose` | Subsidiary-owned questions cover team or department operating context inside one tenant. |
| `TMS-C-114` | 29 | `prose` | Talent-owned questions cover creator-specific activity, public presence, and talent-facing operational views. |
| `TMS-C-115` | 30 | `ui-surface` | External PII questions should not be solved by copying sensitive customer data into TCRN TMS docs, tickets, or screenshots. |

### `docs/wiki-draft/Home.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-116` | 11 | `prose` | [User Guide](./User-Guide.md) |
| `TMS-C-117` | 12 | `prose` | [Architecture Overview](./Architecture-Overview.md) |
| `TMS-C-118` | 13 | `permission` | [Admin Console](./Admin-Console.md) |
| `TMS-C-119` | 14 | `prose` | [Tenant Operations](./Tenant-Operations.md) |
| `TMS-C-120` | 15 | `permission` | [User And Role Management](./User-And-Role-Management.md) |
| `TMS-C-121` | 16 | `api-contract` | [Integrations And API](./Integrations-And-API.md) |
| `TMS-C-122` | 17 | `prose` | [Public Presence](./Public-Presence.md) |
| `TMS-C-123` | 18 | `prose` | [Talent Workspace](./Talent-Workspace.md) |
| `TMS-C-124` | 19 | `prose` | [Operations And Observability](./Operations-And-Observability.md) |
| `TMS-C-125` | 20 | `prose` | [Troubleshooting And FAQ](./Troubleshooting-And-FAQ.md) |
| `TMS-C-126` | 21 | `prose` | [Known Limitations](./Known-Limitations.md) |

### `docs/wiki-draft/Integrations-And-API.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-127` | 5 | `prose` | Interface management. |
| `TMS-C-128` | 6 | `api-contract` | Webhook management. |
| `TMS-C-129` | 7 | `api-contract` | API clients. |
| `TMS-C-130` | 8 | `api-contract` | API registry. |
| `TMS-C-131` | 9 | `api-contract` | API gateway readiness. |
| `TMS-C-132` | 10 | `prose` | Builder registry. |
| `TMS-C-133` | 11 | `prose` | Platform tool connections. |
| `TMS-C-134` | 12 | `api-contract` | Adapters. |

### `docs/wiki-draft/Known-Limitations.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-135` | 15 | `prose` | the feature is visible but not proven as a complete customer workflow; |
| `TMS-C-136` | 16 | `proof-status` | the feature is intentionally excluded from clean docs until a security, permission, accessibility, or runtime proof exists; |
| `TMS-C-137` | 17 | `prose` | the owner has accepted a known limitation and the guide must describe the impact honestly. |
| `TMS-C-138` | 41 | `permission` | RBAC, Initial Admin, hidden-403, and user-management represented slices: G04, G05, and G07 proof. |
| `TMS-C-139` | 42 | `prose` | AC tenant, AC integrations, and AC operations represented slices: G06, G08, and G09 proof. |
| `TMS-C-140` | 43 | `prose` | Tenant root/settings/integration/organization represented slices: G10, G11, and G12 proof. |
| `TMS-C-141` | 44 | `prose` | Talent Workspace represented slices: G13 proof. |
| `TMS-C-142` | 45 | `prose` | Public Presence authoring/preview/public-output represented slices: G14 and G15 proof. |
| `TMS-C-143` | 46 | `ui-surface` | Public Marshmallow route/form/language/focus represented read-only slices: G16 proof. |

### `docs/wiki-draft/Public-Presence.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-144` | 7 | `ui-surface` | Talent homepage management. |
| `TMS-C-145` | 8 | `prose` | Studio, preview, and editor surfaces. |
| `TMS-C-146` | 9 | `ui-surface` | Asset/page component editing. |
| `TMS-C-147` | 10 | `prose` | Marshmallow management and moderation entry points. |
| `TMS-C-148` | 11 | `ui-surface` | Public visitor pages and short links. |

### `docs/wiki-draft/User-And-Role-Management.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-149` | 5 | `permission` | `deny`: explicitly forbidden; wins over grants from other assigned roles. |
| `TMS-C-150` | 6 | `permission` | `grant`: explicitly allowed unless another assigned role denies it. |
| `TMS-C-151` | 7 | `permission` | `unset`: this role does not decide the permission. |

### `docs/wiki-draft/User-Guide.md`

| id | 行 | 类别 | 声称 |
|---|---|---|---|
| `TMS-C-152` | 5 | `prose` | [User Guide Home](../user-guide/README.md) |
| `TMS-C-153` | 6 | `api-contract` | [Getting Started](../user-guide/getting-started/README.md) |
| `TMS-C-154` | 7 | `prose` | [Account and Security](../user-guide/account-and-security/README.md) |
| `TMS-C-155` | 8 | `permission` | [Platform Admin](../user-guide/platform-admin/README.md) |
| `TMS-C-156` | 9 | `permission` | [Tenant Admin](../user-guide/tenant-admin/README.md) |
| `TMS-C-157` | 10 | `permission` | [User and Role Management](../user-guide/user-and-role-management/README.md) |
| `TMS-C-158` | 11 | `prose` | [Integrations](../user-guide/integrations/README.md) |
| `TMS-C-159` | 12 | `prose` | [Public Presence](../user-guide/public-presence/README.md) |
| `TMS-C-160` | 13 | `prose` | [Talent Workspace](../user-guide/talent-workspace/README.md) |
| `TMS-C-161` | 14 | `prose` | [Operations](../user-guide/operations/README.md) |
| `TMS-C-162` | 15 | `prose` | [Troubleshooting](../user-guide/troubleshooting/README.md) |
| `TMS-C-163` | 16 | `prose` | [Reference](../user-guide/reference/README.md) |

<!-- facts:links:ignore-end -->
