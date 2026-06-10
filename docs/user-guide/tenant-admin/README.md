# Tenant Admin

Tenant Admin covers regular tenant workspaces. These are separate from the AC tenant and should be validated independently.

## Tenant Workspace Areas

Regular tenants can expose surfaces for:

- Tenant overview and settings.
- Organization structure.
- User and role management.
- Tenant security settings.
- Integration pages.
- Talent and subsidiary scope management.

Use the tenant navigation and breadcrumbs to confirm the active scope before changing data.

## Best Practice

Operate tenant settings in this order:

1. Confirm tenant, subsidiary, and talent scope before interpreting data.
2. Use read-only review before changing security, integrations, or organization settings.
3. Separate daily tenant operations from platform-level AC work.
4. Treat create/import/delete/batch/test actions as sensitive until proof confirms the workflow.
5. Record whether a change affects one tenant, one subsidiary, one talent, or public output.

## Example Scenario

A tenant administrator needs to prepare a new subsidiary for a regional team. They should first confirm the active tenant and subsidiary scope, review organization/business settings, then assign users or roles through the tenant-scoped user/role flow. They should not use platform AC tools unless tenant provisioning itself is wrong or cross-tenant configuration is involved.

## Tenant Security

Tenant security surfaces can include create, import, delete, batch, or test actions. These actions are not accepted as normal guide procedures without disposable tenant, rollback, direct API negative, and accessibility proof.

## Form Composition Guidance

If a page combines unrelated security, settings, import, test, and destructive actions in one tab, treat that page as a current-state management surface. Future UX should split unrelated task families into separate tabs, submenus, or action dialogs.

## Current Limitations

- Tenant security management and destructive settings remain proof-gated under `OKL-G19-TENANT-SECURITY-001`.
- Tenant root and wrong-tier redirect behavior remains outside any sensitive operation claim unless the exact route has proof.
- Security create/import/delete/batch/test procedures are excluded until focused proof or owner disposition exists.
- Tenant integration lifecycle procedures remain excluded unless a focused proof run closes the linked adapter/secret boundary.
- Tenant settings, security, and organization tables/repeated row actions need stronger accessible-name, keyboard, focus, and status-announcement proof before accessibility acceptance.

Related active limitation IDs: `OKL-G19-TENANT-SECURITY-001`, `OKL-G19-ADMIN-INTEGRATION-001`.
