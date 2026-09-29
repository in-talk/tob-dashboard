import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { Plus, ShieldCheck, Sparkles, X } from "lucide-react";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridColumn } from "@/components/network/DataGrid";
import { Field, FormDrawer } from "@/components/network/FormDrawer";
import { SearchableSelect, SelectOption } from "@/components/network/SearchableSelect";
import {
  NetworkPage,
  ProviderSelect,
  RowActions,
  auditColumns,
  ipSortValue,
} from "@/components/network/shared";
import { useCrudResource } from "@/components/network/useCrudResource";
import { FirewallSyncDialog } from "@/components/network/FirewallSyncDialog";
import { isValidIp, normalizeIp } from "@/lib/network/ip";
import {
  ClientIp,
  ClientOption,
  KamailioClientIpMap,
  KamailioConfig,
  PROVIDER_LABELS,
  Provider,
} from "@/lib/network/types";

const UNASSIGNED = "__unassigned__";
const SWR_OPTS = { revalidateOnFocus: false };

type FormState = {
  kamailio_id: string | null;
  client_id: string | null;
  client_ip_id: string | null;
  /** Typed IP not yet in client_ips — registered on save. */
  new_ip: string | null;
  provider: Provider | null;
};
type FormErrors = Partial<Record<"kamailio_id" | "client_ip", string>>;

const EMPTY: FormState = {
  kamailio_id: null,
  client_id: null,
  client_ip_id: null,
  new_ip: null,
  provider: null,
};

export default function KamailioClientIpsPage() {
  const { rows, isLoading, error, create, update, remove } = useCrudResource<KamailioClientIpMap>(
    "/api/network/kamailio-client-ips",
    ["/api/network/client-ips"]
  );
  const { data: kamailios } = useSWR<KamailioConfig[]>("/api/network/kamailio", fetcher, SWR_OPTS);
  const { data: clientIps } = useSWR<ClientIp[]>("/api/network/client-ips", fetcher, SWR_OPTS);
  const { data: clients } = useSWR<ClientOption[]>("/api/network/client-options", fetcher, SWR_OPTS);

  const [kamailioFilter, setKamailioFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<KamailioClientIpMap | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [syncOpen, setSyncOpen] = useState(false);

  const kamailioOptions: SelectOption[] = useMemo(
    () =>
      (kamailios ?? []).map((k) => ({
        value: k.id,
        label: k.ip,
        description: PROVIDER_LABELS[k.provider],
      })),
    [kamailios]
  );
  const clientOptions: SelectOption[] = useMemo(
    () => (clients ?? []).map((c) => ({ value: c.client_id, label: c.name, description: `#${c.client_id}` })),
    [clients]
  );

  // Pairs already mapped, for UI-level duplicate prevention.
  const mappedPairs = useMemo(
    () => new Set(rows.filter((r) => r.id !== editing?.id).map((r) => `${r.kamailio_id}:${r.client_ip_id}`)),
    [rows, editing]
  );

  // IP picker: narrowed to the selected client's IPs; otherwise every IP.
  const ipOptions: SelectOption[] = useMemo(
    () =>
      (clientIps ?? [])
        .filter((ip) => !form.client_id || ip.client_id === form.client_id)
        .map((ip) => {
          const taken = !!form.kamailio_id && mappedPairs.has(`${form.kamailio_id}:${ip.id}`);
          return {
            value: ip.id,
            label: ip.ip,
            description: ip.client_name ?? "Unassigned",
            disabled: taken,
            disabledReason: taken ? "Already mapped" : undefined,
          };
        }),
    [clientIps, form.client_id, form.kamailio_id, mappedPairs]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!kamailioFilter || r.kamailio_id === kamailioFilter) &&
          (!clientFilter ||
            (clientFilter === UNASSIGNED ? r.client_id === null : r.client_id === clientFilter))
      ),
    [rows, kamailioFilter, clientFilter]
  );

  const openDrawer = (row: KamailioClientIpMap | null) => {
    setEditing(row);
    setForm(
      row
        ? { ...EMPTY, kamailio_id: row.kamailio_id, client_id: row.client_id, client_ip_id: row.client_ip_id }
        : {
            ...EMPTY,
            kamailio_id: kamailioFilter,
            client_id: clientFilter && clientFilter !== UNASSIGNED ? clientFilter : null,
          }
      );
    setErrors({});
    setDrawerOpen(true);
  };

  const setClient = (client_id: string | null) =>
    setForm((f) => {
      const current = clientIps?.find((ip) => ip.id === f.client_ip_id);
      // Drop a selected IP that doesn't belong to the newly chosen client.
      const keep = !client_id || current?.client_id === client_id;
      return { ...f, client_id, client_ip_id: keep ? f.client_ip_id : null };
    });

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.kamailio_id) next.kamailio_id = "Select a Kamailio server";

    if (form.new_ip) {
      if (!isValidIp(form.new_ip)) next.client_ip = "Enter a valid IPv4 or IPv6 address";
      else if (form.kamailio_id) {
        // A typed IP that already exists for this client resolves to that row.
        const existing = clientIps?.find(
          (ip) => ip.ip === form.new_ip && ip.client_id === form.client_id
        );
        if (existing && mappedPairs.has(`${form.kamailio_id}:${existing.id}`))
          next.client_ip = "This IP is already mapped to that Kamailio server";
      }
    } else if (!form.client_ip_id) {
      next.client_ip = "Select a client IP or type a new one";
    } else if (form.kamailio_id && mappedPairs.has(`${form.kamailio_id}:${form.client_ip_id}`)) {
      next.client_ip = "This IP is already mapped to that Kamailio server";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return false;
    if (editing) {
      return update({ id: editing.id, kamailio_id: form.kamailio_id, client_ip_id: form.client_ip_id });
    }
    return create(
      form.new_ip
        ? {
            kamailio_id: form.kamailio_id,
            new_ip: form.new_ip,
            client_id: form.client_id,
            provider: form.provider,
          }
        : { kamailio_id: form.kamailio_id, client_ip_id: form.client_ip_id }
    );
  };

  const columns: DataGridColumn<KamailioClientIpMap>[] = [
    { key: "id", header: "ID", sortValue: (r) => Number(r.id), className: "w-16 text-muted-foreground" },
    {
      key: "kamailio",
      header: "Kamailio",
      sortValue: (r) => ipSortValue(r.kamailio_ip),
      render: (r) => <span className="font-mono text-sm">{r.kamailio_ip}</span>,
    },
    {
      key: "client_ip",
      header: "Client IP",
      sortValue: (r) => ipSortValue(r.client_ip),
      render: (r) => <span className="font-mono text-sm">{r.client_ip}</span>,
    },
    {
      key: "client",
      header: "Client",
      sortValue: (r) => r.client_name,
      render: (r) =>
        r.client_id ? (
          r.client_name
        ) : (
          <span className="text-xs italic text-muted-foreground">Unassigned</span>
        ),
    },
    ...auditColumns<KamailioClientIpMap>(),
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <RowActions
          onEdit={() => openDrawer(r)}
          onDelete={() => remove(r.id)}
          deleteTitle="Delete mapping?"
          deleteDescription={
            <>
              Kamailio <span className="font-mono">{r.kamailio_ip}</span> will stop accepting{" "}
              <span className="font-mono">{r.client_ip}</span>
              {r.client_name ? ` (${r.client_name})` : ""}. The client IP itself is kept.
            </>
          }
        />
      ),
    },
  ];

  return (
    <NetworkPage
      title="Kamailio ↔ Client IPs"
      description="Which client source IPs each Kamailio server accepts."
    >
      <DataGrid
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) =>
          `${r.kamailio_ip} ${r.client_ip} ${r.client_name ?? ""} ${r.updated_by ?? ""}`
        }
        searchPlaceholder="Search IPs or client…"
        isLoading={isLoading}
        error={error}
        initialSort={{ key: "kamailio", dir: "asc" }}
        emptyMessage={rows.length ? "No matching mappings" : "No mappings yet"}
        filters={
          <>
            <SearchableSelect
              className="w-52"
              options={kamailioOptions}
              value={kamailioFilter}
              onChange={setKamailioFilter}
              placeholder="All Kamailio servers"
              searchPlaceholder="Search Kamailio IPs…"
              clearable
            />
            <SearchableSelect
              className="w-52"
              options={[{ value: UNASSIGNED, label: "Unassigned IPs" }, ...clientOptions]}
              value={clientFilter}
              onChange={setClientFilter}
              placeholder="All clients"
              searchPlaceholder="Search clients…"
              clearable
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
              Add mapping
            </Button>
          </>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit mapping" : "Map client IP to Kamailio"}
        description={
          editing
            ? `Editing #${editing.id}`
            : "Pick a client to narrow its IPs, or type any IP directly."
        }
        submitLabel={editing ? "Save changes" : "Create mapping"}
        onSubmit={onSubmit}
        audit={editing ?? undefined}
      >
        <Field label="Kamailio server" htmlFor="kamailio" required error={errors.kamailio_id}>
          <SearchableSelect
            id="kamailio"
            options={kamailioOptions}
            value={form.kamailio_id}
            onChange={(kamailio_id) => setForm((f) => ({ ...f, kamailio_id }))}
            placeholder="Select Kamailio server"
            searchPlaceholder="Search Kamailio IPs…"
            emptyText="No Kamailio servers — add one first"
            invalid={!!errors.kamailio_id}
          />
        </Field>

        <Field
          label="Client"
          htmlFor="client"
          hint={form.client_id ? "Only this client's IPs are listed below." : "Optional — filters the IP list."}
        >
          <SearchableSelect
            id="client"
            options={clientOptions}
            value={form.client_id}
            onChange={setClient}
            placeholder="Any client"
            searchPlaceholder="Search clients…"
            clearable
          />
        </Field>

        <Field
          label="Client IP"
          htmlFor="client-ip"
          required
          error={errors.client_ip}
          hint={editing ? undefined : "Not listed? Type the IP and choose “Add …”."}
        >
          {form.new_ip ? (
            <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-mono">{form.new_ip}</span>
                <span className="text-xs text-muted-foreground">
                  new · {form.client_id ? `for ${clients?.find((c) => c.client_id === form.client_id)?.name}` : "unassigned"}
                </span>
              </span>
              <button
                type="button"
                aria-label="Remove new IP"
                onClick={() => setForm((f) => ({ ...f, new_ip: null }))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <SearchableSelect
              id="client-ip"
              options={ipOptions}
              value={form.client_ip_id}
              onChange={(client_ip_id) => setForm((f) => ({ ...f, client_ip_id }))}
              placeholder={form.client_id ? "Select one of this client's IPs" : "Select or type an IP"}
              searchPlaceholder="Search or type an IP…"
              emptyText={form.client_id ? "This client has no IPs yet" : "No client IPs"}
              invalid={!!errors.client_ip}
              creatable={
                editing
                  ? undefined
                  : {
                      isValid: isValidIp,
                      label: (text) => `Add new IP “${normalizeIp(text)}”`,
                      invalidLabel: (text) => `“${text}” is not a valid IP address`,
                      onCreate: (text) =>
                        setForm((f) => ({ ...f, new_ip: normalizeIp(text), client_ip_id: null })),
                    }
              }
            />
          )}
        </Field>

        {form.new_ip && (
          <Field label="Provider for new IP" htmlFor="provider">
            <ProviderSelect
              id="provider"
              value={form.provider}
              onChange={(provider) => setForm((f) => ({ ...f, provider }))}
              emptyLabel="Not set"
            />
          </Field>
        )}
      </FormDrawer>

      <FirewallSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
