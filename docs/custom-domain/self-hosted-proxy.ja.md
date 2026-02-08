> 🌐 **言語:** [English](self-hosted-proxy.md) | [中文](self-hosted-proxy.zh.md) | [日本語](self-hosted-proxy.ja.md)

# セルフホスト型リバースプロキシ設定ガイド

このガイドでは、TCRN-TMS で独自の SSL 証明書を使用するためのリバースプロキシの設定方法を説明します。

## 概要

**セルフホスト型プロキシ**オプションでは、SSL 証明書を完全に自分で管理できます。お客様のサーバーがリバースプロキシとして機能し、SSL を終端して TCRN-TMS にリクエストを転送します。

```
ユーザー → お客様のサーバー (SSL 終端) → TCRN-TMS
           ↑ お客様の証明書
```

## 前提条件

- パブリック IP アドレスを持つサーバー
- SSL 証明書と秘密鍵
- Nginx または Caddy がインストール済み
- ドメインの DNS 設定へのアクセス

## オプション 1：Nginx 設定

### ステップ 1：Nginx のインストール

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### ステップ 2：SSL 証明書の配置

証明書ファイルを配置します：
```bash
/etc/ssl/certs/your-domain.crt
/etc/ssl/private/your-domain.key
```

### ステップ 3：Nginx 設定の作成

`/etc/nginx/sites-available/custom-domain.conf` を作成：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 設定
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # TCRN-TMS ホームページへのプロキシ
    location / {
        proxy_pass https://YOUR_TCRN_DOMAIN/p/YOUR_TALENT_PATH;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    # TCRN-TMS マシュマロへのプロキシ
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

### ステップ 4：有効化とテスト

```bash
sudo ln -s /etc/nginx/sites-available/custom-domain.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## オプション 2：Caddy 設定

Caddy は自動的に HTTPS を管理しますが、独自の証明書も使用できます。

### ステップ 1：Caddy のインストール

```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### ステップ 2：Caddyfile の作成

`/etc/caddy/Caddyfile` を作成：

```caddyfile
your-domain.com {
    # 独自の証明書を使用
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key

    # ホームページ
    handle {
        reverse_proxy https://YOUR_TCRN_DOMAIN {
            header_up Host {upstream_hostport}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            rewrite /p/YOUR_TALENT_PATH{uri}
        }
    }

    # マシュマロ
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

### ステップ 3：Caddy の起動

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
```

---

## DNS 設定

ドメインをプロキシサーバーに向けます：

| タイプ | 名前 | 値 |
|------|------|-------|
| A | your-domain.com | サーバーの IP |
| AAAA | your-domain.com | サーバーの IPv6 (オプション) |

---

## 変数の置き換え

| 変数 | 説明 | 例 |
|----------|-------------|---------|
| `your-domain.com` | カスタムドメイン | `talent.example.com` |
| `YOUR_TCRN_DOMAIN` | TCRN-TMS プラットフォームドメイン | `web.prod.tcrn-tms.com` |
| `YOUR_TALENT_PATH` | タレントパス | `luna-gaming` |

---

## 検証

設定後、以下を確認してください：

1. **SSL 証明書**：`https://your-domain.com` にアクセスして証明書の詳細を確認
2. **ホームページ**：ホームページが正しく読み込まれることを確認
3. **マシュマロ**：`https://your-domain.com/ask` をテスト

---

## トラブルシューティング

### 502 Bad Gateway
- TCRN-TMS がサーバーからアクセス可能か確認
- proxy_pass URL が正しいか確認

### SSL 証明書エラー
- 証明書とキーファイルの権限が正しいか確認
- 証明書チェーンが完全か確認

### 混合コンテンツ警告
- すべてのプロキシヘッダーが正しく設定されているか確認
- X-Forwarded-Proto ヘッダーを確認
