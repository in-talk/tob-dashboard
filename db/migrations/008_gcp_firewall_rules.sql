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
