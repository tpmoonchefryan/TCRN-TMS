# User and Role Management

This chapter explains the current role and permission model for the accepted G04/G05/G07 proof slices.

## Permission Semantics

TCRN TMS uses a three-state permission model:

| State | Meaning | Final Access Rule |
| --- | --- | --- |
| Deny | This role explicitly forbids the permission | Deny wins over grants from other assigned roles |
| Grant | This role explicitly grants the permission | Grants access unless another assigned role denies it |
| Unset | This role does not decide the permission | Other assigned roles can still grant or deny it |

A single user can hold multiple roles. If any assigned role denies a permission, the final result is denied even if another assigned role grants it. If a role leaves a permission unset, that role does not decide the permission.

## Initial Admin And Custom Roles

The accepted governance model is one built-in recovery role, `INITIAL_ADMIN`, with day-to-day roles created by users through the role management API and UI. Use `INITIAL_ADMIN` as the recovery baseline and custom roles for normal work.

## Permission Packs

Permissions are organized as user-facing capability packs. A pack can represent multiple underlying resource/action permissions so that users do not need to manage every low-level resource entry one by one.

Role editing should support:

- Category filtering.
- Keyword search across labels, descriptions, categories, risk, resources, and actions.
- Grant, deny, and unset states.
- Optional advanced resource/action overrides where needed.

## Best Practice

Design roles around jobs, not people. Keep `INITIAL_ADMIN` as the recovery/admin baseline, then create custom roles for recurring work patterns such as tenant operator, talent manager, integration maintainer, or observability reviewer.

Recommended pattern:

1. Start with the narrowest scope that matches the job.
2. Grant only the permissions needed for the role's normal workflow.
3. Use deny deliberately when a role must never perform a sensitive action, even if another role grants it.
4. Leave permissions unset when the role should not decide the outcome.
5. Review assignments by user and scope before changing permission packs.

## Example Scenario

A tenant wants one teammate to manage customer reports for a talent but not change tenant security settings. Create or select a talent-scoped custom role for report/customer work, keep tenant security permissions unset or denied, and assign it only for the relevant talent scope. Do not use AC platform roles or tenant-wide admin roles for that day-to-day task.

## User Role Assignment

User detail pages can show role assignment by scope, inheritance, and optional expiry. Current proof shows this as a grouped editor. The page may combine identity fields, scoped role assignment, inheritance controls, expiry inputs, and access information.

## Current Limitations

- Do not broaden permissions or grant wildcard roles to make a denied action disappear.
- Role editor UX should not be treated as final information architecture where metadata, permission editing, and assignment controls are mixed in one surface.
- Role deletion is disabled for audit history; use role governance procedures rather than deletion assumptions.

Related proof: G04 Initial Admin/RBAC baseline, G05 hidden-403 proof, and G07 user-management query-state proof.
