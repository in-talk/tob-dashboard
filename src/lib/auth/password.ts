import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;
export const PASSWORD_MIN = 12;
// bcrypt only uses the first 72 bytes; reject longer so nothing is silently ignored.
const PASSWORD_MAX_BYTES = 72;

const COMMON = new Set([
  "password", "password1", "password123", "123456789012", "qwertyuiop12",
  "welcome12345", "admin1234567", "iloveyou1234", "letmein12345", "changeme1234",
]);

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(password: unknown, email?: string): string | null {
  if (typeof password !== "string") return "Password is required";
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) return "Password is too long (max 72 bytes)";
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (classes < 3) return "Password must mix at least 3 of: lowercase, uppercase, digits, symbols";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "Password is too common";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Password must not contain your email name";
  return null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Pre-computed hash compared against when the email doesn't exist, so a
// missing account takes as long to reject as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_COST);

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
