# Homepage AI Injection Manifest

Use this order when assembling prompt context for Homepage AI authoring tasks.

## 1. Canonical Project Context

Inject or summarize these first:

1. `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/20-spec.md`
2. `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/40-decisions.md`
3. `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/50-implementation-plan.md`
4. `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/70-verification.md`
5. `vault/knowledge/projects/TCRN-TMS/ui-ux/uiux-specification-granularity-standard.md`
6. `vault/knowledge/projects/TCRN-TMS/workflow/plan-materialization-granularity.md`

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
