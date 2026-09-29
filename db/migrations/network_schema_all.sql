-- Kamailio / Client IP / Asterisk network schema — single executable script.
-- Generated from db/migrations/001-008. Idempotent: safe to re-run.
-- Run with: psql "$POSTGRESDATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/network_schema_all.sql

BEGIN;

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

-- 007: give the app role (myuser) the same privileges it has on every other
-- table: ALL on tables (= "Dadrtwx" in pgAdmin) plus the id sequences, which
-- INSERTs into BIGSERIAL columns need.

GRANT ALL PRIVILEGES ON TABLE
    kamailio_config,
    client_ips,
    kamailio_client_ip_map,
    asterisk_machines,
    kamailio_asterisk_map
TO myuser;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE
    kamailio_config_id_seq,
    client_ips_id_seq,
    kamailio_client_ip_map_id_seq,
    asterisk_machines_id_seq,
    kamailio_asterisk_map_id_seq
TO myuser;

GRANT USAGE ON TYPE cloud_provider TO myuser;

-- 008: GCP firewall rules whose source ranges are kept in sync with client_ips.
-- Each row names an existing VPC firewall rule and which client IPs it should
-- whitelist; the dashboard's "Sync firewall" action pushes that set to GCP.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'firewall_scope') THEN
        -- all_clients: every client IP
        -- client:      one client's IPs
        -- kamailio:    client IPs mapped to one Kamailio server
        CREATE TYPE firewall_scope AS ENUM ('all_clients', 'client', 'kamailio');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS gcp_firewall_rules (
    id                 BIGSERIAL      PRIMARY KEY,
    project_id         TEXT           NOT NULL,
    rule_name          TEXT           NOT NULL,
    scope              firewall_scope NOT NULL DEFAULT 'all_clients',
    client_id          BIGINT         REFERENCES clients (client_id)  ON DELETE CASCADE,
    kamailio_id        BIGINT         REFERENCES kamailio_config (id) ON DELETE CASCADE,
    -- Ranges always kept in the rule regardless of client_ips (office, VPN…).
    static_ranges      CIDR[]         NOT NULL DEFAULT '{}',
    last_synced_at     TIMESTAMPTZ,
    last_synced_by     TEXT,
    last_sync_status   TEXT           CHECK (last_sync_status IN ('ok', 'error')),
    last_sync_message  TEXT,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_by         TEXT,
    CONSTRAINT gcp_firewall_rules_rule_key UNIQUE (project_id, rule_name),
    CONSTRAINT gcp_firewall_rules_scope_chk CHECK (
        (scope = 'client')   = (client_id   IS NOT NULL) AND
        (scope = 'kamailio') = (kamailio_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS gcp_firewall_rules_client_idx   ON gcp_firewall_rules (client_id);
CREATE INDEX IF NOT EXISTS gcp_firewall_rules_kamailio_idx ON gcp_firewall_rules (kamailio_id);

DROP TRIGGER IF EXISTS gcp_firewall_rules_set_updated_at ON gcp_firewall_rules;
-- Only config edits count as an update; recording a sync result doesn't.
CREATE TRIGGER gcp_firewall_rules_set_updated_at
    BEFORE UPDATE ON gcp_firewall_rules
    FOR EACH ROW
    WHEN ((OLD.project_id, OLD.rule_name, OLD.scope, OLD.client_id, OLD.kamailio_id, OLD.static_ranges)
          IS DISTINCT FROM
          (NEW.project_id, NEW.rule_name, NEW.scope, NEW.client_id, NEW.kamailio_id, NEW.static_ranges))
    EXECUTE FUNCTION set_updated_at();

GRANT ALL PRIVILEGES ON TABLE gcp_firewall_rules TO myuser;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE gcp_firewall_rules_id_seq TO myuser;
GRANT USAGE ON TYPE firewall_scope TO myuser;

COMMIT;
