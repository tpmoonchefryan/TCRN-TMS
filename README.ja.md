<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README.zh-CN.md">简体中文</a> |
  <strong>日本語</strong>
</p>

<h1 align="center">TCRN TMS - タレントマネジメントシステム</h1>

<p align="center">
  <strong>VTuber/VUP事務所向けに設計された総合CRMプラットフォーム</strong>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-PolyForm%20NC-blue">
  <img alt="Node" src="https://img.shields.io/badge/node-20%2B-green">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.8-blue">
  <img alt="PRs Welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen">
</p>

---

## 📋 To Do

- **アダプターとWebhook開発**
  - Bilibiliライブオープンプラットフォームとの連携（視聴者情報の自動更新、メンバーシップ有効期限の追跡、消費履歴など）
  - 中国国内物流会社オープンプラットフォームとの連携（将来のメンバー特典機能向け）

---

## 📖 目次

- [To Do](#-to-do)
- [はじめに](#-はじめに)
- [機能ハイライト](#-機能ハイライト)
- [コアモジュール](#-コアモジュール)
- [アーキテクチャ](#-アーキテクチャ)
- [技術スタック](#-技術スタック)
- [クイックスタート](#-クイックスタート)
- [本番環境デプロイ](#-本番環境デプロイ)
- [PIIプロキシサービスデプロイ](#-piiプロキシサービスデプロイ)
- [APIリファレンス](#-apiリファレンス)
- [セキュリティ](#-セキュリティ)
- [ライセンス](#-ライセンス)

---

## 🎯 はじめに

**TCRN TMS（タレントマネジメントシステム）**は、VTuber（バーチャルYouTuber）およびVUP（バーチャルアップローダー）事務所向けに設計された総合CRMプラットフォームです。顧客プロファイル管理から外部インタラクティブページまで、オールインワンのソリューションを提供します。

### 対象ユーザー

- **VTuber/VUP事務所**：タレント、顧客、ファンインタラクションを大規模に管理
- **個人クリエイター**：カスタマイズ可能なホームページでプロフェッショナルなプレゼンスを構築
- **タレントマネージャー**：メンバーシップ追跡、匿名Q&A（マシュマロ）処理、レポート生成
- **企業チーム**：マルチテナントアーキテクチャと細粒度のRBAC権限

### 主な差別化要素

- **プライバシーファーストアーキテクチャ**：PII（個人識別情報）は暗号化された別のマイクロサービスに保存
- **マルチテナント分離**：各テナントは完全なデータ分離のためにPostgreSQLスキーマを持つ
- **3言語サポート**：英語、中国語、日本語の完全なUIローカライゼーション
- **VTuber専用機能**：マシュマロ（匿名Q&A）、カスタマイズ可能なタレントホームページ、メンバーシップ追跡

---

## ✨ 機能ハイライト

### 🔐 プライバシーファーストPIIアーキテクチャ

すべての機密顧客データ（本名、電話番号、住所、メールアドレス）は独立したPIIプロキシサービスに保存されます：

- **トークンベースアクセス**：ローカルデータベースには`rm_profile_id`トークンのみを保存
- **AES-256-GCM暗号化**：保存データはテナント別DEKで暗号化
- **mTLS認証**：サービス間通信は相互TLSで保護
- **短期JWT**：PII取得には5分有効のアクセストークンを使用

### 🏢 マルチテナント組織構造

```
プラットフォーム（ACテナント）
└── 通常テナント（会社/事務所）
    └── サブシディアリ（部門/チーム）
        └── タレント（個人クリエイター）
```

- **スキーマベース分離**：各テナントは専用PostgreSQLスキーマ（`tenant_xxx`）を持つ
- **階層的権限**：設定とルールはテナント → サブシディアリ → タレントに継承
- **クロステナント管理**：プラットフォーム管理者はすべてのテナントを管理可能

### 🛡️ 三状態RBAC権限システム

従来の付与/拒否システムとは異なり、TCRN TMSは三状態モデルを実装しています：

| 状態 | 説明 | 優先度 |
|------|------|--------|
| **Deny（拒否）** | 明示的に禁止 | 最高 |
| **Grant（付与）** | 明示的に許可 | 中 |
| **Unset（未設定）** | 未構成 | 最低 |

**機能型ロール**：`ADMIN`、`TALENT_MANAGER`、`VIEWER`、`TALENT_SELF`、`MODERATOR`、`SUPPORT`、`ANALYST`

### 🍡 マシュマロ匿名Q&Aシステム

日本の「マシュマロ」サービスにインスピレーションを受けた完全な匿名質問箱システム：

- **スマートCAPTCHA**：3つのモード（常時/なし/自動）と信頼スコア
- **コンテンツモデレーション**：リスクスコア付き多言語不適切表現フィルター
- **外部ブロックリスト**：URL、ドメイン、キーワードパターンをブロック
- **絵文字リアクション**：ファンは承認されたメッセージにリアクション可能
- **エクスポート機能**：メッセージをCSV/JSON/XLSXにエクスポート

### 📊 MFRレポート生成

包括的な**メンバーシップフィードバックレポート**を生成：

- PII付きメンバープロファイル（安全な取得経由）
- プラットフォームアイデンティティ（YouTube、Bilibili等）
- メンバーシップ状態と期限追跡
- 進捗追跡付き非同期生成
- 署名付きURL経由でMinIOから直接ダウンロード

### 🔍 包括的な監査ログ

自動PIIマスキング付き3種類のログ：

| ログタイプ | 目的 | 保持期間 |
|------------|------|----------|
| **変更ログ** | UIトリガーのビジネス変更 | 60日（本番） |
| **技術イベントログ** | システムイベントとエラー | 60日（本番） |
| **統合ログ** | 外部API呼び出しとWebhook | 60日（本番） |

Loki統合により、すべてのログで全文検索が可能です。

---

## 📦 コアモジュール

### 顧客管理

| 機能 | 説明 |
|------|------|
| **個人プロファイル** | 本名、ニックネーム、連絡先、生年月日 |
| **企業プロファイル** | 法人名、登記番号、税番号 |
| **プラットフォームアイデンティティ** | YouTube、Bilibili、Twitch、Twitter UID（履歴追跡付き） |
| **メンバーシップ記録** | クラス、タイプ、レベル（自動更新対応） |
| **外部ID** | 顧客を外部システム（CRM、チケットシステム）にマッピング |
| **一括インポート** | バリデーションとエラーレポート付きCSVインポート |
| **バッチ操作** | タグ/ステータス/メンバーシップの一括更新 |

### ホームページ管理

タレント向けドラッグ＆ドロップホームページビルダー：

- **コンポーネントライブラリ**：ヒーロー、アバウト、ソーシャルリンク、ギャラリー、タイムライン、マシュマロウィジェット
- **テーマシステム**：5つのプリセット（デフォルト、ダーク、キュート、プロフェッショナル、ミニマル）+ カスタムカラー
- **バージョン履歴**：任意の公開済みバージョンにロールバック
- **ライブステータス統合**：Bilibili/YouTubeのリアルタイム配信ステータスとカバー画像表示
- **プロフィールカード**：ローカルアバターアップロードとカスタマイズ可能なレイアウトによるパーソナライゼーション強化
- **カスタムドメイン**：DNS検証付きタレント所有ドメインをサポート
- **SEO最適化**：自動メタタグとOpen Graphサポート

### セキュリティ管理

| 機能 | 説明 |
|------|------|
| **ブロックリスト** | コンテンツフィルタリング用キーワードと正規表現パターン |
| **IPルール** | CIDR対応のホワイトリスト/ブラックリスト |
| **レート制限** | Redisバックのエンドポイント単位レート制限 |
| **UA検出** | 既知のボット/スクレイパーUser-Agentをブロック |
| **技術フィンガープリント** | データ漏洩追跡用の隠しウォーターマーク |

### メールサービス

Tencent Cloud SESと統合：

- **テンプレートシステム**：変数置換付き多言語テンプレート（英/中/日）
- **キュー処理**：リトライとレート制限付きBullMQワーカー
- **プリセットテンプレート**：パスワードリセット、ログイン認証、メンバーシップアラート

---

## 🏗️ アーキテクチャ

```
                                    ┌─────────────────────────────────────────┐
                                    │           クラウドプロバイダー           │
                                    │  ┌─────────────────────────────────┐   │
                                    │  │         ロードバランサー         │   │
                                    │  └─────────────┬───────────────────┘   │
                                    │                │                        │
               ┌─────────────────────┼────────────────┼────────────────────┐  │
               │                     │                │                    │  │
               ▼                     ▼                ▼                    ▼  │
        ┌─────────────┐       ┌─────────────┐  ┌─────────────┐     ┌─────────┐│
        │   Next.js   │       │   NestJS    │  │   Worker    │     │  MinIO  ││
        │   (Web UI)  │──────▶│   (API)     │  │  (BullMQ)   │     │  (S3)   ││
        │   :3000     │       │   :4000     │  │             │     │  :9000  ││
        └─────────────┘       └──────┬──────┘  └──────┬──────┘     └─────────┘│
                                     │                │                       │
                              ┌──────┴──────┬─────────┴────┐                  │
                              │             │              │                  │
                              ▼             ▼              ▼                  │
                       ┌───────────┐ ┌───────────┐  ┌───────────┐             │
                       │PostgreSQL │ │   Redis   │  │   NATS    │             │
                       │   :5432   │ │   :6379   │  │   :4222   │             │
                       └───────────┘ └───────────┘  └───────────┘             │
                              │                                               │
                              │ mTLS                                          │
                              ▼                                               │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
              │         分離されたPII環境                  │                  │
              │  ┌─────────────────┐  ┌─────────────────┐  │                  │
              │  │  PIIプロキシ    │  │  PIIデータベース │  │                  │
              │  │  サービス:5100  │──│  PostgreSQL     │  │                  │
              │  │  (AES-256-GCM)  │  │  (暗号化)       │  │                  │
              │  └─────────────────┘  └─────────────────┘  │                  │
               ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                 │
                                    └─────────────────────────────────────────┘
```

### データフロー

1. **Web UI** → **APIゲートウェイ**（NestJS）ですべてのビジネス操作を処理
2. **API**がJWTを検証し、Redis権限スナップショットをチェック
3. 非PIIデータはテナント固有のPostgreSQLスキーマに保存
4. PII取得：APIが短期JWTを発行 → PIIプロキシ → 暗号化ストレージ
5. バックグラウンドジョブはBullMQワーカーで処理
6. ファイルはMinIOに保存され、署名付きURLでダウンロード

---

## 🛠️ 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| **フロントエンド** | Next.js | 16.1.1 |
| | React | 19.1.1 |
| | TypeScript | 5.8.3 |
| | Tailwind CSS | 3.4.17 |
| | Zustand | 5.0.5 |
| **バックエンド** | NestJS | 11.1.6 |
| | Prisma ORM | 6.14.0 |
| | BullMQ | 5.66.5 |
| **データベース** | PostgreSQL | 16 |
| | Redis | 7 |
| **ストレージ** | MinIO | Latest |
| **メッセージング** | NATS JetStream | 2 |
| **オブザーバビリティ** | OpenTelemetry | - |
| | Prometheus | - |
| | Grafana Loki | 2.9.0 |
| | Grafana Tempo | - |
| **デプロイ** | Docker | - |
| | Kubernetes | - |

---

## 🚀 クイックスタート

### 前提条件

- Node.js 20+（LTS推奨）
- pnpm 9.15.4+
- Docker & Docker Compose
- PostgreSQL 16+（またはDockerを使用）
- Redis 7+（またはDockerを使用）

### 開発環境セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms

# 2. 依存関係をインストール
pnpm install

# 3. インフラサービスを起動
docker-compose up -d postgres redis minio nats loki tempo pii-postgres pii-service

# 4. 環境変数を設定
cp .env.sample .env.local
# .env.localを編集して設定を入力

# 5. データベースを初期化
cd packages/database
pnpm db:apply-migrations
pnpm db:sync-schemas
pnpm db:seed
cd ../..

# 6. 開発サーバーを起動
pnpm dev
```

### アクセスポイント

| サービス | URL |
|----------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:4000 |
| APIドキュメント | http://localhost:4000/api/docs |
| MinIOコンソール | http://localhost:9001 |
| NATSモニター | http://localhost:8222 |

### デフォルト認証情報

**AC（プラットフォーム管理者）テナント：**
| フィールド | 値 |
|------------|-----|
| テナントコード | AC |
| ユーザー名 | ac_admin |
| パスワード | (シードファイルで設定、`00-ac-tenant.ts` 参照) |

---

## 🌐 本番環境デプロイ

このセクションでは、TCRN TMSメインアプリケーションをクラウドサーバーにデプロイする方法を説明します。

### インフラ要件

| コンポーネント | 最小構成 | 推奨構成 |
|----------------|----------|----------|
| **アプリケーションサーバー** | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| **PostgreSQL** | 2 vCPU, 4GB RAM, 50GB SSD | 4 vCPU, 8GB RAM, 100GB SSD |
| **Redis** | 1 vCPU, 1GB RAM | 2 vCPU, 2GB RAM |
| **MinIO** | 2 vCPU, 2GB RAM, 100GB SSD | 4 vCPU, 4GB RAM, 500GB SSD |

### デプロイオプション

#### オプション1：Docker Compose（シングルサーバー）

適用：小規模デプロイ、ステージング環境

```bash
# 1. サーバーを準備
ssh your-server
sudo apt update && sudo apt install -y docker.io docker-compose-plugin

# 2. クローンして設定
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cd tcrn-tms
cp .env.sample .env

# 3. 本番環境変数を設定
cat > .env << 'EOF'
# データベース
POSTGRES_USER=tcrn_prod
POSTGRES_PASSWORD=$(openssl rand -hex 32)
POSTGRES_DB=tcrn_tms
DATABASE_URL=postgresql://tcrn_prod:${POSTGRES_PASSWORD}@postgres:5432/tcrn_tms

# Redis
REDIS_URL=redis://redis:6379

# セキュリティ
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
FINGERPRINT_SECRET_KEY=$(openssl rand -hex 32)
FINGERPRINT_KEY_VERSION=v1

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(openssl rand -hex 32)
MINIO_ENDPOINT=http://minio:9000

# PIIサービス（本番環境では別サーバー推奨）
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true

# アプリケーション
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_APP_URL=https://app.your-domain.com

# メール（Tencent Cloud SES）
TENCENT_SES_SECRET_ID=your-secret-id
TENCENT_SES_SECRET_KEY=your-secret-key
TENCENT_SES_REGION=ap-hongkong
TENCENT_SES_FROM_ADDRESS=noreply@your-domain.com
EOF

# 4. ビルドしてデプロイ
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# 5. データベースを初期化
docker-compose exec api pnpm db:apply-migrations
docker-compose exec api pnpm db:sync-schemas
docker-compose exec api pnpm db:seed
```

#### オプション2：Kubernetes（本番環境推奨）

適用：高可用性、オートスケーリング、エンタープライズデプロイ

```bash
# 1. 名前空間とシークレットを適用
kubectl create namespace tcrn-tms
kubectl apply -f infra/k8s/secrets/

# 2. インフラをデプロイ
kubectl apply -f infra/k8s/postgres/
kubectl apply -f infra/k8s/redis/
kubectl apply -f infra/k8s/minio/
kubectl apply -f infra/k8s/nats/

# 3. インフラの準備を待つ
kubectl wait --for=condition=ready pod -l app=postgres -n tcrn-tms --timeout=300s

# 4. アプリケーションをデプロイ
kubectl apply -f infra/k8s/deployments/

# 5. Ingressを設定
kubectl apply -f infra/k8s/ingress/

# 6. データベースマイグレーションを実行（一度だけ）
kubectl apply -f infra/k8s/jobs/db-migrate.yaml
```

**Kubernetes機能：**

- **ローリングアップデート**：`maxUnavailable: 0`によるゼロダウンタイムデプロイ
- **水平Podオートスケーラー（HPA）**：CPU/メモリに基づく自動スケーリング
- **Pod中断バジェット（PDB）**：更新中の最小レプリカ維持
- **ヘルスチェック**：すべてのサービスにレディネスとライブネスプローブを設定

### SSL/TLS設定

```nginx
# Nginxリバースプロキシ設定例
server {
    listen 443 ssl http2;
    server_name app.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 環境チェックリスト

- [ ] PostgreSQLのTLSを有効化
- [ ] Redisの認証を有効化
- [ ] MinIOのHTTPSを有効化
- [ ] JWTシークレットを生成（最低32文字）
- [ ] フィンガープリントキーを設定
- [ ] PIIサービスURLを設定（次のセクションを参照）
- [ ] メールサービス認証情報を設定
- [ ] バックアップ戦略を実装
- [ ] 監視とアラートを設定

---

## 🔒 PIIプロキシサービスデプロイ

セキュリティコンプライアンスのため、PIIプロキシサービスはメインアプリケーションとは**別のサーバー**にデプロイする必要があります。

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                    メインアプリケーションサーバー                    │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐               │
│  │   Web UI    │   │   API       │   │   Worker    │               │
│  └─────────────┘   └──────┬──────┘   └──────┬──────┘               │
│                           │                  │                      │
│                           │   JWT + mTLS     │                      │
└───────────────────────────┼──────────────────┼──────────────────────┘
                            │                  │
                            ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PIIプロキシサーバー（分離環境）                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    PIIプロキシサービス                       │   │
│  │   - JWT検証                                                  │   │
│  │   - AES-256-GCM暗号化/復号化                                │   │
│  │   - テナント別DEK管理                                        │   │
│  │   - 監査ログ                                                 │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────▼─────────────────────────────────┐   │
│  │                    PIIデータベース                           │   │
│  │   - 保存時暗号化                                             │   │
│  │   - ネットワーク分離                                         │   │
│  │   - 外部直接アクセス禁止                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### サーバー要件

| コンポーネント | スペック |
|----------------|----------|
| **OS** | Ubuntu 22.04 LTS以降 |
| **CPU** | 2+ vCPU |
| **RAM** | 4GB+ |
| **ストレージ** | 50GB+ SSD（暗号化） |
| **ネットワーク** | メインサーバーとのプライベートネットワークまたはVPN |

### ステップ1：PIIサーバーを準備

```bash
# PIIサーバーにSSH接続
ssh pii-server

# システムを更新
sudo apt update && sudo apt upgrade -y

# Dockerをインストール
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# 必要なツールをインストール
sudo apt install -y openssl ufw
```

### ステップ2：ファイアウォールを設定

```bash
# SSHを許可
sudo ufw allow ssh

# PIIサービスポートをメインアプリサーバーからのみ許可
sudo ufw allow from メインサーバーIP to any port 5100

# ファイアウォールを有効化
sudo ufw enable
```

### ステップ3：mTLS証明書を生成

```bash
# 証明書ディレクトリを作成
mkdir -p ~/pii-certs && cd ~/pii-certs

# CA証明書を生成
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=YourOrg/CN=TCRN-TMS-CA"

# PIIサービス用サーバー証明書を生成
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=YourOrg/CN=pii.your-domain.com"
openssl x509 -req -days 365 -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt

# メインアプリ用クライアント証明書を生成
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=YourOrg/CN=main-app"
openssl x509 -req -days 365 -in client.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out client.crt

# クライアント証明書をメインアプリサーバーにコピー
scp ca.crt client.crt client.key main-server:/path/to/certs/
```

### ステップ4：PIIサービスをデプロイ

```bash
# デプロイディレクトリを作成
mkdir -p ~/pii-service && cd ~/pii-service

# 環境変数ファイルを作成
cat > .env << 'EOF'
# PIIデータベース
PII_POSTGRES_USER=pii_admin
PII_POSTGRES_PASSWORD=ここに強力なパスワードを生成
PII_POSTGRES_DB=pii_vault
PII_DATABASE_URL=postgresql://pii_admin:${PII_POSTGRES_PASSWORD}@pii-postgres:5432/pii_vault

# 暗号化
PII_MASTER_KEY=ここに64文字の16進キーを生成
PII_KEY_VERSION=v1

# JWT検証（メインアプリと一致させる）
JWT_SECRET=メインアプリと同じJWTシークレット

# mTLS
MTLS_ENABLED=true
MTLS_CA_CERT=/certs/ca.crt
MTLS_SERVER_CERT=/certs/server.crt
MTLS_SERVER_KEY=/certs/server.key

# サーバー
PORT=5100
NODE_ENV=production
EOF

# docker-composeファイルを作成
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  pii-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${PII_POSTGRES_USER}
      POSTGRES_PASSWORD: ${PII_POSTGRES_PASSWORD}
      POSTGRES_DB: ${PII_POSTGRES_DB}
    volumes:
      - pii_data:/var/lib/postgresql/data
    networks:
      - pii-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PII_POSTGRES_USER} -d ${PII_POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pii-service:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5100:5100"
    environment:
      - DATABASE_URL=${PII_DATABASE_URL}
      - PII_MASTER_KEY=${PII_MASTER_KEY}
      - PII_KEY_VERSION=${PII_KEY_VERSION}
      - JWT_SECRET=${JWT_SECRET}
      - MTLS_ENABLED=${MTLS_ENABLED}
      - MTLS_CA_CERT=${MTLS_CA_CERT}
      - MTLS_SERVER_CERT=${MTLS_SERVER_CERT}
      - MTLS_SERVER_KEY=${MTLS_SERVER_KEY}
      - PORT=${PORT}
      - NODE_ENV=${NODE_ENV}
    volumes:
      - ~/pii-certs:/certs:ro
    depends_on:
      pii-postgres:
        condition: service_healthy
    networks:
      - pii-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5100/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  pii-network:
    driver: bridge

volumes:
  pii_data:
EOF

# PIIサービスソースコードをコピーまたはレジストリからプル
# オプションA：ソースからビルド
git clone https://github.com/tpmoonchefryan/tcrn-tms.git
cp -r tcrn-tms/apps/pii-service/* .

# オプションB：ビルド済みイメージをプル
# docker-compose.ymlを修正してimage: your-registry/pii-service:latestを使用

# デプロイ
docker-compose up -d

# PIIデータベースを初期化
docker-compose exec pii-service pnpm db:push
```

### ステップ5：メインアプリケーションを設定

メインアプリサーバーで環境変数を更新：

```bash
# .envまたは.env.localに追加
PII_SERVICE_URL=https://pii.your-domain.com:5100
PII_SERVICE_MTLS_ENABLED=true
PII_SERVICE_CA_CERT=/path/to/certs/ca.crt
PII_SERVICE_CLIENT_CERT=/path/to/certs/client.crt
PII_SERVICE_CLIENT_KEY=/path/to/certs/client.key
```

### ステップ6：デプロイを検証

```bash
# PIIサーバーで - サービスヘルスを確認
curl -k https://localhost:5100/health

# メインサーバーで - PII接続をテスト（mTLS使用）
curl --cacert /path/to/ca.crt \
     --cert /path/to/client.crt \
     --key /path/to/client.key \
     https://pii.your-domain.com:5100/health
```

### セキュリティチェックリスト

- [ ] PIIサーバーは別の物理/仮想マシン上にある
- [ ] ファイアウォールは特定のIPアドレスのみを許可
- [ ] mTLS証明書が生成され設定されている
- [ ] マスター暗号化キーは安全に保存（HashiCorp Vault検討）
- [ ] データベースは保存時に暗号化（ディスク暗号化）
- [ ] PIIデータベースへの直接インターネットアクセスなし
- [ ] すべてのPIIアクセスの監査ログを有効化
- [ ] 暗号化データの定期バックアップ
- [ ] 証明書ローテーション計画（年1回推奨）

### DEK（データ暗号化キー）ローテーション

```bash
# テナント用の新しいDEKを生成
curl -X POST https://pii.your-domain.com:5100/admin/rotate-dek \
  --cacert /path/to/ca.crt \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant-uuid"}'
```

---

## 📚 APIリファレンス

### ベースURL

```
{baseUrl}/api/v1
```

### 認証

認証が必要なすべてのエンドポイントにはJWTトークンが必要です：

```bash
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantCode": "AC", "username": "admin", "password": "..."}'

# レスポンスにaccessTokenが含まれ、refreshToken Cookieが設定されます
```

### 主要エンドポイント

| カテゴリ | エンドポイント | 説明 |
|----------|---------------|------|
| **認証** | `POST /auth/login` | 認証情報でログイン |
| | `POST /auth/refresh` | アクセストークンを更新 |
| | `POST /auth/logout` | ログアウトしてトークンを無効化 |
| **顧客** | `GET /customers` | 顧客リストを取得（ページネーション） |
| | `POST /customers` | 顧客プロファイルを作成 |
| | `POST /customers/{id}/request-pii-access` | PIIアクセストークンを取得 |
| **組織** | `GET /organization/tree` | 組織構造を取得 |
| | `POST /subsidiaries` | サブシディアリを作成 |
| | `POST /talents` | タレントを作成 |
| **マシュマロ** | `GET /public/marshmallow/{path}/messages` | 公開メッセージを取得 |
| | `POST /public/marshmallow/{path}/submit` | 匿名質問を送信 |
| | `POST /marshmallow/messages/{id}/approve` | メッセージを承認 |
| **レポート** | `POST /reports/mfr/jobs` | MFR生成を開始 |
| | `GET /reports/mfr/jobs/{id}` | ジョブステータスを取得 |
| | `GET /reports/mfr/jobs/{id}/download` | ダウンロードURLを取得 |
| **ログ** | `GET /logs/changes` | 変更ログを照会 |
| | `GET /logs/events` | システムイベントを照会 |
| | `GET /logs/search` | Loki全文検索 |

### レスポンスフォーマット

**成功：**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

**エラー：**
```json
{
  "success": false,
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "ユーザー名またはパスワードが無効です",
  "statusCode": 401
}
```

---

## 🔐 セキュリティ

### パスワードポリシー

- 最低12文字
- 大文字を1つ以上
- 小文字を1つ以上
- 数字を1つ以上
- 特殊文字を1つ以上
- 90日期限リマインダー

### 二要素認証

リカバリーコード付きTOTPベースの2FA：
- セットアップ時に10個のワンタイムリカバリーコードを生成
- リカバリーコードはSHA256ハッシュとして保存
- テナント管理者はすべてのユーザーに2FAを強制可能

### データ保護

| データタイプ | 保護方法 |
|--------------|----------|
| パスワード | bcryptハッシュ（コストファクター12） |
| PII | AES-256-GCM暗号化 |
| セッション | 短い有効期限のJWT |
| API通信 | TLS 1.2+必須 |
| サービス間通信 | mTLS認証 |

### セキュリティヘッダー

すべてのレスポンスに含まれる：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

---

## 📄 ライセンス

このプロジェクトは**PolyForm Noncommercial License 1.0.0**の下でライセンスされています。

商用利用には別途ライセンス契約が必要です。エンタープライズライセンスまたはSaaSサービス購入については、ryan.lan_home@outlook.comまでお問い合わせください。

---

## 📞 サポート

- **ドキュメント**：[docs/](./docs/)
- **Issue**：[GitHub Issues](https://github.com/tpmoonchefryan/tcrn-tms/issues)
- **ディスカッション**：[GitHub Discussions](https://github.com/tpmoonchefryan/tcrn-tms/discussions)
