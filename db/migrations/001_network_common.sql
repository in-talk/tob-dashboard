-- 001: shared objects for the Kamailio / Client IP / Asterisk network tables.

-- Cloud provider enum (idempotent: CREATE TYPE has no IF NOT EXISTS).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cloud_provider') THEN
        CREATE TYPE cloud_provider AS ENUM ('gcp', 'aws');
    END IF;
END
$$;

-- Keeps updated_at current on every UPDATE, so callers can't forget it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
