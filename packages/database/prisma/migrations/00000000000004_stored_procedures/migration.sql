-- © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
-- Stored procedures for multi-tenant user authentication

-- ============================================================================
-- Function: query_user_by_login
-- Purpose: Query user by username or email in a specific tenant schema
-- Used by: AuthService for cross-schema user lookup during login
-- NOTE: tenant_id is NOT stored in system_user table (schema-per-tenant design)
-- ============================================================================
DROP FUNCTION IF EXISTS query_user_by_login(TEXT, TEXT);

CREATE FUNCTION query_user_by_login(
    p_schema_name TEXT,
    p_login TEXT
)
RETURNS TABLE (
    id UUID,
    username VARCHAR(64),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    display_name VARCHAR(128),
    avatar_url VARCHAR(512),
    preferred_language VARCHAR(5),
    totp_secret VARCHAR(64),
    is_totp_enabled BOOLEAN,
    is_active BOOLEAN,
    force_reset BOOLEAN,
    password_changed_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
BEGIN
    -- Build dynamic query to search in the specified schema
    v_query := format(
        'SELECT 
            su.id,
            su.username,
            su.email,
            su.password_hash,
            su.display_name,
            su.avatar_url,
            su.preferred_language,
            su.totp_secret,
            su.is_totp_enabled,
            su.is_active,
            su.force_reset,
            su.password_changed_at,
            su.locked_until
        FROM %I.system_user su
        WHERE (su.username = $1 OR su.email = $1)
        LIMIT 1',
        p_schema_name
    );
    
    RETURN QUERY EXECUTE v_query USING p_login;
END;
$$;

-- Grant execute permission to public (application will connect as db user)
GRANT EXECUTE ON FUNCTION query_user_by_login(TEXT, TEXT) TO PUBLIC;

-- ============================================================================
-- Function: log_security_event
-- Purpose: Log security events in tenant schema
-- Used by: SessionService for audit logging
-- ============================================================================
CREATE OR REPLACE FUNCTION log_security_event(
    p_schema_name TEXT,
    p_event_type VARCHAR(64),
    p_user_id UUID,
    p_ip_address INET,
    p_user_agent TEXT,
    p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
    v_event_id UUID;
BEGIN
    v_event_id := gen_random_uuid();
    
    v_query := format(
        'INSERT INTO %I.security_event (
            id, event_type, user_id, ip_address, user_agent, details, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        p_schema_name
    );
    
    EXECUTE v_query USING v_event_id, p_event_type, p_user_id, p_ip_address, p_user_agent, p_details;
    
    RETURN v_event_id;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist in this schema, ignore
        RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION log_security_event(TEXT, VARCHAR, UUID, INET, TEXT, JSONB) TO PUBLIC;

-- ============================================================================
-- Function: increment_login_attempts
-- Purpose: Increment login attempt counter for a user
-- Used by: AuthService for account lockout tracking
-- ============================================================================
CREATE OR REPLACE FUNCTION increment_login_attempts(
    p_schema_name TEXT,
    p_user_id UUID,
    p_max_attempts INT DEFAULT 5,
    p_lockout_duration INTERVAL DEFAULT '30 minutes'
)
RETURNS TABLE (
    attempts INT,
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
    v_current_attempts INT;
    v_locked_until TIMESTAMPTZ;
BEGIN
    -- Get current login attempts
    v_query := format(
        'SELECT login_attempts, locked_until FROM %I.system_user WHERE id = $1',
        p_schema_name
    );
    EXECUTE v_query INTO v_current_attempts, v_locked_until USING p_user_id;
    
    v_current_attempts := COALESCE(v_current_attempts, 0) + 1;
    
    -- Check if we should lock the account
    IF v_current_attempts >= p_max_attempts THEN
        v_locked_until := NOW() + p_lockout_duration;
    END IF;
    
    -- Update the user record
    v_query := format(
        'UPDATE %I.system_user SET login_attempts = $2, locked_until = $3, updated_at = NOW() WHERE id = $1',
        p_schema_name
    );
    EXECUTE v_query USING p_user_id, v_current_attempts, v_locked_until;
    
    RETURN QUERY SELECT v_current_attempts, (v_locked_until IS NOT NULL AND v_locked_until > NOW()), v_locked_until;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_login_attempts(TEXT, UUID, INT, INTERVAL) TO PUBLIC;

-- ============================================================================
-- Function: reset_login_attempts
-- Purpose: Reset login attempt counter after successful login
-- Used by: AuthService after successful authentication
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_login_attempts(
    p_schema_name TEXT,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
BEGIN
    v_query := format(
        'UPDATE %I.system_user SET login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1',
        p_schema_name
    );
    EXECUTE v_query USING p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_login_attempts(TEXT, UUID) TO PUBLIC;

-- ============================================================================
-- Function: update_last_login
-- Purpose: Update user's last login timestamp
-- Used by: AuthService after successful authentication
-- ============================================================================
CREATE OR REPLACE FUNCTION update_last_login(
    p_schema_name TEXT,
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
BEGIN
    v_query := format(
        'UPDATE %I.system_user SET 
            last_login_at = NOW(), 
            last_login_ip = $2,
            updated_at = NOW() 
        WHERE id = $1',
        p_schema_name
    );
    EXECUTE v_query USING p_user_id, p_ip_address;
END;
$$;

GRANT EXECUTE ON FUNCTION update_last_login(TEXT, UUID, INET) TO PUBLIC;

-- ============================================================================
-- Function: get_user_permissions
-- Purpose: Get all permissions for a user including inherited ones
-- Used by: PermissionSnapshotService for permission calculation
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_schema_name TEXT,
    p_user_id UUID,
    p_scope_type VARCHAR(32) DEFAULT NULL,
    p_scope_id UUID DEFAULT NULL
)
RETURNS TABLE (
    resource_code VARCHAR(64),
    action VARCHAR(32),
    effect VARCHAR(16)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_query TEXT;
BEGIN
    v_query := format(
        'SELECT DISTINCT 
            r.code as resource_code,
            p.action,
            p.effect
        FROM %I.user_role ur
        JOIN %I.role_policy rp ON rp.role_id = ur.role_id
        JOIN %I.policy p ON p.id = rp.policy_id
        JOIN %I.resource r ON r.id = p.resource_id
        WHERE ur.user_id = $1
          AND ur.is_active = true
          AND (ur.valid_from IS NULL OR ur.valid_from <= NOW())
          AND (ur.valid_to IS NULL OR ur.valid_to >= NOW())
          AND ($2 IS NULL OR ur.scope_type = $2)
          AND ($3 IS NULL OR ur.scope_id = $3 OR ur.scope_id IS NULL)',
        p_schema_name, p_schema_name, p_schema_name, p_schema_name
    );
    
    RETURN QUERY EXECUTE v_query USING p_user_id, p_scope_type, p_scope_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions(TEXT, UUID, VARCHAR, UUID) TO PUBLIC;

-- ============================================================================
-- Add login_attempts and last_login fields to system_user if not exists
-- ============================================================================
DO $$
BEGIN
    -- Add to tenant_template schema
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'tenant_template' 
        AND table_name = 'system_user' 
        AND column_name = 'login_attempts'
    ) THEN
        ALTER TABLE tenant_template.system_user 
        ADD COLUMN login_attempts INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'tenant_template' 
        AND table_name = 'system_user' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE tenant_template.system_user 
        ADD COLUMN last_login_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'tenant_template' 
        AND table_name = 'system_user' 
        AND column_name = 'last_login_ip'
    ) THEN
        ALTER TABLE tenant_template.system_user 
        ADD COLUMN last_login_ip INET;
    END IF;
END $$;
