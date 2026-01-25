#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# 迁移脚本：为现有 talent 和 marshmallow_config 补充默认值
# Usage: ./scripts/migrate-tenant-defaults.sh [postgres_container_name] [db_name] [db_user] [db_password]

set -e

# 默认参数
CONTAINER_NAME=${1:-tcrn-postgres}
DB_NAME=${2:-tcrn_tms}
DB_USER=${3:-tcrn}
DB_PASSWORD=${4:-${POSTGRES_PASSWORD}}

if [ -z "$DB_PASSWORD" ]; then
  echo "错误: 请提供数据库密码作为第4个参数，或设置 POSTGRES_PASSWORD 环境变量"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/migrate-tenant-defaults.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "错误: 找不到 SQL 文件: $SQL_FILE"
  exit 1
fi

echo "正在迁移租户默认值..."
echo "容器名称: $CONTAINER_NAME"
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo ""

# 检查容器是否存在
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "错误: 容器 '$CONTAINER_NAME' 不存在或未运行"
  exit 1
fi

# 复制 SQL 文件到容器并执行
docker cp "$SQL_FILE" "${CONTAINER_NAME}:/tmp/migrate-tenant-defaults.sql"

docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
  psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/migrate-tenant-defaults.sql

echo ""
echo "迁移完成!"
