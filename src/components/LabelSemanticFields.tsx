"use client";

/**
 * Description + samples editor for the label modal, plus a
 * "Regenerate Embeddings" button that calls ai-voice-bot via the
 * `/api/labels/regenerate-embedding` proxy.
 *
 * Reused by CreateDocumentForm (regenerate hidden — nothing saved yet)
 * and UpdateDocumentForm (regenerate enabled). The component is fully
 * controlled by the parent's react-hook-form instance via the standard
 * `setValue` / `watch` / `getValues` API.
 */
import { useState, useRef, KeyboardEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormLabel } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { getCampaignLabel } from "@/lib/utils";
import { LabelsSchema } from "@/lib/zod";

interface Props {
  form: UseFormReturn<LabelsSchema>;
  collectionType: string;
  /** Show the "Regenerate Embeddings" button. Pass true only from the
   *  edit modal (a doc must already exist in Mongo to regenerate). */
  showRegenerate: boolean;
}

export default function LabelSemanticFields({
  form,
  collectionType,
  showRegenerate,
}: Props) {
  // react-hook-form holds `samples` as the source of truth. We mirror
  // it in local state for snappy add/remove UX without re-rendering the
  // whole form on every keystroke; sync back on every mutation.
  const initial = (form.getValues("samples") ?? []) as string[];
  const [samples, setSamples] = useState<string[]>(initial);
  const sampleInputRef = useRef<HTMLInputElement>(null);

  const [isRegenerating, setIsRegenerating] = useState(false);

  const writeBack = (next: string[]) => {
    setSamples(next);
    form.setValue("samples", next, { shouldDirty: true });
  };

  const addSample = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (samples.includes(v)) return; // dedupe
    writeBack([...samples, v]);
  };

  const removeSample = (v: string) => {
    writeBack(samples.filter((s) => s !== v));
  };

  const onSampleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter / comma commits the current value. Matches the keywords UX.
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = (e.target as HTMLInputElement).value;
      addSample(v);
      (e.target as HTMLInputElement).value = "";
    }
  };

  const regenerate = async () => {
    const label = (form.getValues("label") ?? "").trim();
    if (!label) {
      toast({
        variant: "destructive",
        description: "Set a label before regenerating embeddings.",
      });
      return;
    }

    let collection: string;
    try {
      collection = getCampaignLabel(collectionType);
    } catch (e) {
      toast({
        variant: "destructive",
        description: `Unknown campaign: ${collectionType}`,
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const r = await fetch("/api/labels/regenerate-embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, label }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          data?.detail || data?.error || `HTTP ${r.status}`
        );
      }
      toast({
        variant: "success",
        description: `Regenerated ${data.vectors_written ?? "?"} vector(s) for ${label} in ${data.took_ms ?? "?"} ms.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        description:
          err instanceof Error ? err.message : "Regenerate failed.",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          value={form.watch("description") ?? ""}
          onChange={(e) =>
            form.setValue("description", e.target.value, {
              shouldDirty: true,
            })
          }
          rows={3}
          placeholder="Short caller-voice description. Used to encode the label's intent vector."
          className="border dark:border-white"
        />
      </FormControl>

      <FormLabel>Samples (optional)</FormLabel>
      <FormControl>
        <Input
          ref={sampleInputRef}
          type="text"
          placeholder="Type a sample phrasing and press Enter."
          onKeyDown={onSampleKey}
          className="border dark:border-white"
        />
      </FormControl>
      {samples.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {samples.map((s) => (
            <Button
              key={s}
              type="button"
              variant="outline"
              onClick={() => removeSample(s)}
              title="Click to remove"
            >
              {s} ✕
            </Button>
          ))}
        </div>
      )}

      {showRegenerate && (
        <Button
          type="button"
          variant="secondary"
          disabled={isRegenerating}
          onClick={regenerate}
          className="w-full"
        >
          {isRegenerating ? "Regenerating…" : "Regenerate Embeddings"}
        </Button>
      )}
    </div>
  );
}
