-- 008: Asterisk machines also have a private (VPC-internal) IP.
-- Nullable so existing rows stay valid; once every machine has one you can
-- enforce it with: ALTER TABLE asterisk_machines ALTER COLUMN private_ip SET NOT NULL;

ALTER TABLE asterisk_machines ADD COLUMN IF NOT EXISTS private_ip INET;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'asterisk_machines_private_ip_host_chk'
    ) THEN
        ALTER TABLE asterisk_machines ADD CONSTRAINT asterisk_machines_private_ip_host_chk
            CHECK (masklen(private_ip) = CASE family(private_ip) WHEN 4 THEN 32 ELSE 128 END);
    END IF;
END
$$;

-- Private ranges can overlap between clouds, so uniqueness is per provider.
CREATE UNIQUE INDEX IF NOT EXISTS asterisk_machines_private_ip_key
    ON asterisk_machines (provider, private_ip) WHERE private_ip IS NOT NULL;
