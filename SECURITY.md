# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x.x | Yes |

## Reporting a Vulnerability

Do not open a public issue for security vulnerabilities.

Contact:

- `security@tcrn-tms.com`
- Or contact `@tpmoonchefryan` directly

Please include:

- vulnerability type
- reproduction steps
- impact assessment
- suggested fix, if available

## Expected Response

- Acknowledgment within 48 hours
- Initial assessment within 7 days
- Critical-fix target within 30 days when applicable

## Scope

In scope:

- TCRN TMS web, api, and worker applications
- PII service
- authentication and authorization flows
- encryption, privacy, and tenant-isolation controls
- third-party integration surfaces maintained by this project

Out of scope:

- denial-of-service attacks
- social engineering
- physical security issues
- vulnerabilities that belong to third-party dependencies only

## Deployment Security Notes

- Never commit `.env` files or production secrets
- Enable mTLS for PII service communication in production
- Use strong credentials and TLS for PostgreSQL and Redis
- Rotate JWT secrets, API keys, and certificate material regularly
- Keep base images and dependencies updated

## Acknowledgments

We appreciate responsible disclosure from security researchers and contributors.
