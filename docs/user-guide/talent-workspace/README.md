# Talent Workspace

Talent Workspace covers talent-scoped work such as customer views, reports, public presence, and settings.

## Common Talent Areas

Talent-scoped navigation can include:

- Talent overview.
- Customer-related pages.
- Report pages.
- Settings.
- Public presence management.

Confirm the active tenant, subsidiary, and talent scope before interpreting permissions or data.

## Customer And Report Surfaces

Customer and report pages should be treated as current-state visible surfaces unless a focused proof run confirms the route is permission-clean for the selected tenant and talent. Current proof found a runtime error in one UAT solo customer-list path.

## Current Limitations

- Customer, report, and settings routes are not accepted as permission-clean while hidden failures remain.
- UAT solo customer-list browsing is not accepted as clean while the runtime error remains reproducible.
- Any customer PII claim must respect the external PII platform boundary described in the README and reference chapter.

Related gap IDs: `GAP-P2-TALENT-WORKSPACE-001`, `GAP-P2-TALENT-WORKSPACE-002`.

