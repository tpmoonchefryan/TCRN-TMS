-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- 迁移屏蔽词数据到现有租户 schema
-- 使用方法: 
--   docker exec -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms -f /path/to/migrate-blocklist-data.sql
--   或者将 SQL 内容通过管道传入:
--   cat scripts/migrate-blocklist-data.sql | docker exec -i -e PGPASSWORD=your_password tcrn-postgres psql -U tcrn -d tcrn_tms

DO $$
DECLARE
  tenant_record RECORD;
  success_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '开始迁移屏蔽词数据...';
  
  -- 遍历所有活跃租户
  FOR tenant_record IN 
    SELECT schema_name 
    FROM public.tenant 
    WHERE is_active = true
  LOOP
    BEGIN
      RAISE NOTICE '正在处理租户 schema: %', tenant_record.schema_name;
      
      -- 复制 blocklist_entry
      EXECUTE format('
        INSERT INTO %I.blocklist_entry
        SELECT * FROM tenant_template.blocklist_entry
        ON CONFLICT DO NOTHING
      ', tenant_record.schema_name);
      
      RAISE NOTICE '  ✓ blocklist_entry 复制成功';
      
      -- 复制 external_blocklist_pattern
      EXECUTE format('
        INSERT INTO %I.external_blocklist_pattern
        SELECT * FROM tenant_template.external_blocklist_pattern
        ON CONFLICT DO NOTHING
      ', tenant_record.schema_name);
      
      RAISE NOTICE '  ✓ external_blocklist_pattern 复制成功';
      
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '处理租户 % 时出错: %', tenant_record.schema_name, SQLERRM;
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '迁移完成!';
  RAISE NOTICE '成功: % 个租户', success_count;
  RAISE NOTICE '失败: % 个租户', failed_count;
  RAISE NOTICE '==========================================';
END $$;
