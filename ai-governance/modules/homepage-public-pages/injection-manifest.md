# Homepage AI Injection Manifest

Use this order when assembling prompt context for Homepage AI authoring tasks.

## 1. Canonical Project Context

Inject or summarize these first:

1. `docs/facts/README.md` — the fact-record format and the authority order.
2. `docs/facts/api-handlers.md` — the 398 API handlers, generated and cross-pinned.
3. `docs/facts/api-metadata-gaps.md` — where API contract metadata is known to be missing.

> **The original six sources are gone and were not replaced in kind.** This list used to name four Public Presence Studio planning documents (`20-spec.md`, `40-decisions.md`, `50-implementation-plan.md`, `70-verification.md`) and two durable standards, all under a platform `vault/` that was archived out of this repository on 2026-07-20. Those files do not exist anywhere in this repository or the platform root.
>
> What was lost is **intent** — the spec, the decisions, and the granularity standards. What replaces it is **fact**: what the system currently is, with evidence. An assistant working from this manifest therefore has no authoritative statement of what Public Presence Studio was *meant* to be, and must not infer one from the facts. When a task needs the original intent, say so and stop; do not reconstruct it.
>
> Recorded under `TCRN-TMS-INIT-001` (`TCRN-TMS-STORY-025`).

## 2. Shared AI Governance

Inject these shared guardrails:

1. `ai-governance/shared/ai-runtime-boundaries.md`
2. `ai-governance/shared/prompt-injection-safety.md`
3. `ai-governance/shared/license-and-asset-policy.md`
4. `ai-governance/security/iframe-allowlist.yaml`

## 3. Homepage Module Pack

Inject these for Homepage authoring:

1. `ai-governance/modules/homepage-public-pages/system-context.md`
2. `ai-governance/modules/homepage-public-pages/prompt-contract.md`
3. `ai-governance/modules/homepage-public-pages/safety-guardrails.md`

Use `homepage-ai-patch.schema.json` as the machine-readable output contract when the AI is expected to return a structured patch.

## 4. Output-Time Checklist

Before returning a final AI patch, verify:

- the output stays in registry-bounded settings patch mode unless the user explicitly requested template/component authoring or Advanced Source;
- template/component authoring output is an IDE review proposal, not a runtime tenant patch;
- the output does not change layout, section order, slots, custom CSS/JS, or component registration outside reviewed template/component code;
- any iframe uses an enabled provider from `ai-governance/security/iframe-allowlist.yaml`;
- any external asset has known commercial-use rights or is rejected;
- the output does not add visible renderer-only content;
- the output names required user confirmations.
