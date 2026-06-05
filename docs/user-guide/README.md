# TCRN TMS User Guide

This guide describes the current TCRN TMS product surfaces for operators, tenant administrators, talent teams, and public-presence editors.

Validation baseline: 2026-06-05. Source implementation and current UI proof take priority over older README text, screenshots, generated summaries, and prior handoff notes. When this guide mentions a limitation, the limitation is intentionally visible instead of being hidden behind an optimistic procedure.

## How To Use This Guide

Start with the chapter that matches the job you are doing:

| Job | Guide Chapter |
| --- | --- |
| Enter the app, choose a workspace, and understand navigation | [Getting Started](./getting-started/README.md) |
| Review account profile and security entry points | [Account and Security](./account-and-security/README.md) |
| Operate the AC platform tenant | [Platform Admin](./platform-admin/README.md) |
| Operate a regular tenant | [Tenant Admin](./tenant-admin/README.md) |
| Manage users, roles, and permissions | [User and Role Management](./user-and-role-management/README.md) |
| Work with APIs, adapters, webhooks, clients, and registries | [Integrations](./integrations/README.md) |
| Manage talent public pages and Marshmallow surfaces | [Public Presence](./public-presence/README.md) |
| Use talent workspace pages | [Talent Workspace](./talent-workspace/README.md) |
| Use runtime flags, observability, and system dictionaries | [Operations](./operations/README.md) |
| Triage common unavailable states | [Troubleshooting](./troubleshooting/README.md) |
| Look up terms and route families | [Reference](./reference/README.md) |

## Guide Scope

This guide documents current visible entry points, current unavailable states, and current known limitations. It does not claim that a workflow is production-ready unless the source and UI proof both support that claim.

The following procedure families remain intentionally limited until bounded proof or remediation exists:

- Public Marshmallow visitor submission, captcha, feed, load-more, reaction, and recovery workflows.
- Password, TOTP, SSO success/linking, session revoke, email change, avatar upload, and other sensitive account mutations.
- Tenant security create/import/delete/batch/test operations.
- System Dictionary destructive or maintenance operations.
- Adapter creation and advanced integration mutations where the UI currently exposes unavailable or denied states.
- Any page marked by the UX audit as hidden 403, page error, mixed-form composition, or unresolved accessibility proof.

## Documentation Model

The repository User Guide is the detailed source for operators and developers. The GitHub Wiki draft is a lighter navigation layer under [`../wiki-draft`](../wiki-draft/Home.md). The wiki should link back to this guide for detailed procedures instead of duplicating every step.

## Accessibility And UX Notes

The current UI audit found multiple areas where a page or tab combines different task families in one dense surface. The guide therefore describes those areas as current-state grouped surfaces and avoids presenting them as the ideal workflow model. Future UI work should prefer one page or tab per primary form family, with secondary or destructive actions moved behind explicit buttons, submenus, or dedicated tabs.

