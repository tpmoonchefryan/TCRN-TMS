# Getting Started

This chapter explains the current entry and navigation model. It avoids sensitive authentication procedures that are still outside G19 terminal proof.

## Entry Points

TCRN TMS has workspace-scoped routes. The app shell typically includes:

- A product or workspace name.
- A left navigation menu for the active workspace.
- Breadcrumbs for the current page family.
- A language switcher when the route supports localization.
- An account menu.

Use the workspace navigation first. Direct URL entry can expose page-error or redirect states on some root and wrong-tier routes.

## Workspace Types

| Workspace | What It Represents | Typical Users |
| --- | --- | --- |
| AC tenant | Platform administration workspace | Platform owner and platform administrators |
| Regular tenant | Agency or company workspace | Tenant administrators and operators |
| Subsidiary | Department or sub-team scope | Scoped tenant operators |
| Talent | Creator or public-presence scope | Talent managers and public-page editors |

## Best Practice

Choose the narrowest workspace that matches the job:

- Use AC only for platform-level administration across tenants.
- Use tenant or subsidiary workspaces for operational setup, users, integrations, and organization data.
- Use talent scope for customer, report, settings, and public-presence work tied to one creator.
- Use public visitor routes only to verify what unauthenticated audiences can see.

Do not switch to a broader workspace just because an action is denied in a narrower one. A denied state usually means the role, scope, or workflow needs review.

## Example Scenario

If a tenant operator wants to check why a public page is not showing the expected media, they should first confirm the tenant and talent context, then open the public-presence guide. They should not use AC tenant management unless the issue is platform-wide, such as tenant provisioning, platform integration health, or cross-tenant observability.

## Mental Model Checks

- AC is for platform administration, not ordinary tenant operations.
- Tenant is the business account; talent is the creator/public-presence scope inside that account.
- Admin preview is not the same as public visitor output.
- A route that loads does not prove that submit, publish, export, or destructive actions are accepted.

## Language Selection

The UI supports English, Simplified Chinese, and Japanese labels. Current audit evidence found open language metadata limitations, so do not treat the HTML language metadata as fully accepted for every localized screen yet.

## Login Credential Boundary

The sign-in form is safe to describe for credential submission at a narrow URL-boundary level: the G19 proof pass repaired the native form fallback to use `POST /api/v1/auth/login`, and the hydrated JavaScript path also posts to `/api/v1/auth/login`. Credential field values must not appear in the browser URL, browser history, request path, screenshots, docs examples, or retained proof artifacts.

This is not a blanket acceptance of the full authentication lifecycle. Password reset/change, account recovery, TOTP, SSO callback/linking, session revocation, email change, and avatar mutation still need separate fixture-safe proof before they become operating procedures.

## Current Limitations

- Full auth lifecycle beyond the G19 credential URL-safety boundary remains excluded pending bounded proof.
- Some root redirects and wrong-tier route redirects can produce page errors. Use visible workspace navigation when possible.
- Login/root accessibility proof is current-state only and should not be described as fully accepted.

Related gap or limitation IDs: `OKL-G19-AUTH-LIFECYCLE-001`, `OKL-G19-AUTH-LIFECYCLE-SSO-001`, `GAP-P2-A11Y-001`, `GAP-P2-A11Y-002`, `GAP-P2-AC-TENANT-002`, `GAP-P2-TENANT-CORE-002`.
