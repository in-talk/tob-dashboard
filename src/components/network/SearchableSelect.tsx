"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  /** Secondary text, also searchable (e.g. client name under an IP). */
  description?: string;
  /** Shown but not selectable — e.g. already mapped. */
  disabled?: boolean;
  disabledReason?: string;
};

type Props = {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
  /**
   * Offer "Use <typed text>" when the search text isn't an existing option.
   * `isValid` gates the row so only acceptable values can be created.
   */
  creatable?: {
    label: (text: string) => string;
    isValid: (text: string) => boolean;
    invalidLabel?: (text: string) => string;
    onCreate: (text: string) => void;
  };
};

/**
 * Searchable dropdown for foreign-key pickers. Rendered without a portal so it
 * works inside the Sheet/Dialog focus trap and scroll lock.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  clearable,
  disabled,
  invalid,
  className,
  id,
  creatable,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.description ?? ""}`.toLowerCase().includes(q)
    );
  }, [options, query]);

  const trimmed = query.trim();
  const showCreate =
    !!creatable &&
    trimmed !== "" &&
    !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());
  const createValid = showCreate && creatable!.isValid(trimmed);
  // Keyboard index space: options first, then the "create" row.
  const itemCount = filtered.length + (showCreate ? 1 : 0);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const create = () => {
    if (!createValid) return;
    creatable!.onCreate(trimmed);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, itemCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) choose(filtered[active]);
      else create();
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
              "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              invalid && "border-red-500 focus:ring-red-500",
              clearable && selected && "pr-14"
            )}
          >
            <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
              {selected ? (
                <>
                  {selected.label}
                  {selected.description && (
                    <span className="ml-1.5 text-muted-foreground">· {selected.description}</span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverPrimitive.Trigger>
        {clearable && selected && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            onClick={() => onChange(null)}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[14rem] rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector("input")?.focus();
        }}
      >
        <div className="border-b p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1">
          {filtered.map((opt, i) => (
            <li
              key={opt.value}
              data-index={i}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              title={opt.disabled ? opt.disabledReason : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(opt)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                i === active && "bg-accent text-accent-foreground",
                opt.disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <Check className={cn("h-4 w-4 shrink-0", opt.value === value ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{opt.label}</span>
              {(opt.description || (opt.disabled && opt.disabledReason)) && (
                <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                  {opt.disabled && opt.disabledReason ? opt.disabledReason : opt.description}
                </span>
              )}
            </li>
          ))}
          {showCreate && (
            <li
              data-index={filtered.length}
              role="option"
              aria-selected={false}
              aria-disabled={!createValid}
              onMouseEnter={() => setActive(filtered.length)}
              onClick={create}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm",
                active === filtered.length && "bg-accent text-accent-foreground",
                !createValid && "cursor-not-allowed text-muted-foreground"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              {createValid
                ? creatable!.label(trimmed)
                : creatable!.invalidLabel?.(trimmed) ?? `"${trimmed}" is not valid`}
            </li>
          )}
          {itemCount === 0 && (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</li>
          )}
        </ul>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
}
