# Homepage Public Pages AI Pack

This pack defines how AI should assist Homepage public-page authoring. It is an injection aid for the Homepage module, not the module truth.

## Canonical References

Read these before using the pack for implementation or product decisions:

- `.context/modules/06-homepage-public-pages/technical_details.md`
- `.context/modules/06-homepage-public-pages/current_issues.md`
- `.context/modules/06-homepage-public-pages/current_progress.md`
- `.context/standards/04-web-frontend.md`
- `.context/standards/09-web-ui-foundations.md`
- `.context/standards/10-web-runtime-dataflow.md`
- `.context/standards/00-governance.md`

## Pack Files

- `injection-manifest.md`: recommended injection order.
- `system-context.md`: Homepage AI behavior context.
- `prompt-contract.md`: expected AI output format and confirmation gates.
- `homepage-ai-patch.schema.json`: machine-readable default patch result shape.
- `safety-guardrails.md`: Homepage-specific safety, iframe, asset, and Advanced Source rules.
- `verification.md`: minimum checks for prompt, implementation, and runtime alignment.

## Scope

This first pack covers Homepage public pages only. Marshmallow may share public presence tokens and shared AI policy, but it should receive a separate module pack before AI edits Marshmallow-specific form behavior or public submissions.
