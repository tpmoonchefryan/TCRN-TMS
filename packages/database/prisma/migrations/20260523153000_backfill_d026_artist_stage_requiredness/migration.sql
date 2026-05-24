-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- D-026 follow-up: seed tenant artist stages, backfill existing talents, and
-- promote talent.artist_stage_id to a required invariant across tenant schemas.

DO $$
DECLARE
    schema_record RECORD;
    missing_stage_count INTEGER;
BEGIN
    FOR schema_record IN
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name LIKE 'tenant_%'
        ORDER BY
            CASE WHEN schema_name = 'tenant_template' THEN 0 ELSE 1 END,
            schema_name
    LOOP
        IF to_regclass(format('%I.talent', schema_record.schema_name)) IS NULL THEN
            RAISE NOTICE 'Skipping schema % because table talent is missing', schema_record.schema_name;
            CONTINUE;
        END IF;

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I.artist_stage (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_type VARCHAR(16) NOT NULL DEFAULT ''tenant'',
                owner_id UUID,
                code VARCHAR(32) NOT NULL,
                name JSONB NOT NULL,
                description JSONB NOT NULL DEFAULT ''{"en":"","zh_HANS":"","zh_HANT":"","ja":"","ko":"","fr":""}'',
                sort_order INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT true,
                is_system BOOLEAN NOT NULL DEFAULT false,
                color VARCHAR(16),
                lifecycle_status_mapping VARCHAR(16) NOT NULL DEFAULT ''draft'',
                homepage_policy_key VARCHAR(64),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                created_by UUID,
                updated_by UUID,
                version INTEGER NOT NULL DEFAULT 1,
                UNIQUE (owner_type, owner_id, code)
            )',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS artist_stage_owner_idx
                ON %I.artist_stage(owner_type, owner_id)',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS artist_stage_active_idx
                ON %I.artist_stage(is_active)',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ADD COLUMN IF NOT EXISTS artist_stage_id UUID',
            schema_record.schema_name
        );

        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS talent_artist_stage_id_idx
                ON %I.talent(artist_stage_id)',
            schema_record.schema_name
        );

        EXECUTE format(
            $seed$
              INSERT INTO %I.artist_stage
                (id, owner_type, owner_id, code, name, description, sort_order, is_active, is_system, color, lifecycle_status_mapping, homepage_policy_key, created_at, updated_at, created_by, updated_by, version)
              SELECT
                gen_random_uuid(),
                'tenant',
                NULL,
                'draft',
                '{"en":"Draft","zh_HANS":"草稿阶段","zh_HANT":"草稿階段","ja":"ドラフト段階","ko":"초안 단계","fr":"Étape brouillon"}'::jsonb,
                '{"en":"Default stage migrated from legacy draft lifecycle status.","zh_HANS":"从历史 draft 生命周期迁移的默认阶段。","zh_HANT":"從歷史 draft 生命週期遷移的預設階段。","ja":"旧 draft ライフサイクルから移行した既定ステージです。","ko":"기존 draft 라이프사이클에서 마이그레이션된 기본 단계입니다.","fr":"Étape par défaut migrée depuis l''ancien statut draft."}'::jsonb,
                10,
                true,
                false,
                '#94A3B8',
                'draft',
                NULL,
                now(),
                now(),
                NULL,
                NULL,
                1
              WHERE NOT EXISTS (
                SELECT 1
                FROM %I.artist_stage
                WHERE owner_type = 'tenant'
                  AND owner_id IS NULL
                  AND code = 'draft'
              )
            $seed$,
            schema_record.schema_name,
            schema_record.schema_name
        );

        EXECUTE format(
            $seed$
              INSERT INTO %I.artist_stage
                (id, owner_type, owner_id, code, name, description, sort_order, is_active, is_system, color, lifecycle_status_mapping, homepage_policy_key, created_at, updated_at, created_by, updated_by, version)
              SELECT
                gen_random_uuid(),
                'tenant',
                NULL,
                'published',
                '{"en":"Published","zh_HANS":"已发布阶段","zh_HANT":"已發佈階段","ja":"公開段階","ko":"게시 단계","fr":"Étape publiée"}'::jsonb,
                '{"en":"Default stage migrated from legacy published lifecycle status.","zh_HANS":"从历史 published 生命周期迁移的默认阶段。","zh_HANT":"從歷史 published 生命週期遷移的預設階段。","ja":"旧 published ライフサイクルから移行した既定ステージです。","ko":"기존 published 라이프사이클에서 마이그레이션된 기본 단계입니다.","fr":"Étape par défaut migrée depuis l''ancien statut published."}'::jsonb,
                20,
                true,
                false,
                '#10B981',
                'published',
                NULL,
                now(),
                now(),
                NULL,
                NULL,
                1
              WHERE NOT EXISTS (
                SELECT 1
                FROM %I.artist_stage
                WHERE owner_type = 'tenant'
                  AND owner_id IS NULL
                  AND code = 'published'
              )
            $seed$,
            schema_record.schema_name,
            schema_record.schema_name
        );

        EXECUTE format(
            $seed$
              INSERT INTO %I.artist_stage
                (id, owner_type, owner_id, code, name, description, sort_order, is_active, is_system, color, lifecycle_status_mapping, homepage_policy_key, created_at, updated_at, created_by, updated_by, version)
              SELECT
                gen_random_uuid(),
                'tenant',
                NULL,
                'disabled',
                '{"en":"Disabled","zh_HANS":"停用阶段","zh_HANT":"停用階段","ja":"停止段階","ko":"비활성 단계","fr":"Étape désactivée"}'::jsonb,
                '{"en":"Default stage migrated from legacy disabled lifecycle status.","zh_HANS":"从历史 disabled 生命周期迁移的默认阶段。","zh_HANT":"從歷史 disabled 生命週期遷移的預設階段。","ja":"旧 disabled ライフサイクルから移行した既定ステージです。","ko":"기존 disabled 라이프사이클에서 마이그레이션된 기본 단계입니다.","fr":"Étape par défaut migrée depuis l''ancien statut disabled."}'::jsonb,
                30,
                true,
                false,
                '#9CA3AF',
                'disabled',
                NULL,
                now(),
                now(),
                NULL,
                NULL,
                1
              WHERE NOT EXISTS (
                SELECT 1
                FROM %I.artist_stage
                WHERE owner_type = 'tenant'
                  AND owner_id IS NULL
                  AND code = 'disabled'
              )
            $seed$,
            schema_record.schema_name,
            schema_record.schema_name
        );

        EXECUTE format(
            $sql$
              UPDATE %I.artist_stage
              SET lifecycle_status_mapping = 'draft',
                  sort_order = 10,
                  is_active = true
              WHERE owner_type = 'tenant'
                AND owner_id IS NULL
                AND code = 'draft'
                AND (
                  lifecycle_status_mapping IS DISTINCT FROM 'draft'
                  OR sort_order IS DISTINCT FROM 10
                  OR is_active IS DISTINCT FROM true
                )
            $sql$,
            schema_record.schema_name
        );

        EXECUTE format(
            $sql$
              UPDATE %I.artist_stage
              SET lifecycle_status_mapping = 'published',
                  sort_order = 20,
                  is_active = true
              WHERE owner_type = 'tenant'
                AND owner_id IS NULL
                AND code = 'published'
                AND (
                  lifecycle_status_mapping IS DISTINCT FROM 'published'
                  OR sort_order IS DISTINCT FROM 20
                  OR is_active IS DISTINCT FROM true
                )
            $sql$,
            schema_record.schema_name
        );

        EXECUTE format(
            $sql$
              UPDATE %I.artist_stage
              SET lifecycle_status_mapping = 'disabled',
                  sort_order = 30,
                  is_active = true
              WHERE owner_type = 'tenant'
                AND owner_id IS NULL
                AND code = 'disabled'
                AND (
                  lifecycle_status_mapping IS DISTINCT FROM 'disabled'
                  OR sort_order IS DISTINCT FROM 30
                  OR is_active IS DISTINCT FROM true
                )
            $sql$,
            schema_record.schema_name
        );

        EXECUTE format(
            $sql$
              UPDATE %I.talent AS talent
              SET artist_stage_id = (
                SELECT stage.id
                FROM %I.artist_stage AS stage
                WHERE stage.owner_type = 'tenant'
                  AND stage.owner_id IS NULL
                  AND stage.is_active = true
                  AND stage.lifecycle_status_mapping = COALESCE(talent.lifecycle_status, 'draft')
                ORDER BY
                  CASE
                    WHEN stage.code = COALESCE(talent.lifecycle_status, 'draft') THEN 0
                    ELSE 1
                  END,
                  stage.sort_order ASC,
                  stage.created_at ASC
                LIMIT 1
              )
              WHERE talent.artist_stage_id IS NULL
            $sql$,
            schema_record.schema_name,
            schema_record.schema_name
        );

        EXECUTE format(
            'SELECT COUNT(*)::int
             FROM %I.talent
             WHERE artist_stage_id IS NULL',
            schema_record.schema_name
        )
        INTO missing_stage_count;

        IF missing_stage_count > 0 THEN
            RAISE EXCEPTION 'Schema % still has % talents without artist_stage_id after D-026 backfill',
                schema_record.schema_name,
                missing_stage_count;
        END IF;

        EXECUTE format(
            'ALTER TABLE %I.talent
                DROP CONSTRAINT IF EXISTS talent_artist_stage_id_fkey',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ALTER COLUMN artist_stage_id SET NOT NULL',
            schema_record.schema_name
        );

        EXECUTE format(
            'ALTER TABLE %I.talent
                ADD CONSTRAINT talent_artist_stage_id_fkey
                FOREIGN KEY (artist_stage_id)
                REFERENCES %I.artist_stage(id)
                ON DELETE RESTRICT
                ON UPDATE CASCADE',
            schema_record.schema_name,
            schema_record.schema_name
        );
    END LOOP;
END $$;
