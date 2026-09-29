-- 004: which client IPs each Kamailio server accepts traffic from.

CREATE TABLE IF NOT EXISTS kamailio_client_ip_map (
    id            BIGSERIAL   PRIMARY KEY,
    kamailio_id   BIGINT      NOT NULL REFERENCES kamailio_config (id) ON DELETE CASCADE,
    client_ip_id  BIGINT      NOT NULL REFERENCES client_ips (id)      ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by    TEXT,
    CONSTRAINT kamailio_client_ip_map_key UNIQUE (kamailio_id, client_ip_id)
);

-- kamailio_id lookups are served by the composite unique index.
CREATE INDEX IF NOT EXISTS kamailio_client_ip_map_client_ip_idx
    ON kamailio_client_ip_map (client_ip_id);

DROP TRIGGER IF EXISTS kamailio_client_ip_map_set_updated_at ON kamailio_client_ip_map;
CREATE TRIGGER kamailio_client_ip_map_set_updated_at
    BEFORE UPDATE ON kamailio_client_ip_map
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
