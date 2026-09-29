import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { Plus, ShieldCheck } from "lucide-react";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid, DataGridColumn } from "@/components/network/DataGrid";
import { Field, FormDrawer } from "@/components/network/FormDrawer";
import { SearchableSelect, SelectOption } from "@/components/network/SearchableSelect";
import {
  NetworkPage,
  ProviderBadge,
  ProviderSelect,
  RowActions,
  auditColumns,
  ipSortValue,
} from "@/components/network/shared";
import { useCrudResource } from "@/components/network/useCrudResource";
import { FirewallSyncDialog } from "@/components/network/FirewallSyncDialog";
import { isValidIp, normalizeIp, parseIpList } from "@/lib/network/ip";
import { ClientIp, ClientOption, Provider } from "@/lib/network/types";

const UNASSIGNED = "__unassigned__";

type FormState = { client_id: string | null; ips: string; provider: Provider | null };
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function ClientIpsPage() {
  const { rows, isLoading, error, create, update, remove } = useCrudResource<ClientIp>(
    "/api/network/client-ips",
    ["/api/network/kamailio-client-ips"]
  );
  const { data: clients } = useSWR<ClientOption[]>("/api/network/client-options", fetcher, {
    revalidateOnFocus: false,
  });

  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<Provider | null>(null);
  const [editing, setEditing] = useState<ClientIp | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ client_id: null, ips: "", provider: null });
  const [errors, setErrors] = useState<FormErrors>({});
  const [syncOpen, setSyncOpen] = useState(false);
  // Set after any add/edit/delete so the admin is reminded to push to GCP.
  const [firewallStale, setFirewallStale] = useState(false);
  const markStale = <R extends { ok: boolean }>(result: R) => {
    if (result.ok) setFirewallStale(true);
    return result;
  };

  const clientOptions: SelectOption[] = useMemo(
    () => (clients ?? []).map((c) => ({ value: c.client_id, label: c.name, description: `#${c.client_id}` })),
    [clients]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!clientFilter ||
            (clientFilter === UNASSIGNED ? r.client_id === null : r.client_id === clientFilter)) &&
          (!providerFilter || r.provider === providerFilter)
      ),
    [rows, clientFilter, providerFilter]
  );

  const openDrawer = (row: ClientIp | null) => {
    setEditing(row);
    setForm(
      row
        ? { client_id: row.client_id, ips: row.ip, provider: row.provider }
        : { client_id: clientFilter && clientFilter !== UNASSIGNED ? clientFilter : null, ips: "", provider: null }
    );
    setErrors({});
    setDrawerOpen(true);
  };

  /** IPs already stored for the chosen client (excluding the row being edited). */
  const existingForClient = (clientId: string | null) =>
    new Set(rows.filter((r) => r.client_id === clientId && r.id !== editing?.id).map((r) => r.ip));

  const validate = (): boolean => {
    const next: FormErrors = {};
    const existing = existingForClient(form.client_id);

    if (editing) {
      const ip = normalizeIp(form.ips);
      if (!ip) next.ips = "IP address is required";
      else if (!isValidIp(ip)) next.ips = "Enter a valid IPv4 or IPv6 address";
      else if (existing.has(ip)) next.ips = "This client already has that IP";
    } else {
      const { valid, invalid } = parseIpList(form.ips);
      const dupes = valid.filter((ip) => existing.has(ip));
      if (invalid.length) next.ips = `Invalid IP address(es): ${invalid.join(", ")}`;
      else if (!valid.length) next.ips = "Enter at least one IP address";
      else if (dupes.length === valid.length) next.ips = `Already registered: ${dupes.join(", ")}`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return false;
    if (editing) {
      return markStale(
        await update({
          id: editing.id,
          client_id: form.client_id,
          ip: normalizeIp(form.ips),
          provider: form.provider,
        })
      );
    }
    return markStale(await create({ client_id: form.client_id, ips: form.ips, provider: form.provider }));
  };

  // Live preview of what "Add" will do with the comma-separated input.
  const preview = useMemo(() => {
    if (editing || !form.ips.trim()) return null;
    const { valid, invalid } = parseIpList(form.ips);
    const existing = existingForClient(form.client_id);
    const dupes = valid.filter((ip) => existing.has(ip));
    return { toAdd: valid.length - dupes.length, dupes, invalid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ips, form.client_id, editing, rows]);

  const columns: DataGridColumn<ClientIp>[] = [
    { key: "id", header: "ID", sortValue: (r) => Number(r.id), className: "w-16 text-muted-foreground" },
    {
      key: "client",
      header: "Client",
      sortValue: (r) => r.client_name,
      render: (r) =>
        r.client_id ? (
          <div>
            <div className="font-medium">{r.client_name}</div>
            <div className="text-xs text-muted-foreground">#{r.client_id}</div>
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "ip",
      header: "IP address",
      sortValue: (r) => ipSortValue(r.ip),
      render: (r) => <span className="font-mono text-sm">{r.ip}</span>,
    },
    {
      key: "provider",
      header: "Provider",
      sortValue: (r) => r.provider,
      render: (r) => <ProviderBadge provider={r.provider} />,
    },
    ...auditColumns<ClientIp>(),
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <RowActions
          onEdit={() => openDrawer(r)}
          onDelete={async () => markStale(await remove(r.id))}
          deleteTitle={`Delete IP ${r.ip}?`}
          deleteDescription={`This IP${r.client_name ? ` will be removed from ${r.client_name} and` : ""} will be unmapped from every Kamailio server. This cannot be undone.`}
        />
      ),
    },
  ];

  return (
    <NetworkPage
      title="Client IPs"
      description="Source IPs each client sends SIP traffic from. A client can have many IPs."
    >
      {firewallStale && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <span>Client IPs changed. GCP firewall rules aren&apos;t updated until you sync them.</span>
          <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
            <ShieldCheck className="mr-1.5 h-4 w-4" />
            Review &amp; sync
          </Button>
        </div>
      )}

      <DataGrid
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.ip} ${r.client_name ?? ""} ${r.client_id ?? ""} ${r.updated_by ?? ""}`}
        searchPlaceholder="Search IP or client…"
        isLoading={isLoading}
        error={error}
        initialSort={{ key: "client", dir: "asc" }}
        emptyMessage={rows.length ? "No matching IPs" : "No client IPs yet"}
        filters={
          <>
            <SearchableSelect
              className="w-56"
              options={[{ value: UNASSIGNED, label: "Unassigned IPs" }, ...clientOptions]}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All clients"
              searchPlaceholder="Search clients…"
              clearable
            />
            <ProviderSelect
              value={providerFilter}
              onChange={setProviderFilter}
              emptyLabel="All providers"
              className="w-40"
            />
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setSyncOpen(true)}>
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Sync GCP firewall
            </Button>
            <Button onClick={() => openDrawer(null)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add client IPs
            </Button>
          </>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit client IP" : "Add client IPs"}
        description={
          editing ? `Editing #${editing.id}` : "Add one or more IPs for a client in a single step."
        }
        submitLabel={editing ? "Save changes" : "Add IPs"}
        onSubmit={onSubmit}
        audit={editing ?? undefined}
      >
        <Field
          label="Client"
          htmlFor="client"
          error={errors.client_id}
          hint="Leave empty to register an IP that isn't attributed to a client yet."
        >
          <SearchableSelect
            id="client"
            options={clientOptions}
            value={form.client_id}
            onChange={(client_id) => setForm((f) => ({ ...f, client_id }))}
            placeholder="Select client"
            searchPlaceholder="Search clients…"
            clearable
          />
        </Field>

        {editing ? (
          <Field label="IP address" htmlFor="ip" required error={errors.ips}>
            <Input
              id="ip"
              value={form.ips}
              onChange={(e) => setForm((f) => ({ ...f, ips: e.target.value }))}
              className={errors.ips ? "border-red-500 font-mono" : "font-mono"}
              autoComplete="off"
            />
          </Field>
        ) : (
          <Field
            label="IP addresses"
            htmlFor="ips"
            required
            error={errors.ips}
            hint={
              preview ? (
                <>
                  {preview.toAdd} to add
                  {preview.dupes.length > 0 && ` · skipping existing: ${preview.dupes.join(", ")}`}
                  {preview.invalid.length > 0 && (
                    <span className="text-red-600"> · invalid: {preview.invalid.join(", ")}</span>
                  )}
                </>
              ) : (
                "Comma-separated, e.g. 34.1.2.3, 34.1.2.4"
              )
            }
          >
            <Textarea
              id="ips"
              rows={4}
              value={form.ips}
              onChange={(e) => setForm((f) => ({ ...f, ips: e.target.value }))}
              placeholder="34.1.2.3, 34.1.2.4"
              className={errors.ips ? "border-red-500 font-mono" : "font-mono"}
            />
          </Field>
        )}

        <Field label="Provider" htmlFor="provider">
          <ProviderSelect
            id="provider"
            value={form.provider}
            onChange={(provider) => setForm((f) => ({ ...f, provider }))}
            emptyLabel="Not set"
          />
        </Field>
      </FormDrawer>

      <FirewallSyncDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        onSynced={() => setFirewallStale(false)}
      />
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
