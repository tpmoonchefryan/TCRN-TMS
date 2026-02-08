> 🌐 **语言:** [English](cloudflare-saas.md) | [中文](cloudflare-saas.zh.md) | [日本語](cloudflare-saas.ja.md)

# Cloudflare for SaaS 配置指南

本指南说明如何配置 Cloudflare for SaaS 来管理您的自定义域名与 TCRN-TMS 的 SSL 证书。

## 概述

使用 **Cloudflare for SaaS**，SSL 证书会在 Cloudflare 边缘节点自动配置和续期。客户只需添加 CNAME 记录，无需任何证书管理。

```
用户 → Cloudflare 边缘节点 (SSL) → TCRN-TMS 源站
       ↑ 自动证书
```

## 优势

- ✅ 自动配置 SSL 证书
- ✅ 自动续期证书
- ✅ 全球 CDN 和 DDoS 防护
- ✅ 无需证书管理
- ✅ 企业级安全

---

## 平台管理员配置

### 步骤 1：启用 Cloudflare for SaaS

1. 登录 Cloudflare 控制面板
2. 选择您的区域（例如 `tcrn-tms.com`）
3. 进入 **SSL/TLS** → **自定义主机名**
4. 启用 **Cloudflare for SaaS**

### 步骤 2：配置回源地址

设置您的回源地址为 TCRN-TMS 服务器：

```
回源地址: origin.tcrn-tms.com
```

### 步骤 3：通过 API 添加自定义主机名

当客户验证域名后，将其添加到 Cloudflare：

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

## 客户配置

### 步骤 1：添加 CNAME 记录

在您的 DNS 服务商处添加以下记录：

| 类型 | 名称 | 值 |
|------|------|-------|
| CNAME | @ 或 子域名 | `proxy.tcrn-tms.com` |

**示例：**
- 域名：`talent.example.com`
- CNAME 目标：`proxy.tcrn-tms.com`

### 步骤 2：添加验证 TXT 记录

添加 TCRN-TMS 设置中显示的 TXT 记录：

| 类型 | 名称 | 值 |
|------|------|-------|
| TXT | `_tcrn-verification.your-domain.com` | `tcrn-verify={token}` |

### 步骤 3：等待 SSL 配置

DNS 生效后（5 分钟 - 48 小时），Cloudflare 将自动：
1. 验证域名所有权
2. 签发 SSL 证书
3. 启用 HTTPS

### 步骤 4：验证

访问 `https://your-domain.com`，您应该能看到带有有效 SSL 的 TCRN-TMS 页面。

---

## 常见 DNS 服务商配置

### Cloudflare DNS

1. 进入 **DNS** → **记录**
2. 点击 **添加记录**
3. 选择 **CNAME**
4. 输入名称和目标

### 阿里云 DNS

1. 进入 云解析DNS
2. 点击 添加记录
3. 记录类型: CNAME
4. 输入主机名和目标

### 腾讯云 DNSPod

1. 进入 DNS 解析
2. 点击 添加记录
3. 记录类型: CNAME
4. 输入子域名和目标

### GoDaddy

1. 进入 **My Products** → **DNS**
2. 点击 **Add**
3. 类型: CNAME
4. 输入主机和指向

---

## SSL 证书详情

Cloudflare for SaaS 提供：

| 功能 | 值 |
|---------|-------|
| 证书类型 | Universal SSL (DV) |
| 加密 | TLS 1.2 / TLS 1.3 |
| 有效期 | 90 天（自动续期）|
| 证书颁发机构 | Let's Encrypt / DigiCert |

---

## 故障排查

### "SSL Pending" 状态

- 确保 CNAME 记录配置正确
- 等待 DNS 生效（最多 48 小时）
- 检查是否有 CAA 记录阻止签发

### "Host Error" 错误

- 验证域名是否已在其他地方配置
- 检查是否有冲突的 DNS 记录

### 证书不受信任

- 确保通过 HTTPS 访问
- 清除浏览器缓存后重试

---

## API 参考

### 添加自定义主机名

```bash
POST /zones/{zone_id}/custom_hostnames
```

### 检查主机名状态

```bash
GET /zones/{zone_id}/custom_hostnames/{hostname_id}
```

### 删除自定义主机名

```bash
DELETE /zones/{zone_id}/custom_hostnames/{hostname_id}
```

完整 API 文档请访问：[Cloudflare API Docs](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-list-custom-hostnames)
