#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# 为指定租户的指定用户赋予 PLATFORM_ADMIN 角色
# 
# Usage: ./scripts/assign-platform-admin.sh <tenant_code> <username> [postgres_container] [db_name] [db_user] [db_password]
#
# Example:
#   ./scripts/assign-platform-admin.sh AC ac_admin
#   ./scripts/assign-platform-admin.sh demo admin tcrn-postgres tcrn_tms tcrn $POSTGRES_PASSWORD

set -e

if [ $# -lt 2 ]; then
  echo "错误: 参数不足"
  echo "用法: $0 <tenant_code> <username> [postgres_container] [db_name] [db_user] [db_password]"
  echo ""
  echo "参数说明:"
  echo "  tenant_code       租户代码（如 'AC', 'demo'）"
  echo "  username          用户名（如 'ac_admin', 'admin'）"
  echo "  postgres_container PostgreSQL 容器名称（默认: tcrn-postgres）"
  echo "  db_name           数据库名称（默认: tcrn_tms）"
  echo "  db_user           数据库用户（默认: tcrn）"
  echo "  db_password       数据库密码（默认: \$POSTGRES_PASSWORD 环境变量）"
  echo ""
  echo "示例:"
  echo "  $0 AC ac_admin"
  echo "  $0 demo admin tcrn-postgres tcrn_tms tcrn mypassword"
  exit 1
fi

TENANT_CODE=$1
USERNAME=$2
CONTAINER_NAME=${3:-tcrn-postgres}
DB_NAME=${4:-tcrn_tms}
DB_USER=${5:-tcrn}
DB_PASSWORD=${6:-${POSTGRES_PASSWORD}}

if [ -z "$DB_PASSWORD" ]; then
  echo "错误: 请提供数据库密码作为第6个参数，或设置 POSTGRES_PASSWORD 环境变量"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/assign-platform-admin.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "错误: 找不到 SQL 文件: $SQL_FILE"
  exit 1
fi

echo "正在为租户 '$TENANT_CODE' 的用户 '$USERNAME' 赋予 PLATFORM_ADMIN 角色..."
echo "容器名称: $CONTAINER_NAME"
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo ""

# 检查容器是否存在
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "错误: 容器 '$CONTAINER_NAME' 不存在或未运行"
  exit 1
fi

# 创建临时 SQL 文件，替换变量
TEMP_SQL=$(mktemp)
sed "s/:tenant_code/'${TENANT_CODE}'/g; s/:username/'${USERNAME}'/g" "$SQL_FILE" > "$TEMP_SQL"

# 复制 SQL 文件到容器并执行
docker cp "$TEMP_SQL" "${CONTAINER_NAME}:/tmp/assign-platform-admin-temp.sql"

docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
  psql -U "$DB_USER" -d "$DB_NAME" -f /tmp/assign-platform-admin-temp.sql

# 清理临时文件
rm -f "$TEMP_SQL"
docker exec "$CONTAINER_NAME" rm -f /tmp/assign-platform-admin-temp.sql

echo ""
echo "操作完成!"
