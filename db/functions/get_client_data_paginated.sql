-- FUNCTION: public.get_client_data_paginated(bigint, timestamp with time zone, timestamp with time zone, text, integer, text, integer, integer)

-- Drop the previous 8-arg signature first: adding p_user_id (9th) would
-- otherwise create a SECOND overload and make existing 8-arg calls ambiguous.
DROP FUNCTION IF EXISTS public.get_client_data_paginated(bigint, timestamp with time zone, timestamp with time zone, text, integer, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_client_data_paginated(
	p_client_id bigint,
	p_start_date timestamp with time zone,
	p_end_date timestamp with time zone,
	p_caller_id text DEFAULT NULL::text,
	p_call_id integer DEFAULT NULL::integer,
	p_search_term text DEFAULT NULL::text,
	p_page_number integer DEFAULT 1,
	p_page_size integer DEFAULT 10,
	p_user_id text DEFAULT NULL::text)
    RETURNS jsonb
    LANGUAGE 'plpgsql'
    COST 100
    STABLE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_offset integer;
    v_total_records bigint;
    v_total_pages bigint;
    v_data jsonb;
    v_search text;
BEGIN
    -- Sanitize pagination
    p_page_number := GREATEST(p_page_number, 1);
    p_page_size   := LEAST(GREATEST(p_page_size, 1), 100000);
    v_offset      := (p_page_number - 1) * p_page_size;

    -- Prepare search pattern for global search
    v_search := '%' || p_search_term || '%';

    -- 1. Get total count
    SELECT COUNT(*)
    INTO v_total_records
    FROM calls t
    WHERE (p_client_id IS NULL OR t.client_id = p_client_id)
      AND t.disposition IS NOT NULL
      AND t.agent IS NOT NULL
      -- If specific search is active, ignore dates. Otherwise, respect them.
      AND (
          (p_caller_id IS NOT NULL OR p_call_id IS NOT NULL OR p_user_id IS NOT NULL)
          OR (t.created_at >= p_start_date AND t.created_at < p_end_date)
      )
      -- Specific filters
      AND (p_caller_id IS NULL OR t.caller_id = p_caller_id)
      AND (p_call_id IS NULL OR t.call_id = p_call_id)
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
      -- Global search filter
      AND (p_search_term IS NULL OR (
          t.caller_id ILIKE v_search OR
          t.user_id ILIKE v_search OR
          t.call_id::text ILIKE v_search OR
          t.disposition ILIKE v_search OR
          t.label ILIKE v_search OR
          t.agent ILIKE v_search OR
          t.transcription ILIKE v_search
      ));

    -- 2. Fetch paginated data
    WITH paged_calls AS (
        SELECT t.* FROM calls t
        WHERE (p_client_id IS NULL OR t.client_id = p_client_id)
          AND t.disposition IS NOT NULL
          AND t.agent IS NOT NULL
          AND (
              (p_caller_id IS NOT NULL OR p_call_id IS NOT NULL OR p_user_id IS NOT NULL)
              OR (t.created_at >= p_start_date AND t.created_at < p_end_date)
          )
          AND (p_caller_id IS NULL OR t.caller_id = p_caller_id)
          AND (p_call_id IS NULL OR t.call_id = p_call_id)
      AND (p_user_id IS NULL OR t.user_id = p_user_id)
          AND (p_search_term IS NULL OR (
              t.caller_id ILIKE v_search OR
              t.call_id::text ILIKE v_search OR
              t.disposition ILIKE v_search OR
              t.label ILIKE v_search OR
              t.agent ILIKE v_search OR
              t.transcription ILIKE v_search
          ))
        ORDER BY t.created_at DESC
        LIMIT p_page_size OFFSET v_offset
    ),
    -- ... rest of your existing JSON building logic ...,

    -- 3. Caller counts for the current page (per caller_id, within this client)
    caller_counts AS (
        SELECT caller_id, COUNT(*) AS caller_count
        FROM calls
        WHERE (p_client_id IS NULL OR client_id = p_client_id)
          AND caller_id IN (SELECT DISTINCT caller_id FROM paged_calls)
        GROUP BY caller_id
    ),

    -- 4. Caller counts across ALL clients (caller_id only, no client_id filter)
    caller_counts_all AS (
        SELECT caller_id, COUNT(*) AS caller_count_all
        FROM calls
        WHERE caller_id IN (SELECT DISTINCT caller_id FROM paged_calls)
        GROUP BY caller_id
    )

    SELECT jsonb_agg(
        jsonb_build_object(
            'call_id', p.call_id,
            'caller_id', p.caller_id,
            'user_id', p.user_id,
            'caller_count', COALESCE(cc.caller_count, 1),
            'caller_count_all', COALESCE(cca.caller_count_all, 1),
            'call_start_time', p.call_start_time,
            'call_end_time', p.call_end_time,
            'call_duration', p.call_duration,
            'call_recording_path', p.call_recording_path,
            'call_status', p.call_status,
            'agent', p.agent,
            'created_at', p.created_at,
            'call_unique_id', p.call_unique_id,
            'client_id', p.client_id,
            'version', p.version,
            'model', p.model,
            'transcription', p.transcription,
            'turn', p.turn,
            'label', p.label,
            'disposition', p.disposition
        ) ORDER BY p.created_at DESC
    )
    INTO v_data
    FROM paged_calls p
    LEFT JOIN caller_counts cc
           ON cc.caller_id = p.caller_id
    LEFT JOIN caller_counts_all cca
           ON cca.caller_id = p.caller_id;

    v_total_pages := CEIL(v_total_records::numeric / p_page_size)::bigint;

    RETURN jsonb_build_object(
        'meta', jsonb_build_object(
            'total_records', v_total_records,
            'current_page', p_page_number,
            'page_size', p_page_size,
            'total_pages', v_total_pages,
            'has_next_page', p_page_number < v_total_pages,
            'has_previous_page', p_page_number > 1
        ),
        'data', COALESCE(v_data, '[]'::jsonb)
    );
END;
$BODY$;

ALTER FUNCTION public.get_client_data_paginated(bigint, timestamp with time zone, timestamp with time zone, text, integer, text, integer, integer, text)
    OWNER TO bilal_super_user;
