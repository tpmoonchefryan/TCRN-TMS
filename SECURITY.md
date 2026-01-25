# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of TCRN TMS seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email us at: **ryan.lan_home@outlook.com** (or contact @tpmoonchefryan directly)
3. Include as much information as possible:
   - Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability and provide an initial response within 7 days
- **Resolution**: We aim to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate with you on public disclosure timing

### Scope

The following are in scope for security reports:

- TCRN TMS main application (web, api, worker)
- PII Service
- Authentication and authorization systems
- Data encryption and privacy features
- Third-party integrations

### Out of Scope

- Denial of service attacks
- Social engineering
- Physical security
- Issues in dependencies (please report to the respective project)

## Security Best Practices

When deploying TCRN TMS:

1. **Environment Variables**: Never commit `.env` files to version control
2. **mTLS**: Always use mTLS for PII Service communication in production
3. **Database**: Use strong passwords and enable SSL for PostgreSQL connections
4. **Updates**: Keep all dependencies up to date
5. **Secrets**: Rotate JWT secrets and API keys regularly

## Acknowledgments

We thank all security researchers who help keep TCRN TMS secure. Contributors will be acknowledged here (with permission).

---

*This security policy is subject to change. Last updated: January 2026*
