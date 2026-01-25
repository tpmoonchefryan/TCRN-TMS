-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- 为指定租户的指定用户赋予 PLATFORM_ADMIN 角色（直接执行版本）
-- 
-- 使用方法：
--   1. 修改下面的 TENANT_CODE 和 USERNAME 变量
--   2. 执行: cat scripts/assign-platform-admin-direct.sql | docker exec -i -e PGPASSWORD=xxx tcrn-postgres psql -U tcrn -d tcrn_tms
--
-- 或者使用 psql 交互式执行：
--   psql -U tcrn -d tcrn_tms
--   \i scripts/assign-platform-admin-direct.sql

DO $$
DECLARE
  -- ==========================================
  -- 请修改以下两个变量
  -- ==========================================
  TENANT_CODE VARCHAR(255) := 'AC';        -- 租户代码（如 'AC', 'demo'）
  USERNAME VARCHAR(255) := 'ac_admin';     -- 用户名（如 'ac_admin', 'admin'）
  -- ==========================================
  
  tenant_schema_name VARCHAR(255);
  tenant_id UUID;
  user_id_val UUID;
  role_id_val UUID;
  existing_assignment_id UUID;
BEGIN
  -- 1. 查找租户的 schema 名称和 ID
  SELECT schema_name, id INTO tenant_schema_name, tenant_id
  FROM public.tenant
  WHERE code = TENANT_CODE AND is_active = true
  LIMIT 1;

  IF tenant_schema_name IS NULL THEN
    RAISE EXCEPTION '租户 "%" 不存在或未激活', TENANT_CODE;
  END IF;

  RAISE NOTICE '找到租户: % (schema: %, id: %)', TENANT_CODE, tenant_schema_name, tenant_id;

  -- 2. 查找用户（通过用户名）
  EXECUTE format('
    SELECT id INTO user_id_val
    FROM %I.system_user
    WHERE username = $1 AND is_active = true
    LIMIT 1
  ', tenant_schema_name) USING USERNAME;

  IF user_id_val IS NULL THEN
    RAISE EXCEPTION '用户 "%" 在租户 "%" 中不存在或未激活', USERNAME, TENANT_CODE;
  END IF;

  RAISE NOTICE '找到用户: % (id: %)', USERNAME, user_id_val;

  -- 3. 查找 PLATFORM_ADMIN 角色
  EXECUTE format('
    SELECT id INTO role_id_val
    FROM %I.role
    WHERE code = ''PLATFORM_ADMIN'' AND is_active = true
    LIMIT 1
  ', tenant_schema_name);

  IF role_id_val IS NULL THEN
    -- 尝试创建 PLATFORM_ADMIN 角色（如果不存在）
    RAISE NOTICE 'PLATFORM_ADMIN 角色不存在，正在创建...';
    EXECUTE format('
      INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), ''PLATFORM_ADMIN'', ''Platform Administrator'', ''平台管理员'', ''プラットフォーム管理者'', 
              ''AC tenant administrator with platform-wide access'', true, true, now(), now(), 1)
      ON CONFLICT (code) DO UPDATE SET is_active = true
      RETURNING id INTO role_id_val
    ', tenant_schema_name);
    
    IF role_id_val IS NULL THEN
      EXECUTE format('
        SELECT id INTO role_id_val
        FROM %I.role
        WHERE code = ''PLATFORM_ADMIN''
        LIMIT 1
      ', tenant_schema_name);
    END IF;
  END IF;

  IF role_id_val IS NULL THEN
    RAISE EXCEPTION '无法找到或创建 PLATFORM_ADMIN 角色';
  END IF;

  RAISE NOTICE '找到角色: PLATFORM_ADMIN (id: %)', role_id_val;

  -- 4. 检查是否已存在角色分配
  EXECUTE format('
    SELECT id INTO existing_assignment_id
    FROM %I.user_role
    WHERE user_id = $1
      AND role_id = $2
      AND scope_type = ''tenant''
      AND COALESCE(scope_id, ''00000000-0000-0000-0000-000000000000'') = COALESCE($3, ''00000000-0000-0000-0000-000000000000'')
    LIMIT 1
  ', tenant_schema_name) USING user_id_val, role_id_val, tenant_id;

  IF existing_assignment_id IS NOT NULL THEN
    RAISE NOTICE '用户 "%" 已经拥有 PLATFORM_ADMIN 角色（分配 ID: %）', USERNAME, existing_assignment_id;
    RETURN;
  END IF;

  -- 5. 创建角色分配
  EXECUTE format('
    INSERT INTO %I.user_role (id, user_id, role_id, scope_type, scope_id, inherit, granted_at)
    VALUES (gen_random_uuid(), $1, $2, ''tenant'', $3, false, now())
  ', tenant_schema_name) USING user_id_val, role_id_val, tenant_id;

  RAISE NOTICE '==========================================';
  RAISE NOTICE '成功为租户 "%" 的用户 "%" 赋予 PLATFORM_ADMIN 角色', TENANT_CODE, USERNAME;
  RAISE NOTICE '==========================================';
END $$;
