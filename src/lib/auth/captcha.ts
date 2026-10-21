// Cloudflare Turnstile verification for the login form.
//
// The token is checked inside NextAuth's authorize(), so a script can't skip
// it by calling the login endpoint directly (the old reCAPTCHA check ran in
// a separate endpoint and could be bypassed).
//
// TURNSTILE_MODE:
//   "after_failures" (default when TURNSTILE_SECRET_KEY is set) — only after
//       a few failed attempts for an email/IP, or when the whole site is
//       seeing a burst of failures (credential stuffing across many emails).
//   "always"  — every sign-in.
//   "off"     — disabled (also the default when no secret key is set).

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EXPECTED_ACTION = "login";

export type CaptchaMode = "off" | "after_failures" | "always";

export function captchaMode(): CaptchaMode {
  if (!process.env.TURNSTILE_SECRET_KEY) return "off";
  const m = process.env.TURNSTILE_MODE;
  return m === "always" || m === "off" ? m : "after_failures";
}

/** Failed attempts (per email, in the rate-limit window) before a captcha is required. */
export const CAPTCHA_AFTER_EMAIL_FAILURES = 3;
/** Same, per client IP (only known when TRUST_PROXY=true). */
export const CAPTCHA_AFTER_IP_FAILURES = 5;
/** Site-wide failed logins within GLOBAL_WINDOW_MS that switch on captcha for everyone. */
export const CAPTCHA_GLOBAL_FAILURES = 30;
export const GLOBAL_WINDOW_MS = 5 * 60 * 1000;

export async function verifyCaptcha(token: unknown, ip: string): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "not-configured" };
  if (typeof token !== "string" || !token || token.length > 2048) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };
    if (!data.success) return { ok: false, reason: (data["error-codes"] ?? []).join(",") || "rejected" };
    // Test keys return no action; real widgets return the one we set.
    if (data.action && data.action !== EXPECTED_ACTION) return { ok: false, reason: "wrong-action" };
    return { ok: true };
  } catch (err) {
    // Fail closed: if Cloudflare can't be reached, a login that needs a
    // captcha is refused rather than waved through.
    console.error("[captcha] verification failed:", (err as Error).message);
    return { ok: false, reason: "verify-unreachable" };
  }
}
