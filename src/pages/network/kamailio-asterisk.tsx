import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { GetServerSideProps } from "next";
import { Plus } from "lucide-react";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { Button } from "@/components/ui/button";
import { DataGrid, DataGridColumn } from "@/components/network/DataGrid";
import { Field, FormDrawer } from "@/components/network/FormDrawer";
import { SearchableSelect, SelectOption } from "@/components/network/SearchableSelect";
import {
  NetworkPage,
  ProviderBadge,
  RowActions,
  auditColumns,
  ipSortValue,
} from "@/components/network/shared";
import { useCrudResource } from "@/components/network/useCrudResource";
import {
  AsteriskMachine,
  KamailioAsteriskMap,
  KamailioConfig,
  PROVIDER_LABELS,
} from "@/lib/network/types";

const SWR_OPTS = { revalidateOnFocus: false };

type FormState = { kamailio_id: string | null; asterisk_id: string | null };
type FormErrors = Partial<Record<keyof FormState, string>>;

export default function KamailioAsteriskPage() {
  const { rows, isLoading, error, create, update, remove } = useCrudResource<KamailioAsteriskMap>(
    "/api/network/kamailio-asterisk"
  );
  const { data: kamailios } = useSWR<KamailioConfig[]>("/api/network/kamailio", fetcher, SWR_OPTS);
  const { data: asterisks } = useSWR<AsteriskMachine[]>("/api/network/asterisk", fetcher, SWR_OPTS);

  const [kamailioFilter, setKamailioFilter] = useState<string | null>(null);
  const [asteriskFilter, setAsteriskFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<KamailioAsteriskMap | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ kamailio_id: null, asterisk_id: null });
  const [errors, setErrors] = useState<FormErrors>({});

  const mappedPairs = useMemo(
    () => new Set(rows.filter((r) => r.id !== editing?.id).map((r) => `${r.kamailio_id}:${r.asterisk_id}`)),
    [rows, editing]
  );

  const kamailioOptions: SelectOption[] = useMemo(
    () =>
      (kamailios ?? []).map((k) => ({ value: k.id, label: k.ip, description: PROVIDER_LABELS[k.provider] })),
    [kamailios]
  );
  const asteriskFilterOptions: SelectOption[] = useMemo(
    () =>
      (asterisks ?? []).map((a) => ({ value: a.id, label: a.ip, description: PROVIDER_LABELS[a.provider] })),
    [asterisks]
  );
  // In the form, Asterisk machines already mapped to the chosen Kamailio are disabled.
  const asteriskFormOptions: SelectOption[] = useMemo(
    () =>
      asteriskFilterOptions.map((o) => {
        const taken = !!form.kamailio_id && mappedPairs.has(`${form.kamailio_id}:${o.value}`);
        return { ...o, disabled: taken, disabledReason: taken ? "Already mapped" : undefined };
      }),
    [asteriskFilterOptions, form.kamailio_id, mappedPairs]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!kamailioFilter || r.kamailio_id === kamailioFilter) &&
          (!asteriskFilter || r.asterisk_id === asteriskFilter)
      ),
    [rows, kamailioFilter, asteriskFilter]
  );

  const openDrawer = (row: KamailioAsteriskMap | null) => {
    setEditing(row);
    setForm(
      row
        ? { kamailio_id: row.kamailio_id, asterisk_id: row.asterisk_id }
        : { kamailio_id: kamailioFilter, asterisk_id: asteriskFilter }
    );
    setErrors({});
    setDrawerOpen(true);
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.kamailio_id) next.kamailio_id = "Select a Kamailio server";
    if (!form.asterisk_id) next.asterisk_id = "Select an Asterisk machine";
    else if (form.kamailio_id && mappedPairs.has(`${form.kamailio_id}:${form.asterisk_id}`))
      next.asterisk_id = "This Asterisk machine is already mapped to that Kamailio server";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return false;
    return editing ? update({ id: editing.id, ...form }) : create(form);
  };

  const columns: DataGridColumn<KamailioAsteriskMap>[] = [
    { key: "id", header: "ID", sortValue: (r) => Number(r.id), className: "w-16 text-muted-foreground" },
    {
      key: "kamailio",
      header: "Kamailio",
      sortValue: (r) => ipSortValue(r.kamailio_ip),
      render: (r) => <span className="font-mono text-sm">{r.kamailio_ip}</span>,
    },
    {
      key: "asterisk",
      header: "Asterisk",
      sortValue: (r) => ipSortValue(r.asterisk_ip),
      render: (r) => <span className="font-mono text-sm">{r.asterisk_ip}</span>,
    },
    {
      key: "asterisk_provider",
      header: "Asterisk provider",
      sortValue: (r) => r.asterisk_provider,
      render: (r) => <ProviderBadge provider={r.asterisk_provider} />,
    },
    ...auditColumns<KamailioAsteriskMap>(),
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
              Kamailio <span className="font-mono">{r.kamailio_ip}</span> will stop routing to Asterisk{" "}
              <span className="font-mono">{r.asterisk_ip}</span>.
            </>
          }
        />
      ),
    },
  ];

  return (
    <NetworkPage
      title="Kamailio ↔ Asterisk"
      description="Which Asterisk machines each Kamailio server routes calls to."
    >
      <DataGrid
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.kamailio_ip} ${r.asterisk_ip} ${r.updated_by ?? ""}`}
        searchPlaceholder="Search IPs…"
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
              options={asteriskFilterOptions}
              value={asteriskFilter}
              onChange={setAsteriskFilter}
              placeholder="All Asterisk machines"
              searchPlaceholder="Search Asterisk IPs…"
              clearable
            />
          </>
        }
        actions={
          <Button onClick={() => openDrawer(null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add mapping
          </Button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? "Edit mapping" : "Map Asterisk to Kamailio"}
        description={editing ? `Editing #${editing.id}` : "Each Kamailio/Asterisk pair can be mapped once."}
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
        <Field label="Asterisk machine" htmlFor="asterisk" required error={errors.asterisk_id}>
          <SearchableSelect
            id="asterisk"
            options={asteriskFormOptions}
            value={form.asterisk_id}
            onChange={(asterisk_id) => setForm((f) => ({ ...f, asterisk_id }))}
            placeholder="Select Asterisk machine"
            searchPlaceholder="Search Asterisk IPs…"
            emptyText="No Asterisk machines — add one first"
            invalid={!!errors.asterisk_id}
          />
        </Field>
      </FormDrawer>
    </NetworkPage>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
