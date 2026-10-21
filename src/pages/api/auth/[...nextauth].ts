import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth/password";
import { clientIp, hit, peek, reset } from "@/lib/auth/rateLimit";
import {
  CAPTCHA_AFTER_EMAIL_FAILURES,
  CAPTCHA_AFTER_IP_FAILURES,
  CAPTCHA_GLOBAL_FAILURES,
  captchaMode,
  GLOBAL_WINDOW_MS,
  verifyCaptcha,
} from "@/lib/auth/captcha";
import {
  audit,
  findUserByEmail,
  isLocked,
  loadAuthState,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth/state";

// Idle timeout: the cookie is re-issued on each authenticated request, so a
// session dies after this long without activity.
const IDLE_MAX_AGE_SEC = 12 * 60 * 60;
// Absolute lifetime: re-login required this long after sign-in regardless.
const ABSOLUTE_MAX_AGE_SEC = 24 * 60 * 60;

const IP_LIMIT = 20; // attempts per IP per window
const EMAIL_LIMIT = 10; // attempts per email per window (existing or not)
const WINDOW_MS = 15 * 60 * 1000;

/** Error code the sign-in page maps to a "try again later" message. */
export const TOO_MANY_ATTEMPTS = "TooManyAttempts";
/** The sign-in page shows the Turnstile widget when it gets this. */
export const CAPTCHA_REQUIRED = "CaptchaRequired";
export const CAPTCHA_FAILED = "CaptchaFailed";

const GLOBAL_FAIL_KEY = "login:fail:global";
/** Count a failed login site-wide (drives captcha during credential stuffing). */
function noteFailure() {
  hit(GLOBAL_FAIL_KEY, Number.MAX_SAFE_INTEGER, GLOBAL_WINDOW_MS);
}

class SessionRejected extends Error {}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha", type: "text" },
      },
      async authorize(credentials, req) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        const headers = req?.headers as Record<string, string | string[] | undefined> | undefined;
        const ip = clientIp(headers);
        const userAgent = typeof headers?.["user-agent"] === "string" ? headers["user-agent"] : null;

        if (!email || !password || email.length > 254 || password.length > 1024) return null;

        // NextAuth doesn't expose the socket address here, so the IP is only
        // known behind a trusted proxy (TRUST_PROXY=true). Without it, skip the
        // per-IP limit rather than lump every visitor into one bucket.
        const ipHit = ip === "unknown" ? { ok: true, count: 0 } : hit(`login:ip:${ip}`, IP_LIMIT, WINDOW_MS);
        const emailHit = hit(`login:email:${email}`, EMAIL_LIMIT, WINDOW_MS);
        if (!ipHit.ok || !emailHit.ok) {
          await audit("login_rate_limited", { email, ip, userAgent });
          throw new Error(TOO_MANY_ATTEMPTS);
        }

        // Turnstile: required always, or once this email/IP has a few failures,
        // or while the whole site is seeing a burst of failed logins.
        const mode = captchaMode();
        if (mode !== "off") {
          const needsCaptcha =
            mode === "always" ||
            emailHit.count > CAPTCHA_AFTER_EMAIL_FAILURES ||
            ipHit.count > CAPTCHA_AFTER_IP_FAILURES ||
            peek(GLOBAL_FAIL_KEY) >= CAPTCHA_GLOBAL_FAILURES;
          if (needsCaptcha) {
            const token = credentials?.captchaToken;
            if (!token) throw new Error(CAPTCHA_REQUIRED);
            const check = await verifyCaptcha(token, ip);
            if (!check.ok) {
              noteFailure();
              await audit("captcha_failed", { email, ip, userAgent, details: { reason: check.reason } });
              throw new Error(CAPTCHA_FAILED);
            }
          }
        }

        try {
          const user = await findUserByEmail(email);
          // Always run bcrypt, even for unknown emails, so timing doesn't
          // reveal which accounts exist.
          const valid = await verifyPassword(password, user?.password);

          if (!user || !user.is_active) {
            noteFailure();
            await audit("login_failure", { email, ip, userAgent, details: { reason: user ? "inactive" : "unknown_email" } });
            return null;
          }
          if (isLocked(user)) {
            // Same response as a bad password: don't confirm the account exists.
            noteFailure();
            await audit("login_locked", { userId: user.id, email, ip, userAgent });
            return null;
          }
          if (!valid) {
            noteFailure();
            await recordFailedLogin(user);
            await audit("login_failure", { userId: user.id, email, ip, userAgent, details: { reason: "bad_password" } });
            return null;
          }

          await recordSuccessfulLogin(user);
          reset(`login:email:${email}`);
          await audit("login_success", { userId: user.id, email, ip, userAgent });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            client_id: user.client_id,
            token_version: user.token_version,
          };
        } catch (error) {
          console.error("[auth] authorize error:", (error as Error).message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.client_id = user.client_id;
        token.tv = user.token_version;
        token.auth_time = now;
        return token;
      }

      // Tokens issued before this hardening (no auth_time) are rejected,
      // which signs everyone out once on deploy.
      if (!token.id || typeof token.auth_time !== "number") {
        throw new SessionRejected("legacy token");
      }
      if (now - token.auth_time > ABSOLUTE_MAX_AGE_SEC) {
        throw new SessionRejected("absolute lifetime exceeded");
      }

      // Re-check the account on every use (cached ~30 s): deleted, disabled
      // or password/role-changed accounts lose their sessions.
      const state = await loadAuthState(String(token.id));
      if (!state || !state.is_active || state.token_version !== Number(token.tv ?? 0)) {
        await audit("session_revoked", { userId: String(token.id), email: token.email ?? null });
        throw new SessionRejected("revoked");
      }

      token.role = state.role;
      token.client_id = state.client_id;
      token.name = state.name;
      token.email = state.email;
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: String(token.id),
        name: token.name ?? "",
        email: token.email ?? "",
        role: String(token.role),
        client_id: token.client_id as number,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: IDLE_MAX_AGE_SEC,
  },
  jwt: {
    maxAge: IDLE_MAX_AGE_SEC,
  },
  // Never enable in production: it logs tokens and session contents.
  debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",
  pages: {
    signIn: "/signin",
    error: "/unauthorize",
  },
};

export default NextAuth(authOptions);
