# Known Limitations

Validation baseline: 2026-06-10 G19 clean-docs staging.

This page keeps limitation visibility high so guide and wiki wording does not overclaim current product behavior.

## How To Use This Page

Use this page as a routing aid, not as a workaround catalog. Each limitation means one of three things:

- the feature is visible but not proven as a complete customer workflow;
- the feature is intentionally excluded from clean docs until a security, permission, accessibility, or runtime proof exists;
- the owner has accepted a known limitation and the guide must describe the impact honestly.

When a limitation is later resolved, update the linked guide/wiki section with Best Practice, a realistic scenario, and proof-backed operating steps. Until then, keep the clean claim out of customer-facing procedures.

## Active G19 Limitations

| ID | Area | Customer impact | Current safe wording |
| --- | --- | --- | --- |
| `OKL-G19-AUTH-LIFECYCLE-001` | Auth lifecycle | Login URL safety is repaired, but password reset/change, account recovery, full redirect lifecycle, and external-next submit behavior are not accepted as complete operating procedures. | Document only basic sign-in and safe redirect boundaries. |
| `OKL-G19-AUTH-LIFECYCLE-SSO-001` | SSO | Discovery/start UI can be described, but callback, account linking, unlinking, replay, and cross-tenant failure cases need redacted fixture proof. | Keep SSO lifecycle procedure wording excluded. |
| `OKL-G19-AUTH-PASSWORD-001` | Password mutation | Password reset/change/recovery still lack resettable fixture and cleanup proof. | Keep password mutation as a focused support/security procedure outside the public guide. |
| `OKL-G19-ACCOUNT-TOTP-001` | TOTP and recovery codes | TOTP setup, disable, QR secret handling, and recovery-code regeneration need redacted proof. | Do not publish TOTP setup/recovery procedures. |
| `OKL-G19-ACCOUNT-SESSION-001` | Session revoke | Current-session and other-session revoke flows need disposable session proof. | Do not publish session-revoke procedures. |
| `OKL-G19-ACCOUNT-PROFILE-001` | Email/avatar/profile sensitive updates | Profile UI can be used for orientation, but email and avatar mutations need raw-media/email redaction and cleanup proof. | Keep sensitive profile mutation procedures excluded. |
| `OKL-G19-ADMIN-INTEGRATION-001` | Adapters, webhooks, and API secrets | Integration pages are visible and unit-tested, but creation, secret display, rotation, revoke, and cleanup need disposable integration proof. | Keep adapter and secret mutation procedures blocker-aware. |
| `OKL-G19-TENANT-SECURITY-001` | Tenant security and destructive settings | Destructive or lockout-sensitive tenant actions need disposable tenant, last-admin, rollback, and direct API negative proof. | Keep tenant security/destructive procedures excluded. |
| `OKL-G19-DICTIONARY-RUNTIME-001` | System Dictionary and runtime flags | Maintenance operations need rollback, audit, and denied-role proof. | Describe governance and triage only. |
| `OKL-G19-PUBLIC-WRITE-001` | Public Marshmallow submit/reaction writes | Public route/form display is accepted for the proofed read-only scope, but submit/reaction writes need disposable public fixture and cleanup proof. | Do not publish public submit/reaction procedures. |
| `OKL-G19-WIKI-REMOTE-001` | Remote GitHub Wiki | The repository wiki draft is staged locally, but `.wiki.git` publication remains unavailable/deferred. | Use `docs/wiki-draft/**` as the staging source only. |

## Resolved Or Narrowed Historical Rows

The older `GAP-P2-*` rows for G04-G16 are no longer listed as active limitations when their represented proof slice is terminal green. The linked evidence remains the source of truth for scope:

- RBAC, Initial Admin, hidden-403, and user-management represented slices: G04, G05, and G07 proof.
- AC tenant, AC integrations, and AC operations represented slices: G06, G08, and G09 proof.
- Tenant root/settings/integration/organization represented slices: G10, G11, and G12 proof.
- Talent Workspace represented slices: G13 proof.
- Public Presence authoring/preview/public-output represented slices: G14 and G15 proof.
- Public Marshmallow route/form/language/focus represented read-only slices: G16 proof.

These rows should not be reintroduced as active limitations unless a later proof run reopens them.

## Accessibility Boundaries

`GAP-P2-A11Y-001`, `GAP-P2-A11Y-002`, and `GAP-P2-A11Y-011` remain residual accessibility boundaries for broad language metadata and account/profile security flows. Do not claim keyboard, screen-reader, mobile, or focus support for a sensitive flow unless the exact flow has matching proof.
