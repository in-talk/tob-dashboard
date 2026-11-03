export const PROVIDERS = ["gcp", "aws"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<Provider, string> = {
  gcp: "GCP",
  aws: "AWS",
};

export type Audit = {
  id: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type KamailioConfig = Audit & { ip: string; provider: Provider };

export type AsteriskMachine = Audit & {
  name: string | null;
  /** Public IP. */
  ip: string;
  private_ip: string | null;
  provider: Provider;
};

export type ClientIp = Audit & {
  client_id: string | null;
  client_name: string | null;
  ip: string;
  provider: Provider | null;
};

export type KamailioClientIpMap = Audit & {
  kamailio_id: string;
  kamailio_ip: string;
  client_ip_id: string;
  client_ip: string;
  client_id: string | null;
  client_name: string | null;
};

export type KamailioAsteriskMap = Audit & {
  kamailio_id: string;
  kamailio_ip: string;
  asterisk_id: string;
  asterisk_name: string | null;
  asterisk_ip: string;
  asterisk_private_ip: string | null;
  asterisk_provider: Provider;
};

export type ClientOption = { client_id: string; name: string };

/** One configured GCP firewall rule's diff against client_ips. */
export type FirewallSyncPlan = {
  /** "project/rule" — as configured in GCP_FIREWALL_RULES. */
  key: string;
  project_id: string;
  rule_name: string;
  /** INGRESS syncs sourceRanges; EGRESS syncs destinationRanges. */
  direction?: "INGRESS" | "EGRESS";
  network?: string;
  disabled?: boolean;
  /** Full IP-range list the rule will hold after syncing. */
  desired: string[];
  to_add: string[];
  to_remove: string[];
  unchanged: number;
  /** Safety stop — the rule is readable but must not be synced as-is. */
  blocked?: string;
  /** Could not read or update the rule. */
  error?: string;
  /** Set by apply. */
  applied?: boolean;
  result?: string;
};

/** Outcome of calling /sync-audios on one Asterisk machine. */
export type AudioSyncResult = {
  id: string;
  name: string | null;
  ip: string;
  success: boolean;
  message: string;
  logs: string[];
  duration_ms: number;
};

/** Outcome of /invalidate-cache on one Asterisk machine. */
export type CacheInvalidateResult = {
  id: string;
  name: string | null;
  ip: string;
  success: boolean;
  /** The machine's own reply message, or why the call failed. */
  message: string;
  duration_ms: number;
};

/** Body sent to a Kamailio's Sync API (POST /api/v1/sync), built by get_kamailio_ips(). */
export type KamailioSyncPayload = {
  vicidial_ips: string[];
  asterisk_servers: { private_ip: string; public_ip: string; name: string }[];
};

/** What would be sent to one Kamailio, plus anything that blocks syncing it. */
export type KamailioSyncPreview = {
  id: string;
  ip: string;
  provider: Provider;
  payload: KamailioSyncPayload | null;
  /** Reasons this Kamailio can't be synced right now (empty = ready). */
  problems: string[];
};

/** Outcome of syncing one Kamailio. */
export type KamailioSyncResult = {
  id: string;
  ip: string;
  /** success = HTTP 200; partial = HTTP 207 (DB updated, runtime reload failed). */
  status: "success" | "partial" | "failed" | "skipped";
  http_status: number | null;
  /** The API's machine-readable code, e.g. VALIDATION_ERROR. */
  code: string | null;
  message: string;
  /** Kamailio's request id — give this to the Kamailio admin when something fails. */
  request_id: string | null;
  /** The API's `data` object (added/removed/unchanged/skipped, runtime_reload, ...). */
  data: Record<string, unknown> | null;
  sent: { vicidial_ips: number; asterisk_servers: number };
  duration_ms: number;
};
