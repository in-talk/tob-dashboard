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
 *
 * Default-ON flags: set `defaultValue: true` here AND check it in ai-voice-bot
 * with `has_flag("<KEY>", default=True)`. A client row that has never stored
 * the key is then treated as ON on both sides; only an explicit `false`
 * (unticking the checkbox and saving) turns it off.
 */
export type FeatureFlagKey = "MC_AEP" | "PITCH_CET";

export type FeatureFlagDef = {
  /** Stored key — must match the ai-voice-bot has_flag("<KEY>") check exactly. */
  key: FeatureFlagKey;
  /** Human label shown next to the checkbox. */
  label: string;
  /** Optional one-line help shown under the checkbox. */
  description?: string;
  /**
   * Value used when the client has never stored this key. Defaults to false.
   * Must match the `default=` passed to has_flag() in ai-voice-bot.
   */
  defaultValue?: boolean;
};

export const FEATURE_FLAGS: FeatureFlagDef[] = [
  {
    key: "MC_AEP",
    label: "MC_AEP",
    description:
      "Medicare: handle the post-pitch ack via the AEP branch instead of the model-based PQ1 split.",
  },
  {
    key: "PITCH_CET",
    label: "PITCH_CET",
    description:
      "FE V2 + Medicare: randomly play CET pitches (card/email/text). Off = always play the base P pitch.",
    defaultValue: true,
  },
];

export type FeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

/**
 * Normalise any stored value into a clean {KEY: boolean} map of known flags.
 * A key that is absent falls back to the flag's `defaultValue` (false if unset).
 */
export function normaliseFeatureFlags(raw: unknown): FeatureFlags {
  const out: FeatureFlags = {};
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  for (const def of FEATURE_FLAGS) {
    out[def.key] =
      obj[def.key] === undefined || obj[def.key] === null
        ? Boolean(def.defaultValue)
        : Boolean(obj[def.key]);
  }
  return out;
}
