> 🌐 **语言:** [English](self-hosted-proxy.md) | [中文](self-hosted-proxy.zh.md) | [日本語](self-hosted-proxy.ja.md)

# 自托管反向代理配置指南

本指南说明如何设置自己的反向代理，以便在 TCRN-TMS 上使用您自己的 SSL 证书。

## 概述

使用**自托管代理**选项时，您可以完全控制自己的 SSL 证书。您的服务器作为反向代理，终止 SSL 连接并将请求转发到 TCRN-TMS。

```
用户 → 您的服务器 (SSL 终止) → TCRN-TMS
       ↑ 您的证书
```

## 前提条件

- 具有公网 IP 地址的服务器
- 您的 SSL 证书和私钥
- 已安装 Nginx 或 Caddy
- 可访问域名的 DNS 设置

## 方案一：Nginx 配置

### 步骤 1：安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 步骤 2：配置 SSL 证书

放置您的证书文件：
```bash
/etc/ssl/certs/your-domain.crt
/etc/ssl/private/your-domain.key
```

### 步骤 3：创建 Nginx 配置

创建 `/etc/nginx/sites-available/custom-domain.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 代理到 TCRN-TMS 主页
    location / {
        proxy_pass https://YOUR_TCRN_DOMAIN/p/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    # 代理到 TCRN-TMS 棉花糖
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

### 步骤 4：启用并测试

```bash
sudo ln -s /etc/nginx/sites-available/custom-domain.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 方案二：Caddy 配置

Caddy 自动管理 HTTPS，但您也可以使用自己的证书。

### 步骤 1：安装 Caddy

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### 步骤 2：创建 Caddyfile

创建 `/etc/caddy/Caddyfile`：

```caddyfile
your-domain.com {
    # 使用您自己的证书
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key

    # 主页
    handle {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /p/YOUR_TALENT_PATH{uri}
        }
    }

    # 棉花糖
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

### 步骤 3：启动 Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## DNS 配置

将您的域名指向代理服务器：

| 类型 | 名称 | 值 |
|------|------|-------|
| A | your-domain.com | 您的服务器 IP |
| AAAA | your-domain.com | 您的服务器 IPv6 (可选) |

---

## 变量替换说明

| 变量 | 说明 | 示例 |
|----------|-------------|---------|
| `your-domain.com` | 您的自定义域名 | `talent.example.com` |
| `YOUR_TCRN_DOMAIN` | TCRN-TMS 平台域名 | `web.prod.tcrn-tms.com` |
| `YOUR_TALENT_PATH` | 您的艺人路径 | `luna-gaming` |

---

## 验证

配置完成后，请验证：

1. **SSL 证书**：访问 `https://your-domain.com` 并检查证书详情
2. **主页**：确保您的主页正确加载
3. **棉花糖**：测试 `https://your-domain.com/ask`

---

## 故障排查

### 502 Bad Gateway
- 检查 TCRN-TMS 是否可从您的服务器访问
- 验证 proxy_pass URL 是否正确

### SSL 证书错误
- 确保证书和密钥文件权限正确
- 验证证书链是否完整

### 混合内容警告
- 确保所有代理头已正确设置
- 检查 X-Forwarded-Proto 头
