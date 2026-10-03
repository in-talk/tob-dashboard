// Server-only: thin client for the Compute Engine firewall REST API.
//
// Credentials, in order:
//   1. GCP_FIREWALL_SA_KEY — service-account key JSON (raw or base64)
//   2. Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, or the
//      VM/Cloud Run metadata server when the dashboard runs on GCP)
// The account needs, on each project: compute.firewalls.get,
// compute.firewalls.update, compute.networks.updatePolicy (required by GCP for
// any firewall-rule change) and compute.globalOperations.get. Grant them via a
// custom role rather than roles/compute.securityAdmin.

import { GoogleAuth } from "google-auth-library";

const COMPUTE = "https://compute.googleapis.com/compute/v1";
const SCOPES = ["https://www.googleapis.com/auth/compute"];

export type GcpFirewall = {
  name: string;
  network: string;
  direction: "INGRESS" | "EGRESS";
  disabled?: boolean;
  sourceRanges?: string[];
  destinationRanges?: string[];
  sourceTags?: string[];
  sourceServiceAccounts?: string[];
};

type Operation = {
  name: string;
  status: "PENDING" | "RUNNING" | "DONE";
  error?: { errors?: { code: string; message: string }[] };
};

export class GcpError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

let auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (auth) return auth;
  const raw = process.env.GCP_FIREWALL_SA_KEY?.trim();
  if (raw) {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    auth = new GoogleAuth({ credentials: JSON.parse(json), scopes: SCOPES });
  } else {
    auth = new GoogleAuth({ scopes: SCOPES });
  }
  return auth;
}

async function request<T>(method: "GET" | "PATCH" | "POST", url: string, data?: unknown): Promise<T> {
  let client;
  try {
    client = await getAuth().getClient();
  } catch {
    throw new GcpError(
      "GCP credentials are not configured — set GCP_FIREWALL_SA_KEY (service-account JSON) on the server"
    );
  }
  try {
    const res = await client.request<T>({ method, url, data });
    return res.data;
  } catch (err) {
    const e = err as { response?: { status?: number; data?: { error?: { message?: string } } }; message?: string };
    const status = e.response?.status;
    const detail = e.response?.data?.error?.message ?? e.message ?? "Unknown GCP error";
    if (status === 404) throw new GcpError("Firewall rule not found in GCP", 404);
    if (status === 403) throw new GcpError(`Permission denied by GCP: ${detail}`, 403);
    throw new GcpError(detail, status);
  }
}

const firewallUrl = (project: string, rule: string) =>
  `${COMPUTE}/projects/${encodeURIComponent(project)}/global/firewalls/${encodeURIComponent(rule)}`;

export function getFirewall(project: string, rule: string): Promise<GcpFirewall> {
  return request<GcpFirewall>("GET", firewallUrl(project, rule));
}

/** The rule's IP list: sources for INGRESS rules, destinations for EGRESS. */
export const rangeField = (direction: GcpFirewall["direction"]) =>
  direction === "EGRESS" ? "destinationRanges" : "sourceRanges";

/** Replace a rule's IP list and wait for the operation to finish. */
export async function setFirewallRanges(
  project: string,
  rule: string,
  direction: GcpFirewall["direction"],
  ranges: string[]
) {
  let op = await request<Operation>("PATCH", firewallUrl(project, rule), {
    [rangeField(direction)]: ranges,
  });
  // operations.wait returns when DONE or after ~2 minutes; retry a few times.
  for (let i = 0; op.status !== "DONE" && i < 3; i++) {
    op = await request<Operation>(
      "POST",
      `${COMPUTE}/projects/${encodeURIComponent(project)}/global/operations/${op.name}/wait`
    );
  }
  if (op.status !== "DONE") throw new GcpError("Timed out waiting for GCP to apply the change");
  const errors = op.error?.errors;
  if (errors?.length) throw new GcpError(errors.map((e) => e.message).join("; "));
}
