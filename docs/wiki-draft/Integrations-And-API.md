# Integrations And API

Integration surfaces include:

- Interface management.
- Webhook management.
- API clients.
- API registry.
- API gateway readiness.
- Builder registry.
- Platform tool connections.
- Adapters.

## Current Caveat

Adapter creation is not currently documented as an accepted workflow. Some registry and integration routes have hidden denied, unavailable, or viewport-parity limitations.

## Best Practice Summary

Treat integration work as a lifecycle: review interface and registry state, make scoped configuration changes only after proof, then use logs or observability to verify behavior. Keep secret-bearing values out of screenshots and support notes.

Example: when a webhook does not deliver, first confirm tenant scope and readiness state. Escalate to AC gateway or registry review only if the issue appears cross-tenant or platform-wide.

Detailed guide: [Integrations](../user-guide/integrations/README.md).
