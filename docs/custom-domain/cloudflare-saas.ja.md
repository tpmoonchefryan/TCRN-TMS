> 🌐 **言語:** [English](cloudflare-saas.md) | [中文](cloudflare-saas.zh.md) | [日本語](cloudflare-saas.ja.md)

# Cloudflare for SaaS 設定ガイド

このガイドでは、TCRN-TMS のカスタムドメインで SSL 証明書を管理するための Cloudflare for SaaS の設定方法を説明します。

## 概要

**Cloudflare for SaaS** を使用すると、SSL 証明書は Cloudflare のエッジで自動的にプロビジョニングおよび更新されます。お客様は CNAME レコードを追加するだけで、証明書管理は不要です。

```
ユーザー → Cloudflare エッジ (SSL) → TCRN-TMS オリジン
           ↑ 自動証明書
```

## メリット

- ✅ SSL 証明書の自動プロビジョニング
- ✅ 自動証明書更新
- ✅ グローバル CDN と DDoS 保護
- ✅ 証明書管理不要
- ✅ エンタープライズグレードのセキュリティ

---

## TCRN-TMS プラットフォーム管理者向け

### ステップ 1：Cloudflare for SaaS を有効化

1. Cloudflare ダッシュボードにログイン
2. ゾーンを選択（例：`tcrn-tms.com`）
3. **SSL/TLS** → **カスタムホスト名** に移動
4. **Cloudflare for SaaS** を有効化

### ステップ 2：フォールバックオリジンを設定

フォールバックオリジンを TCRN-TMS サーバーに設定：

```
フォールバックオリジン: origin.tcrn-tms.com
```

### ステップ 3：API 経由でカスタムホスト名を追加

お客様がドメインを確認したら、Cloudflare に追加：

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

## お客様向け

### ステップ 1：CNAME レコードを追加

DNS プロバイダーで以下のレコードを追加：

| タイプ | 名前 | 値 |
|------|------|-------|
| CNAME | @ またはサブドメイン | `proxy.tcrn-tms.com` |

**例：**
- ドメイン：`talent.example.com`
- CNAME ターゲット：`proxy.tcrn-tms.com`

### ステップ 2：確認用 TXT レコードを追加

TCRN-TMS 設定画面に表示される TXT レコードを追加：

| タイプ | 名前 | 値 |
|------|------|-------|
| TXT | `_tcrn-verification.your-domain.com` | `tcrn-verify={token}` |

### ステップ 3：SSL プロビジョニングを待つ

DNS 伝播後（5 分〜48 時間）、Cloudflare が自動的に：
1. ドメイン所有権を確認
2. SSL 証明書を発行
3. HTTPS を有効化

### ステップ 4：確認

`https://your-domain.com` にアクセスすると、有効な SSL を持つ TCRN-TMS ページが表示されるはずです。

---

## 主要 DNS プロバイダーの設定

### Cloudflare DNS

1. **DNS** → **レコード** に移動
2. **レコードを追加** をクリック
3. **CNAME** を選択
4. 名前とターゲットを入力

### お名前.com

1. DNS 設定に移動
2. レコードを追加
3. タイプ: CNAME
4. ホスト名とターゲットを入力

### AWS Route 53

1. ホストゾーンを選択
2. レコードを作成
3. タイプ: CNAME
4. 値を入力

### GoDaddy

1. **My Products** → **DNS** に移動
2. **Add** をクリック
3. タイプ: CNAME
4. ホストとポイント先を入力

---

## SSL 証明書の詳細

Cloudflare for SaaS が提供：

| 機能 | 値 |
|---------|-------|
| 証明書タイプ | Universal SSL (DV) |
| 暗号化 | TLS 1.2 / TLS 1.3 |
| 有効期間 | 90 日（自動更新）|
| 認証局 | Let's Encrypt / DigiCert |

---

## トラブルシューティング

### "SSL Pending" ステータス

- CNAME レコードが正しく設定されているか確認
- DNS 伝播を待つ（最大 48 時間）
- 発行をブロックする CAA レコードがないか確認

### "Host Error"

- ドメインが他の場所で既に設定されていないか確認
- 競合する DNS レコードがないか確認

### 証明書が信頼されない

- HTTPS 経由でアクセスしているか確認
- ブラウザキャッシュをクリアして再試行

---

## API リファレンス

### カスタムホスト名を追加

```bash
POST /zones/{zone_id}/custom_hostnames
```

### ホスト名ステータスを確認

```bash
GET /zones/{zone_id}/custom_hostnames/{hostname_id}
```

### カスタムホスト名を削除

```bash
DELETE /zones/{zone_id}/custom_hostnames/{hostname_id}
```

完全な API ドキュメントはこちら：[Cloudflare API Docs](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-list-custom-hostnames)
