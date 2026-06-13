-- SPDX-License-Identifier: Apache-2.0
-- 为指定租户的指定用户赋予 PLATFORM_ADMIN 角色
-- 
-- 使用方法：
--   psql -v tenant_code=AC -v username=ac_admin -f scripts/assign-platform-admin.sql

\if :{?tenant_code}
\else
  \echo '错误: missing required psql variable tenant_code'
  \quit 3
\endif

\if :{?username}
\else
  \echo '错误: missing required psql variable username'
  \quit 3
\endif

SELECT set_config('tcrn.assign_platform_admin.tenant_code', :'tenant_code', false);
SELECT set_config('tcrn.assign_platform_admin.username', :'username', false);

DO $$
DECLARE
  tenant_code_arg TEXT := current_setting('tcrn.assign_platform_admin.tenant_code', true);
  username_arg TEXT := current_setting('tcrn.assign_platform_admin.username', true);
  tenant_schema_name VARCHAR(255);
  tenant_id UUID;
  user_id_val UUID;
  role_id_val UUID;
  existing_assignment_id UUID;
BEGIN
  IF tenant_code_arg IS NULL OR tenant_code_arg = '' THEN
    RAISE EXCEPTION 'tenant_code is required';
  END IF;

  IF username_arg IS NULL OR username_arg = '' THEN
    RAISE EXCEPTION 'username is required';
  END IF;

  -- 1. 查找租户的 schema 名称和 ID
  SELECT schema_name, id INTO tenant_schema_name, tenant_id
  FROM public.tenant
  WHERE code = tenant_code_arg AND is_active = true
  LIMIT 1;

  IF tenant_schema_name IS NULL THEN
    RAISE EXCEPTION '租户 "%" 不存在或未激活', tenant_code_arg;
  END IF;

  RAISE NOTICE '找到租户: % (schema: %, id: %)', tenant_code_arg, tenant_schema_name, tenant_id;

  -- 2. 查找用户（通过用户名）
  EXECUTE format('
    SELECT id FROM %I.system_user
    WHERE username = $1 AND is_active = true
    LIMIT 1
  ', tenant_schema_name) INTO user_id_val USING username_arg;

  IF user_id_val IS NULL THEN
    RAISE EXCEPTION '用户 "%" 在租户 "%" 中不存在或未激活', username_arg, tenant_code_arg;
  END IF;

  RAISE NOTICE '找到用户: % (id: %)', username_arg, user_id_val;

  -- 3. 查找 PLATFORM_ADMIN 角色
  EXECUTE format('
    SELECT id FROM %I.role
    WHERE code = ''PLATFORM_ADMIN'' AND is_active = true
    LIMIT 1
  ', tenant_schema_name) INTO role_id_val;

  IF role_id_val IS NULL THEN
    -- 尝试创建 PLATFORM_ADMIN 角色（如果不存在）
    RAISE NOTICE 'PLATFORM_ADMIN 角色不存在，正在创建...';
    EXECUTE format('
      INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), ''PLATFORM_ADMIN'', ''Platform Administrator'', ''平台管理员'', ''プラットフォーム管理者'', 
              ''AC tenant administrator with platform-wide access'', true, true, now(), now(), 1)
      ON CONFLICT (code) DO UPDATE SET is_active = true
    ', tenant_schema_name);
    
    -- 重新查询角色 ID
    EXECUTE format('
      SELECT id FROM %I.role
      WHERE code = ''PLATFORM_ADMIN''
      LIMIT 1
    ', tenant_schema_name) INTO role_id_val;
  END IF;

  IF role_id_val IS NULL THEN
    RAISE EXCEPTION '无法找到或创建 PLATFORM_ADMIN 角色';
  END IF;

  RAISE NOTICE '找到角色: PLATFORM_ADMIN (id: %)', role_id_val;

  -- 4. 检查是否已存在角色分配
  EXECUTE format('
    SELECT id FROM %I.user_role
    WHERE user_id = $1
      AND role_id = $2
      AND scope_type = ''tenant''
    LIMIT 1
  ', tenant_schema_name) INTO existing_assignment_id USING user_id_val, role_id_val;

  IF existing_assignment_id IS NOT NULL THEN
    RAISE NOTICE '用户 "%" 已经拥有 PLATFORM_ADMIN 角色（分配 ID: %）', username_arg, existing_assignment_id;
    RETURN;
  END IF;

  -- 5. 创建角色分配
  EXECUTE format('
    INSERT INTO %I.user_role (id, user_id, role_id, scope_type, scope_id, inherit, granted_at)
    VALUES (gen_random_uuid(), $1, $2, ''tenant'', NULL, false, now())
  ', tenant_schema_name) USING user_id_val, role_id_val;

  RAISE NOTICE '==========================================';
  RAISE NOTICE '成功为租户 "%" 的用户 "%" 赋予 PLATFORM_ADMIN 角色', tenant_code_arg, username_arg;
  RAISE NOTICE '==========================================';
END $$;
