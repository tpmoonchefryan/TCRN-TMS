# Homepage Public Pages AI Pack

This pack defines how AI should assist Public Presence homepage authoring. It is an injection aid for the Homepage/Public Presence module, not the module truth.

## Canonical References

Read these before using the pack for implementation or product decisions:

- [`docs/facts/README.md`](../../../docs/facts/README.md) — fact-record format and the authority order that governs every claim below.
- [`docs/facts/api-handlers.md`](../../../docs/facts/api-handlers.md) — the API surface this module talks to.
- [`docs/facts/api-metadata-gaps.md`](../../../docs/facts/api-metadata-gaps.md) — known contract-metadata gaps, several of which fall in this module.

> **Six references were removed here, not relocated.** This list previously named four Public Presence Studio planning documents and two durable standards under a platform `vault/` archived out of this repository on 2026-07-20. They no longer exist in this repository or the platform root.
>
> The replacements above are **facts** (what the system is, with evidence), not **specs** (what it was meant to be). The specs are gone. Do not treat a fact as if it were a requirement, and do not reconstruct the lost intent from the code — when a decision needs the original rationale, escalate instead of inferring.
>
> Recorded under `TCRN-TMS-INIT-001` (`TCRN-TMS-STORY-025`).

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
