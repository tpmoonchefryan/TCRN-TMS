# AI Governance

This directory stores prompt and policy material for product AI features. It is an approved root-level exception for AI injection assets, not a replacement for the fact baseline in `docs/facts/`, the governance chain, or product source contracts.

## Purpose

- Provide default prompt context for module-owned AI features.
- Keep reusable AI guardrails close to the repository.
- Provide machine-readable policy fragments that can later feed prompt assemblers, validators, tests, or runtime gates.

## Authority

Product specs, plans, and durable knowledge remain the project truth for product, API, UI, security, and module facts. Files in `ai-governance/` explain how AI should use those truths.

The authority order for what this system **currently is** is defined in [`docs/facts/README.md`](../docs/facts/README.md) and is, highest first:

`runtime` (observed behaviour) > `schema` (Prisma) > `api-contract` (OpenAPI baseline, controller decorators) > `source` (other code) > `doc` (existing documents).

`ai-governance/` sits at the `doc` tier. **A statement here can never outrank source code or observed behaviour**, and it can never be the sole support for a claim about current behaviour. When a file here conflicts with a higher tier, the higher tier wins and the file here is corrected — there is no "treat it as authoritative until resolved" path.

> **Historical note.** Until `TCRN-TMS-INIT-001`, this section named a controlling planning package under `vault/initiatives/projects/TCRN-TMS/**` and `vault/knowledge/projects/TCRN-TMS/**`. That vault was archived out of this platform on 2026-07-20 and no longer exists anywhere in the repository or the platform root, so those pointers had been dangling. Worse, the old rule said to treat this directory as authoritative *until the conflict is resolved* — and with the controlling source gone, that condition could never be met, which would have made `ai-governance/` permanently self-authoritative. That is the failure mode this rewrite closes.

## Directory Shape

- `shared/`: cross-module AI behavior, prompt-injection, and license rules.
- `security/`: machine-readable security allowlists and policy fragments.
- `modules/<module>/`: module-specific injection manifests, prompt contracts, output contracts, and guardrails.

## Update Rules

- Do not store formal product specs here. Specs belong to the owning Initiative on the governance chain (`.tcrn-workspace/TCRN-TMS/`); statements about what the system currently is belong in `docs/facts/`.
- Do not duplicate full module facts here. Reference `docs/facts/` instead; a fact has exactly one home and this is not it.
- Do not define API, schema, or UI standards here. Durable standards belong in `docs/facts/` (what is) or the owning Initiative (what should be); keep this directory as AI runtime prompt/policy material.
- A module prompt may narrow shared policy, but it must not relax shared safety, license, iframe, PII, or Advanced Source boundaries.
- Every prompt update must answer whether it changes product behavior. If yes, update the relevant `docs/facts/` entries and product contract files in the same change.
