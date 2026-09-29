"use client";

import React, { FormEvent, ReactNode, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CustomLoader from "@/components/ui/CustomLoader";
import { MutationResult } from "./useCrudResource";
import { formatTimestamp } from "./shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /**
   * Run client-side validation first and return false to stop; otherwise
   * perform the request. A failed MutationResult is shown in the error banner
   * and keeps the drawer open.
   */
  onSubmit: () => Promise<MutationResult | false>;
  /** Existing record → shows its audit trail at the bottom. */
  audit?: { created_at: string; updated_at: string; updated_by: string | null };
  children: ReactNode;
};

/** Side-panel wrapper shared by every add/edit form. */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  audit,
  children,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit();
      if (result === false) return;
      if (!result.ok) setServerError(result.error ?? "Something went wrong");
      else handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-5 py-4">
          {serverError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {children}

          {audit && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <dt>Created</dt>
              <dd>{formatTimestamp(audit.created_at)}</dd>
              <dt>Updated</dt>
              <dd>{formatTimestamp(audit.updated_at)}</dd>
              <dt>Updated by</dt>
              <dd>{audit.updated_by || "—"}</dd>
            </dl>
          )}

          <SheetFooter className="mt-auto gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="mr-3">Saving…</span>
                  <CustomLoader />
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Label + control + hint/error, used for every field in the drawers. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
