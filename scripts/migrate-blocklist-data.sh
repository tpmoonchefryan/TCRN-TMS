#!/bin/bash
# © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
# 迁移屏蔽词数据到现有租户 schema
# Usage: ./scripts/migrate-blocklist-data.sh [postgres_container_name] [db_name] [db_user] [db_password]

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

echo "正在迁移屏蔽词数据..."
echo "容器名称: $CONTAINER_NAME"
echo "数据库名称: $DB_NAME"
echo "数据库用户: $DB_USER"
echo ""

# 检查容器是否存在
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "错误: 容器 '$CONTAINER_NAME' 不存在或未运行"
  exit 1
fi

# 获取所有活跃租户的 schema 名称
echo "正在获取活跃租户列表..."
TENANT_SCHEMAS=$(docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
  psql -U "$DB_USER" -d "$DB_NAME" -t -c \
  "SELECT schema_name FROM public.tenant WHERE is_active = true;")

if [ -z "$TENANT_SCHEMAS" ]; then
  echo "警告: 未找到活跃租户"
  exit 0
fi

# 为每个租户复制屏蔽词数据
SUCCESS_COUNT=0
FAILED_COUNT=0

for SCHEMA in $TENANT_SCHEMAS; do
  SCHEMA=$(echo "$SCHEMA" | xargs) # 去除空白字符
  
  if [ -z "$SCHEMA" ]; then
    continue
  fi
  
  echo ""
  echo "正在处理租户 schema: $SCHEMA"
  
  # 复制 blocklist_entry
  echo "  → 复制 blocklist_entry..."
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO \"$SCHEMA\".blocklist_entry
     SELECT * FROM tenant_template.blocklist_entry
     ON CONFLICT DO NOTHING;" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "    ✓ blocklist_entry 复制成功"
  else
    echo "    ✗ blocklist_entry 复制失败"
    FAILED_COUNT=$((FAILED_COUNT + 1))
    continue
  fi
  
  # 复制 external_blocklist_pattern
  echo "  → 复制 external_blocklist_pattern..."
  docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO \"$SCHEMA\".external_blocklist_pattern
     SELECT * FROM tenant_template.external_blocklist_pattern
     ON CONFLICT DO NOTHING;" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "    ✓ external_blocklist_pattern 复制成功"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "    ✗ external_blocklist_pattern 复制失败"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

echo ""
echo "=========================================="
echo "迁移完成!"
echo "成功: $SUCCESS_COUNT 个租户"
echo "失败: $FAILED_COUNT 个租户"
echo "=========================================="
