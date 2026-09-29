import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DataGrid, DataGridColumn } from "@/components/network/DataGrid";
import { Field, FormDrawer } from "@/components/network/FormDrawer";
import { SearchableSelect, SelectOption } from "@/components/network/SearchableSelect";
import { FirewallSyncDialog } from "@/components/network/FirewallSyncDialog";
import { NetworkPage, RowActions, auditColumns, formatTimestamp } from "@/components/network/shared";
import { useCrudResource } from "@/components/network/useCrudResource";
import { parseCidrList } from "@/lib/network/ip";
import {
  ClientOption,
  FIREWALL_SCOPES,
  FIREWALL_SCOPE_LABELS,
  FirewallRule,
  FirewallScope,
  KamailioConfig,
  PROVIDER_LABELS,
} from "@/lib/network/types";

const SWR_OPTS = { revalidateOnFocus: false };
const PROJECT_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const RULE_RE = /^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/;

type FormState = {
  project_id: string;
  rule_name: string;
  scope: FirewallScope;
  client_id: string | null;
  kamailio_id: string | null;
  static_ranges: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  project_id: "",
  rule_name: "",
  scope: "all_clients",
  client_id: null,
  kamailio_id: null,
  static_ranges: "",
};

function describeScope(r: FirewallRule): string {
  if (r.scope === "client") return `Client: ${r.client_name ?? r.client_id}`;
  if (r.scope === "kamailio") return `IPs mapped to Kamailio ${r.kamailio_ip ?? r.kamailio_id}`;
  return FIREWALL_SCOPE_LABELS.all_clients;
}

export default function FirewallRulesPage() {
  const { rows, isLoading, error, create, update, remove } = useCrudResource<FirewallRule>(
    "/api/network/firewall-rules"
  );
  const { data: clients } = useSWR<ClientOption[]>("/api/network/client-options", fetcher, SWR_OPTS);
  const { data: kamailios } = useSWR<KamailioConfig[]>("/api/network/kamailio", fetcher, SWR_OPTS);

  const [editing, setEditing] = useState<FirewallRule | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sync, setSync] = useState<{ open: boolean; ruleId?: string }>({ open: false });

  const clientOptions: SelectOption[] = useMemo(
    () => (clients ?? []).map((c) => ({ value: c.client_id, label: c.name, description: `#${c.client_id}` })),
    [clients]
  );
  const kamailioOptions: SelectOption[] = useMemo(
    () =>
      (kamailios ?? []).map((k) => ({ value: k.id, label: k.ip, description: PROVIDER_LABELS[k.provider] })),
    [kamailios]
  );

  const openDrawer = (row: FirewallRule | null) => {
    setEditing(row);
    setForm(
      row
        ? {
            project_id: row.project_id,
            rule_name: row.rule_name,
            scope: row.scope,
            client_id: row.client_id,
            kamailio_id: row.kamailio_id,
            static_ranges: row.static_ranges.join(", "),
          }
        : // Default the project to the one used most recently.
          { ...EMPTY, project_id: rows[0]?.project_id ?? "" }
    );
    setErrors({});
    setDrawerOpen(true);
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const project = form.project_id.trim();
    const rule = form.rule_name.trim();
    if (!PROJECT_RE.test(project)) next.project_id = "Enter a valid GCP project ID, e.g. intalk-prod";
    if (!RULE_RE.test(rule)) next.rule_name = "Lower-case letters, digits and hyphens; must start with a letter";
    else if (rows.some((r) => r.project_id === project && r.rule_name === rule && r.id !== editing?.id))
      next.rule_name = "This rule is already registered";
    if (form.scope === "client" && !form.client_id) next.client_id = "Select a client";
    if (form.scope === "kamailio" && !form.kamailio_id) next.kamailio_id = "Select a Kamailio server";
    const { invalid } = parseCidrList(form.static_ranges);
    if (invalid.length) next.static_ranges = `Invalid range(s): ${invalid.join(", ")}`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return false;
    const body = {
      project_id: form.project_id.trim(),
      rule_name: form.rule_name.trim(),
      scope: form.scope,
      client_id: form.scope === "client" ? form.client_id : null,
      kamailio_id: form.scope === "kamailio" ? form.kamailio_id : null,
      static_ranges: form.static_ranges,
    };
    return editing ? update({ id: editing.id, ...body }) : create(body);
  };

  const columns: DataGridColumn<FirewallRule>[] = [
    {
      key: "rule",
      header: "Firewall rule",
      sortValue: (r) => `${r.project_id}/${r.rule_name}`,
      render: (r) => (
        <div>
          <div className="font-mono text-sm font-medium">{r.rule_name}</div>
          <div className="text-xs text-muted-foreground">{r.project_id}</div>
        </div>
      ),
    },
    {
      key: "contents",
      header: "Whitelists",
      sortValue: (r) => describeScope(r),
      render: (r) => (
        <div className="text-sm">
          <div>{describeScope(r)}</div>
          {r.static_ranges.length > 0 && (
            <div className="text-xs text-muted-foreground" title={r.static_ranges.join(", ")}>
              + {r.static_ranges.length} fixed range(s)
            </div>
          )}
        </div>
      ),
    },
    {
      key: "last_sync",
      header: "Last sync",
      sortValue: (r) => r.last_synced_at,
      render: (r) =>
        r.last_synced_at ? (
          <div className="text-xs">
            <span
              className={
                r.last_sync_status === "ok" ? "font-medium text-green-600" : "font-medium text-red-600"
              }
            >
              {r.last_sync_status === "ok" ? "OK" : "Failed"}
            </span>{" "}
            <span className="text-muted-foreground">
              {formatTimestamp(r.last_synced_at)} · {r.last_synced_by}
            </span>
            {r.last_sync_message && (
              <div className="max-w-xs truncate text-muted-foreground" title={r.last_sync_message}>
                {r.last_sync_message}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">Never synced</span>
        ),
    },
    ...auditColumns<FirewallRule>(),
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (r) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Sync this rule"
            title="Sync this rule"
            onClick={() => setSync({ open: true, ruleId: r.id })}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <RowActions
            onEdit={() => openDrawer(r)}
            onDelete={() => remove(r.id)}
            deleteTitle={`Stop managing ${r.rule_name}?`}
            deleteDescription="The rule is only removed from this dashboard. The firewall rule in GCP and its current IPs stay as they are."
          />
        </div>
      ),
    },
  ];

  return (
    <NetworkPage
      title="GCP firewall rules"
      description="Existing VPC firewall rules whose source IPs are managed from Client IPs. Syncing replaces each rule's source ranges with the list below."
    >
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.project_id} ${r.rule_name} ${describeScope(r)}`}
        searchPlaceholder="Search rules…"
        isLoading={isLoading}
        error={error}
        initialSort={{ key: "rule", dir: "asc" }}
        emptyMessage="No firewall rules registered yet"
        actions={
          <>
            <Button variant="outline" onClick={() => setSync({ open: true })} disabled={!rows.length}>
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Sync all
            </Button>
            <Button onClick={() => openDrawer(null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Register rule
            </Button>
          </>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit firewall rule" : "Register firewall rule"}
        description="The rule must already exist in GCP. The dashboard only changes its source IP ranges."
        submitLabel={editing ? "Save changes" : "Register rule"}
        onSubmit={onSubmit}
        audit={editing ?? undefined}
      >
        <Field label="GCP project ID" htmlFor="project" required error={errors.project_id}>
          <Input
            id="project"
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
            placeholder="intalk-prod"
            className={errors.project_id ? "border-red-500 font-mono" : "font-mono"}
            autoComplete="off"
          />
        </Field>
        <Field
          label="Firewall rule name"
          htmlFor="rule"
          required
          error={errors.rule_name}
          hint="As shown in VPC network → Firewall"
        >
          <Input
            id="rule"
            value={form.rule_name}
            onChange={(e) => setForm((f) => ({ ...f, rule_name: e.target.value }))}
            placeholder="allow-sip-clients"
            className={errors.rule_name ? "border-red-500 font-mono" : "font-mono"}
            autoComplete="off"
          />
        </Field>
        <Field label="Whitelist" htmlFor="scope" required>
          <Select
            value={form.scope}
            onValueChange={(scope) => setForm((f) => ({ ...f, scope: scope as FirewallScope }))}
          >
            <SelectTrigger id="scope" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIREWALL_SCOPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {FIREWALL_SCOPE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {form.scope === "client" && (
          <Field label="Client" htmlFor="client" required error={errors.client_id}>
            <SearchableSelect
              id="client"
              options={clientOptions}
              value={form.client_id}
              onChange={(client_id) => setForm((f) => ({ ...f, client_id }))}
              placeholder="Select client"
              searchPlaceholder="Search clients…"
              invalid={!!errors.client_id}
            />
          </Field>
        )}
        {form.scope === "kamailio" && (
          <Field label="Kamailio server" htmlFor="kamailio" required error={errors.kamailio_id}>
            <SearchableSelect
              id="kamailio"
              options={kamailioOptions}
              value={form.kamailio_id}
              onChange={(kamailio_id) => setForm((f) => ({ ...f, kamailio_id }))}
              placeholder="Select Kamailio server"
              searchPlaceholder="Search Kamailio IPs…"
              invalid={!!errors.kamailio_id}
            />
          </Field>
        )}

        <Field
          label="Always-allowed ranges"
          htmlFor="static"
          error={errors.static_ranges}
          hint="Optional. IPs/CIDRs that aren't client IPs but must stay in the rule (office, VPN, monitoring). Anything else in the rule is removed on sync."
        >
          <Textarea
            id="static"
            rows={3}
            value={form.static_ranges}
            onChange={(e) => setForm((f) => ({ ...f, static_ranges: e.target.value }))}
            placeholder="203.0.113.10, 198.51.100.0/24"
            className={errors.static_ranges ? "border-red-500 font-mono" : "font-mono"}
          />
        </Field>
      </FormDrawer>

      <FirewallSyncDialog
        open={sync.open}
        ruleId={sync.ruleId}
        onOpenChange={(open) => setSync((s) => ({ ...s, open }))}
      />
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
