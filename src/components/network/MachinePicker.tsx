"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { AsteriskMachine } from "@/lib/network/types";
import { ProviderBadge } from "./shared";

type Props = {
  machines: AsteriskMachine[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
};

/** Checkbox dropdown for choosing Asterisk machines, with "Select all". */
export function MachinePicker({ machines, selected, onChange, disabled }: Props) {
  const allSelected = machines.length > 0 && selected.size === machines.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  const toggleAll = (checked: boolean) =>
    onChange(checked ? new Set(machines.map((m) => m.id)) : new Set());

  const label = allSelected
    ? `All machines (${machines.length})`
    : selected.size === 0
      ? "Select machines…"
      : selected.size === 1
        ? machineLabel(machines.find((m) => selected.has(m.id)))
        : `${selected.size} machines selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled || !machines.length}
        >
          <span className={cn(!selected.size && "text-muted-foreground")}>
            {machines.length ? label : "No Asterisk machines"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-1">
        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-muted">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(c) => toggleAll(c === true)}
          />
          Select all
        </label>
        <div className="my-1 border-t" />
        <div className="max-h-72 overflow-y-auto">
          {machines.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(m.id)}
                onCheckedChange={(c) => toggle(m.id, c === true)}
              />
              <span className="min-w-0">
                {m.name && <span className="block truncate font-medium">{m.name}</span>}
                <span className={cn("font-mono", m.name && "text-xs text-muted-foreground")}>
                  {m.ip}
                </span>
                {m.private_ip && (
                  <span className="ml-1 font-mono text-xs text-muted-foreground">
                    ({m.private_ip})
                  </span>
                )}
              </span>
              <span className="ml-auto">
                <ProviderBadge provider={m.provider} />
              </span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function machineLabel(m: AsteriskMachine | undefined) {
  if (!m) return "";
  return m.name ? `${m.name} (${m.ip})` : m.ip;
}
