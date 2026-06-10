# Integrations

Integration surfaces cover interfaces, adapters, webhooks, API clients, registries, gateway readiness, builder registry pages, and platform tool connections.

## Integration Families

| Family | Current Guide Position |
| --- | --- |
| Interface management | Visible management surface; permission-clean status not fully accepted |
| Webhook management | Visible management surface; mutation proof depends on focused validation |
| API clients | Visible management surface; access and viewport parity need current proof |
| API registry | Visible registry surface; desktop/mobile parity remains limited in some states |
| API gateway readiness | Visible readiness surface; use current-state wording |
| Builder registry | Visible registry surface; desktop/mobile parity remains limited in some states |
| Platform tool connections | Visible operations surface; avoid overclaiming mutation readiness |
| Adapters | Adapter creation is not accepted as a usable guide procedure yet |

## Using Integration Pages

Use integration pages for browsing visible state and understanding readiness. Before documenting a creation, destructive, or credential-adjacent mutation as normal operation, collect bounded proof and cleanup evidence.

## Best Practice

Treat integrations as a lifecycle, not a single setup page:

1. Confirm the business system you are connecting and the tenant scope it belongs to.
2. Review interface and registry state before creating or changing adapters.
3. Keep secrets, client credentials, and webhook payload details out of screenshots and support tickets.
4. Use observability and logs to verify behavior after a configuration change.
5. Record whether a page is AC-level, tenant-level, or public-facing before describing it as an operating procedure.

## Example Scenario

A tenant wants to receive ticketing-system updates through a webhook. The safe workflow starts by checking the tenant integration page and current registry/readiness state. If webhook creation or secret rotation is needed, keep the guide blocker-aware until a focused proof run covers creation, validation, redaction, failure handling, and cleanup. If multiple tenants show the same readiness issue, escalate to AC integration or gateway-readiness review.

## Current Limitations

- AC integration and API pages are not permission-clean while hidden 403 or denied states remain.
- API Registry and Builder Registry desktop/mobile access parity is not fully accepted.
- Some AC and tenant integration redirects can produce page errors.
- Adapter create is currently documented only as unavailable/current-state, not as a supported procedure.

Related gap IDs: `GAP-P2-AC-INTEGRATION-001`, `GAP-P2-AC-INTEGRATION-002`, `GAP-P2-AC-INTEGRATION-003`, `GAP-P2-FORM-004`, `GAP-P2-TENANT-INTEGRATION-001`.
