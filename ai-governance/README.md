# AI Governance

This directory stores prompt and policy material for product AI features. It is an approved root-level exception for AI injection assets, not a replacement for the owning initiative, vault knowledge, or product source contracts.

## Purpose

- Provide default prompt context for module-owned AI features.
- Keep reusable AI guardrails close to the repository.
- Provide machine-readable policy fragments that can later feed prompt assemblers, validators, tests, or runtime gates.

## Authority

Product specs, plans, and durable knowledge remain the project truth for product, API, UI, security, and module facts. Files in `ai-governance/` explain how AI should use those truths.

For Public Presence Studio, the controlling planning package is the owning initiative under the platform vault: `vault/initiatives/projects/TCRN-TMS/active/public-presence-studio/**`. Durable workflow and UI/UX standards live under `vault/knowledge/projects/TCRN-TMS/**`. If an AI governance file conflicts with the initiative or vault knowledge, update the controlling source first or treat it as authoritative until the conflict is resolved.

## Directory Shape

- `shared/`: cross-module AI behavior, prompt-injection, and license rules.
- `security/`: machine-readable security allowlists and policy fragments.
- `modules/<module>/`: module-specific injection manifests, prompt contracts, output contracts, and guardrails.

## Update Rules

- Do not store formal product specs here. Use the owning initiative package under `vault/initiatives/projects/TCRN-TMS/**`.
- Do not duplicate full module facts here. Reference the owning initiative and durable vault knowledge.
- Do not define API, schema, or UI standards here. Promote durable standards to `vault/knowledge/projects/TCRN-TMS/**` and keep this directory as AI runtime prompt/policy material.
- A module prompt may narrow shared policy, but it must not relax shared safety, license, iframe, PII, or Advanced Source boundaries.
- Every prompt update must answer whether it changes product behavior. If yes, update the relevant owning initiative, vault knowledge, or product contract files in the same change.
