-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Fix missing RBAC data (resources, roles, policies, role_policy) in tenant schemas
-- This script is idempotent and can be run multiple times safely

-- Function to fix RBAC data for a single tenant schema
CREATE OR REPLACE FUNCTION fix_rbac_data(schema_name TEXT) RETURNS VOID AS $$
DECLARE
  resource_record RECORD;
  role_record RECORD;
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'Fixing RBAC data for schema: %', schema_name;

  -- =========================================================================
  -- Step 1: Insert missing resources
  -- =========================================================================
  FOR resource_record IN 
    SELECT * FROM (VALUES
      ('customer.profile', 'customer', 'Customer Profile', '客户档案', '顧客プロファイル'),
      ('customer.membership', 'customer', 'Membership Management', '会员管理', '会員管理'),
      ('customer.import', 'customer', 'Customer Import', '客户导入', '顧客インポート'),
      ('org.subsidiary', 'organization', 'Subsidiary Management', '分级目录管理', '組織管理'),
      ('org.talent', 'organization', 'Talent Management', '艺人管理', 'タレント管理'),
      ('system_user.manage', 'user', 'User Management', '用户管理', 'ユーザー管理'),
      ('system_user.self', 'user', 'Personal Profile', '个人资料', '個人設定'),
      ('role.manage', 'user', 'Role Management', '角色管理', 'ロール管理'),
      ('config.entity', 'config', 'Configuration Entity', '配置实体', '設定エンティティ'),
      ('config.blocklist', 'config', 'Blocklist Management', '屏蔽词管理', 'ブロックリスト管理'),
      ('talent.homepage', 'page', 'Homepage Management', '主页管理', 'ホームページ管理'),
      ('talent.marshmallow', 'page', 'Marshmallow Management', '棉花糖管理', 'マシュマロ管理'),
      ('report.mfr', 'report', 'Membership Feedback Report', '会员回馈报表', '会員フィードバックレポート'),
      ('integration.adapter', 'integration', 'Integration Adapter', '接口适配器', '連携アダプター'),
      ('integration.webhook', 'integration', 'Webhook Management', 'Webhook管理', 'Webhook管理'),
      ('log.change_log', 'log', 'Change Log', '变更日志', '変更ログ'),
      ('log.tech_log', 'log', 'Technical Event Log', '技术事件日志', '技術イベントログ'),
      ('log.integration_log', 'log', 'Integration Log', '集成日志', '連携ログ'),
      ('log.search', 'log', 'Log Search', '日志搜索', 'ログ検索'),
      ('config.pii_service', 'config', 'PII Service Config', 'PII服务配置', 'PIIサービス設定'),
      ('config.profile_store', 'config', 'Profile Store', '档案存储', 'プロファイルストア')
    ) AS t(code, module, name_en, name_zh, name_ja)
  LOOP
    EXECUTE format('
      INSERT INTO %I.resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0, true, now(), now())
      ON CONFLICT (code) DO NOTHING
    ', schema_name)
    USING resource_record.code, resource_record.module, resource_record.name_en, resource_record.name_zh, resource_record.name_ja;
  END LOOP;

  RAISE NOTICE '  Resources created/verified for %', schema_name;

  -- =========================================================================
  -- Step 2: Insert missing roles
  -- =========================================================================
  FOR role_record IN
    SELECT * FROM (VALUES
      ('TENANT_ADMIN', 'Tenant Administrator', '租户管理员', 'テナント管理者', 'Full access to all tenant resources', true),
      ('TENANT_READONLY', 'Tenant Read-Only', '租户只读', 'テナント読み取り専用', 'Read-only access to all tenant resources', true),
      ('TALENT_MANAGER', 'Talent Manager', '艺人管理员', 'タレントマネージャー', 'Can manage assigned talent and their customers', true),
      ('SUBSIDIARY_MANAGER', 'Subsidiary Manager', '分级目录管理员', '組織管理者', 'Can manage subsidiary and all talents within', true),
      ('REPORT_VIEWER', 'Report Viewer', '报表查看者', 'レポート閲覧者', 'Can view reports', true),
      ('REPORT_OPERATOR', 'Report Operator', '报表操作员', 'レポートオペレーター', 'Can generate and export reports', true)
    ) AS t(code, name_en, name_zh, name_ja, description, is_system)
  LOOP
    EXECUTE format('
      INSERT INTO %I.role (id, code, name_en, name_zh, name_ja, description, is_system, is_active, created_at, updated_at, version)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, now(), now(), 1)
      ON CONFLICT (code) DO NOTHING
    ', schema_name)
    USING role_record.code, role_record.name_en, role_record.name_zh, role_record.name_ja, role_record.description, role_record.is_system;
  END LOOP;

  RAISE NOTICE '  Roles created/verified for %', schema_name;

  -- =========================================================================
  -- Step 3: Create policies for all resources with all actions
  -- =========================================================================
  FOR resource_record IN
    EXECUTE format('SELECT id, code FROM %I.resource', schema_name)
  LOOP
    FOR policy_record IN
      SELECT unnest(ARRAY['read', 'write', 'admin', 'execute']) AS action
    LOOP
      EXECUTE format('
        INSERT INTO %I.policy (id, resource_id, action, effect, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, ''allow'', true, now(), now())
        ON CONFLICT (resource_id, action, effect) DO NOTHING
      ', schema_name)
      USING resource_record.id, policy_record.action;
    END LOOP;
  END LOOP;

  RAISE NOTICE '  Policies created/verified for %', schema_name;

  -- =========================================================================
  -- Step 4: Link role_policy for TENANT_ADMIN (all policies with admin action)
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''TENANT_ADMIN'' AND p.action = ''admin''
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  -- =========================================================================
  -- Step 5: Link role_policy for TENANT_READONLY (all policies with read action)
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''TENANT_READONLY'' AND p.action = ''read''
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  -- =========================================================================
  -- Step 6: Link role_policy for TALENT_MANAGER
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''TALENT_MANAGER'' 
      AND (
        (res.code = ''customer.profile'' AND p.action = ''admin'') OR
        (res.code = ''customer.membership'' AND p.action = ''admin'') OR
        (res.code = ''customer.import'' AND p.action = ''execute'') OR
        (res.code = ''talent.homepage'' AND p.action = ''admin'') OR
        (res.code = ''talent.marshmallow'' AND p.action = ''admin'') OR
        (res.code = ''report.mfr'' AND p.action IN (''read'', ''execute''))
      )
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  -- =========================================================================
  -- Step 7: Link role_policy for SUBSIDIARY_MANAGER
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''SUBSIDIARY_MANAGER'' 
      AND (
        (res.code = ''org.subsidiary'' AND p.action = ''read'') OR
        (res.code = ''org.talent'' AND p.action = ''admin'') OR
        (res.code = ''customer.profile'' AND p.action = ''admin'') OR
        (res.code = ''customer.membership'' AND p.action = ''admin'') OR
        (res.code = ''customer.import'' AND p.action = ''execute'') OR
        (res.code = ''config.entity'' AND p.action = ''read'') OR
        (res.code = ''report.mfr'' AND p.action = ''admin'')
      )
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  -- =========================================================================
  -- Step 8: Link role_policy for REPORT_VIEWER
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''REPORT_VIEWER'' 
      AND res.code = ''report.mfr'' AND p.action = ''read''
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  -- =========================================================================
  -- Step 9: Link role_policy for REPORT_OPERATOR
  -- =========================================================================
  EXECUTE format('
    INSERT INTO %I.role_policy (id, role_id, policy_id, created_at)
    SELECT gen_random_uuid(), r.id, p.id, now()
    FROM %I.role r
    CROSS JOIN %I.policy p
    JOIN %I.resource res ON p.resource_id = res.id
    WHERE r.code = ''REPORT_OPERATOR'' 
      AND res.code = ''report.mfr'' AND p.action IN (''read'', ''execute'')
    ON CONFLICT DO NOTHING
  ', schema_name, schema_name, schema_name, schema_name);

  RAISE NOTICE '  Role-policy mappings created/verified for %', schema_name;
  RAISE NOTICE 'Completed RBAC fix for schema: %', schema_name;
END;
$$ LANGUAGE plpgsql;

-- Fix tenant_template schema first
SELECT fix_rbac_data('tenant_template');

-- Fix all existing tenant schemas
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT schema_name FROM public.tenant WHERE schema_name IS NOT NULL AND schema_name != ''
  LOOP
    PERFORM fix_rbac_data(tenant_record.schema_name);
  END LOOP;
END $$;

-- Clean up
DROP FUNCTION fix_rbac_data(TEXT);

-- Verify fix: Show role_policy counts per tenant
SELECT 
  t.code as tenant_code,
  t.schema_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = t.schema_name AND table_name = 'role_policy') > 0 as has_role_policy_table
FROM public.tenant t
WHERE t.schema_name IS NOT NULL;

-- Show detailed counts for verification
DO $$
DECLARE
  tenant_record RECORD;
  resource_count INTEGER;
  role_count INTEGER;
  policy_count INTEGER;
  role_policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RBAC Data Verification ===';
  
  FOR tenant_record IN 
    SELECT code, schema_name FROM public.tenant WHERE schema_name IS NOT NULL AND schema_name != ''
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I.resource', tenant_record.schema_name) INTO resource_count;
    EXECUTE format('SELECT COUNT(*) FROM %I.role', tenant_record.schema_name) INTO role_count;
    EXECUTE format('SELECT COUNT(*) FROM %I.policy', tenant_record.schema_name) INTO policy_count;
    EXECUTE format('SELECT COUNT(*) FROM %I.role_policy', tenant_record.schema_name) INTO role_policy_count;
    
    RAISE NOTICE 'Tenant %: resources=%, roles=%, policies=%, role_policies=%', 
      tenant_record.code, resource_count, role_count, policy_count, role_policy_count;
  END LOOP;
END $$;
