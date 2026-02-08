> 🌐 **Language:** [English](self-hosted-proxy.md) | [中文](self-hosted-proxy.zh.md) | [日本語](self-hosted-proxy.ja.md)

# Self-Hosted Reverse Proxy Setup Guide

This guide explains how to set up your own reverse proxy to use your custom SSL certificate with TCRN-TMS.

## Overview

With the **Self-Hosted Proxy** option, you maintain complete control over your SSL certificates. Your server acts as a reverse proxy, terminating SSL and forwarding requests to TCRN-TMS.

```
User → Your Server (SSL termination) → TCRN-TMS
       ↑ Your certificate
```

## Prerequisites

- A server with a public IP address
- Your SSL certificate and private key
- Nginx or Caddy installed
- Access to your domain's DNS settings

## Option 1: Nginx Configuration

### Step 1: Install Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### Step 2: Configure SSL Certificate

Place your certificate files:
```bash
/etc/ssl/certs/your-domain.crt
/etc/ssl/private/your-domain.key
```

### Step 3: Create Nginx Configuration

Create `/etc/nginx/sites-available/custom-domain.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to TCRN-TMS Homepage
    location / {
        proxy_pass https://YOUR_TCRN_DOMAIN/p/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    # Proxy to TCRN-TMS Marshmallow
    location /ask {
        proxy_pass https://YOUR_TCRN_DOMAIN/m/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }
}
```

### Step 4: Enable and Test

```bash
sudo ln -s /etc/nginx/sites-available/custom-domain.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 2: Caddy Configuration

Caddy automatically manages HTTPS, but you can also use your own certificate.

### Step 1: Install Caddy

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Step 2: Create Caddyfile

Create `/etc/caddy/Caddyfile`:

```caddyfile
your-domain.com {
    # Use your own certificate
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key

    # Homepage
    handle {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /p/YOUR_TALENT_PATH{uri}
        }
    }

    # Marshmallow
    handle /ask* {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /m/YOUR_TALENT_PATH{uri}
        }
    }
}
```

### Step 3: Start Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## DNS Configuration

Point your domain to your proxy server:

| Type | Name | Value |
|------|------|-------|
| A | your-domain.com | Your Server IP |
| AAAA | your-domain.com | Your Server IPv6 (optional) |

---

## Variables to Replace

| Variable | Description | Example |
|----------|-------------|---------|
| `your-domain.com` | Your custom domain | `talent.example.com` |
| `YOUR_TCRN_DOMAIN` | TCRN-TMS platform domain | `web.prod.tcrn-tms.com` |
| `YOUR_TALENT_PATH` | Your talent path | `luna-gaming` |

---

## Verification

After configuration, verify:

1. **SSL Certificate**: Visit `https://your-domain.com` and check certificate details
2. **Homepage**: Ensure your homepage loads correctly
3. **Marshmallow**: Test `https://your-domain.com/ask`

---

## Troubleshooting

### 502 Bad Gateway
- Check if TCRN-TMS is accessible from your server
- Verify proxy_pass URL is correct

### SSL Certificate Errors
- Ensure certificate and key files have correct permissions
- Verify certificate chain is complete

### Mixed Content Warnings
- Ensure all proxy headers are set correctly
- Check X-Forwarded-Proto header
