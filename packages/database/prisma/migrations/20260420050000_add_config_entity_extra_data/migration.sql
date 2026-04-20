-- Add JSONB metadata storage for scoped config entity translation maps.
-- Applies to tenant_template and existing tenant schemas so runtime reads/writes stay aligned.

DO $$
DECLARE
    schema_record RECORD;
    table_name TEXT;
    config_tables TEXT[] := ARRAY[
        'channel_category',
        'business_segment',
        'communication_type',
        'address_type',
        'customer_status',
        'reason_category',
        'inactivation_reason',
        'membership_class',
        'consent'
    ];
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
        ORDER BY CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END, schema_name
    LOOP
        FOREACH table_name IN ARRAY config_tables
        LOOP
            IF to_regclass(format('%I.%I', schema_record.schema_name, table_name)) IS NULL THEN
                RAISE NOTICE 'Skipping %.% because table is missing', schema_record.schema_name, table_name;
                CONTINUE;
            END IF;

            EXECUTE format(
                'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS extra_data JSONB',
                schema_record.schema_name,
                table_name
            );
        END LOOP;
    END LOOP;
END $$;
