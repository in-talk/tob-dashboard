-- 006: which Asterisk machines each Kamailio server routes to.

CREATE TABLE IF NOT EXISTS kamailio_asterisk_map (
    id           BIGSERIAL   PRIMARY KEY,
    kamailio_id  BIGINT      NOT NULL REFERENCES kamailio_config (id)   ON DELETE CASCADE,
    asterisk_id  BIGINT      NOT NULL REFERENCES asterisk_machines (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by   TEXT,
    CONSTRAINT kamailio_asterisk_map_key UNIQUE (kamailio_id, asterisk_id)
);

CREATE INDEX IF NOT EXISTS kamailio_asterisk_map_asterisk_idx
    ON kamailio_asterisk_map (asterisk_id);

DROP TRIGGER IF EXISTS kamailio_asterisk_map_set_updated_at ON kamailio_asterisk_map;
CREATE TRIGGER kamailio_asterisk_map_set_updated_at
    BEFORE UPDATE ON kamailio_asterisk_map
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
