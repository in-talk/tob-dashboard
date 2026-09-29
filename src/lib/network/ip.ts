// Isomorphic IP helpers — used by forms (client-side validation) and API
// routes (server-side validation) so both layers agree on what is valid.

const IPV4_RE =
  /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
const HEX_GROUP_RE = /^[0-9a-f]{1,4}$/i;

export function isIPv4(value: string): boolean {
  return IPV4_RE.test(value);
}

export function isIPv6(value: string): boolean {
  if (!value.includes(":")) return false;

  let groups = 8;
  let head = value;
  // Trailing embedded IPv4 (e.g. ::ffff:10.0.0.1) takes the room of 2 groups.
  const lastColon = value.lastIndexOf(":");
  const tail = value.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (!isIPv4(tail)) return false;
    head = value.slice(0, lastColon + 1) + "0"; // placeholder group
    groups = 7;
  }

  const parts = head.split("::");
  if (parts.length > 2) return false;

  const split = (s: string) => (s === "" ? [] : s.split(":"));
  const left = split(parts[0]);
  const right = parts.length === 2 ? split(parts[1]) : [];
  if (![...left, ...right].every((g) => HEX_GROUP_RE.test(g))) return false;

  const count = left.length + right.length;
  return parts.length === 2 ? count < groups : count === groups;
}

export function isValidIp(value: string): boolean {
  const v = value.trim();
  return isIPv4(v) || isIPv6(v);
}

/** Canonical form used for duplicate detection (lower-case IPv6). */
export function normalizeIp(value: string): string {
  return value.trim().toLowerCase();
}

export type ParsedIpList = { valid: string[]; invalid: string[] };

/** Parse a comma-separated IP list: trims, drops blanks, de-duplicates. */
export function parseIpList(input: string | null | undefined): ParsedIpList {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of (input ?? "").split(",")) {
    const ip = normalizeIp(raw);
    if (!ip || seen.has(ip)) continue;
    seen.add(ip);
    (isValidIp(ip) ? valid : invalid).push(ip);
  }
  return { valid, invalid };
}

/**
 * Single IP or CIDR range (e.g. 203.0.113.0/24). /0 is rejected: in a
 * firewall allow-list it would whitelist the whole internet.
 */
export function isValidCidr(value: string): boolean {
  const [ip, prefix, ...rest] = value.trim().split("/");
  if (rest.length || !isValidIp(ip)) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  const bits = Number(prefix);
  return bits >= 1 && bits <= (isIPv4(ip) ? 32 : 128);
}

/** Parse a comma/newline-separated CIDR list: trims, drops blanks, de-duplicates. */
export function parseCidrList(input: string | null | undefined): ParsedIpList {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const raw of (input ?? "").split(/[,\n]/)) {
    const v = raw.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    (isValidCidr(v) ? valid : invalid).push(v);
  }
  return { valid, invalid };
}
