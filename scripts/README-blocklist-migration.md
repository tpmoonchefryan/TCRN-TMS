# 屏蔽词数据迁移指南

## 概述

此脚本用于将屏蔽词数据从 `tenant_template` schema 复制到所有活跃租户的 schema 中。

## 方法 1: 使用 Shell 脚本（推荐）

### 生产环境

```bash
# 设置环境变量（如果还没有设置）
export POSTGRES_PASSWORD=your_password

# 执行迁移
./scripts/migrate-blocklist-data.sh tcrn-postgres tcrn_tms tcrn $POSTGRES_PASSWORD
```

### Staging 环境

```bash
./scripts/migrate-blocklist-data.sh tcrn-postgres tcrn_tms_staging tcrn $POSTGRES_PASSWORD
```

### 参数说明

1. `postgres_container_name`: PostgreSQL 容器名称（默认: `tcrn-postgres`）
2. `db_name`: 数据库名称（默认: `tcrn_tms`）
3. `db_user`: 数据库用户（默认: `tcrn`）
4. `db_password`: 数据库密码（或通过 `POSTGRES_PASSWORD` 环境变量）

## 方法 2: 使用 SQL 脚本

### 生产环境

```bash
# 将 SQL 文件复制到容器中
docker cp scripts/migrate-blocklist-data.sql tcrn-postgres:/tmp/migrate.sql

# 执行 SQL
docker exec -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms -f /tmp/migrate.sql
```

### 或者通过管道直接执行

```bash
cat scripts/migrate-blocklist-data.sql | \
  docker exec -i -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms
```

## 方法 3: 单行命令（快速执行）

### 生产环境

```bash
docker exec -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms -c "
DO \$\$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT schema_name FROM public.tenant WHERE is_active = true
  LOOP
    EXECUTE format('INSERT INTO %I.blocklist_entry SELECT * FROM tenant_template.blocklist_entry ON CONFLICT DO NOTHING', tenant_record.schema_name);
    EXECUTE format('INSERT INTO %I.external_blocklist_pattern SELECT * FROM tenant_template.external_blocklist_pattern ON CONFLICT DO NOTHING', tenant_record.schema_name);
    RAISE NOTICE '已处理租户: %', tenant_record.schema_name;
  END LOOP;
END \$\$;
"
```

### Staging 环境

```bash
docker exec -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms_staging -c "
DO \$\$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT schema_name FROM public.tenant WHERE is_active = true
  LOOP
    EXECUTE format('INSERT INTO %I.blocklist_entry SELECT * FROM tenant_template.blocklist_entry ON CONFLICT DO NOTHING', tenant_record.schema_name);
    EXECUTE format('INSERT INTO %I.external_blocklist_pattern SELECT * FROM tenant_template.external_blocklist_pattern ON CONFLICT DO NOTHING', tenant_record.schema_name);
    RAISE NOTICE '已处理租户: %', tenant_record.schema_name;
  END LOOP;
END \$\$;
"
```

## 验证迁移结果

### 检查某个租户的屏蔽词数量

```bash
# 替换 tenant_xxx 为实际的租户 schema 名称
docker exec -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms -c "
SELECT 
  (SELECT COUNT(*) FROM tenant_xxx.blocklist_entry) as blocklist_count,
  (SELECT COUNT(*) FROM tenant_xxx.external_blocklist_pattern) as external_blocklist_count,
  (SELECT COUNT(*) FROM tenant_template.blocklist_entry) as template_blocklist_count,
  (SELECT COUNT(*) FROM tenant_template.external_blocklist_pattern) as template_external_count;
"
```

### 列出所有租户及其数据统计

```bash
docker exec -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms -c "
SELECT 
  t.schema_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = t.schema_name AND table_name = 'blocklist_entry') as has_blocklist_table,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = t.schema_name AND table_name = 'external_blocklist_pattern') as has_external_table
FROM public.tenant t
WHERE t.is_active = true;
"
```

## 注意事项

1. **备份**: 执行迁移前建议备份数据库
2. **幂等性**: 脚本使用 `ON CONFLICT DO NOTHING`，可以安全地重复执行
3. **权限**: 确保数据库用户有足够的权限访问所有租户 schema
4. **容器名称**: 如果使用不同的容器名称，请相应调整命令

## 故障排查

### 容器不存在

```bash
# 查看所有运行中的容器
docker ps --format '{{.Names}}' | grep postgres

# 查看所有容器（包括停止的）
docker ps -a --format '{{.Names}}' | grep postgres
```

### 权限错误

确保数据库用户有权限访问所有 schema：

```bash
docker exec -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms -c "
GRANT USAGE ON SCHEMA tenant_template TO tcrn;
GRANT SELECT ON ALL TABLES IN SCHEMA tenant_template TO tcrn;
"
```

### 表不存在

如果某个租户的 schema 中缺少表，需要先运行数据库迁移：

```bash
# 在 API 容器中运行 Prisma migrate
docker exec tcrn-api npm run prisma:migrate:deploy
```
