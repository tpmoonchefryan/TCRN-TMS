-- D026-R10: move Public Presence authority to dictionary-backed Artist Status
-- and Homepage Template Type codes while preserving retired columns for rollback.

INSERT INTO public.system_dictionary (id, code, name, description, sort_order, is_active, created_at, updated_at, version)
VALUES
  (
    gen_random_uuid(),
    'artist-status',
    '{"en":"Artist Status","zh_HANS":"艺人状态","zh_HANT":"藝人狀態","ja":"アーティストステータス","ko":"Artist Status","fr":"Artist Status"}'::jsonb,
    '{"en":"System status dictionary referenced by Artist Stage.","zh_HANS":"Artist Stage 引用的系统状态字典。","zh_HANT":"Artist Stage 引用的系統狀態字典。","ja":"Artist Stage が参照するシステムステータス辞書です。","ko":"System status dictionary referenced by Artist Stage.","fr":"System status dictionary referenced by Artist Stage."}'::jsonb,
    120,
    true,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'homepage-template-type',
    '{"en":"Homepage Template Type","zh_HANS":"主页模板类型","zh_HANT":"主頁模板類型","ja":"ホームページテンプレートタイプ","ko":"Homepage Template Type","fr":"Homepage Template Type"}'::jsonb,
    '{"en":"System template type dictionary used by Public Presence Studio policy.","zh_HANS":"Public Presence Studio 策略使用的系统模板类型字典。","zh_HANT":"Public Presence Studio 策略使用的系統模板類型字典。","ja":"Public Presence Studio ポリシーで使うシステムテンプレートタイプ辞書です。","ko":"System template type dictionary used by Public Presence Studio policy.","fr":"System template type dictionary used by Public Presence Studio policy."}'::jsonb,
    121,
    true,
    now(),
    now(),
    1
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

INSERT INTO public.system_dictionary_item (
  id,
  dictionary_code,
  code,
  name,
  description,
  sort_order,
  is_active,
  extra_data,
  created_at,
  updated_at,
  version
)
VALUES
  (
    gen_random_uuid(),
    'artist-status',
    'draft',
    '{"en":"Draft","zh_HANS":"草稿","zh_HANT":"草稿","ja":"下書き","ko":"Draft","fr":"Draft"}'::jsonb,
    '{"en":"Talent is not publicly visible.","zh_HANS":"艺人暂不公开展示。","zh_HANT":"藝人暫不公開展示。","ja":"タレントは公開表示されません。","ko":"Talent is not publicly visible.","fr":"Talent is not publicly visible."}'::jsonb,
    10,
    true,
    '{"derivedLifecycleStatus":"draft"}'::jsonb,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'artist-status',
    'published',
    '{"en":"Published","zh_HANS":"已发布","zh_HANT":"已發佈","ja":"公開済み","ko":"Published","fr":"Published"}'::jsonb,
    '{"en":"Talent is eligible for public fan page publishing.","zh_HANS":"艺人可用于粉丝公开页发布。","zh_HANT":"藝人可用於粉絲公開頁發佈。","ja":"タレントは公開ファンページ公開の対象です。","ko":"Talent is eligible for public fan page publishing.","fr":"Talent is eligible for public fan page publishing."}'::jsonb,
    20,
    true,
    '{"derivedLifecycleStatus":"published"}'::jsonb,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'artist-status',
    'disabled',
    '{"en":"Disabled","zh_HANS":"停用","zh_HANT":"停用","ja":"無効","ko":"Disabled","fr":"Disabled"}'::jsonb,
    '{"en":"Talent is disabled for public publishing.","zh_HANS":"艺人停用公开发布。","zh_HANT":"藝人停用公開發佈。","ja":"タレントは公開発行から無効化されています。","ko":"Talent is disabled for public publishing.","fr":"Talent is disabled for public publishing."}'::jsonb,
    30,
    true,
    '{"derivedLifecycleStatus":"disabled"}'::jsonb,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'homepage-template-type',
    'pending-reveal',
    '{"en":"Pending Reveal","zh_HANS":"待揭晓","zh_HANT":"待揭曉","ja":"公開待ち","ko":"Pending Reveal","fr":"Pending Reveal"}'::jsonb,
    '{"en":"Reveal and countdown-oriented homepage templates.","zh_HANS":"面向揭晓与倒计时的主页模板。","zh_HANT":"面向揭曉與倒計時的主頁模板。","ja":"公開・カウントダウン向けホームページテンプレートです。","ko":"Reveal and countdown-oriented homepage templates.","fr":"Reveal and countdown-oriented homepage templates."}'::jsonb,
    10,
    true,
    '{"defaultTemplateId":"debutReveal"}'::jsonb,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'homepage-template-type',
    'operating',
    '{"en":"Operating","zh_HANS":"运营中","zh_HANT":"營運中","ja":"運用中","ko":"Operating","fr":"Operating"}'::jsonb,
    '{"en":"Always-on public homepage templates.","zh_HANS":"常驻公开主页模板。","zh_HANT":"常駐公開主頁模板。","ja":"常設公開ホームページテンプレートです。","ko":"Always-on public homepage templates.","fr":"Always-on public homepage templates."}'::jsonb,
    20,
    true,
    '{"defaultTemplateId":"activeTalentHub"}'::jsonb,
    now(),
    now(),
    1
  ),
  (
    gen_random_uuid(),
    'homepage-template-type',
    'graduated',
    '{"en":"Graduated","zh_HANS":"已毕业","zh_HANT":"已畢業","ja":"卒業済み","ko":"Graduated","fr":"Graduated"}'::jsonb,
    '{"en":"Archive or post-graduation homepage templates.","zh_HANS":"归档或毕业后的主页模板。","zh_HANT":"歸檔或畢業後的主頁模板。","ja":"アーカイブまたは卒業後のホームページテンプレートです。","ko":"Archive or post-graduation homepage templates.","fr":"Archive or post-graduation homepage templates."}'::jsonb,
    30,
    true,
    '{}'::jsonb,
    now(),
    now(),
    1
  )
ON CONFLICT (dictionary_code, code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  extra_data = EXCLUDED.extra_data,
  updated_at = now();

ALTER TABLE tenant_template.artist_stage
  ADD COLUMN IF NOT EXISTS artist_status_code VARCHAR(64) NOT NULL DEFAULT 'draft';

UPDATE tenant_template.artist_stage
SET artist_status_code = COALESCE(NULLIF(lifecycle_status_mapping, ''), 'draft')
WHERE artist_status_code IS NULL OR artist_status_code = '';

ALTER TABLE tenant_template.public_presence_asset
  ADD COLUMN IF NOT EXISTS template_type_code VARCHAR(64);

UPDATE tenant_template.public_presence_asset
SET template_type_code = CASE template_id
  WHEN 'debutReveal' THEN 'pending-reveal'
  WHEN 'activeTalentHub' THEN 'operating'
  ELSE template_type_code
END
WHERE asset_kind = 'template'
  AND template_type_code IS NULL;

CREATE INDEX IF NOT EXISTS public_presence_asset_template_type_code_idx
  ON tenant_template.public_presence_asset(template_type_code);

DO $$
DECLARE
  tenant_schema text;
BEGIN
  FOR tenant_schema IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant\_%' ESCAPE '\'
      AND schema_name <> 'tenant_template'
  LOOP
    IF to_regclass(format('%I.artist_stage', tenant_schema)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.artist_stage ADD COLUMN IF NOT EXISTS artist_status_code VARCHAR(64) NOT NULL DEFAULT ''draft''',
        tenant_schema
      );
      EXECUTE format(
        'UPDATE %I.artist_stage SET artist_status_code = COALESCE(NULLIF(lifecycle_status_mapping, ''''), ''draft'') WHERE artist_status_code IS NULL OR artist_status_code = ''''',
        tenant_schema
      );
    END IF;

    IF to_regclass(format('%I.public_presence_asset', tenant_schema)) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I.public_presence_asset ADD COLUMN IF NOT EXISTS template_type_code VARCHAR(64)',
        tenant_schema
      );
      EXECUTE format(
        'UPDATE %I.public_presence_asset SET template_type_code = CASE template_id WHEN ''debutReveal'' THEN ''pending-reveal'' WHEN ''activeTalentHub'' THEN ''operating'' ELSE template_type_code END WHERE asset_kind = ''template'' AND template_type_code IS NULL',
        tenant_schema
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS public_presence_asset_template_type_code_idx ON %I.public_presence_asset(template_type_code)',
        tenant_schema
      );
    END IF;
  END LOOP;
END $$;
