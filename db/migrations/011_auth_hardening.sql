-- 011: authentication hardening.
--
-- The dashboard code detects these columns/tables at runtime, so it works
-- before this runs — but until it does, sessions can't be revoked and
-- accounts can't be locked or disabled. Safe to re-run (IF NOT EXISTS).

BEGIN;

-- Session revocation + account state on users ---------------------------------
ALTER TABLE users
  -- Bumped on password change, role/email change or deactivation; every
  -- session token carries the value from sign-in, and a mismatch logs it out.
  ADD COLUMN IF NOT EXISTS token_version       integer     NOT NULL DEFAULT 0,
  -- false = can't sign in, existing sessions die within ~30 s.
  ADD COLUMN IF NOT EXISTS is_active           boolean     NOT NULL DEFAULT true,
  -- Brute-force lockout: 5 bad passwords -> 15 min lock, doubling to 24 h max.
  ADD COLUMN IF NOT EXISTS failed_login_count  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until        timestamptz NULL,
  ADD COLUMN IF NOT EXISTS last_login_at       timestamptz NULL,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz NULL;

-- Audit trail ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id          bigserial   PRIMARY KEY,
  event       text        NOT NULL,   -- login_success, login_failure, user_updated, access_denied, ...
  user_id     text        NULL,       -- text, not FK: rows must survive user deletion
  email       text        NULL,
  ip          text        NULL,
  user_agent  text        NULL,
  details     jsonb       NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_audit_log_created_at_idx ON auth_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_log_user_idx       ON auth_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_log_event_idx      ON auth_audit_log (event, created_at DESC);

-- Client scoping looks up a user's clients on every dashboard request.
CREATE INDEX IF NOT EXISTS clients_by_users_user_id_idx ON clients_by_users (user_id);

-- The app may write and read audit rows but not alter or delete them.
GRANT SELECT, INSERT ON TABLE auth_audit_log TO myuser;
GRANT USAGE, SELECT ON SEQUENCE auth_audit_log_id_seq TO myuser;

COMMIT;

-- Optional, run separately (outside a transaction) -------------------------
-- 1) Recording playback checks (call_id, call_recording_path, client_id) on
--    calls. If calls.call_id isn't indexed already:
--      CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_call_id_idx ON calls (call_id);
--
-- 2) Enforce one account per email (check for duplicates first):
--      SELECT lower(email), count(*) FROM users GROUP BY 1 HAVING count(*) > 1;
--      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_lower_uq ON users (lower(email));
--
-- 3) Retention, e.g. monthly from cron:
--      DELETE FROM auth_audit_log WHERE created_at < now() - interval '1 year';
