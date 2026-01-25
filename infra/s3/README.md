# S3 Lifecycle Policies

This directory contains S3/MinIO lifecycle policies for TCRN TMS.

## Policy Overview

| Rule ID | Prefix | Hot Storage | Transition | Cold Storage | Expiration |
|---------|--------|-------------|------------|--------------|------------|
| prod-log-archive | logs/prod/ | 60 days | GLACIER | 60+ days | 365 days |
| staging-log-expiry | logs/staging/ | 30 days | - | - | 30 days |
| temp-reports-cleanup | temp-reports/ | 7 days | - | - | 7 days |
| completed-reports-archive | reports/ | 30 days | STANDARD_IA → GLACIER | 30-90 days | 365 days |
| import-uploads-cleanup | imports/ | 30 days | - | - | 30 days |
| export-files-archive | exports/ | 30 days | STANDARD_IA | 30 days | 90 days |
| trace-data-retention | traces/ | 7 days | STANDARD_IA | 7 days | 30 days |

## Applying to AWS S3

```bash
# Set bucket name
BUCKET_NAME=tcrn-tms-storage

# Apply lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BUCKET_NAME \
  --lifecycle-configuration file://lifecycle-policy.json
```

## Applying to MinIO

MinIO uses ILM (Information Lifecycle Management):

```bash
# Set MinIO alias
mc alias set tcrn http://localhost:9000 minioadmin minioadmin

# Apply lifecycle rules (example for temp-reports)
mc ilm rule add tcrn/tcrn-storage \
  --prefix "temp-reports/" \
  --expiry-days 7

mc ilm rule add tcrn/tcrn-storage \
  --prefix "logs/staging/" \
  --expiry-days 30

mc ilm rule add tcrn/tcrn-storage \
  --prefix "imports/" \
  --expiry-days 30
```

## PRD Requirements

Per PRD §4.4 Deployment & Operations:
- Staging logs: 30 days retention
- Production logs: 60 days hot + 365 days cold (Glacier)
- Temporary files: 7 days max
