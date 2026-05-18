# Homepage Public Pages AI Pack

This pack defines how AI should assist Public Presence homepage authoring. It is an injection aid for the Homepage/Public Presence module, not the module truth.

## Canonical References

Read these before using the pack for implementation or product decisions:

- `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/20-spec.md`
- `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/40-decisions.md`
- `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/50-implementation-plan.md`
- `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/70-verification.md`
- `vault/knowledge/projects/TCRN-TMS/ui-ux/uiux-specification-granularity-standard.md`
- `vault/knowledge/projects/TCRN-TMS/workflow/plan-materialization-granularity.md`

## Pack Files

- `injection-manifest.md`: recommended injection order.
- `system-context.md`: Homepage AI behavior context.
- `prompt-contract.md`: expected AI output format and confirmation gates.
- `homepage-ai-patch.schema.json`: machine-readable default patch result shape.
- `safety-guardrails.md`: Homepage-specific safety, iframe, asset, and Advanced Source rules.
- `verification.md`: minimum checks for prompt, implementation, and runtime alignment.

## Scope

This pack covers Public Presence homepage pages, template settings patches, and template/component authoring assistance. Marshmallow may share public presence tokens and shared AI policy, but it should receive a separate module pack before AI edits Marshmallow-specific form behavior or public submissions.

## D-022 Authoring Boundary

AI has two allowed paths:

- Runtime settings patch: suggest registry-bounded changes to released templates/components only.
- Authoring assistance: propose code, manifest, fixture, or documentation changes inside the full-screen Template Center / Component Store Web IDE workflow for human review.

AI must not inject executable template/component code into tenant content, mutate layout outside code-owned templates, move live pointers, publish, schedule, roll back, add providers, or bypass registry/safety validation.
