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

## Documentation Boundary

Architecture claims in this wiki are summaries. For user-facing operations, use the repository guide and current source/UI evidence.

