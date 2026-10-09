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
