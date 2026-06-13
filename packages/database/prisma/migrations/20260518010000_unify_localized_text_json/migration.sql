-- SPDX-License-Identifier: Apache-2.0
-- Migration: make six-locale JSONB LocalizedText the single translated content shape.

CREATE OR REPLACE FUNCTION public.tcrn_localized_text_from_legacy(
    en_value TEXT,
    zh_value TEXT,
    ja_value TEXT,
    existing JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT jsonb_build_object(
        'en',
        COALESCE(NULLIF(existing->>'en', ''), NULLIF(en_value, ''), ''),
        'zh_HANS',
        COALESCE(NULLIF(existing->>'zh_HANS', ''), NULLIF(zh_value, ''), NULLIF(en_value, ''), ''),
        'zh_HANT',
        COALESCE(NULLIF(existing->>'zh_HANT', ''), NULLIF(zh_value, ''), NULLIF(en_value, ''), ''),
        'ja',
        COALESCE(NULLIF(existing->>'ja', ''), NULLIF(ja_value, ''), NULLIF(en_value, ''), ''),
        'ko',
        COALESCE(NULLIF(existing->>'ko', ''), NULLIF(en_value, ''), ''),
        'fr',
        COALESCE(NULLIF(existing->>'fr', ''), NULLIF(en_value, ''), '')
    );
$$;

CREATE OR REPLACE FUNCTION public.tcrn_migrate_localized_column(
    p_schema_name TEXT,
    p_table_name TEXT,
    p_target_column TEXT,
    p_en_column TEXT,
    p_zh_column TEXT,
    p_ja_column TEXT,
    p_require_non_null BOOLEAN DEFAULT false
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    target_regclass REGCLASS;
    has_target BOOLEAN;
    has_en BOOLEAN;
    has_zh BOOLEAN;
    has_ja BOOLEAN;
BEGIN
    target_regclass := to_regclass(format('%I.%I', p_schema_name, p_table_name));

    IF target_regclass IS NULL THEN
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_target_column
    ) INTO has_target;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_en_column
    ) INTO has_en;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_zh_column
    ) INTO has_zh;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = p_schema_name
          AND table_name = p_table_name
          AND column_name = p_ja_column
    ) INTO has_ja;

    IF NOT has_target THEN
        EXECUTE format(
            'ALTER TABLE %I.%I ADD COLUMN %I JSONB',
            p_schema_name,
            p_table_name,
            p_target_column
        );
    END IF;

    IF has_en THEN
        EXECUTE format(
            'UPDATE %I.%I SET %I = public.tcrn_localized_text_from_legacy(%I, %s, %s, CASE WHEN jsonb_typeof(%I) = ''object'' THEN %I ELSE NULL END) WHERE %I IS NULL OR jsonb_typeof(%I) <> ''object''',
            p_schema_name,
            p_table_name,
            p_target_column,
            p_en_column,
            CASE WHEN has_zh THEN format('%I', p_zh_column) ELSE 'NULL::text' END,
            CASE WHEN has_ja THEN format('%I', p_ja_column) ELSE 'NULL::text' END,
            p_target_column,
            p_target_column,
            p_target_column,
            p_target_column
        );
    ELSE
        EXECUTE format(
            'UPDATE %I.%I SET %I = public.tcrn_localized_text_from_legacy(NULL, NULL, NULL, CASE WHEN jsonb_typeof(%I) = ''object'' THEN %I ELSE NULL END) WHERE %I IS NULL OR jsonb_typeof(%I) <> ''object''',
            p_schema_name,
            p_table_name,
            p_target_column,
            p_target_column,
            p_target_column,
            p_target_column,
            p_target_column
        );
    END IF;

    IF p_require_non_null THEN
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I SET NOT NULL',
            p_schema_name,
            p_table_name,
            p_target_column
        );
    END IF;

    IF has_en THEN
        EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I', p_schema_name, p_table_name, p_en_column);
    END IF;

    IF has_zh THEN
        EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I', p_schema_name, p_table_name, p_zh_column);
    END IF;

    IF has_ja THEN
        EXECUTE format('ALTER TABLE %I.%I DROP COLUMN %I', p_schema_name, p_table_name, p_ja_column);
    END IF;
END $$;

DO $$
DECLARE
    target_schema TEXT;
    target_table TEXT;
    public_tables TEXT[] := ARRAY[
        'system_dictionary',
        'system_dictionary_item',
        'email_template'
    ];
    tenant_tables TEXT[] := ARRAY[
        'subsidiary',
        'talent',
        'role',
        'resource',
        'pii_service_config',
        'profile_store',
        'channel_category',
        'business_segment',
        'communication_type',
        'address_type',
        'customer_status',
        'reason_category',
        'inactivation_reason',
        'membership_class',
        'membership_type',
        'membership_level',
        'consent',
        'consumer',
        'social_platform',
        'blocklist_entry',
        'marshmallow_config',
        'external_blocklist_pattern',
        'integration_adapter',
        'webhook'
    ];
BEGIN
    FOREACH target_table IN ARRAY public_tables
    LOOP
        target_schema := 'public';

        IF target_table IN (
            'system_dictionary',
            'system_dictionary_item',
            'subsidiary',
            'talent',
            'pii_service_config',
            'profile_store',
            'channel_category',
            'business_segment',
            'communication_type',
            'address_type',
            'customer_status',
            'reason_category',
            'inactivation_reason',
            'membership_class',
            'membership_type',
            'membership_level'
        ) THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'description', 'description_en', 'description_zh', 'description_ja', false);
            CONTINUE;
        END IF;

        IF target_table = 'email_template' THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'subject', 'subject_en', 'subject_zh', 'subject_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'body_html', 'body_html_en', 'body_html_zh', 'body_html_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'body_text', 'body_text_en', 'body_text_zh', 'body_text_ja', false);
            CONTINUE;
        END IF;
    END LOOP;

    FOR target_schema IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name = 'tenant_template'
           OR schema_name LIKE 'tenant_%'
        ORDER BY CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END, schema_name
    LOOP
        FOREACH target_table IN ARRAY tenant_tables
        LOOP
        IF target_table IN (
            'subsidiary',
            'talent',
            'pii_service_config',
            'profile_store',
            'channel_category',
            'business_segment',
            'communication_type',
            'address_type',
            'customer_status',
            'reason_category',
            'inactivation_reason',
            'membership_class',
            'membership_type',
            'membership_level'
        ) THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'description', 'description_en', 'description_zh', 'description_ja', false);
            CONTINUE;
        END IF;

        IF target_table = 'role' THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            CONTINUE;
        END IF;

        IF target_table = 'resource' THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            CONTINUE;
        END IF;

        IF target_table = 'consent' THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'content_markdown', 'content_markdown_en', 'content_markdown_zh', 'content_markdown_ja', false);
            CONTINUE;
        END IF;

        IF target_table IN (
            'consumer',
            'social_platform',
            'blocklist_entry',
            'external_blocklist_pattern',
            'integration_adapter',
            'webhook'
        ) THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'name', 'name_en', 'name_zh', 'name_ja', true);
            CONTINUE;
        END IF;

        IF target_table = 'marshmallow_config' THEN
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'terms_content', 'terms_content_en', 'terms_content_zh', 'terms_content_ja', false);
            PERFORM public.tcrn_migrate_localized_column(target_schema, target_table, 'privacy_content', 'privacy_content_en', 'privacy_content_zh', 'privacy_content_ja', false);
        END IF;
        END LOOP;
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.tcrn_migrate_localized_column(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.tcrn_localized_text_from_legacy(TEXT, TEXT, TEXT, JSONB);
