-- 009: Asterisk machines get an optional human-readable name (e.g. "asterisk-agi-2").
-- Nullable so existing rows stay valid; unique (case-insensitive) when set.

ALTER TABLE asterisk_machines ADD COLUMN IF NOT EXISTS name TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS asterisk_machines_name_key
    ON asterisk_machines (lower(name)) WHERE name IS NOT NULL;
