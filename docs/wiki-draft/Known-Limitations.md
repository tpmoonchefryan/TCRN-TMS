# Known Limitations

Validation baseline: 2026-06-05.

This page keeps limitation visibility high so guide and wiki wording does not overclaim current product behavior.

## Blocker-Level Limitation

- `GAP-P2-PUBLIC-VISITOR-002`: Public Marshmallow visitor submission and related visitor workflows are not accepted as available procedures.

## Role And Permission Limitations

- `GAP-P2-RBAC-001`: Current UI proof still showed additional default roles in at least the AC tenant, so the `INITIAL_ADMIN`-only baseline is not accepted as clean.
- `GAP-P2-RBAC-002`, `GAP-P2-RBAC-003`, `GAP-P2-RBAC-004`: Tenant user and role routes can expose hidden 403 or current-state-only behavior.
- `GAP-P2-FORM-001`, `GAP-P2-FORM-002`: Some user/role pages mix different task families in one surface.

## Admin And Tenant Limitations

- `GAP-P2-AC-USER-MGMT-001`: AC user-management query/tab states are not accepted as clean.
- `GAP-P2-AC-TENANT-001`, `GAP-P2-AC-TENANT-002`: Tenant editing and root/wrong-tier routing can expose hidden 403 or page-error states.
- `GAP-P2-FORM-003`: Tenant create/edit sections are current-state only; do not present the mixed create/edit surface as clean task separation until it is split or re-dispositioned.
- `GAP-P2-A11Y-003`: AC tenant list filters, table summaries, and repeated tenant row actions need stronger accessible-name and keyboard proof.
- `GAP-P2-TENANT-CORE-001`, `GAP-P2-TENANT-CORE-002`, `GAP-P2-TENANT-CORE-003`, `GAP-P2-FORM-007`: Tenant security management, tenant root redirects, and organization query-state behavior are not accepted as clean.
- `GAP-P2-FORM-006`: Tenant settings config-entity and dictionary workbenches need stronger task-family separation or owner disposition.
- `GAP-P2-A11Y-006`: Tenant settings/security/organization tables and repeated row actions need stronger accessible-name, keyboard, focus, and status-announcement proof before accessibility acceptance.

## Integration And Operations Limitations

- `GAP-P2-AC-INTEGRATION-001`, `GAP-P2-AC-INTEGRATION-002`, `GAP-P2-AC-INTEGRATION-003`, `GAP-P2-A11Y-004`: AC integration/API surfaces have hidden denied, unavailable, viewport-parity, redirect, or registry-table accessibility limitations.
- `GAP-P2-FORM-004`: Adapter create is not accepted as a usable workflow.
- `GAP-P2-TENANT-INTEGRATION-001`, `GAP-P2-TENANT-INTEGRATION-002`, `GAP-P2-TENANT-INTEGRATION-003`: Tenant integration redirects, module availability copy, and observability query-state behavior remain open.
- `GAP-P2-FORM-008`: Tenant interface, adapter, and webhook workspaces need stronger task-family separation proof.
- `GAP-P2-A11Y-007`: Tenant integration tables, route states, and language metadata need focused accessibility proof.
- `GAP-P2-AC-OPS-001`, `GAP-P2-AC-OPS-002`, `GAP-P2-AC-OPS-003`: Operations and System Dictionary maintenance procedures and deep links are restricted pending proof.
- `GAP-P2-FORM-005`, `GAP-P2-A11Y-005`: System Dictionary and Observability workbenches need stronger task separation, row-action names, keyboard, focus, and status proof.

## Public Presence And Talent Limitations

- `GAP-P2-PUBLIC-PRESENCE-001`, `GAP-P2-PUBLIC-PRESENCE-002`, `GAP-P2-PUBLIC-PRESENCE-003`: Private authoring, editor/preview/Studio, and Marshmallow management routes remain current-state only where hidden failures or unavailable states remain.
- `GAP-P2-FORM-010`, `GAP-P2-FORM-011`, `GAP-P2-A11Y-009`: Public Presence authoring, asset IDE, preview, Marshmallow configuration/export, and panel/form accessibility are not accepted as complete workflows.
- `GAP-P2-PUBLIC-VISITOR-001`, `GAP-P2-PUBLIC-VISITOR-003`, `GAP-P2-FORM-012`, `GAP-P2-A11Y-010`: Public homepage and Marshmallow visitor routes need unavailable/error/external-media, form, language metadata, keyboard, and status proof before clean public guide claims.
- `GAP-P2-TALENT-WORKSPACE-001`, `GAP-P2-TALENT-WORKSPACE-002`, `GAP-P2-TALENT-WORKSPACE-003`: Talent customer/report/settings routes and one solo customer-list state are not accepted as clean.
- `GAP-P2-FORM-009`, `GAP-P2-A11Y-008`: Talent settings and talent workspace tables/forms need stronger task-family separation, row-action naming, keyboard, focus, and language metadata proof.

## Account, Auth, And Accessibility Limitations

- `GAP-P2-AUTH-001`: Full auth lifecycle, password reset, TOTP, SSO success/linking, and external-next sanitization are excluded pending bounded proof.
- `GAP-P2-PROFILE-001`, `GAP-P2-PROFILE-002`: Profile/security surfaces and sensitive mutations are not fully accepted.
- `GAP-P2-A11Y-001`, `GAP-P2-A11Y-002`, `GAP-P2-A11Y-011`: Language metadata, login/root accessibility, profile/security drawer focus, repeated account actions, status announcements, and broader accessibility acceptance remain limited.
