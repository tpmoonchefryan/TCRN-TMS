-- Add extra_data to system_dictionary so dictionary types can carry dynamic translation maps
-- and future metadata without reopening flat-field schema changes for every locale expansion.

ALTER TABLE public.system_dictionary
    ADD COLUMN IF NOT EXISTS extra_data JSONB;
