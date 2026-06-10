# Architecture Overview

TCRN TMS is a multi-tenant talent management system for VTuber/VUP agencies.

## Scope Model

```text
Platform / AC tenant
└── Regular tenant
    └── Subsidiary
        └── Talent
```

## Core Boundaries

- AC tenant: platform-wide administration.
- Regular tenant: agency/company operations.
- Subsidiary: department or team scope.
- Talent: creator-specific work and public presence.
- External PII platform: sensitive customer fields are delegated outside this repository-owned runtime.

## Best Practice

Use the architecture as a scope map before choosing a workspace or interpreting an error. Start from the question "which actor owns this action?" and then move down the hierarchy only as far as needed:

- AC-owned questions cover tenant provisioning, platform-level policy, cross-tenant integration health, and global operational stewardship.
- Tenant-owned questions cover agency users, tenant settings, tenant integrations, and subsidiary organization.
- Subsidiary-owned questions cover team or department operating context inside one tenant.
- Talent-owned questions cover creator-specific activity, public presence, and talent-facing operational views.
- External PII questions should not be solved by copying sensitive customer data into TCRN TMS docs, tickets, or screenshots.

## Example Scenario

An operator reports that a public talent page does not show the expected campaign content.

1. Check whether the issue is public output or admin preview. If only the admin preview is correct, keep the investigation in Public Presence authoring and publication proof.
2. Check the talent scope. If the wrong talent is selected, fix the talent context before escalating to tenant settings.
3. Check tenant-level integration or runtime state only if multiple talents or public pages in the same tenant are affected.
4. Escalate to AC only when the symptom crosses tenant boundaries, depends on platform-wide capability, or suggests shared infrastructure failure.

## Mental Model

Architecture describes responsibility, not permission. A visible route or a link in the UI does not prove that a user can safely perform every action in that area. Permission, mutation, public-output, and sensitive-account procedures still need their own accepted proof before the guide can present them as clean customer workflows.

## Documentation Boundary

Architecture claims in this wiki are summaries. For user-facing operations, use the repository guide and current source/UI evidence.
