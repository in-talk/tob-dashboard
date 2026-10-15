-- Generic per-client feature flags.
--
-- Stored as a JSON object of {flag_key: boolean}, e.g. {"AEP": true}.
-- Managed from the dashboard (FEATURE_FLAGS registry / Create-Update Client
-- form), forwarded by node-agi in the ws `data.feature_flags`, and read by
-- ai-voice-bot via CallState.has_flag("<KEY>").
--
-- Adding a NEW flag later needs NO further migration: add a registry entry in
-- the dashboard and a has_flag() check in ai-voice-bot.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill any pre-existing NULLs (no-op given the NOT NULL DEFAULT above, kept
-- for safety if the column was added without a default in an earlier attempt).
UPDATE clients SET feature_flags = '{}'::jsonb WHERE feature_flags IS NULL;
