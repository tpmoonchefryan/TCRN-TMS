# API handler 事实基线

> 治理记录:`TCRN-TMS-STORY-006`(Epic `TCRN-TMS-EPIC-002`)· 分解裁定 minutes `TCRN-TMS-MIN-001` · 门 `TCRN-TMS-GATE-002`
>
> **本文件由 `scripts/facts-generate-api.mjs` 生成,请勿手改。** 重跑 `node scripts/facts-generate-api.mjs` 覆盖;`--check` 校验一致性。

## 分母

- **398** 条 handler,来自 **60** 个 controller 文件。
- 归一化路由清单内容 sha256:`77e420714dbb881e19101a2bcc3d9d5f8af73ffd9e4bbbf1f7ee0b48b323cd86`
- 该分母已由两个独立提取器逐条互钉,详见 [`_meta/denominator-registry.md`](_meta/denominator-registry.md)。

## 权威层级

全部 `api-contract` 级(来源=controller 装饰器)。按 [权威序](README.md#权威序),该层级可支撑 `proven`。

## 汇总

| 指标 | 数量 |
|---|---|
| handler 总数 | 398 |
| controller 文件数 | 60 |
| 带权限装饰器 | 302 |
| 标记为 public | 34 |
| **既无权限也非 public** | **62** |
| 缺 `@ApiOperation` | 10 |
| 缺 `@ApiResponse` | 139 |

「既无权限也非 public」的 62 条是待判定项,逐条判定见 `TCRN-TMS-STORY-011`。

## 事实表

每行一条 fact,`confidence: proven`(证据=controller 源码位置),`authority_tier: api-contract`。

| id | 方法 | 路径 | 证据 locator | 权限 | ApiOperation | ApiResponse |
|---|---|---|---|---|---|---|
| `TMS-F-API-001` | `DELETE` | `/auth/sso/account-links/{linkId}` | apps/api/src/modules/auth/auth.controller.ts:318 | **—** | ✓ | ✗ |
| `TMS-F-API-002` | `DELETE` | `/blocklist-entries/{id}` | apps/api/src/modules/security/controllers/security.controller.ts:289 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-003` | `DELETE` | `/delegated-admins/{id}` | apps/api/src/modules/delegated-admin/delegated-admin.controller.ts:137 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-004` | `DELETE` | `/email-templates/{code}` | apps/api/src/modules/email/controllers/email-template.controller.ts:301 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-005` | `DELETE` | `/exports/{jobId}` | apps/api/src/modules/export/controllers/export.controller.ts:299 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-006` | `DELETE` | `/external-blocklist/{id}` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:341 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-007` | `DELETE` | `/integration/webhooks/{webhookId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:552 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-008` | `DELETE` | `/ip-access-rules/{id}` | apps/api/src/modules/security/controllers/security.controller.ts:508 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-009` | `DELETE` | `/reports/mfr/jobs/{jobId}` | apps/api/src/modules/report/controllers/report.controller.ts:620 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-010` | `DELETE` | `/roles/{roleId}` | apps/api/src/modules/role/role.controller.ts:950 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-011` | `DELETE` | `/system-dictionary/{type}/items/{itemId}` | apps/api/src/modules/dictionary/dictionary.controller.ts:878 | **—** | ✓ | ✓ |
| `TMS-F-API-012` | `DELETE` | `/system-roles/{systemRoleId}` | apps/api/src/modules/system-role/system-role.controller.ts:414 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-013` | `DELETE` | `/talents/{talentId}` | apps/api/src/modules/talent/talent.controller.ts:1831 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-014` | `DELETE` | `/talents/{talentId}/customers/{customerId}/external-ids/{externalIdId}` | apps/api/src/modules/customer/controllers/external-id.controller.ts:139 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-015` | `DELETE` | `/talents/{talentId}/imports/customers/{type}/{jobId}` | apps/api/src/modules/import/controllers/import.controller.ts:610 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-016` | `DELETE` | `/users/{userId}/roles/{assignmentId}` | apps/api/src/modules/role/user-role.controller.ts:187 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-017` | `DELETE` | `/users/me/avatar` | apps/api/src/modules/auth/auth.controller.ts:2109 | **—** | ✓ | ✗ |
| `TMS-F-API-018` | `DELETE` | `/users/me/sessions/{id}` | apps/api/src/modules/auth/auth.controller.ts:1979 | **—** | ✓ | ✗ |
| `TMS-F-API-019` | `GET` | `/` | apps/api/src/app.controller.ts:12 | **—** | ✓ | ✓ |
| `TMS-F-API-020` | `GET` | `/api-gateway-readiness/cutover-runbook` | apps/api/src/modules/api-gateway-readiness/api-gateway-readiness.controller.ts:57 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-021` | `GET` | `/api-gateway-readiness/rendered/{provider}` | apps/api/src/modules/api-gateway-readiness/api-gateway-readiness.controller.ts:42 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-022` | `GET` | `/api-gateway-readiness/route-policy` | apps/api/src/modules/api-gateway-readiness/api-gateway-readiness.controller.ts:33 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-023` | `GET` | `/api-gateway-readiness/summary` | apps/api/src/modules/api-gateway-readiness/api-gateway-readiness.controller.ts:24 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-024` | `GET` | `/api-registry/builder-readonly-export` | apps/api/src/modules/api-registry/api-registry.controller.ts:104 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-025` | `GET` | `/api-registry/document` | apps/api/src/modules/api-registry/api-registry.controller.ts:69 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-026` | `GET` | `/api-registry/drift-report` | apps/api/src/modules/api-registry/api-registry.controller.ts:80 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-027` | `GET` | `/api-registry/gateway-route-manifest` | apps/api/src/modules/api-registry/api-registry.controller.ts:96 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-028` | `GET` | `/api-registry/swagger-exposure-policy` | apps/api/src/modules/api-registry/api-registry.controller.ts:88 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-029` | `GET` | `/auth/oauth/authorize` | apps/api/src/modules/auth/auth.controller.ts:1237 | _public_ | ✓ | ✗ |
| `TMS-F-API-030` | `GET` | `/auth/sso/account-link-providers` | apps/api/src/modules/auth/auth.controller.ts:263 | **—** | ✓ | ✗ |
| `TMS-F-API-031` | `GET` | `/auth/sso/account-links` | apps/api/src/modules/auth/auth.controller.ts:256 | **—** | ✓ | ✗ |
| `TMS-F-API-032` | `GET` | `/auth/sso/admin/providers` | apps/api/src/modules/auth/auth.controller.ts:336 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-033` | `GET` | `/auth/sso/callback/{providerCode}` | apps/api/src/modules/auth/auth.controller.ts:192 | _public_ | ✓ | ✗ |
| `TMS-F-API-034` | `GET` | `/auth/sso/external-tools/readiness` | apps/api/src/modules/auth/auth.controller.ts:445 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-035` | `GET` | `/auth/sso/providers` | apps/api/src/modules/auth/auth.controller.ts:168 | _public_ | ✓ | ✗ |
| `TMS-F-API-036` | `GET` | `/blocklist-entries` | apps/api/src/modules/security/controllers/security.controller.ts:104 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-037` | `GET` | `/blocklist-entries/{id}` | apps/api/src/modules/security/controllers/security.controller.ts:206 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-038` | `GET` | `/builder-registry/artifacts/{artifactKind}` | apps/api/src/modules/builder-registry/builder-registry.controller.ts:77 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-039` | `GET` | `/builder-registry/composed-dry-run/ac-capability-surface-overview` | apps/api/src/modules/builder-registry/builder-registry.controller.ts:109 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-040` | `GET` | `/builder-registry/modules` | apps/api/src/modules/builder-registry/builder-registry.controller.ts:50 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-041` | `GET` | `/builder-registry/operations/{operationCode}` | apps/api/src/modules/builder-registry/builder-registry.controller.ts:59 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-042` | `GET` | `/builder-registry/summary` | apps/api/src/modules/builder-registry/builder-registry.controller.ts:41 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-043` | `GET` | `/compliance/report` | apps/api/src/modules/log/controllers/compliance-report.controller.ts:24 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-044` | `GET` | `/configuration-entity/{entityType}` | apps/api/src/modules/config/config.controller.ts:649 | **—** | ✓ | ✗ |
| `TMS-F-API-045` | `GET` | `/configuration-entity/{entityType}/{id}` | apps/api/src/modules/config/config.controller.ts:727 | **—** | ✓ | ✗ |
| `TMS-F-API-046` | `GET` | `/configuration-entity/blocklist-entry/effective` | apps/api/src/modules/config/config.controller.ts:1011 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-047` | `GET` | `/configuration-entity/membership-classes/{classId}/types` | apps/api/src/modules/config/config.controller.ts:587 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-048` | `GET` | `/configuration-entity/membership-tree` | apps/api/src/modules/config/config.controller.ts:563 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-049` | `GET` | `/configuration-entity/membership-types/{typeId}/levels` | apps/api/src/modules/config/config.controller.ts:618 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-050` | `GET` | `/delegated-admins` | apps/api/src/modules/delegated-admin/delegated-admin.controller.ts:63 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-051` | `GET` | `/delegated-admins/my-scopes` | apps/api/src/modules/delegated-admin/delegated-admin.controller.ts:153 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-052` | `GET` | `/email-templates` | apps/api/src/modules/email/controllers/email-template.controller.ts:163 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-053` | `GET` | `/email-templates/{code}` | apps/api/src/modules/email/controllers/email-template.controller.ts:200 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-054` | `GET` | `/email/config` | apps/api/src/modules/email/controllers/email-config.controller.ts:203 | **—** | ✓ | ✓ |
| `TMS-F-API-055` | `GET` | `/email/sender-domains` | apps/api/src/modules/email/controllers/tenant-sending-domain.controller.ts:232 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-056` | `GET` | `/email/tenants/{tenantId}/sending-domains` | apps/api/src/modules/email/controllers/tenant-sending-domain.controller.ts:185 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-057` | `GET` | `/event-backbone/bullmq-classification` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:38 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-058` | `GET` | `/event-backbone/policy` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:46 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-059` | `GET` | `/event-backbone/registry` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:18 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-060` | `GET` | `/event-backbone/subject-mapping` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:26 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-061` | `GET` | `/event-backbone/summary` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:54 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-062` | `GET` | `/exports` | apps/api/src/modules/export/controllers/export.controller.ts:181 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-063` | `GET` | `/exports/{jobId}` | apps/api/src/modules/export/controllers/export.controller.ts:215 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-064` | `GET` | `/exports/{jobId}/download` | apps/api/src/modules/export/controllers/export.controller.ts:252 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-065` | `GET` | `/external-blocklist` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:63 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-066` | `GET` | `/external-blocklist/{id}` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:196 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-067` | `GET` | `/external-blocklist/scope/{scopeType}/{scopeId}` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:108 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-068` | `GET` | `/external-blocklist/talent/{talentId}` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:155 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-069` | `GET` | `/health` | apps/api/src/modules/health/health.controller.ts:67 | _public_ | ✓ | ✓ |
| `TMS-F-API-070` | `GET` | `/health/live` | apps/api/src/modules/health/health.controller.ts:78 | _public_ | ✓ | ✓ |
| `TMS-F-API-071` | `GET` | `/health/ready` | apps/api/src/modules/health/health.controller.ts:85 | _public_ | ✓ | ✓ |
| `TMS-F-API-072` | `GET` | `/integration/adapter-definitions` | apps/api/src/modules/integration/controllers/integration.controller.ts:262 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-073` | `GET` | `/integration/adapters` | apps/api/src/modules/integration/controllers/integration.controller.ts:276 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-074` | `GET` | `/integration/adapters/{adapterId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:335 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-075` | `GET` | `/integration/adapters/effective/{platformCode}` | apps/api/src/modules/integration/controllers/integration.controller.ts:315 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-076` | `GET` | `/integration/webhook-definitions` | apps/api/src/modules/integration/controllers/integration.controller.ts:269 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-077` | `GET` | `/integration/webhooks` | apps/api/src/modules/integration/controllers/integration.controller.ts:404 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-078` | `GET` | `/integration/webhooks/{webhookId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:529 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-079` | `GET` | `/integration/webhooks/{webhookId}/delivery-attempts` | apps/api/src/modules/integration/controllers/integration.controller.ts:437 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-080` | `GET` | `/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:454 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-081` | `GET` | `/integration/webhooks/events` | apps/api/src/modules/integration/controllers/integration.controller.ts:425 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-082` | `GET` | `/internal/domain-check` | apps/api/src/modules/homepage/controllers/internal-domain.controller.ts:26 | _public_ | ✗ | ✗ |
| `TMS-F-API-083` | `GET` | `/ip-access-rules` | apps/api/src/modules/security/controllers/security.controller.ts:414 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-084` | `GET` | `/logs/changes` | apps/api/src/modules/log/controllers/change-log.controller.ts:22 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-085` | `GET` | `/logs/changes/object/{objectType}/{objectId}` | apps/api/src/modules/log/controllers/change-log.controller.ts:44 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-086` | `GET` | `/logs/changes/operator/{operatorId}` | apps/api/src/modules/log/controllers/change-log.controller.ts:77 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-087` | `GET` | `/logs/events` | apps/api/src/modules/log/controllers/tech-event-log.controller.ts:23 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-088` | `GET` | `/logs/events/trace/{traceId}` | apps/api/src/modules/log/controllers/tech-event-log.controller.ts:45 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-089` | `GET` | `/logs/integrations` | apps/api/src/modules/log/controllers/integration-log.controller.ts:23 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-090` | `GET` | `/logs/integrations/failed` | apps/api/src/modules/log/controllers/integration-log.controller.ts:68 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-091` | `GET` | `/logs/integrations/trace/{traceId}` | apps/api/src/modules/log/controllers/integration-log.controller.ts:45 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-092` | `GET` | `/logs/search` | apps/api/src/modules/log/controllers/log-search.controller.ts:122 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-093` | `GET` | `/logs/search/change-logs` | apps/api/src/modules/log/controllers/log-search.controller.ts:199 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-094` | `GET` | `/logs/search/events` | apps/api/src/modules/log/controllers/log-search.controller.ts:236 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-095` | `GET` | `/logs/search/integrations` | apps/api/src/modules/log/controllers/log-search.controller.ts:275 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-096` | `GET` | `/module-capabilities/effective` | apps/api/src/modules/tenant/module-capability.controller.ts:15 | **—** | ✓ | ✓ |
| `TMS-F-API-097` | `GET` | `/module-capabilities/registry` | apps/api/src/modules/tenant/module-capability.controller.ts:28 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-098` | `GET` | `/observability/adapters/{adapterCode}/deep-link` | apps/api/src/modules/observability-adapters/observability-adapters.controller.ts:46 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-099` | `GET` | `/observability/adapters/definitions` | apps/api/src/modules/observability-adapters/observability-adapters.controller.ts:21 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-100` | `GET` | `/observability/adapters/policy` | apps/api/src/modules/observability-adapters/observability-adapters.controller.ts:28 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-101` | `GET` | `/observability/adapters/summary` | apps/api/src/modules/observability-adapters/observability-adapters.controller.ts:35 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-102` | `GET` | `/organization/path/{subpath}` | apps/api/src/modules/organization/organization.controller.ts:828 | **—** | ✓ | ✓ |
| `TMS-F-API-103` | `GET` | `/organization/settings` | apps/api/src/modules/settings/settings.controller.ts:349 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-104` | `GET` | `/organization/settings/artist-lifecycle-flow` | apps/api/src/modules/settings/settings.controller.ts:410 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-105` | `GET` | `/organization/settings/turnstile` | apps/api/src/modules/settings/settings.controller.ts:441 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-106` | `GET` | `/organization/tree` | apps/api/src/modules/organization/organization.controller.ts:580 | **—** | ✓ | ✓ |
| `TMS-F-API-107` | `GET` | `/organization/tree/children` | apps/api/src/modules/organization/organization.controller.ts:770 | **—** | ✓ | ✓ |
| `TMS-F-API-108` | `GET` | `/organization/tree/root` | apps/api/src/modules/organization/organization.controller.ts:711 | **—** | ✓ | ✓ |
| `TMS-F-API-109` | `GET` | `/permissions` | apps/api/src/modules/permission/permission.controller.ts:143 | **—** | ✓ | ✗ |
| `TMS-F-API-110` | `GET` | `/permissions/resources` | apps/api/src/modules/permission/permission.controller.ts:175 | **—** | ✓ | ✗ |
| `TMS-F-API-111` | `GET` | `/pii-service-configs` | apps/api/src/modules/pii-config/controllers/pii-service-config.controller.ts:71 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-112` | `GET` | `/pii-service-configs/{id}` | apps/api/src/modules/pii-config/controllers/pii-service-config.controller.ts:100 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-113` | `GET` | `/platform-tools/connections` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:28 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-114` | `GET` | `/platform-tools/connections/{toolCode}` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:39 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-115` | `GET` | `/platform-tools/connections/{toolCode}/deep-link` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:75 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-116` | `GET` | `/platform-tools/definitions` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:21 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-117` | `GET` | `/platform-tools/deployment-boundary` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:87 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-118` | `GET` | `/platform/config` | apps/api/src/modules/config/global-config.controller.ts:480 | **—** | ✓ | ✓ |
| `TMS-F-API-119` | `GET` | `/platform/config/{key}` | apps/api/src/modules/config/global-config.controller.ts:365 | **—** | ✓ | ✓ |
| `TMS-F-API-120` | `GET` | `/profile-stores` | apps/api/src/modules/pii-config/controllers/profile-store.controller.ts:268 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-121` | `GET` | `/profile-stores/{id}` | apps/api/src/modules/pii-config/controllers/profile-store.controller.ts:298 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-122` | `GET` | `/public-presence/assets` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:68 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-123` | `GET` | `/public-presence/assets/{assetId}` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:84 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-124` | `GET` | `/public-presence/assets/{assetId}/revisions` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:101 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-125` | `GET` | `/public/assets/{bucket}/{key}` | apps/api/src/modules/public/public-assets.controller.ts:35 | _public_ | ✓ | ✗ |
| `TMS-F-API-126` | `GET` | `/public/domain-lookup` | apps/api/src/modules/homepage/controllers/domain-lookup.controller.ts:76 | _public_ | ✓ | ✓ |
| `TMS-F-API-127` | `GET` | `/public/domain-lookup/{hostname}` | apps/api/src/modules/public/public-domain.controller.ts:21 | _public_ | ✓ | ✗ |
| `TMS-F-API-128` | `GET` | `/public/homepage/{path}` | apps/api/src/modules/homepage/controllers/public-homepage.controller.ts:173 | _public_ | ✗ | ✓ |
| `TMS-F-API-129` | `GET` | `/public/homepage/{path}/calendar.ics` | apps/api/src/modules/homepage/controllers/calendar.controller.ts:43 | _public_ | ✓ | ✓ |
| `TMS-F-API-130` | `GET` | `/public/homepage/{tenantCode}/{talentCode}` | apps/api/src/modules/homepage/controllers/public-homepage.controller.ts:139 | _public_ | ✗ | ✓ |
| `TMS-F-API-131` | `GET` | `/public/marshmallow/{path}/config` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:91 | _public_ | ✓ | ✓ |
| `TMS-F-API-132` | `GET` | `/public/marshmallow/{path}/messages` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:161 | _public_ | ✓ | ✓ |
| `TMS-F-API-133` | `GET` | `/public/marshmallow/{tenantCode}/{talentCode}/config` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:62 | _public_ | ✓ | ✓ |
| `TMS-F-API-134` | `GET` | `/public/marshmallow/{tenantCode}/{talentCode}/messages` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:118 | _public_ | ✓ | ✓ |
| `TMS-F-API-135` | `GET` | `/rate-limit/stats` | apps/api/src/modules/security/controllers/rate-limit-stats.controller.ts:142 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-136` | `GET` | `/reports/catalog` | apps/api/src/modules/report/controllers/report-catalog.controller.ts:179 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-137` | `GET` | `/reports/catalog/{reportId}` | apps/api/src/modules/report/controllers/report-catalog.controller.ts:201 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-138` | `GET` | `/reports/mfr/jobs` | apps/api/src/modules/report/controllers/report.controller.ts:472 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-139` | `GET` | `/reports/mfr/jobs/{jobId}` | apps/api/src/modules/report/controllers/report.controller.ts:510 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-140` | `GET` | `/reports/mfr/jobs/{jobId}/download` | apps/api/src/modules/report/controllers/report.controller.ts:560 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-141` | `GET` | `/roles` | apps/api/src/modules/role/role.controller.ts:569 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-142` | `GET` | `/roles/{roleId}` | apps/api/src/modules/role/role.controller.ts:680 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-143` | `GET` | `/runtime-flags/adapters` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:33 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-144` | `GET` | `/runtime-flags/definitions` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:40 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-145` | `GET` | `/runtime-flags/policy` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:47 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-146` | `GET` | `/runtime-flags/provider-readiness` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:65 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-147` | `GET` | `/runtime-flags/summary` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:54 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-148` | `GET` | `/subsidiaries` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:528 | **—** | ✓ | ✓ |
| `TMS-F-API-149` | `GET` | `/subsidiaries/{subsidiaryId}` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:643 | **—** | ✓ | ✓ |
| `TMS-F-API-150` | `GET` | `/subsidiaries/{subsidiaryId}/integration/adapters` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:43 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-151` | `GET` | `/subsidiaries/{subsidiaryId}/integration/adapters/effective/{platformCode}` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:84 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-152` | `GET` | `/subsidiaries/{subsidiaryId}/settings` | apps/api/src/modules/settings/settings.controller.ts:489 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-153` | `GET` | `/subsidiaries/{subsidiaryId}/settings/artist-lifecycle-flow` | apps/api/src/modules/settings/settings.controller.ts:525 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-154` | `GET` | `/system-dictionary` | apps/api/src/modules/dictionary/dictionary.controller.ts:563 | **—** | ✓ | ✓ |
| `TMS-F-API-155` | `GET` | `/system-dictionary/{type}` | apps/api/src/modules/dictionary/dictionary.controller.ts:585 | **—** | ✓ | ✓ |
| `TMS-F-API-156` | `GET` | `/system-dictionary/{type}/{code}` | apps/api/src/modules/dictionary/dictionary.controller.ts:641 | **—** | ✓ | ✓ |
| `TMS-F-API-157` | `GET` | `/system-roles` | apps/api/src/modules/system-role/system-role.controller.ts:307 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-158` | `GET` | `/system-roles/{systemRoleId}` | apps/api/src/modules/system-role/system-role.controller.ts:340 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-159` | `GET` | `/system-users` | apps/api/src/modules/system-user/system-user.controller.ts:619 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-160` | `GET` | `/system-users/{systemUserId}` | apps/api/src/modules/system-user/system-user.controller.ts:711 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-161` | `GET` | `/system-users/{systemUserId}/scope-access` | apps/api/src/modules/system-user/system-user.controller.ts:1018 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-162` | `GET` | `/talents` | apps/api/src/modules/talent/talent.controller.ts:1389 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-163` | `GET` | `/talents/{talentId}` | apps/api/src/modules/talent/talent.controller.ts:1694 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-164` | `GET` | `/talents/{talentId}/custom-domain` | apps/api/src/modules/talent/talent.controller.ts:2237 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-165` | `GET` | `/talents/{talentId}/customers` | apps/api/src/modules/customer/controllers/customer.controller.ts:73 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-166` | `GET` | `/talents/{talentId}/customers/{customerId}` | apps/api/src/modules/customer/controllers/customer.controller.ts:116 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-167` | `GET` | `/talents/{talentId}/customers/{customerId}/external-ids` | apps/api/src/modules/customer/controllers/external-id.controller.ts:36 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-168` | `GET` | `/talents/{talentId}/customers/{customerId}/memberships` | apps/api/src/modules/customer/controllers/membership.controller.ts:50 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-169` | `GET` | `/talents/{talentId}/customers/{customerId}/platform-identities` | apps/api/src/modules/customer/controllers/platform-identity.controller.ts:52 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-170` | `GET` | `/talents/{talentId}/customers/{customerId}/platform-identities/history` | apps/api/src/modules/customer/controllers/platform-identity.controller.ts:218 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-171` | `GET` | `/talents/{talentId}/homepage` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:350 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-172` | `GET` | `/talents/{talentId}/homepage/versions` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:624 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-173` | `GET` | `/talents/{talentId}/homepage/versions/{versionId}` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:674 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-174` | `GET` | `/talents/{talentId}/imports/customers` | apps/api/src/modules/import/controllers/import.controller.ts:452 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-175` | `GET` | `/talents/{talentId}/imports/customers/{type}/{jobId}` | apps/api/src/modules/import/controllers/import.controller.ts:496 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-176` | `GET` | `/talents/{talentId}/imports/customers/{type}/{jobId}/errors` | apps/api/src/modules/import/controllers/import.controller.ts:551 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-177` | `GET` | `/talents/{talentId}/imports/customers/companies/template` | apps/api/src/modules/import/controllers/import.controller.ts:242 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-178` | `GET` | `/talents/{talentId}/imports/customers/individuals/template` | apps/api/src/modules/import/controllers/import.controller.ts:200 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-179` | `GET` | `/talents/{talentId}/integration/adapters` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:167 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-180` | `GET` | `/talents/{talentId}/integration/adapters/effective/{platformCode}` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:208 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-181` | `GET` | `/talents/{talentId}/marshmallow/config` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:103 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-182` | `GET` | `/talents/{talentId}/marshmallow/export/{jobId}` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:804 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-183` | `GET` | `/talents/{talentId}/marshmallow/export/{jobId}/download` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:845 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-184` | `GET` | `/talents/{talentId}/marshmallow/messages` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:436 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-185` | `GET` | `/talents/{talentId}/public-presence` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:85 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-186` | `GET` | `/talents/{talentId}/public-presence/preview` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:109 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-187` | `GET` | `/talents/{talentId}/publish-readiness` | apps/api/src/modules/talent/talent.controller.ts:1935 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-188` | `GET` | `/talents/{talentId}/settings` | apps/api/src/modules/settings/settings.controller.ts:652 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-189` | `GET` | `/talents/{talentId}/settings/artist-lifecycle-flow` | apps/api/src/modules/settings/settings.controller.ts:688 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-190` | `GET` | `/talents/custom-domain-bindings` | apps/api/src/modules/talent/talent.controller.ts:1510 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-191` | `GET` | `/tenants` | apps/api/src/modules/tenant/tenant.controller.ts:663 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-192` | `GET` | `/tenants/{tenantId}` | apps/api/src/modules/tenant/tenant.controller.ts:884 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-193` | `GET` | `/tenants/{tenantId}/capabilities` | apps/api/src/modules/tenant/tenant.controller.ts:951 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-194` | `GET` | `/users/{userId}/roles` | apps/api/src/modules/role/user-role.controller.ts:73 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-195` | `GET` | `/users/me` | apps/api/src/modules/auth/auth.controller.ts:1271 | **—** | ✓ | ✓ |
| `TMS-F-API-196` | `GET` | `/users/me/permissions` | apps/api/src/modules/permission/my-permissions.controller.ts:51 | **—** | ✓ | ✗ |
| `TMS-F-API-197` | `GET` | `/users/me/sessions` | apps/api/src/modules/auth/auth.controller.ts:1926 | **—** | ✓ | ✓ |
| `TMS-F-API-198` | `PATCH` | `/auth/sso/admin/providers/{providerCode}` | apps/api/src/modules/auth/auth.controller.ts:392 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-199` | `PATCH` | `/auth/sso/external-tools/readiness/{toolCode}` | apps/api/src/modules/auth/auth.controller.ts:453 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-200` | `PATCH` | `/blocklist-entries/{id}` | apps/api/src/modules/security/controllers/security.controller.ts:241 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-201` | `PATCH` | `/configuration-entity/{entityType}/{id}` | apps/api/src/modules/config/config.controller.ts:760 | **—** | ✓ | ✗ |
| `TMS-F-API-202` | `PATCH` | `/email-templates/{code}` | apps/api/src/modules/email/controllers/email-template.controller.ts:264 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-203` | `PATCH` | `/email/config` | apps/api/src/modules/email/controllers/email-config.controller.ts:230 | **—** | ✓ | ✓ |
| `TMS-F-API-204` | `PATCH` | `/email/sender-domains` | apps/api/src/modules/email/controllers/tenant-sending-domain.controller.ts:246 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-205` | `PATCH` | `/email/tenants/{tenantId}/sending-domains` | apps/api/src/modules/email/controllers/tenant-sending-domain.controller.ts:207 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-206` | `PATCH` | `/external-blocklist/{id}` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:286 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-207` | `PATCH` | `/integration/adapters/{adapterId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:346 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-208` | `PATCH` | `/integration/adapters/{adapterId}/configs` | apps/api/src/modules/integration/controllers/integration.controller.ts:380 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-209` | `PATCH` | `/integration/webhooks/{webhookId}` | apps/api/src/modules/integration/controllers/integration.controller.ts:540 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-210` | `PATCH` | `/organization/settings` | apps/api/src/modules/settings/settings.controller.ts:376 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-211` | `PATCH` | `/organization/settings/artist-lifecycle-flow` | apps/api/src/modules/settings/settings.controller.ts:424 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-212` | `PATCH` | `/organization/settings/turnstile` | apps/api/src/modules/settings/settings.controller.ts:458 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-213` | `PATCH` | `/pii-service-configs/{id}` | apps/api/src/modules/pii-config/controllers/pii-service-config.controller.ts:163 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-214` | `PATCH` | `/platform-tools/connections/{toolCode}` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:51 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-215` | `PATCH` | `/platform/config/{key}` | apps/api/src/modules/config/global-config.controller.ts:416 | **—** | ✓ | ✓ |
| `TMS-F-API-216` | `PATCH` | `/profile-stores/{id}` | apps/api/src/modules/pii-config/controllers/profile-store.controller.ts:386 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-217` | `PATCH` | `/roles/{roleId}` | apps/api/src/modules/role/role.controller.ts:747 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-218` | `PATCH` | `/roles/{roleId}/permissions` | apps/api/src/modules/role/role.controller.ts:798 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-219` | `PATCH` | `/runtime-flags/kill-switches/{switchId}/deactivate` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:98 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-220` | `PATCH` | `/subsidiaries/{subsidiaryId}` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:704 | **—** | ✓ | ✓ |
| `TMS-F-API-221` | `PATCH` | `/subsidiaries/{subsidiaryId}/settings` | apps/api/src/modules/settings/settings.controller.ts:555 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-222` | `PATCH` | `/subsidiaries/{subsidiaryId}/settings/reset` | apps/api/src/modules/settings/settings.controller.ts:604 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-223` | `PATCH` | `/system-dictionary/{type}` | apps/api/src/modules/dictionary/dictionary.controller.ts:723 | **—** | ✓ | ✓ |
| `TMS-F-API-224` | `PATCH` | `/system-dictionary/{type}/items/{itemId}` | apps/api/src/modules/dictionary/dictionary.controller.ts:816 | **—** | ✓ | ✓ |
| `TMS-F-API-225` | `PATCH` | `/system-roles/{systemRoleId}` | apps/api/src/modules/system-role/system-role.controller.ts:384 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-226` | `PATCH` | `/system-users/{systemUserId}` | apps/api/src/modules/system-user/system-user.controller.ts:789 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-227` | `PATCH` | `/talents/{talentId}` | apps/api/src/modules/talent/talent.controller.ts:1776 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-228` | `PATCH` | `/talents/{talentId}/custom-domain/inherited-selections` | apps/api/src/modules/talent/talent.controller.ts:2365 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-229` | `PATCH` | `/talents/{talentId}/custom-domain/paths` | apps/api/src/modules/talent/talent.controller.ts:2410 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-230` | `PATCH` | `/talents/{talentId}/custom-domain/ssl-mode` | apps/api/src/modules/talent/talent.controller.ts:2446 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-231` | `PATCH` | `/talents/{talentId}/customers/{customerId}/memberships/{recordId}` | apps/api/src/modules/customer/controllers/membership.controller.ts:145 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-232` | `PATCH` | `/talents/{talentId}/customers/{customerId}/platform-identities/{identityId}` | apps/api/src/modules/customer/controllers/platform-identity.controller.ts:155 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-233` | `PATCH` | `/talents/{talentId}/customers/companies/{customerId}` | apps/api/src/modules/customer/controllers/customer.controller.ts:468 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-234` | `PATCH` | `/talents/{talentId}/customers/individuals/{customerId}` | apps/api/src/modules/customer/controllers/customer.controller.ts:208 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-235` | `PATCH` | `/talents/{talentId}/customers/individuals/{customerId}/pii` | apps/api/src/modules/customer/controllers/customer.controller.ts:365 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-236` | `PATCH` | `/talents/{talentId}/homepage/draft` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:448 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-237` | `PATCH` | `/talents/{talentId}/homepage/settings` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:580 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-238` | `PATCH` | `/talents/{talentId}/marshmallow/config` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:138 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-239` | `PATCH` | `/talents/{talentId}/marshmallow/messages/{messageId}` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:707 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-240` | `PATCH` | `/talents/{talentId}/public-presence/draft` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:168 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-241` | `PATCH` | `/talents/{talentId}/settings` | apps/api/src/modules/settings/settings.controller.ts:714 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-242` | `PATCH` | `/talents/{talentId}/settings/reset` | apps/api/src/modules/settings/settings.controller.ts:763 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-243` | `PATCH` | `/talents/custom-domain-bindings/{domainId}` | apps/api/src/modules/talent/talent.controller.ts:1607 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-244` | `PATCH` | `/tenants/{tenantId}` | apps/api/src/modules/tenant/tenant.controller.ts:1010 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-245` | `PATCH` | `/users/{userId}/roles/{assignmentId}` | apps/api/src/modules/role/user-role.controller.ts:156 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-246` | `PATCH` | `/users/me` | apps/api/src/modules/auth/auth.controller.ts:1367 | **—** | ✓ | ✓ |
| `TMS-F-API-247` | `POST` | `/auth/forgot-password` | apps/api/src/modules/auth/auth.controller.ts:764 | _public_ | ✓ | ✗ |
| `TMS-F-API-248` | `POST` | `/auth/login` | apps/api/src/modules/auth/auth.controller.ts:491 | _public_ | ✓ | ✓ |
| `TMS-F-API-249` | `POST` | `/auth/logout` | apps/api/src/modules/auth/auth.controller.ts:1142 | **—** | ✓ | ✓ |
| `TMS-F-API-250` | `POST` | `/auth/logout-all` | apps/api/src/modules/auth/auth.controller.ts:1200 | **—** | ✓ | ✗ |
| `TMS-F-API-251` | `POST` | `/auth/password/reset` | apps/api/src/modules/auth/auth.controller.ts:668 | _public_ | ✓ | ✗ |
| `TMS-F-API-252` | `POST` | `/auth/recovery-code/verify` | apps/api/src/modules/auth/auth.controller.ts:1033 | _public_ | ✓ | ✗ |
| `TMS-F-API-253` | `POST` | `/auth/refresh` | apps/api/src/modules/auth/auth.controller.ts:1070 | _public_ | ✓ | ✓ |
| `TMS-F-API-254` | `POST` | `/auth/reset-password-by-token` | apps/api/src/modules/auth/auth.controller.ts:890 | _public_ | ✓ | ✗ |
| `TMS-F-API-255` | `POST` | `/auth/sso/account-links/complete` | apps/api/src/modules/auth/auth.controller.ts:293 | **—** | ✓ | ✗ |
| `TMS-F-API-256` | `POST` | `/auth/sso/account-links/start` | apps/api/src/modules/auth/auth.controller.ts:270 | **—** | ✓ | ✗ |
| `TMS-F-API-257` | `POST` | `/auth/sso/exchange` | apps/api/src/modules/auth/auth.controller.ts:208 | _public_ | ✓ | ✗ |
| `TMS-F-API-258` | `POST` | `/auth/sso/start` | apps/api/src/modules/auth/auth.controller.ts:179 | _public_ | ✓ | ✗ |
| `TMS-F-API-259` | `POST` | `/auth/totp/verify` | apps/api/src/modules/auth/auth.controller.ts:633 | _public_ | ✓ | ✗ |
| `TMS-F-API-260` | `POST` | `/blocklist-entries` | apps/api/src/modules/security/controllers/security.controller.ts:141 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-261` | `POST` | `/blocklist-entries/{id}/disable` | apps/api/src/modules/security/controllers/security.controller.ts:326 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-262` | `POST` | `/blocklist-entries/{id}/enable` | apps/api/src/modules/security/controllers/security.controller.ts:368 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-263` | `POST` | `/blocklist-entries/test` | apps/api/src/modules/security/controllers/security.controller.ts:178 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-264` | `POST` | `/configuration-entity/{entityType}` | apps/api/src/modules/config/config.controller.ts:688 | **—** | ✓ | ✗ |
| `TMS-F-API-265` | `POST` | `/configuration-entity/{entityType}/{id}/deactivate` | apps/api/src/modules/config/config.controller.ts:801 | **—** | ✓ | ✗ |
| `TMS-F-API-266` | `POST` | `/configuration-entity/{entityType}/{id}/disable` | apps/api/src/modules/config/config.controller.ts:862 | **—** | ✓ | ✗ |
| `TMS-F-API-267` | `POST` | `/configuration-entity/{entityType}/{id}/enable` | apps/api/src/modules/config/config.controller.ts:892 | **—** | ✓ | ✗ |
| `TMS-F-API-268` | `POST` | `/configuration-entity/{entityType}/{id}/reactivate` | apps/api/src/modules/config/config.controller.ts:832 | **—** | ✓ | ✗ |
| `TMS-F-API-269` | `POST` | `/configuration-entity/blocklist-entry/test` | apps/api/src/modules/config/config.controller.ts:992 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-270` | `POST` | `/configuration-entity/consumer/{consumerId}/generate-key` | apps/api/src/modules/config/config.controller.ts:921 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-271` | `POST` | `/configuration-entity/consumer/{consumerId}/revoke-key` | apps/api/src/modules/config/config.controller.ts:973 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-272` | `POST` | `/configuration-entity/consumer/{consumerId}/rotate-key` | apps/api/src/modules/config/config.controller.ts:947 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-273` | `POST` | `/delegated-admins` | apps/api/src/modules/delegated-admin/delegated-admin.controller.ts:106 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-274` | `POST` | `/email-templates` | apps/api/src/modules/email/controllers/email-template.controller.ts:232 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-275` | `POST` | `/email-templates/{code}/preview` | apps/api/src/modules/email/controllers/email-template.controller.ts:365 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-276` | `POST` | `/email-templates/{code}/reactivate` | apps/api/src/modules/email/controllers/email-template.controller.ts:333 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-277` | `POST` | `/email/config/test` | apps/api/src/modules/email/controllers/email-config.controller.ts:278 | **—** | ✓ | ✓ |
| `TMS-F-API-278` | `POST` | `/email/config/test-connection` | apps/api/src/modules/email/controllers/email-config.controller.ts:368 | **—** | ✓ | ✓ |
| `TMS-F-API-279` | `POST` | `/event-backbone/replay-preview` | apps/api/src/modules/event-backbone/event-backbone.controller.ts:65 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-280` | `POST` | `/exports` | apps/api/src/modules/export/controllers/export.controller.ts:148 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-281` | `POST` | `/external-blocklist` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:242 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-282` | `POST` | `/external-blocklist/{id}/disable` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:380 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-283` | `POST` | `/external-blocklist/{id}/enable` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:429 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-284` | `POST` | `/external-blocklist/batch-toggle` | apps/api/src/modules/marshmallow/controllers/external-blocklist.controller.ts:478 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-285` | `POST` | `/integration/adapters` | apps/api/src/modules/integration/controllers/integration.controller.ts:301 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-286` | `POST` | `/integration/adapters/{adapterId}/configs/{configKey}/reveal` | apps/api/src/modules/integration/controllers/integration.controller.ts:392 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-287` | `POST` | `/integration/adapters/{adapterId}/deactivate` | apps/api/src/modules/integration/controllers/integration.controller.ts:358 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-288` | `POST` | `/integration/adapters/{adapterId}/reactivate` | apps/api/src/modules/integration/controllers/integration.controller.ts:369 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-289` | `POST` | `/integration/consumers/{consumerId}/regenerate-key` | apps/api/src/modules/integration/controllers/integration.controller.ts:585 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-290` | `POST` | `/integration/webhooks` | apps/api/src/modules/integration/controllers/integration.controller.ts:414 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-291` | `POST` | `/integration/webhooks/{webhookId}/deactivate` | apps/api/src/modules/integration/controllers/integration.controller.ts:563 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-292` | `POST` | `/integration/webhooks/{webhookId}/delivery-attempts/{attemptId}/replay` | apps/api/src/modules/integration/controllers/integration.controller.ts:499 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-293` | `POST` | `/integration/webhooks/{webhookId}/reactivate` | apps/api/src/modules/integration/controllers/integration.controller.ts:574 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-294` | `POST` | `/integration/webhooks/{webhookId}/test-delivery` | apps/api/src/modules/integration/controllers/integration.controller.ts:475 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-295` | `POST` | `/ip-access-rules` | apps/api/src/modules/security/controllers/security.controller.ts:448 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-296` | `POST` | `/ip-access-rules/check` | apps/api/src/modules/security/controllers/security.controller.ts:480 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-297` | `POST` | `/permissions/check` | apps/api/src/modules/permission/permission.controller.ts:196 | **—** | ✓ | ✗ |
| `TMS-F-API-298` | `POST` | `/pii-service-configs` | apps/api/src/modules/pii-config/controllers/pii-service-config.controller.ts:134 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-299` | `POST` | `/pii-service-configs/{id}/test` | apps/api/src/modules/pii-config/controllers/pii-service-config.controller.ts:198 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-300` | `POST` | `/platform-tools/connections/{toolCode}/health-check` | apps/api/src/modules/platform-tools/platform-tools.controller.ts:63 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-301` | `POST` | `/profile-stores` | apps/api/src/modules/pii-config/controllers/profile-store.controller.ts:338 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-302` | `POST` | `/public-presence/assets` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:120 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-303` | `POST` | `/public-presence/assets/{assetId}/current/validate` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:170 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-304` | `POST` | `/public-presence/assets/{assetId}/duplicate` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:196 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-305` | `POST` | `/public/marshmallow/{path}/messages/{messageId}/mark-read` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:359 | _public_ | ✓ | ✓ |
| `TMS-F-API-306` | `POST` | `/public/marshmallow/{path}/messages/{messageId}/mark-read-auth` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:452 | _public_ | ✓ | ✓ |
| `TMS-F-API-307` | `POST` | `/public/marshmallow/{path}/messages/{messageId}/reply-auth` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:511 | _public_ | ✓ | ✓ |
| `TMS-F-API-308` | `POST` | `/public/marshmallow/{path}/submit` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:246 | _public_ | ✓ | ✓ |
| `TMS-F-API-309` | `POST` | `/public/marshmallow/{tenantCode}/{talentCode}/submit` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:206 | _public_ | ✓ | ✓ |
| `TMS-F-API-310` | `POST` | `/public/marshmallow/messages/{messageId}/react` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:319 | _public_ | ✓ | ✓ |
| `TMS-F-API-311` | `POST` | `/public/marshmallow/preview-image` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:284 | _public_ | ✓ | ✓ |
| `TMS-F-API-312` | `POST` | `/public/marshmallow/validate-sso` | apps/api/src/modules/marshmallow/controllers/public-marshmallow.controller.ts:409 | _public_ | ✓ | ✓ |
| `TMS-F-API-313` | `POST` | `/reports/mfr/jobs` | apps/api/src/modules/report/controllers/report.controller.ts:432 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-314` | `POST` | `/reports/mfr/search` | apps/api/src/modules/report/controllers/report.controller.ts:395 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-315` | `POST` | `/roles` | apps/api/src/modules/role/role.controller.ts:621 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-316` | `POST` | `/roles/{roleId}/deactivate` | apps/api/src/modules/role/role.controller.ts:874 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-317` | `POST` | `/roles/{roleId}/reactivate` | apps/api/src/modules/role/role.controller.ts:912 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-318` | `POST` | `/runtime-flags/evaluate` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:76 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-319` | `POST` | `/runtime-flags/kill-switches` | apps/api/src/modules/runtime-flags/runtime-flags.controller.ts:87 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-320` | `POST` | `/security/fingerprint` | apps/api/src/modules/security/controllers/security.controller.ts:69 | **—** | ✓ | ✓ |
| `TMS-F-API-321` | `POST` | `/subsidiaries` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:588 | **—** | ✓ | ✓ |
| `TMS-F-API-322` | `POST` | `/subsidiaries/{subsidiaryId}/deactivate` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:802 | **—** | ✓ | ✓ |
| `TMS-F-API-323` | `POST` | `/subsidiaries/{subsidiaryId}/integration/adapters` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:69 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-324` | `POST` | `/subsidiaries/{subsidiaryId}/integration/adapters/{adapterId}/disable` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:105 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-325` | `POST` | `/subsidiaries/{subsidiaryId}/integration/adapters/{adapterId}/enable` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:121 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-326` | `POST` | `/subsidiaries/{subsidiaryId}/move` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:757 | **—** | ✓ | ✓ |
| `TMS-F-API-327` | `POST` | `/subsidiaries/{subsidiaryId}/reactivate` | apps/api/src/modules/subsidiary/subsidiary.controller.ts:857 | **—** | ✓ | ✓ |
| `TMS-F-API-328` | `POST` | `/system-dictionary` | apps/api/src/modules/dictionary/dictionary.controller.ts:690 | **—** | ✓ | ✓ |
| `TMS-F-API-329` | `POST` | `/system-dictionary/{type}/items` | apps/api/src/modules/dictionary/dictionary.controller.ts:769 | **—** | ✓ | ✓ |
| `TMS-F-API-330` | `POST` | `/system-dictionary/{type}/items/{itemId}/reactivate` | apps/api/src/modules/dictionary/dictionary.controller.ts:940 | **—** | ✓ | ✓ |
| `TMS-F-API-331` | `POST` | `/system-roles` | apps/api/src/modules/system-role/system-role.controller.ts:286 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-332` | `POST` | `/system-users` | apps/api/src/modules/system-user/system-user.controller.ts:667 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-333` | `POST` | `/system-users/{systemUserId}/deactivate` | apps/api/src/modules/system-user/system-user.controller.ts:878 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-334` | `POST` | `/system-users/{systemUserId}/force-totp` | apps/api/src/modules/system-user/system-user.controller.ts:967 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-335` | `POST` | `/system-users/{systemUserId}/reactivate` | apps/api/src/modules/system-user/system-user.controller.ts:918 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-336` | `POST` | `/system-users/{systemUserId}/reset-password` | apps/api/src/modules/system-user/system-user.controller.ts:833 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-337` | `POST` | `/system-users/{systemUserId}/scope-access` | apps/api/src/modules/system-user/system-user.controller.ts:1048 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-338` | `POST` | `/talents` | apps/api/src/modules/talent/talent.controller.ts:1443 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-339` | `POST` | `/talents/{talentId}/custom-domain` | apps/api/src/modules/talent/talent.controller.ts:2278 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-340` | `POST` | `/talents/{talentId}/custom-domain/verify` | apps/api/src/modules/talent/talent.controller.ts:2324 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-341` | `POST` | `/talents/{talentId}/customers/{customerId}/deactivate` | apps/api/src/modules/customer/controllers/customer.controller.ts:521 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-342` | `POST` | `/talents/{talentId}/customers/{customerId}/external-ids` | apps/api/src/modules/customer/controllers/external-id.controller.ts:82 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-343` | `POST` | `/talents/{talentId}/customers/{customerId}/memberships` | apps/api/src/modules/customer/controllers/membership.controller.ts:97 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-344` | `POST` | `/talents/{talentId}/customers/{customerId}/platform-identities` | apps/api/src/modules/customer/controllers/platform-identity.controller.ts:98 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-345` | `POST` | `/talents/{talentId}/customers/{customerId}/reactivate` | apps/api/src/modules/customer/controllers/customer.controller.ts:585 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-346` | `POST` | `/talents/{talentId}/customers/batch` | apps/api/src/modules/customer/controllers/customer.controller.ts:636 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-347` | `POST` | `/talents/{talentId}/customers/companies` | apps/api/src/modules/customer/controllers/customer.controller.ts:422 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-348` | `POST` | `/talents/{talentId}/customers/companies/{customerId}/pii-portal-session` | apps/api/src/modules/customer/controllers/customer.controller.ts:313 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-349` | `POST` | `/talents/{talentId}/customers/individuals` | apps/api/src/modules/customer/controllers/customer.controller.ts:162 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-350` | `POST` | `/talents/{talentId}/customers/individuals/{customerId}/pii-portal-session` | apps/api/src/modules/customer/controllers/customer.controller.ts:261 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-351` | `POST` | `/talents/{talentId}/disable` | apps/api/src/modules/talent/talent.controller.ts:2097 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-352` | `POST` | `/talents/{talentId}/homepage/assets` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:383 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-353` | `POST` | `/talents/{talentId}/homepage/publish` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:492 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-354` | `POST` | `/talents/{talentId}/homepage/unpublish` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:541 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-355` | `POST` | `/talents/{talentId}/homepage/versions/{versionId}/restore` | apps/api/src/modules/homepage/controllers/homepage.controller.ts:736 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-356` | `POST` | `/talents/{talentId}/imports/customers/companies` | apps/api/src/modules/import/controllers/import.controller.ts:368 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-357` | `POST` | `/talents/{talentId}/imports/customers/individuals` | apps/api/src/modules/import/controllers/import.controller.ts:288 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-358` | `POST` | `/talents/{talentId}/integration/adapters` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:193 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-359` | `POST` | `/talents/{talentId}/integration/adapters/{adapterId}/disable` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:229 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-360` | `POST` | `/talents/{talentId}/integration/adapters/{adapterId}/enable` | apps/api/src/modules/integration/controllers/scoped-integration-adapter.controller.ts:245 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-361` | `POST` | `/talents/{talentId}/marshmallow/avatar` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:186 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-362` | `POST` | `/talents/{talentId}/marshmallow/config/domain` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:281 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-363` | `POST` | `/talents/{talentId}/marshmallow/config/verify-domain` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:342 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-364` | `POST` | `/talents/{talentId}/marshmallow/export` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:760 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-365` | `POST` | `/talents/{talentId}/marshmallow/messages/{messageId}/approve` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:479 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-366` | `POST` | `/talents/{talentId}/marshmallow/messages/{messageId}/reject` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:522 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-367` | `POST` | `/talents/{talentId}/marshmallow/messages/{messageId}/reply` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:614 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-368` | `POST` | `/talents/{talentId}/marshmallow/messages/{messageId}/unreject` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:571 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-369` | `POST` | `/talents/{talentId}/marshmallow/messages/batch` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:663 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-370` | `POST` | `/talents/{talentId}/marshmallow/sso-token` | apps/api/src/modules/marshmallow/controllers/marshmallow.controller.ts:389 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-371` | `POST` | `/talents/{talentId}/move` | apps/api/src/modules/talent/talent.controller.ts:1886 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-372` | `POST` | `/talents/{talentId}/public-presence/bootstrap` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:139 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-373` | `POST` | `/talents/{talentId}/public-presence/publish` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:263 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-374` | `POST` | `/talents/{talentId}/public-presence/publish/cancel` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:306 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-375` | `POST` | `/talents/{talentId}/public-presence/publish/schedule` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:285 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-376` | `POST` | `/talents/{talentId}/public-presence/review/approve` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:241 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-377` | `POST` | `/talents/{talentId}/public-presence/review/request-changes` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:220 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-378` | `POST` | `/talents/{talentId}/public-presence/review/submit` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:198 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-379` | `POST` | `/talents/{talentId}/public-presence/rollback-draft` | apps/api/src/modules/homepage/controllers/public-presence.controller.ts:328 | `[object Object]` | ✗ | ✗ |
| `TMS-F-API-380` | `POST` | `/talents/{talentId}/publish` | apps/api/src/modules/talent/talent.controller.ts:2036 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-381` | `POST` | `/talents/{talentId}/re-enable` | apps/api/src/modules/talent/talent.controller.ts:2158 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-382` | `POST` | `/talents/{talentId}/stage-transitions` | apps/api/src/modules/talent/talent.controller.ts:1971 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-383` | `POST` | `/talents/custom-domain-bindings` | apps/api/src/modules/talent/talent.controller.ts:1576 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-384` | `POST` | `/talents/custom-domain-bindings/{domainId}/verify` | apps/api/src/modules/talent/talent.controller.ts:1653 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-385` | `POST` | `/tenants` | apps/api/src/modules/tenant/tenant.controller.ts:751 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-386` | `POST` | `/tenants/{tenantId}/activate` | apps/api/src/modules/tenant/tenant.controller.ts:1091 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-387` | `POST` | `/tenants/{tenantId}/deactivate` | apps/api/src/modules/tenant/tenant.controller.ts:1145 | `[object Object]` | ✓ | ✓ |
| `TMS-F-API-388` | `POST` | `/users/{userId}/roles` | apps/api/src/modules/role/user-role.controller.ts:118 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-389` | `POST` | `/users/me/avatar` | apps/api/src/modules/auth/auth.controller.ts:2018 | **—** | ✓ | ✗ |
| `TMS-F-API-390` | `POST` | `/users/me/email/confirm` | apps/api/src/modules/auth/auth.controller.ts:2282 | **—** | ✓ | ✗ |
| `TMS-F-API-391` | `POST` | `/users/me/email/request-change` | apps/api/src/modules/auth/auth.controller.ts:2161 | **—** | ✓ | ✗ |
| `TMS-F-API-392` | `POST` | `/users/me/password` | apps/api/src/modules/auth/auth.controller.ts:1446 | **—** | ✓ | ✓ |
| `TMS-F-API-393` | `POST` | `/users/me/recovery-codes` | apps/api/src/modules/auth/auth.controller.ts:1834 | **—** | ✓ | ✗ |
| `TMS-F-API-394` | `POST` | `/users/me/totp/disable` | apps/api/src/modules/auth/auth.controller.ts:1745 | **—** | ✓ | ✗ |
| `TMS-F-API-395` | `POST` | `/users/me/totp/enable` | apps/api/src/modules/auth/auth.controller.ts:1648 | **—** | ✓ | ✗ |
| `TMS-F-API-396` | `POST` | `/users/me/totp/setup` | apps/api/src/modules/auth/auth.controller.ts:1578 | **—** | ✓ | ✓ |
| `TMS-F-API-397` | `PUT` | `/public-presence/assets/{assetId}/current` | apps/api/src/modules/homepage/controllers/public-presence-asset.controller.ts:144 | `[object Object]` | ✓ | ✗ |
| `TMS-F-API-398` | `PUT` | `/tenants/{tenantId}/capabilities` | apps/api/src/modules/tenant/tenant.controller.ts:977 | `[object Object]` | ✓ | ✓ |
