> 🌐 **Language:** [English](cloudflare-saas.md) | [中文](cloudflare-saas.zh.md) | [日本語](cloudflare-saas.ja.md)

# Cloudflare for SaaS Setup Guide

This guide explains how to configure Cloudflare for SaaS to manage SSL certificates for your custom domain with TCRN-TMS.

## Overview

With **Cloudflare for SaaS**, SSL certificates are automatically provisioned and renewed at Cloudflare's edge. Customers simply add a CNAME record - no certificate management required.

```
User → Cloudflare Edge (SSL) → TCRN-TMS Origin
       ↑ Automatic certificate
```

## Benefits

- ✅ Automatic SSL certificate provisioning
- ✅ Automatic certificate renewal
- ✅ Global CDN and DDoS protection
- ✅ No certificate management required
- ✅ Enterprise-grade security

---

## For TCRN-TMS Platform Administrators

### Step 1: Enable Cloudflare for SaaS

1. Log in to Cloudflare Dashboard
2. Select your zone (e.g., `tcrn-tms.com`)
3. Go to **SSL/TLS** → **Custom Hostnames**
4. Enable **Cloudflare for SaaS**

### Step 2: Configure Fallback Origin

Set your fallback origin to your TCRN-TMS server:

```
Fallback Origin: origin.tcrn-tms.com
```

### Step 3: Add Custom Hostname via API

When a customer verifies their domain, add it to Cloudflare:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/custom_hostnames" \
     -H "Authorization: Bearer {api_token}" \
     -H "Content-Type: application/json" \
     --data '{
       "hostname": "talent.customer.com",
       "ssl": {
         "method": "txt",
         "type": "dv"
       }
     }'
```

---

## For Customers

### Step 1: Add CNAME Record

Add the following DNS record at your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | @ or subdomain | `proxy.tcrn-tms.com` |

**Example:**
- Domain: `talent.example.com`
- CNAME Target: `proxy.tcrn-tms.com`

### Step 2: Add TXT Record for Verification

Add the TXT record shown in your TCRN-TMS settings:

| Type | Name | Value |
|------|------|-------|
| TXT | `_tcrn-verification.your-domain.com` | `tcrn-verify={token}` |

### Step 3: Wait for SSL Provisioning

After DNS propagation (5 min - 48 hours), Cloudflare will automatically:
1. Validate domain ownership
2. Issue SSL certificate
3. Enable HTTPS

### Step 4: Verify

Visit `https://your-domain.com` - you should see your TCRN-TMS page with valid SSL.

---

## DNS Provider Instructions

### Cloudflare DNS

1. Go to **DNS** → **Records**
2. Click **Add Record**
3. Select **CNAME**
4. Enter name and target

### Alibaba Cloud DNS

1. Go to 云解析DNS
2. Click 添加记录
3. 记录类型: CNAME
4. Enter hostname and target

### Tencent Cloud DNSPod

1. Go to DNS 解析
2. Click 添加记录
3. 记录类型: CNAME
4. Enter subdomain and target

### GoDaddy

1. Go to **My Products** → **DNS**
2. Click **Add**
3. Type: CNAME
4. Enter host and points to

---

## SSL Certificate Details

Cloudflare for SaaS provides:

| Feature | Value |
|---------|-------|
| Certificate Type | Universal SSL (DV) |
| Encryption | TLS 1.2 / TLS 1.3 |
| Validity | 90 days (auto-renewed) |
| Certificate Authority | Let's Encrypt / DigiCert |

---

## Troubleshooting

### "SSL Pending" Status

- Ensure CNAME record is correctly configured
- Wait for DNS propagation (up to 48 hours)
- Check for CAA records that might block issuance

### "Host Error"

- Verify the domain is not already configured elsewhere
- Check for conflicting DNS records

### Certificate Not Trusted

- Ensure you're accessing via HTTPS
- Clear browser cache and retry

---

## API Reference

### Add Custom Hostname

```bash
POST /zones/{zone_id}/custom_hostnames
```

### Check Hostname Status

```bash
GET /zones/{zone_id}/custom_hostnames/{hostname_id}
```

### Delete Custom Hostname

```bash
DELETE /zones/{zone_id}/custom_hostnames/{hostname_id}
```

For full API documentation, visit: [Cloudflare API Docs](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-list-custom-hostnames)
