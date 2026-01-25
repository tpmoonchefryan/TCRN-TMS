-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- 迁移脚本：为现有 talent 和 marshmallow_config 补充默认值
-- 使用方法：
--   docker exec -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms -f /path/to/migrate-tenant-defaults.sql
--   或者：
--   cat scripts/migrate-tenant-defaults.sql | docker exec -i -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms

DO $$
DECLARE
  tenant_record RECORD;
  talent_count INTEGER := 0;
  marshmallow_count INTEGER := 0;
  resource_count INTEGER := 0;
BEGIN
  RAISE NOTICE '开始迁移默认值...';
  
  -- 遍历所有活跃租户
  FOR tenant_record IN 
    SELECT schema_name 
    FROM public.tenant 
    WHERE is_active = true
  LOOP
    BEGIN
      RAISE NOTICE '正在处理租户 schema: %', tenant_record.schema_name;
      
      -- =========================================================================
      -- 1. 更新 talent settings，添加默认功能开关
      -- =========================================================================
      EXECUTE format('
        UPDATE %I.talent 
        SET settings = jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(settings, ''{}''::jsonb),
              ''{homepageEnabled}'', 
              ''true''::jsonb,
              true
            ),
            ''{marshmallowEnabled}'',
            ''true''::jsonb,
            true
          ),
          ''{inheritTimezone}'',
          ''true''::jsonb,
          true
        )
        WHERE settings IS NULL 
           OR settings->>''homepageEnabled'' IS NULL 
           OR settings->>''marshmallowEnabled'' IS NULL
      ', tenant_record.schema_name);
      
      GET DIAGNOSTICS talent_count = ROW_COUNT;
      IF talent_count > 0 THEN
        RAISE NOTICE '  ✓ 更新 % 个 talent 的 settings', talent_count;
      END IF;
      
      -- =========================================================================
      -- 2. 启用 marshmallow_config（如果 talent.settings.marshmallowEnabled = true）
      -- =========================================================================
      EXECUTE format('
        UPDATE %I.marshmallow_config mc
        SET is_enabled = true
        FROM %I.talent t
        WHERE mc.talent_id = t.id
          AND mc.is_enabled = false
          AND COALESCE((t.settings->>''marshmallowEnabled'')::boolean, true) = true
      ', tenant_record.schema_name, tenant_record.schema_name);
      
      GET DIAGNOSTICS marshmallow_count = ROW_COUNT;
      IF marshmallow_count > 0 THEN
        RAISE NOTICE '  ✓ 启用 % 个 marshmallow_config', marshmallow_count;
      END IF;
      
      -- =========================================================================
      -- 3. 添加新的资源定义（如果缺失）
      -- =========================================================================
      -- 检查并添加新资源格式
      EXECUTE format('
        INSERT INTO %I.resource (id, code, module, name_en, name_zh, name_ja, sort_order, is_active, created_at, updated_at)
        VALUES 
          (gen_random_uuid(), ''subsidiary'', ''organization'', ''Subsidiary'', ''分级目录'', ''組織'', 0, true, now(), now()),
          (gen_random_uuid(), ''talent'', ''organization'', ''Talent'', ''艺人'', ''タレント'', 0, true, now(), now()),
          (gen_random_uuid(), ''system_user'', ''user'', ''System User'', ''系统用户'', ''システムユーザー'', 0, true, now(), now()),
          (gen_random_uuid(), ''role'', ''user'', ''Role'', ''角色'', ''ロール'', 0, true, now(), now()),
          (gen_random_uuid(), ''homepage'', ''external'', ''Homepage'', ''个人主页'', ''ホームページ'', 0, true, now(), now()),
          (gen_random_uuid(), ''marshmallow'', ''external'', ''Marshmallow'', ''棉花糖'', ''マシュマロ'', 0, true, now(), now()),
          (gen_random_uuid(), ''customer.pii'', ''customer'', ''Customer PII'', ''客户敏感信息'', ''顧客PII'', 0, true, now(), now()),
          (gen_random_uuid(), ''security.blocklist'', ''security'', ''Blocklist'', ''屏蔽词'', ''ブロックリスト'', 0, true, now(), now()),
          (gen_random_uuid(), ''security.ip_rules'', ''security'', ''IP Rules'', ''IP规则'', ''IPルール'', 0, true, now(), now()),
          (gen_random_uuid(), ''security.external_blocklist'', ''security'', ''External Blocklist'', ''外部屏蔽名单'', ''外部ブロックリスト'', 0, true, now(), now()),
          (gen_random_uuid(), ''log.change'', ''log'', ''Change Log'', ''变更日志'', ''変更ログ'', 0, true, now(), now()),
          (gen_random_uuid(), ''log.security'', ''log'', ''Security Log'', ''安全日志'', ''セキュリティログ'', 0, true, now(), now()),
          (gen_random_uuid(), ''log.integration'', ''log'', ''Integration Log'', ''集成日志'', ''連携ログ'', 0, true, now(), now()),
          (gen_random_uuid(), ''integration.consumer'', ''integration'', ''API Consumer'', ''API消费者'', ''APIコンシューマー'', 0, true, now(), now())
        ON CONFLICT (code) DO NOTHING
      ', tenant_record.schema_name);
      
      GET DIAGNOSTICS resource_count = ROW_COUNT;
      IF resource_count > 0 THEN
        RAISE NOTICE '  ✓ 添加 % 个新资源定义', resource_count;
      END IF;
      
      -- =========================================================================
      -- 4. 为 ADMIN/TENANT_ADMIN 角色添加新资源的权限
      -- =========================================================================
      -- 首先为新资源创建 policies
      EXECUTE format('
        INSERT INTO %I.policy (id, resource_id, action, is_active, created_at, updated_at)
        SELECT gen_random_uuid(), r.id, a.action, true, now(), now()
        FROM %I.resource r
        CROSS JOIN (VALUES (''read''), (''write''), (''delete''), (''admin'')) AS a(action)
        WHERE r.code IN (''subsidiary'', ''talent'', ''system_user'', ''role'', ''homepage'', ''marshmallow'', 
                         ''customer.pii'', ''security.blocklist'', ''security.ip_rules'', ''security.external_blocklist'',
                         ''log.change'', ''log.security'', ''log.integration'', ''integration.consumer'')
        ON CONFLICT (resource_id, action) DO NOTHING
      ', tenant_record.schema_name, tenant_record.schema_name);
      
      -- 为 ADMIN 和 TENANT_ADMIN 角色添加新权限
      EXECUTE format('
        INSERT INTO %I.role_policy (id, role_id, policy_id, effect, created_at)
        SELECT gen_random_uuid(), r.id, p.id, ''grant'', now()
        FROM %I.role r
        CROSS JOIN %I.policy p
        JOIN %I.resource res ON p.resource_id = res.id
        WHERE r.code IN (''ADMIN'', ''TENANT_ADMIN'')
          AND res.code IN (''subsidiary'', ''talent'', ''system_user'', ''role'', ''homepage'', ''marshmallow'', 
                           ''customer.pii'', ''security.blocklist'', ''security.ip_rules'', ''security.external_blocklist'',
                           ''log.change'', ''log.security'', ''log.integration'', ''integration.consumer'')
        ON CONFLICT DO NOTHING
      ', tenant_record.schema_name, tenant_record.schema_name, tenant_record.schema_name, tenant_record.schema_name);
      
      RAISE NOTICE '  ✓ 权限更新完成';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '处理租户 % 时出错: %', tenant_record.schema_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '迁移完成!';
  RAISE NOTICE '==========================================';
END $$;
