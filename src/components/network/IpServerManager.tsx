"use client";

import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isValidIp, normalizeIp } from "@/lib/network/ip";
import { Audit, Provider } from "@/lib/network/types";
import { DataGrid, DataGridColumn } from "./DataGrid";
import { Field, FormDrawer } from "./FormDrawer";
import { ProviderBadge, ProviderSelect, RowActions, auditColumns, ipSortValue } from "./shared";
import { useCrudResource } from "./useCrudResource";

type IpServer = Audit & { ip: string; private_ip?: string | null; provider: Provider };

type Props = {
  endpoint: string;
  /** Singular noun, e.g. "Kamailio server". */
  noun: string;
  /** Mapping endpoints that display this entity and must refresh after edits. */
  dependents: string[];
  /** Extra read-only column, e.g. mapping counts. */
  extraColumns?: DataGridColumn<IpServer>[];
  deleteWarning: string;
  /** Also capture an optional private (VPC-internal) IP, unique per provider. */
  withPrivateIp?: boolean;
};

type FormState = { ip: string; private_ip: string; provider: Provider | null };
type FormErrors = Partial<Record<keyof FormState, string>>;

/**
 * CRUD screen for an "IP + provider" entity (Kamailio servers, Asterisk
 * machines). Both tables share the same shape and rules: unique host IP,
 * required provider; Asterisk additionally has a private IP (withPrivateIp).
 */
export function IpServerManager({
  endpoint,
  noun,
  dependents,
  extraColumns = [],
  deleteWarning,
  withPrivateIp = false,
}: Props) {
  const { rows, isLoading, error, create, update, remove } = useCrudResource<IpServer>(
    endpoint,
    dependents
  );
  const [providerFilter, setProviderFilter] = useState<Provider | null>(null);
  const [editing, setEditing] = useState<IpServer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ip: "", private_ip: "", provider: null });
  const [errors, setErrors] = useState<FormErrors>({});

  const filtered = useMemo(
    () => (providerFilter ? rows.filter((r) => r.provider === providerFilter) : rows),
    [rows, providerFilter]
  );

  const openDrawer = (row: IpServer | null) => {
    setEditing(row);
    setForm(
      row
        ? { ip: row.ip, private_ip: row.private_ip ?? "", provider: row.provider }
        : { ip: "", private_ip: "", provider: null }
    );
    setErrors({});
    setDrawerOpen(true);
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const ip = normalizeIp(form.ip);
    const ipLabel = withPrivateIp ? "Public IP" : "IP address";
    if (!ip) next.ip = `${ipLabel} is required`;
    else if (!isValidIp(ip)) next.ip = "Enter a valid IPv4 or IPv6 address";
    else if (rows.some((r) => r.ip === ip && r.id !== editing?.id))
      next.ip = `A ${noun} with this ${withPrivateIp ? "public IP" : "IP"} already exists`;
    if (!form.provider) next.provider = "Provider is required";

    const privateIp = normalizeIp(form.private_ip);
    if (withPrivateIp && privateIp) {
      if (!isValidIp(privateIp)) next.private_ip = "Enter a valid IPv4 or IPv6 address";
      else if (
        rows.some(
          (r) =>
            r.private_ip === privateIp && r.provider === form.provider && r.id !== editing?.id
        )
      )
        next.private_ip = `Another ${noun} on this provider already has this private IP`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return false;
    const body = {
      ip: normalizeIp(form.ip),
      provider: form.provider,
      ...(withPrivateIp ? { private_ip: normalizeIp(form.private_ip) || null } : {}),
    };
    return editing ? update({ id: editing.id, ...body }) : create(body);
  };

  const columns: DataGridColumn<IpServer>[] = [
    { key: "id", header: "ID", sortValue: (r) => Number(r.id), className: "w-16 text-muted-foreground" },
    {
      key: "ip",
      header: withPrivateIp ? "Public IP" : "IP address",
      sortValue: (r) => ipSortValue(r.ip),
      render: (r) => <span className="font-mono text-sm">{r.ip}</span>,
    },
    ...(withPrivateIp
      ? [
          {
            key: "private_ip",
            header: "Private IP",
            sortValue: (r: IpServer) => (r.private_ip ? ipSortValue(r.private_ip) : null),
            render: (r: IpServer) =>
              r.private_ip ? (
                <span className="font-mono text-sm">{r.private_ip}</span>
              ) : (
                <span className="text-xs italic text-muted-foreground">Not set</span>
              ),
          },
        ]
      : []),
    {
      key: "provider",
      header: "Provider",
      sortValue: (r) => r.provider,
      render: (r) => <ProviderBadge provider={r.provider} />,
    },
    ...extraColumns,
    ...auditColumns<IpServer>(),
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <RowActions
          onEdit={() => openDrawer(r)}
          onDelete={() => remove(r.id)}
          deleteTitle={`Delete ${noun} ${r.ip}?`}
          deleteDescription={deleteWarning}
        />
      ),
    },
  ];

  return (
    <>
      <DataGrid
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        searchText={(r) => `${r.ip} ${r.private_ip ?? ""} ${r.provider} ${r.updated_by ?? ""}`}
        searchPlaceholder="Search IP or user…"
        isLoading={isLoading}
        error={error}
        initialSort={{ key: "ip", dir: "asc" }}
        emptyMessage={rows.length ? "No matching records" : `No ${noun}s yet`}
        filters={
          <ProviderSelect
            value={providerFilter}
            onChange={setProviderFilter}
            emptyLabel="All providers"
            className="w-40"
          />
        }
        actions={
          <Button onClick={() => openDrawer(null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add {noun}
          </Button>
        }
      />

      <FormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={editing ? `Edit ${noun}` : `Add ${noun}`}
        description={
          editing
            ? `Editing #${editing.id}`
            : withPrivateIp
              ? "Public IPs must be unique; private IPs must be unique per provider."
              : "IP addresses must be unique."
        }
        submitLabel={editing ? "Save changes" : `Add ${noun}`}
        onSubmit={onSubmit}
        audit={editing ?? undefined}
      >
        <Field
          label={withPrivateIp ? "Public IP" : "IP address"}
          htmlFor="ip"
          required
          error={errors.ip}
          hint={withPrivateIp ? "External address, e.g. 34.123.45.67" : "e.g. 10.128.0.12"}
        >
          <Input
            id="ip"
            value={form.ip}
            onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
            placeholder="0.0.0.0"
            className={errors.ip ? "border-red-500 font-mono" : "font-mono"}
            autoComplete="off"
            autoFocus
          />
        </Field>
        {withPrivateIp && (
          <Field
            label="Private IP"
            htmlFor="private_ip"
            error={errors.private_ip}
            hint="Internal VPC address, e.g. 10.128.0.12. Optional."
          >
            <Input
              id="private_ip"
              value={form.private_ip}
              onChange={(e) => setForm((f) => ({ ...f, private_ip: e.target.value }))}
              placeholder="10.0.0.0"
              className={errors.private_ip ? "border-red-500 font-mono" : "font-mono"}
              autoComplete="off"
            />
          </Field>
        )}
        <Field label="Provider" htmlFor="provider" required error={errors.provider}>
          <ProviderSelect
            id="provider"
            value={form.provider}
            onChange={(provider) => setForm((f) => ({ ...f, provider }))}
            invalid={!!errors.provider}
          />
        </Field>
      </FormDrawer>
    </>
  );
}
