# TCRN TMS User Guide

This guide describes the current TCRN TMS product surfaces for operators, tenant administrators, talent teams, and public-presence editors.

Validation baseline: 2026-06-10 G19 clean-docs staging. Source implementation and current UI proof take priority over older README text, screenshots, generated summaries, and prior handoff notes. When this guide mentions a limitation, the limitation is intentionally visible instead of being hidden behind an optimistic procedure.

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

## Best-Practice Reading Pattern

For each feature area, read the guide in this order:

1. Confirm which scope you are in: AC, tenant, subsidiary, talent, or public visitor.
2. Confirm whether the task is read-only, configuration, publishing, security-sensitive, or destructive.
3. Check whether the feature is documented as clean, blocker-aware, or excluded pending proof.
4. Follow the recommended workflow only when the documented scope and permission match your current job.
5. Use [Known Limitations](../wiki-draft/Known-Limitations.md) and [Troubleshooting](./troubleshooting/README.md) when the UI is visible but the action is denied, unavailable, or not yet proven.

Best Practice: treat visibility as a starting point, not approval to act. A route can appear in navigation while specific data, controls, or mutations remain restricted by tenant, talent, role, or proof status.

## Example Scenario

A tour operations manager is preparing a new public campaign for a talent. They should not start in the AC platform console. A safer path is:

1. Use the tenant or talent workspace to confirm the talent scope.
2. Review customer/report context in [Talent Workspace](./talent-workspace/README.md).
3. Prepare public-facing content through [Public Presence](./public-presence/README.md).
4. Check the limitation notes before relying on Marshmallow visitor submission or public output.
5. Ask a tenant administrator to adjust roles or integrations only when the task requires configuration outside the talent scope.

This keeps day-to-day talent work separate from platform administration and avoids confusing admin previews with public visitor behavior.

## Guide Scope

This guide documents current visible entry points, current unavailable states, and current known limitations. It does not claim that a workflow is production-ready unless the source and UI proof both support that claim.

The following procedure families remain intentionally limited until bounded proof or remediation exists:

- Public Marshmallow visitor submission, captcha, feed, load-more, reaction, and recovery workflows.
- Password, TOTP, SSO success/linking, session revoke, email change, avatar upload, and other sensitive account mutations.
- Tenant security create/import/delete/batch/test operations.
- System Dictionary destructive or maintenance operations.
- Adapter creation, webhook/API secret workflows, and advanced integration mutations.
- Accessibility, keyboard, screen-reader, mobile, or focus claims for sensitive flows without exact proof.

The G19 proof pass repaired the login form native fallback so credential fields are posted to the login endpoint instead of being serialized into the URL when JavaScript submit handling is unavailable. That proof is narrow: it does not turn the full auth lifecycle into a documented procedure.

## Documentation Model

The repository User Guide is the detailed source for operators and developers. The GitHub Wiki draft is a lighter navigation layer under [`../wiki-draft`](../wiki-draft/Home.md). The wiki should link back to this guide for detailed procedures instead of duplicating every step.

The GitHub Wiki is not the proof source. When the wiki summarizes a workflow, the repository guide and linked evidence remain authoritative for scope, limitations, and accepted behavior.

## Accessibility And UX Notes

The current UI audit found multiple areas where a page or tab combines different task families in one dense surface. The guide therefore describes those areas as current-state grouped surfaces and avoids presenting them as the ideal workflow model. Future UI work should prefer one page or tab per primary form family, with secondary or destructive actions moved behind explicit buttons, submenus, or dedicated tabs.
