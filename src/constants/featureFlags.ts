/**
 * Per-client feature-flag registry.
 *
 * This is the SINGLE place where the set of client feature flags is defined.
 * Each entry renders a checkbox in the Create/Update Client form, and the
 * selected flags are stored on the client as a JSON object
 * (`clients.feature_flags`, e.g. {"AEP": true}).
 *
 * The flag VALUE is managed here from the dashboard; the flag BEHAVIOUR lives
 * in code (ai-voice-bot `campaign_handler.py`, gated on
 * `call_state.has_flag("<KEY>")`). node-agi forwards the JSON as-is.
 *
 * To add a new flag:
 *   1. Add an entry below (key must match the code's has_flag("<KEY>") check).
 *   2. Add the `has_flag("<KEY>")` logic in ai-voice-bot.
 * No DB migration or API change is needed to introduce a new flag.
 */
export type FeatureFlagKey = "MC_AEP";

export type FeatureFlagDef = {
  /** Stored key — must match the ai-voice-bot has_flag("<KEY>") check exactly. */
  key: FeatureFlagKey;
  /** Human label shown next to the checkbox. */
  label: string;
  /** Optional one-line help shown under the checkbox. */
  description?: string;
};

export const FEATURE_FLAGS: FeatureFlagDef[] = [
  {
    key: "MC_AEP",
    label: "MC_AEP",
    description:
      "Medicare: handle the post-pitch ack via the AEP branch instead of the model-based PQ1 split.",
  },
];

export type FeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

/** Normalise any stored value into a clean {KEY: boolean} map of known flags. */
export function normaliseFeatureFlags(raw: unknown): FeatureFlags {
  const out: FeatureFlags = {};
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const def of FEATURE_FLAGS) {
    out[def.key] = Boolean(obj[def.key]);
  }
  return out;
}
