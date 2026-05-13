# Homepage AI Injection Manifest

Use this order when assembling prompt context for Homepage AI authoring tasks.

## 1. Canonical Project Context

Inject or summarize these first:

1. `.context/standards/00-governance.md`
2. `.context/standards/04-web-frontend.md`
3. `.context/standards/09-web-ui-foundations.md`
4. `.context/standards/10-web-runtime-dataflow.md`
5. `.context/modules/06-homepage-public-pages/technical_details.md`
6. `.context/modules/06-homepage-public-pages/current_issues.md`
7. `.context/modules/06-homepage-public-pages/current_progress.md`

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

- the output stays in template mode unless the user explicitly requested Advanced Source;
- any iframe uses an enabled provider from `ai-governance/security/iframe-allowlist.yaml`;
- any external asset has known commercial-use rights or is rejected;
- the output does not add visible renderer-only content;
- the output names required user confirmations.
