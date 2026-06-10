# Platform Admin

Platform Admin covers the AC tenant workspace used for cross-tenant operation.

## Main AC Surfaces

The AC admin console currently exposes route families for:

- Tenant management.
- User management.
- Interface and webhook management.
- API client management.
- API registry and gateway readiness.
- Builder registry.
- Platform tool connections.
- Runtime flags.
- Observability.
- System dictionary.

Use the visible AC navigation to enter these areas. Some direct redirects and wrong-tier routes currently produce page errors.

## Best Practice

Use the AC workspace for platform-level stewardship, not ordinary tenant work. AC actions should answer questions such as:

- Is the tenant provisioned and healthy?
- Are platform integrations, registries, gateway readiness, and runtime flags in the expected state?
- Do observability records show a platform-wide issue?
- Does a system dictionary change need platform-level governance?

Avoid using AC access to bypass tenant or talent permission boundaries. If the problem belongs to one tenant or one talent, start in that narrower scope and escalate only when the evidence points to platform-level configuration.

## Example Scenario

An agency reports that a webhook integration appears unavailable. A tenant operator should first inspect the tenant integration page and recent observability state. A platform administrator uses AC only after the issue looks cross-tenant, registry-level, or related to gateway/runtime configuration. That separation prevents platform maintenance pages from becoming a shortcut for tenant operations.

## Tenant Management

Tenant management is the AC-side entry point for browsing and editing tenant-level records. Current proof supports describing the visible list and editor surfaces, but not claiming every tenant capability or email-domain edit path is clean.

## AC User Management

AC user management includes user browsing and user detail editing. The user detail screen can include account profile fields, role assignments, and scope access information. Because this surface mixes identity metadata, role assignment, inheritance, and safety copy in one page, describe it as a current grouped editor, not as the target UX model.

## Current Limitations

- AC user-management query and tab states are not accepted as clean.
- Tenant capability and email-domain editing should not be described as fully clean while hidden 403s remain.
- Some AC integration and operations routes expose hidden denied or unavailable states.
- Destructive or sensitive platform maintenance actions require bounded proof before guide promotion.

Related gap IDs: `GAP-P2-AC-USER-MGMT-001`, `GAP-P2-AC-TENANT-001`, `GAP-P2-AC-TENANT-002`, `GAP-P2-FORM-001`, `GAP-P2-FORM-003`, `GAP-P2-AC-INTEGRATION-001`, `GAP-P2-AC-OPS-001`, `GAP-P2-AC-OPS-003`.
