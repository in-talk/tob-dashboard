import { useCallback, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";

interface UseKeywordsOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  initialKeywords?: string[];
  onClear?: () => void;
}

export function useKeywords({ form, initialKeywords = [], onClear }: UseKeywordsOptions) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const keywordInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement | null>(null);

  const addKeyword = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();

      const input = keywordInputRef.current?.value.trim();
      if (!input || keywords.includes(input)) return;

      setKeywords((prev) => [...prev, input]);
      form.setValue("keywords", [...(form.getValues("keywords") || []), input]);
      if (keywordInputRef.current) keywordInputRef.current.value = "";
    },
    [keywords, form]
  );

  const addBulkKeywords = useCallback(() => {
    const input = bulkInputRef.current?.value.trim();
    if (!input) return;

    const newKeywords = input
      .split(/[\n,]+/)
      .map((k) => k.trim())
      .filter((k) => k && !keywords.includes(k));

    if (newKeywords.length > 0) {
      setKeywords((prev) => [...prev, ...newKeywords]);
      form.setValue("keywords", [...(form.getValues("keywords") || []), ...newKeywords]);
    }
    if (bulkInputRef.current) bulkInputRef.current.value = "";
  }, [keywords, form]);

  const removeKeyword = useCallback(
    (keyword: string) => {
      setKeywords((prev) => prev.filter((k) => k !== keyword));
      form.setValue(
        "keywords",
        (form.getValues("keywords") || []).filter((k:string) => k !== keyword)
      );
    },
    [form]
  );

  const clearKeywords = useCallback(() => {
    setKeywords([]);
    form.setValue("keywords", []);
    if (onClear) onClear();
  }, [form, onClear]);

  return {
    keywords,
    keywordInputRef,
    bulkInputRef,
    addKeyword,
    addBulkKeywords,
    removeKeyword,
    clearKeywords,
  };
}