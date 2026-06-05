# User and Role Management

This chapter explains the current role and permission model without hiding the open baseline mismatch found during audit.

## Permission Semantics

TCRN TMS uses a three-state permission model:

| State | Meaning | Final Access Rule |
| --- | --- | --- |
| Deny | This role explicitly forbids the permission | Deny wins over grants from other assigned roles |
| Grant | This role explicitly grants the permission | Grants access unless another assigned role denies it |
| Unset | This role does not decide the permission | Other assigned roles can still grant or deny it |

A single user can hold multiple roles. If any assigned role denies a permission, the final result is denied even if another assigned role grants it. If a role leaves a permission unset, that role does not decide the permission.

## Initial Admin And Custom Roles

The intended governance model is one built-in recovery role, `INITIAL_ADMIN`, with day-to-day roles created by users through the role management API and UI. Current local UI proof still showed additional default role assignments in at least the AC tenant, so do not claim that every environment currently displays only `INITIAL_ADMIN` by default.

## Permission Packs

Permissions are organized as user-facing capability packs. A pack can represent multiple underlying resource/action permissions so that users do not need to manage every low-level resource entry one by one.

Role editing should support:

- Category filtering.
- Keyword search across labels, descriptions, categories, risk, resources, and actions.
- Grant, deny, and unset states.
- Optional advanced resource/action overrides where needed.

## User Role Assignment

User detail pages can show role assignment by scope, inheritance, and optional expiry. Current proof shows this as a grouped editor. The page may combine identity fields, scoped role assignment, inheritance controls, expiry inputs, and access information.

## Current Limitations

- Role baseline is not accepted as clean while non-`INITIAL_ADMIN` defaults appear in current UI proof.
- Tenant-level role management routes can expose hidden 403 or current-state-only behavior.
- Role editor UX should not be treated as complete where metadata, permission editing, and assignment controls are mixed in one surface.
- Role deletion is disabled for audit history; use role governance procedures rather than deletion assumptions.

Related gap IDs: `GAP-P2-RBAC-001`, `GAP-P2-RBAC-002`, `GAP-P2-RBAC-003`, `GAP-P2-RBAC-004`, `GAP-P2-AC-USER-MGMT-001`, `GAP-P2-FORM-001`, `GAP-P2-FORM-002`.

