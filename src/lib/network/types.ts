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

export type AsteriskMachine = Audit & { ip: string; provider: Provider };

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
  asterisk_ip: string;
  asterisk_provider: Provider;
};

export type ClientOption = { client_id: string; name: string };

export const FIREWALL_SCOPES = ["all_clients", "client", "kamailio"] as const;
export type FirewallScope = (typeof FIREWALL_SCOPES)[number];

export const FIREWALL_SCOPE_LABELS: Record<FirewallScope, string> = {
  all_clients: "All client IPs",
  client: "One client's IPs",
  kamailio: "Client IPs mapped to a Kamailio",
};

export type FirewallRule = Audit & {
  project_id: string;
  rule_name: string;
  scope: FirewallScope;
  client_id: string | null;
  client_name: string | null;
  kamailio_id: string | null;
  kamailio_ip: string | null;
  static_ranges: string[];
  last_synced_at: string | null;
  last_synced_by: string | null;
  last_sync_status: "ok" | "error" | null;
  last_sync_message: string | null;
};

export type FirewallSyncPlan = {
  id: string;
  project_id: string;
  rule_name: string;
  scope_label: string;
  network?: string;
  disabled?: boolean;
  /** Full source-range list the rule will hold after syncing. */
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
