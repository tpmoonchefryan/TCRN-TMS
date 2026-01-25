-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Migration: System Dictionary Tables
-- Adds system_dictionary and system_dictionary_item tables to public schema
-- These tables store platform-level dictionaries editable by AC tenant only

-- System Dictionary (Dictionary Type Definition)
CREATE TABLE IF NOT EXISTS public.system_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_system_dictionary_code ON public.system_dictionary(code);
CREATE INDEX IF NOT EXISTS idx_system_dictionary_is_active ON public.system_dictionary(is_active);

COMMENT ON TABLE public.system_dictionary IS 'System-level dictionary types, editable by AC tenant only';
COMMENT ON COLUMN public.system_dictionary.code IS 'Unique identifier for the dictionary type (e.g., countries, languages)';

-- System Dictionary Item (Dictionary Entries)
CREATE TABLE IF NOT EXISTS public.system_dictionary_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dictionary_code VARCHAR(64) NOT NULL REFERENCES public.system_dictionary(code) ON DELETE CASCADE,
    code VARCHAR(64) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_zh VARCHAR(255),
    name_ja VARCHAR(255),
    description_en TEXT,
    description_zh TEXT,
    description_ja TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    extra_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(dictionary_code, code)
);

CREATE INDEX IF NOT EXISTS idx_system_dictionary_item_dictionary_code ON public.system_dictionary_item(dictionary_code);
CREATE INDEX IF NOT EXISTS idx_system_dictionary_item_code ON public.system_dictionary_item(code);
CREATE INDEX IF NOT EXISTS idx_system_dictionary_item_is_active ON public.system_dictionary_item(is_active);
CREATE INDEX IF NOT EXISTS idx_system_dictionary_item_extra_data ON public.system_dictionary_item USING GIN(extra_data);

COMMENT ON TABLE public.system_dictionary_item IS 'Dictionary entries belonging to a dictionary type';
COMMENT ON COLUMN public.system_dictionary_item.extra_data IS 'Additional data specific to dictionary type (e.g., currency symbol, timezone offset)';
