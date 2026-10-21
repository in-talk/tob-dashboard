// Role definitions shared by the edge middleware, API guards and pages.
// Keep this file free of Node-only imports (pg, bcrypt) — middleware runs on
// the edge runtime and imports it.

export const ROLES = ["admin", "superAdmin", "user"] as const;
export type Role = (typeof ROLES)[number];

export const ADMIN: Role[] = ["admin"];
export const ADMIN_OR_SUPER: Role[] = ["admin", "superAdmin"];
export const ANY_ROLE: Role[] = ["admin", "superAdmin", "user"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Admins see every client; everyone else is limited to clients_by_users. */
export function isGlobalRole(role: string | undefined | null): boolean {
  return role === "admin";
}

/**
 * Page access by role, enforced in middleware (defense in depth — every page
 * also has a getServerSideProps guard). Anything not listed is admin-only.
 */
export const PAGE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/reports/interactions", roles: ["admin", "user"] },
  { prefix: "/audio-preview", roles: ["admin", "user"] },
  { prefix: "/audio-formatter", roles: ["admin", "superAdmin"] },
];

export function rolesForPage(pathname: string): Role[] {
  if (pathname === "/") return ["admin", "user"];
  const hit = PAGE_ROLES.find(
    (p) => pathname === p.prefix || pathname.startsWith(p.prefix + "/")
  );
  return hit ? hit.roles : ADMIN;
}
