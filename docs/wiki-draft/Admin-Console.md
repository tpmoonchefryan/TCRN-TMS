# Admin Console

The Admin Console covers AC tenant surfaces used by platform administrators.

## Main Areas

- Tenant management.
- User management.
- Interface and webhook management.
- API client, registry, gateway readiness, and builder registry pages.
- Platform tool connections.
- Runtime flags and observability.
- System dictionary.

## Best-Practice Summary

Use AC for platform stewardship: tenant provisioning, registry health, runtime flags, observability, and platform dictionaries. Do not use AC as a shortcut for normal tenant or talent workflows.

Example: if one tenant cannot see integration data, start with tenant integration troubleshooting. Move to AC only when the issue looks cross-tenant, registry-level, or runtime-wide.

## Current Caveat

AC user, tenant, integration, and operations pages are accepted only for their represented proof slices. Adapter/secret mutation, tenant-destructive actions, and System Dictionary/runtime maintenance remain limitation-aware. See [Platform Admin](../user-guide/platform-admin/README.md) and [Known Limitations](./Known-Limitations.md).
