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

## Open Limitation Index

The 2026-06-05 UI/UX audit keeps the following additional current-state limitations open. Guide procedures should treat these as constraints, not as accepted end-to-end workflows.

| Area | Open Gap IDs | Documentation Boundary |
| --- | --- | --- |
| AC tenant management and registries | `GAP-P2-A11Y-003`, `GAP-P2-A11Y-004` | Table captions, filters, and repeated row actions need stronger accessible-name and keyboard proof. |
| AC operations and system dictionary | `GAP-P2-AC-OPS-002`, `GAP-P2-FORM-005`, `GAP-P2-A11Y-005` | Observability query-state behavior and dictionary/operations workbench separation remain current-state only. |
| Tenant core operations | `GAP-P2-TENANT-CORE-003`, `GAP-P2-FORM-006` | Organization/settings deep links and large settings workbenches should not be documented as clean, stable procedures. |
| Tenant integrations | `GAP-P2-TENANT-INTEGRATION-002`, `GAP-P2-TENANT-INTEGRATION-003`, `GAP-P2-FORM-008`, `GAP-P2-A11Y-007` | Module availability, query-state persistence, integration workbench separation, and table/action accessibility remain open. |
| Talent workspace | `GAP-P2-TALENT-WORKSPACE-003`, `GAP-P2-FORM-009`, `GAP-P2-A11Y-008` | Talent settings/report/customer list workflows need clearer procedure proof and accessibility validation. |
| Public presence authoring | `GAP-P2-FORM-010`, `GAP-P2-FORM-011`, `GAP-P2-A11Y-009` | Studio, asset, Marshmallow management, preview, export, and authoring accessibility are not accepted as complete workflows. |
| Public visitor routes | `GAP-P2-PUBLIC-VISITOR-001`, `GAP-P2-PUBLIC-VISITOR-003`, `GAP-P2-FORM-012`, `GAP-P2-A11Y-010` | Public homepage and Marshmallow docs must preserve unavailable/error/external-media and accessibility boundaries. |
| Account security accessibility | `GAP-P2-A11Y-011` | Profile and security drawers, repeated actions, status announcements, and language metadata need focused accessibility proof. |
