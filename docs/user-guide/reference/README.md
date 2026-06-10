# Reference

This reference defines terms used across the guide and maps product route families to user jobs.

## Glossary

| Term | Meaning |
| --- | --- |
| AC tenant | Platform administration tenant used for cross-tenant operations |
| Regular tenant | Agency or company tenant used for day-to-day operations |
| Subsidiary | Child scope under a regular tenant |
| Talent | Creator scope under a tenant or subsidiary |
| Initial Admin | Intended built-in recovery role, represented as `INITIAL_ADMIN` |
| Custom role | User-created day-to-day role managed through the role APIs and UI |
| Permission pack | User-facing capability that may map to multiple resource/action permissions |
| Grant | Explicit permission allow state |
| Deny | Explicit permission deny state; overrides grants from other assigned roles |
| Unset | Role does not decide the permission |
| Scope | Workspace, tenant, subsidiary, or talent boundary where access applies |
| Hidden 403 | A route is visible or navigable but internal content/API access is denied |
| Known limitation | Current-source or UI limitation that must be documented without overclaiming |
| Clean procedure | A workflow whose product behavior, permissions, accessibility, and docs claim are all backed by accepted proof |
| Blocker-aware procedure | A workflow that can be described only with limitation language because at least one linked proof row is still open, deferred, or owner-pending |

## Route Family Index

| Route Family | Guide Chapter |
| --- | --- |
| Sign-in, root, workspace entry | [Getting Started](../getting-started/README.md) |
| Account profile and security | [Account and Security](../account-and-security/README.md) |
| AC tenant management | [Platform Admin](../platform-admin/README.md) |
| Regular tenant management | [Tenant Admin](../tenant-admin/README.md) |
| Users, roles, permissions | [User and Role Management](../user-and-role-management/README.md) |
| APIs, webhooks, adapters, clients, registries | [Integrations](../integrations/README.md) |
| Public pages and Marshmallow | [Public Presence](../public-presence/README.md) |
| Talent customers, reports, settings | [Talent Workspace](../talent-workspace/README.md) |
| Runtime flags, observability, system dictionary | [Operations](../operations/README.md) |

## Maintenance Reference

Dependency maintenance remains documented separately in [`../../dependency-maintenance.md`](../../dependency-maintenance.md). That document is an engineering maintenance reference, not a user-facing product guide.

## Proof Status Model

Use these states when interpreting guide and wiki language:

| Status | Meaning | Customer Impact |
| --- | --- | --- |
| Clean | The linked source/runtime proof supports the procedure. | The guide may give operational steps and Best Practice. |
| Blocker-aware | The feature exists, but one or more proof rows remain open or deferred. | The guide may explain current behavior and safe boundaries, but should not promise complete workflow success. |
| Owner-accepted limitation | A limitation is known and accepted for now. | The guide may describe the limitation, impact, and safe workaround if one exists. |
| Excluded | The procedure is not customer-ready or is too sensitive without proof. | The guide should not teach the procedure as available. |

## Active Limitation Index

The G19 clean-docs staging pass keeps the following limitations active. Historical `GAP-P2-*` rows for represented G04-G16 proof slices are archived in the initiative evidence instead of repeated here as active customer limitations.

| Area | Limitation IDs | Documentation Boundary |
| --- | --- | --- |
| Auth lifecycle | `OKL-G19-AUTH-LIFECYCLE-001`, `OKL-G19-AUTH-LIFECYCLE-SSO-001` | Login credential URL safety is repaired; full lifecycle, SSO callback/link/revoke, and account recovery remain proof-gated. |
| Account security | `OKL-G19-AUTH-PASSWORD-001`, `OKL-G19-ACCOUNT-TOTP-001`, `OKL-G19-ACCOUNT-SESSION-001`, `OKL-G19-ACCOUNT-PROFILE-001` | Password, TOTP, session, email, and avatar mutations need resettable fixture, cleanup, redaction, and exact-flow accessibility proof. |
| Integrations | `OKL-G19-ADMIN-INTEGRATION-001` | Adapter, webhook, API secret, and credential-adjacent mutations need disposable fixture and redacted cleanup proof. |
| Tenant security | `OKL-G19-TENANT-SECURITY-001` | Destructive or lockout-sensitive settings need last-admin, rollback, and direct API negative proof. |
| Operations | `OKL-G19-DICTIONARY-RUNTIME-001` | System Dictionary and runtime-flag maintenance need audit and rollback proof. |
| Public visitor writes | `OKL-G19-PUBLIC-WRITE-001` | Public Marshmallow submit/reaction writes need disposable public fixture and cleanup proof. |
| Wiki publication | `OKL-G19-WIKI-REMOTE-001` | `docs/wiki-draft/**` is staging only until remote Wiki publication is separately approved and read back. |
