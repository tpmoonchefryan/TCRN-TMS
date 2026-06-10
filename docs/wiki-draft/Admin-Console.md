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

Some AC user, tenant, integration, and operations routes have current limitations such as hidden 403 states, page errors, or unproven sensitive procedures. See [Platform Admin](../user-guide/platform-admin/README.md) and [Known Limitations](./Known-Limitations.md).
