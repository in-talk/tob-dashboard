-- 002: Kamailio servers.

CREATE TABLE IF NOT EXISTS kamailio_config (
    id          BIGSERIAL      PRIMARY KEY,
    ip          INET           NOT NULL,
    provider    cloud_provider NOT NULL,
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by  TEXT,
    CONSTRAINT kamailio_config_ip_key UNIQUE (ip),
    -- Host addresses only (no CIDR ranges such as 10.0.0.0/24).
    CONSTRAINT kamailio_config_ip_host_chk
        CHECK (masklen(ip) = CASE family(ip) WHEN 4 THEN 32 ELSE 128 END)
);

CREATE INDEX IF NOT EXISTS kamailio_config_provider_idx ON kamailio_config (provider);

DROP TRIGGER IF EXISTS kamailio_config_set_updated_at ON kamailio_config;
CREATE TRIGGER kamailio_config_set_updated_at
    BEFORE UPDATE ON kamailio_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
