-- SQL Schema for Dossier Location Facile database tables
-- You can copy and paste this script directly into the Supabase SQL Editor.

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
    gdrive_folder_id TEXT,
    files JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of doc_type -> google drive webViewLink
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for Application performance
CREATE INDEX IF NOT EXISTS properties_slug_idx ON properties(slug);
CREATE INDEX IF NOT EXISTS submissions_property_id_idx ON submissions(property_id);
CREATE INDEX IF NOT EXISTS forms_property_id_idx ON forms(property_id);

-- Grant full privileges to service_role for all tables
-- (Resolves permission denied errors when using the service_role API key)
GRANT ALL PRIVILEGES ON TABLE public.properties TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.forms TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.submissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."user" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."session" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."account" TO service_role;
GRANT ALL PRIVILEGES ON TABLE public."verification" TO service_role;
