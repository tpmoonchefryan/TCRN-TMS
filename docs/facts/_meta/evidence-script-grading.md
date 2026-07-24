# TMS 证据脚本可运行性分级

> 治理记录:`TCRN-TMS-STORY-001`(Epic `TCRN-TMS-EPIC-001`,Initiative `TCRN-TMS-INIT-001`)· 分解裁定 minutes `TCRN-TMS-MIN-001`

## 一句话

`apps/api/scripts/` 下有 **106 个证据脚本**(103 个 `.mjs` + 3 个 `.ts`:`api-registry-openapi-export.ts`、`event-backbone-api-readback-evidence.ts`、`export-swagger-evidence.ts`),**没有任何一个**被 `package.json`、`turbo.json` 或 `.github/workflows/` 引用 —— 一整套已建成却从不运行的证据机器。本次实测:**零个真故障**。

> 本次分级只覆盖 103 个 `.mjs`;3 个 `.ts` 需 TS 运行时,列为待测。

## 测量方法

- 逐个 `.mjs` 以 `node <script>` 在仓根执行,单脚本硬超时 30 秒。
- 每个子进程 `detached` 自成进程组,超时以 `SIGKILL` 回收整组;运行后实测 `ps` 无残留(后台资源治理要求)。
- 静态预分类跳过需要 DB / 网络的脚本,不做带副作用的试跑。
- **退出码单独不作为分级依据。** 输出合法证据 JSON 后退出非零的脚本判为「门见红」而非故障 —— 这是本次分级最重要的方法学修正。

## 分级结果

| 分级 | 数量 | 含义 |
|---|---|---|
| GREEN 跑通 | 56 | 今天就能跑、退出 0 |
| RED 门见红 | 9 | **工作正常的门**:输出合法证据 JSON 后退出非零 |
| 需必填参数 | 14 | 缺 CLI 参数(`path undefined`),非故障 |
| 缺输入文件 | 7 | 依赖的配置/夹具不在仓内 |
| 需 DB 或网络 | 10 | 本次未跑,静态分类跳过 |
| 工具模块 | 7 | `*-script-utils.mjs`,非独立入口 |
| **真故障** | **0** | —— |

**可用率**:86 个独立入口中,65 个(56 GREEN + 9 RED)今天即产出真实证据 = **76%**。

## 结论

1. **证据机器完好,缺的是接线。** 零真故障意味着 INIT-001 的主体不是修脚本,而是把已有产出接进 CI 与 facts。
2. **9 个见红的门是资产不是负债。** 它们证明这些检查器确实会红 —— 满足红证纪律的一半(另一半是变异注入,见 `TCRN-TMS-STORY-003`)。
3. **21 个需参数或输入的脚本须逐个补齐调用约定**,这是 STORY-001 之后的接线工作。

## 已见红的 9 个门

这 9 个脚本当前输出负面结论。**它们的红是待查的真实信号,不是脚本缺陷**,须在对应 Epic 内逐条判定:

- `event-backbone-compose-classification.mjs`
- `event-backbone-compose-env-isolation.mjs`
- `prepare-webhook-delivery-fixtures.mjs`
- `verify-api-registry-evidence-redaction.mjs`
- `verify-api-registry-negative-authority.mjs`
- `verify-gateway-rendered-artifacts.mjs`
- `webhook-delivery-tenant-isolation-evidence.mjs`
- `write-api-registry-document.mjs`
- `write-event-backbone-inventory-baseline.mjs`

## 已发现的确定性风险(供 `TCRN-TMS-GATE-002`)

多个脚本的输出含 `checkedAt` 实时时间戳(实测样本:`checkedAt: 2026-07-24T20:45:38.529Z`)。**含时间戳的工件重跑必不字节一致**,派生再生成确定性门会因此假红。接线前须为这些脚本提供确定性时钟注入或在比对时剔除时间戳字段。

## 全量清单

### GREEN 跑通(56)

- `event-backbone-bullmq-classification-evidence.mjs`
- `event-backbone-consumer-replay-evidence.mjs`
- `event-backbone-env-render-evidence.mjs`
- `event-backbone-license-sbom-posture.mjs`
- `event-backbone-nats-bridge-evidence.mjs`
- `event-backbone-outbox-evidence.mjs`
- `event-backbone-proof-artifacts.mjs`
- `event-backbone-redaction-isolation-evidence.mjs`
- `export-openapi-docs.mjs`
- `observability-deeplink-evidence.mjs`
- `observability-license-sbom-posture.mjs`
- `observability-otel-evidence.mjs`
- `observability-prometheus-alert-lint.mjs`
- `observability-query-safety-evidence.mjs`
- `observability-redaction-evidence.mjs`
- `platform-tool-deployment-boundary-evidence.mjs`
- `prepare-api-gateway-readiness-fixtures.mjs`
- `prepare-api-registry-acceptance-fixtures.mjs`
- `prepare-builder-registry-fixtures.mjs`
- `prepare-event-backbone-fixtures.mjs`
- `prepare-observability-fixtures.mjs`
- `prepare-runtime-flag-fixtures.mjs`
- `runtime-flag-context-redaction-evidence.mjs`
- `runtime-flag-env-render-evidence.mjs`
- `runtime-flag-evaluation-evidence.mjs`
- `runtime-flag-kill-switch-evidence.mjs`
- `runtime-flag-legacy-quarantine-evidence.mjs`
- `runtime-flag-license-sbom-posture.mjs`
- `runtime-flag-overloaded-flag-classification.mjs`
- `runtime-flag-provider-readiness-evidence.mjs`
- `verify-api-gateway-readiness-browser-artifacts.mjs`
- `verify-builder-evidence-redaction.mjs`
- `verify-builder-negative-authority.mjs`
- `verify-builder-registry-browser-artifacts.mjs`
- `verify-gateway-negative-authority.mjs`
- `verify-observability-adapter-rollout.mjs`
- `verify-runtime-flag-rollout.mjs`
- `verify-swagger-exposure-policy.mjs`
- `verify-webhook-delivery-rollout.mjs`
- `verify-webhook-event-catalog.mjs`
- `webhook-delivery-env-render-evidence.mjs`
- `webhook-delivery-license-sbom-posture.mjs`
- `webhook-delivery-nats-readiness-evidence.mjs`
- `webhook-delivery-provider-readiness-evidence.mjs`
- `webhook-delivery-redaction-evidence.mjs`
- `webhook-delivery-retry-replay-evidence.mjs`
- `webhook-delivery-signature-evidence.mjs`
- `write-api-registry-controller-inventory.mjs`
- `write-builder-current-source-inventory.mjs`
- `write-builder-forbidden-term-baseline.mjs`
- `write-gateway-compose-fixture-env.mjs`
- `write-gateway-current-proxy-inventory.mjs`
- `write-gateway-dependency-absence.mjs`
- `write-module-capability-registry-document.mjs`
- `write-observability-inventory-baseline.mjs`
- `write-runtime-flag-inventory-baseline.mjs`

### RED 门见红(输出合法证据后退出非零)(9)

- `event-backbone-compose-classification.mjs`
- `event-backbone-compose-env-isolation.mjs`
- `prepare-webhook-delivery-fixtures.mjs`
- `verify-api-registry-evidence-redaction.mjs`
- `verify-api-registry-negative-authority.mjs`
- `verify-gateway-rendered-artifacts.mjs`
- `webhook-delivery-tenant-isolation-evidence.mjs`
- `write-api-registry-document.mjs`
- `write-event-backbone-inventory-baseline.mjs`

### SKIPPED(10)

- `event-backbone-compose-fixture-env.mjs`
- `export-swagger-evidence.mjs`
- `platform-tool-ssrf-evidence.mjs`
- `prepare-observability-env-fixture.mjs`
- `prepare-platform-tool-fixtures.mjs`
- `redact-compose-config-evidence.mjs`
- `redact-observability-compose-config.mjs`
- `webhook-delivery-outbox-evidence.mjs`
- `webhook-delivery-target-url-ssrf-evidence.mjs`
- `write-webhook-delivery-inventory-baseline.mjs`

### UTIL(7)

- `api-gateway-readiness-script-utils.mjs`
- `api-registry-script-utils.mjs`
- `builder-registry-script-utils.mjs`
- `event-backbone-script-utils.mjs`
- `observability-script-utils.mjs`
- `runtime-flag-script-utils.mjs`
- `webhook-delivery-script-utils.mjs`

### 缺输入文件(7)

- `observability-compose-classification.mjs`
- `render-gateway-readiness-artifacts.mjs`
- `verify-api-registry-drift.mjs`
- `verify-openapi-redaction.mjs`
- `write-api-registry-swagger-inventory.mjs`
- `write-gateway-route-manifest.mjs`
- `write-gateway-route-policy.mjs`

### 需必填参数(14)

- `generate-builder-sdk-artifacts.mjs`
- `render-gateway-compose-readiness.mjs`
- `verify-builder-generated-artifacts.mjs`
- `verify-gateway-compose-redaction.mjs`
- `verify-gateway-rate-limit-cors-policy.mjs`
- `verify-gateway-route-drift.mjs`
- `verify-gateway-trusted-proxy-policy.mjs`
- `write-builder-api-readonly-export.mjs`
- `write-builder-composed-operation-dry-run.mjs`
- `write-builder-license-sbom-posture.mjs`
- `write-builder-module-capability-manifest.mjs`
- `write-builder-schema-catalog.mjs`
- `write-builder-source-readback.mjs`
- `write-gateway-cutover-runbook.mjs`

