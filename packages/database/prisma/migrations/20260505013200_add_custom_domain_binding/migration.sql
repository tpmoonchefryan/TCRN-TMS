-- Add global custom-domain binding registry for inherited tenant/subsidiary/talent domains.
-- Additive only: existing tenant-local talent.custom_domain remains the legacy dedicated-domain source.

CREATE TABLE IF NOT EXISTS public.custom_domain_binding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
    owner_type VARCHAR(16) NOT NULL,
    owner_id UUID,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
    custom_domain_verification_token VARCHAR(64),
    custom_domain_ssl_mode VARCHAR(32) NOT NULL DEFAULT 'auto',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT custom_domain_binding_owner_type_check
        CHECK (owner_type IN ('tenant', 'subsidiary', 'talent')),
    CONSTRAINT custom_domain_binding_owner_id_check
        CHECK (
            (owner_type = 'tenant' AND owner_id IS NULL)
            OR (owner_type IN ('subsidiary', 'talent') AND owner_id IS NOT NULL)
        ),
    CONSTRAINT custom_domain_binding_ssl_mode_check
        CHECK (custom_domain_ssl_mode IN ('auto', 'self_hosted', 'cloudflare')),
    CONSTRAINT custom_domain_binding_hostname_lowercase_check
        CHECK (hostname = lower(hostname))
);

CREATE INDEX IF NOT EXISTS idx_custom_domain_binding_tenant_owner
    ON public.custom_domain_binding(tenant_id, owner_type, owner_id);

CREATE INDEX IF NOT EXISTS idx_custom_domain_binding_active
    ON public.custom_domain_binding(is_active);

CREATE TABLE IF NOT EXISTS public.custom_domain_talent_selection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
    custom_domain_binding_id UUID NOT NULL REFERENCES public.custom_domain_binding(id) ON DELETE CASCADE,
    talent_id UUID NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT custom_domain_talent_selection_unique UNIQUE (custom_domain_binding_id, talent_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_domain_talent_selection_tenant_talent
    ON public.custom_domain_talent_selection(tenant_id, talent_id);
