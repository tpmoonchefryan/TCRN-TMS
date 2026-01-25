# 为指定租户的指定用户赋予 PLATFORM_ADMIN 角色

## 概述

这些脚本用于为指定租户的指定用户赋予 `PLATFORM_ADMIN` 角色。`PLATFORM_ADMIN` 是平台级别的管理员角色，通常用于 AC (Access Control) 租户。

## 文件说明

1. **`assign-platform-admin-direct.sql`** - 直接执行版本（推荐）
   - 修改文件中的 `TENANT_CODE` 和 `USERNAME` 变量后直接执行
   - 最简单直接的方式

2. **`assign-platform-admin.sh`** - Shell 脚本封装版本
   - 通过命令行参数传递租户代码和用户名
   - 适合自动化脚本或 CI/CD 流程

3. **`assign-platform-admin.sql`** - psql 变量版本
   - 使用 psql 的 `\set` 命令设置变量
   - 适合交互式使用

## 使用方法

### 方法 1: 直接执行 SQL（推荐）

1. 编辑 `scripts/assign-platform-admin-direct.sql`，修改以下变量：
   ```sql
   TENANT_CODE VARCHAR(255) := 'AC';        -- 修改为你的租户代码
   USERNAME VARCHAR(255) := 'ac_admin';     -- 修改为你的用户名
   ```

2. 执行 SQL：
   ```bash
   cat scripts/assign-platform-admin-direct.sql | \
     docker exec -i -e PGPASSWORD=your_password tcrn-postgres \
     psql -U tcrn -d tcrn_tms
   ```

### 方法 2: 使用 Shell 脚本

```bash
# 基本用法
./scripts/assign-platform-admin.sh AC ac_admin

# 指定所有参数
./scripts/assign-platform-admin.sh \
  AC \
  ac_admin \
  tcrn-postgres \
  tcrn_tms \
  tcrn \
  your_password

# 使用环境变量
export POSTGRES_PASSWORD=your_password
./scripts/assign-platform-admin.sh AC ac_admin
```

### 方法 3: 交互式 psql

```bash
docker exec -it -e PGPASSWORD=your_password tcrn-postgres \
  psql -U tcrn -d tcrn_tms

# 在 psql 中执行
\set tenant_code 'AC'
\set username 'ac_admin'
\i scripts/assign-platform-admin.sql
```

## 功能说明

脚本会执行以下操作：

1. **查找租户**：根据租户代码查找对应的 schema 和租户 ID
2. **查找用户**：在租户 schema 中查找指定用户
3. **查找/创建角色**：
   - 查找 `PLATFORM_ADMIN` 角色
   - 如果不存在，自动创建该角色
4. **检查重复**：检查用户是否已经拥有该角色
5. **分配角色**：在租户级别（`scope_type = 'tenant'`）为用户分配角色

## 注意事项

- **PLATFORM_ADMIN 角色**：通常只在 AC 租户中使用，用于平台级别的管理
- **作用域**：角色分配在租户级别（`scope_type = 'tenant'`），`scope_id` 为租户 ID
- **重复分配**：如果用户已经拥有该角色，脚本会跳过并提示
- **权限要求**：执行脚本需要数据库管理员权限

## 示例

### 为 AC 租户的 ac_admin 用户赋予 PLATFORM_ADMIN 角色

```bash
# 方法 1: 直接执行
cat scripts/assign-platform-admin-direct.sql | \
  docker exec -i -e PGPASSWORD=mypassword tcrn-postgres \
  psql -U tcrn -d tcrn_tms

# 方法 2: Shell 脚本
./scripts/assign-platform-admin.sh AC ac_admin
```

### 验证角色分配

```sql
-- 连接到数据库后执行
SELECT 
  u.username,
  r.code as role_code,
  ur.scope_type,
  ur.scope_id,
  ur.granted_at
FROM tenant_ac.user_role ur
JOIN tenant_ac.system_user u ON ur.user_id = u.id
JOIN tenant_ac.role r ON ur.role_id = r.id
WHERE r.code = 'PLATFORM_ADMIN';
```

## 故障排除

### 错误：租户不存在或未激活
- 检查租户代码是否正确
- 确认租户在 `public.tenant` 表中存在且 `is_active = true`

### 错误：用户不存在或未激活
- 检查用户名是否正确
- 确认用户在对应租户的 schema 中存在且 `is_active = true`

### 错误：无法找到或创建 PLATFORM_ADMIN 角色
- 检查租户 schema 中的 `role` 表是否有写入权限
- 查看数据库日志获取详细错误信息
