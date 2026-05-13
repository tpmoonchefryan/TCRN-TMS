# AI Governance

This directory stores prompt and policy material for product AI features. It is an approved root-level exception for AI injection assets, not a replacement for `.context`.

## Purpose

- Provide default prompt context for module-owned AI features.
- Keep reusable AI guardrails close to the repository.
- Provide machine-readable policy fragments that can later feed prompt assemblers, validators, tests, or runtime gates.

## Authority

`.context/standards/*` and `.context/modules/*` remain the project truth for product, API, UI, security, and module facts. Files in `ai-governance/` explain how AI should use those truths.

If an AI governance file conflicts with `.context`, update `.context` first or treat `.context` as authoritative until the conflict is resolved.

## Directory Shape

- `shared/`: cross-module AI behavior, prompt-injection, and license rules.
- `security/`: machine-readable security allowlists and policy fragments.
- `modules/<module>/`: module-specific injection manifests, prompt contracts, output contracts, and guardrails.

## Update Rules

- Do not store formal product specs here. Use `.context/plans/*`.
- Do not duplicate full module facts here. Reference `.context/modules/*`.
- Do not define API, schema, or UI standards here. Promote durable standards to `.context/standards/*`.
- A module prompt may narrow shared policy, but it must not relax shared safety, license, iframe, PII, or Advanced Source boundaries.
- Every prompt update must answer whether it changes product behavior. If yes, update the relevant `.context` files in the same change.
