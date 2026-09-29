-- 003: IPs belonging to a client. A client can have many IPs.
-- client_id is nullable so an IP can be registered directly (e.g. from the
-- Kamailio mapping screen) before it is attributed to a client.

CREATE TABLE IF NOT EXISTS client_ips (
    id          BIGSERIAL      PRIMARY KEY,
    client_id   BIGINT         REFERENCES clients (client_id) ON DELETE CASCADE,
    ip          INET           NOT NULL,
    provider    cloud_provider,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by  TEXT,
    CONSTRAINT client_ips_client_ip_key UNIQUE (client_id, ip),
    CONSTRAINT client_ips_ip_host_chk
        CHECK (masklen(ip) = CASE family(ip) WHEN 4 THEN 32 ELSE 128 END)
);

-- UNIQUE (client_id, ip) treats NULLs as distinct, so unassigned IPs need
-- their own guard.
CREATE UNIQUE INDEX IF NOT EXISTS client_ips_unassigned_ip_key
    ON client_ips (ip) WHERE client_id IS NULL;

-- The composite unique index above already serves lookups by client_id.
CREATE INDEX IF NOT EXISTS client_ips_ip_idx       ON client_ips (ip);
CREATE INDEX IF NOT EXISTS client_ips_provider_idx ON client_ips (provider);

DROP TRIGGER IF EXISTS client_ips_set_updated_at ON client_ips;
CREATE TRIGGER client_ips_set_updated_at
    BEFORE UPDATE ON client_ips
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
