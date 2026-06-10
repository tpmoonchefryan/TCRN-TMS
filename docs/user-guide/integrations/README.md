# Integrations

Integration surfaces cover interfaces, adapters, webhooks, API clients, registries, gateway readiness, builder registry pages, and platform tool connections.

## Integration Families

| Family | Current Guide Position |
| --- | --- |
| Interface management | Visible management surface for accepted G08/G11 proof slices |
| Webhook management | Visible management surface; mutation proof depends on focused validation |
| API clients | Visible management surface; credential mutation needs focused proof |
| API registry | Visible registry surface for accepted proof slices |
| API gateway readiness | Visible readiness surface |
| Builder registry | Visible registry surface for accepted proof slices |
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

- Adapter creation and configuration need disposable integration fixture and cleanup proof.
- Webhook/API secret display, rotation, revoke, and deletion need redacted proof.
- Keep secrets, auth headers, cookies, session ids, payload details, and customer-sensitive data out of screenshots and support tickets.

Related limitation ID: `OKL-G19-ADMIN-INTEGRATION-001`.
