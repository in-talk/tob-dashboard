export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  /** false = deactivated: can't sign in. Absent before migration 011. */
  is_active?: boolean;
  last_login_at?: string | null;
  /** Set while the account is locked after repeated wrong passwords. */
  locked_until?: string | null;
};

export function isLocked(user: Pick<User, "locked_until">): boolean {
  return !!user.locked_until && new Date(user.locked_until).getTime() > Date.now();
}
