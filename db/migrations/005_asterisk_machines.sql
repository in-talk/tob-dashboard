-- 005: Asterisk machines.

CREATE TABLE IF NOT EXISTS asterisk_machines (
    id          BIGSERIAL      PRIMARY KEY,
    ip          INET           NOT NULL,
    provider    cloud_provider NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by  TEXT,
    CONSTRAINT asterisk_machines_ip_key UNIQUE (ip),
    CONSTRAINT asterisk_machines_ip_host_chk
        CHECK (masklen(ip) = CASE family(ip) WHEN 4 THEN 32 ELSE 128 END)
);

CREATE INDEX IF NOT EXISTS asterisk_machines_provider_idx ON asterisk_machines (provider);

DROP TRIGGER IF EXISTS asterisk_machines_set_updated_at ON asterisk_machines;
CREATE TRIGGER asterisk_machines_set_updated_at
    BEFORE UPDATE ON asterisk_machines
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
