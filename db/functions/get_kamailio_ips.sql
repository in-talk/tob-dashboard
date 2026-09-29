-- FUNCTION: public.get_kamailio_ips(inet)
--
-- Given a Kamailio server IP, returns the Asterisk IPs it routes to and the
-- client IPs it accepts, e.g.
--   SELECT get_kamailio_ips('10.0.0.1');
--   => {"kamailio_ip": "10.0.0.1",
--       "asterisk_ips": ["10.1.0.1", "10.1.0.2"],
--       "client_ips":   ["34.1.2.3", "34.1.2.4"]}
-- Unknown Kamailio IP => both arrays empty.

CREATE OR REPLACE FUNCTION public.get_kamailio_ips(p_kamailio_ip inet)
    RETURNS jsonb
    LANGUAGE sql
    STABLE
AS $BODY$
    SELECT jsonb_build_object(
        'kamailio_ip', host(p_kamailio_ip),
        'asterisk_ips', COALESCE((
            SELECT jsonb_agg(host(a.ip) ORDER BY a.ip)
            FROM kamailio_config k
            JOIN kamailio_asterisk_map m ON m.kamailio_id = k.id
            JOIN asterisk_machines a     ON a.id = m.asterisk_id
            WHERE k.ip = p_kamailio_ip
        ), '[]'::jsonb),
        -- DISTINCT: the same IP can be registered under more than one client.
        'client_ips', COALESCE((
            SELECT jsonb_agg(host(ip) ORDER BY ip)
            FROM (
                SELECT DISTINCT ci.ip
                FROM kamailio_config k
                JOIN kamailio_client_ip_map m ON m.kamailio_id = k.id
                JOIN client_ips ci            ON ci.id = m.client_ip_id
                WHERE k.ip = p_kamailio_ip
            ) d
        ), '[]'::jsonb)
    );
$BODY$;
