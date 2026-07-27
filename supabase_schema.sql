-- SQL Schema for Dossier Location Facile database tables
-- You can copy and paste this script directly into the Supabase SQL Editor.

-- Automatically enable RLS on every table created in the public schema.
-- This event-trigger function requires elevated rights, but it must never be
-- callable through the API roles.
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
    cmd RECORD;
BEGIN
    FOR cmd IN
        SELECT *
        FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          AND object_type IN ('table', 'partitioned table')
    LOOP
        IF cmd.schema_name = 'public' THEN
            BEGIN
                EXECUTE format(
                    'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
                    cmd.object_identity
                );
                RAISE LOG 'rls_auto_enable: enabled RLS on %',
                    cmd.object_identity;
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE LOG 'rls_auto_enable: failed to enable RLS on %',
                        cmd.object_identity;
            END;
        END IF;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM service_role;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();

-- 1. Better-Auth Tables (using standard PostgreSQL schema)

CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
    id TEXT PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at TIMESTAMP,
    refresh_token_expires_at TIMESTAMP,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for Better-Auth performance
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session"(user_id);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account"(user_id);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);


-- 2. Application Tables

CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    gdrive_folder_id TEXT, -- Main folder ID for this property on Google Drive
    rent NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
    require_guarantor TEXT NOT NULL DEFAULT 'optional', -- 'none', 'optional', 'required'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_first_name TEXT NOT NULL,
    tenant_last_name TEXT NOT NULL,
    tenant_email TEXT NOT NULL,
    tenant_phone TEXT NOT NULL,
    tenant_situation TEXT NOT NULL, -- 'student', 'employee', 'other'
    tenant_income NUMERIC NOT NULL DEFAULT 0,
    guarantor_type TEXT NOT NULL DEFAULT 'none', -- 'none', 'visale', 'physical'
    guarantor_income NUMERIC NOT NULL DEFAULT 0,
    gdrive_folder_id TEXT,
    files JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of doc_type -> google drive webViewLink
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    tenant_comment TEXT, -- Optional comment from the tenant
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Refuse submissions when the public application form is missing or closed.
-- FOR SHARE serializes the check with concurrent form updates so a closure
-- cannot race with an insertion.
CREATE OR REPLACE FUNCTION public.enforce_active_submission_form()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    PERFORM 1
    FROM public.forms
    WHERE property_id = NEW.property_id
      AND is_active IS TRUE
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'submission_form_inactive';
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_active_submission_form() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_active_submission_form_before_insert
    ON public.submissions;
CREATE TRIGGER enforce_active_submission_form_before_insert
BEFORE INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_active_submission_form();

-- Server-side rate limiting for the public submission endpoint.
-- rate_limit_key is an HMAC of the client IP, never the raw address.
CREATE TABLE IF NOT EXISTS submission_rate_limits (
    rate_limit_key TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 1),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submission_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE submission_rate_limits FROM PUBLIC, anon, authenticated;

-- Indexes for Application performance
CREATE INDEX IF NOT EXISTS properties_slug_idx ON properties(slug);
CREATE INDEX IF NOT EXISTS submissions_property_id_idx ON submissions(property_id);
CREATE INDEX IF NOT EXISTS forms_property_id_idx ON forms(property_id);
CREATE INDEX IF NOT EXISTS submission_rate_limits_updated_at_idx
    ON submission_rate_limits(updated_at);

-- Grant full privileges to service_role for all tables
-- (Resolves permission denied errors when using the service_role API key)
GRANT ALL PRIVILEGES ON TABLE public.properties TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.forms TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.submissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."user" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."session" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."account" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."verification" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.submission_rate_limits TO service_role;
