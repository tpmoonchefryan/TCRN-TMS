-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- 迁移脚本：为现有 talent 和 marshmallow_config 补充默认值
-- 注意：RBAC 契约不再由本脚本维护，请改用 `pnpm --filter @tcrn/database db:sync-rbac`
-- 使用方法：
--   docker exec -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms -f /path/to/migrate-tenant-defaults.sql
--   或者：
--   cat scripts/migrate-tenant-defaults.sql | docker exec -i -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms

DO $$
DECLARE
  tenant_record RECORD;
  talent_count INTEGER := 0;
  marshmallow_count INTEGER := 0;
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
      -- 3. RBAC 契约已迁移到 shared catalog 统一维护
      -- =========================================================================
      RAISE NOTICE '  ↪ 跳过 RBAC 资源/权限增量写入；如需修复权限契约，请运行 pnpm --filter @tcrn/database db:sync-rbac';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '处理租户 % 时出错: %', tenant_record.schema_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '迁移完成!';
  RAISE NOTICE '==========================================';
END $$;
