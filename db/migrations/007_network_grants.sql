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
