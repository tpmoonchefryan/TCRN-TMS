# Caddy Configuration for TCRN TMS

This directory contains the Caddy reverse proxy configuration with automatic SSL support for custom domains.

## Features

1. **Main Domain** (`tcrn.app`) - Standard HTTPS with automatic Let's Encrypt certificates
2. **System Subdomains** (`*.m.tcrn.app`, `*.p.tcrn.app`) - Wildcard SSL using DNS challenge
3. **Custom Domains** - On-demand TLS for user-verified custom domains

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ACME_EMAIL` | Email for Let's Encrypt notifications | Yes |
| `CF_API_TOKEN` | Cloudflare API token for DNS challenge (wildcard certs) | Yes for wildcards |

## Domain Types

### 1. Path-based Access
- URL: `https://tcrn.app/m/{talentCode}`
- No additional configuration needed

### 2. System Subdomains
- URL: `https://{talentCode}.m.tcrn.app`
- Automatically routed by Next.js middleware
- Requires wildcard DNS: `*.m.tcrn.app → A record`
- SSL: Wildcard certificate via DNS-01 challenge

### 3. Custom Domains
- URL: `https://marshmallow.example.com`
- User configures:
  1. CNAME record pointing to `custom.tcrn.app`
  2. TXT record for domain verification
- SSL: On-demand certificate via HTTP-01 challenge

## On-Demand TLS Verification

Caddy calls the internal endpoint before issuing certificates:

```
GET /api/v1/internal/domain-check?domain=example.com
```

- Returns `200 OK` if domain is verified → Certificate issued
- Returns error if domain not found → Certificate denied

## Docker Compose Example

```yaml
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infra/caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    environment:
      - ACME_EMAIL=admin@tcrn.app
      - CF_API_TOKEN=${CF_API_TOKEN}
    depends_on:
      - web
      - api

volumes:
  caddy_data:
  caddy_config:
```

## Cloudflare API Token

For wildcard certificates, create a Cloudflare API token with:
- Zone:DNS:Edit permissions
- Scoped to your domain zone

## Testing

1. Local testing (no SSL):
   ```bash
   caddy run --config Caddyfile.dev
   ```

2. Production:
   ```bash
   caddy run --config Caddyfile
   ```

## Troubleshooting

### Certificate not issuing for custom domain
1. Check domain verification status in database
2. Verify CNAME record points to `custom.tcrn.app`
3. Check Caddy logs for on-demand TLS errors

### Wildcard certificate failing
1. Verify Cloudflare API token permissions
2. Check DNS propagation for the zone
3. Review Caddy logs for DNS challenge errors
