-- FUNCTION: public.get_kamailio_ips(inet)
--
-- Given a Kamailio server IP, returns the request body for that server's
-- Kamailio Sync API (POST http://<kamailio>:7778/api/v1/sync), e.g.
--   SELECT get_kamailio_ips('10.0.0.1');
--   => {"vicidial_ips": ["34.1.2.3", "34.1.2.4"],
--       "asterisk_servers": [
--         {"private_ip": "10.128.0.21", "public_ip": "35.1.0.1", "name": "asterisk-agi-1"},
--         {"private_ip": "10.128.0.32", "public_ip": "35.1.0.2", "name": "asterisk-agi-2"}]}
--
-- vicidial_ips      = client IPs mapped to this Kamailio (address table, group 1).
--                     DISTINCT: the same IP can be registered under several clients.
-- asterisk_servers  = Asterisk machines mapped to this Kamailio (dispatcher, set 1).
--                     The API requires private_ip, public_ip and a unique name for
--                     every entry, so machines WITHOUT a private IP are left out here.
--                     The dashboard refuses to sync a Kamailio that has such machines
--                     mapped (the API's full-list semantics would otherwise remove
--                     them from the dispatcher). Machines without a name are sent as
--                     "asterisk-<id>".
-- Unknown Kamailio IP => both arrays empty (the API rejects empty arrays, and so
-- does the dashboard before calling it).
--
-- Only the two keys the API accepts are returned, so the result can be sent
-- as the request body unchanged.

CREATE OR REPLACE FUNCTION public.get_kamailio_ips(
	p_kamailio_ip inet)
    RETURNS jsonb
    LANGUAGE 'sql'
    COST 100
    STABLE PARALLEL UNSAFE
AS $BODY$
    SELECT jsonb_build_object(
        'vicidial_ips', COALESCE((
            SELECT jsonb_agg(host(d.ip) ORDER BY d.ip)
            FROM (
                SELECT DISTINCT ci.ip
                FROM kamailio_config k
                JOIN kamailio_client_ip_map m ON m.kamailio_id = k.id
                JOIN client_ips ci            ON ci.id = m.client_ip_id
                WHERE k.ip = p_kamailio_ip
            ) d
        ), '[]'::jsonb),
        'asterisk_servers', COALESCE((
            SELECT jsonb_agg(
                       jsonb_build_object(
                           'private_ip', host(a.private_ip),
                           'public_ip',  host(a.ip),
                           'name',       COALESCE(NULLIF(btrim(a.name), ''), 'asterisk-' || a.id)
                       )
                       ORDER BY a.ip
                   )
            FROM kamailio_config k
            JOIN kamailio_asterisk_map m ON m.kamailio_id = k.id
            JOIN asterisk_machines a     ON a.id = m.asterisk_id
            WHERE k.ip = p_kamailio_ip
              AND a.private_ip IS NOT NULL
        ), '[]'::jsonb)
    );
$BODY$;

ALTER FUNCTION public.get_kamailio_ips(inet)
    OWNER TO bilal_super_user;

-- The dashboard calls this function as the app role.
GRANT EXECUTE ON FUNCTION public.get_kamailio_ips(inet) TO myuser;
