"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { LabelsSchema, labelsSchema } from "@/lib/zod";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { useMemo, useState } from "react";

import { updateDocumentFormData } from "@/constants";

interface UpdateDocumentFormProps {
  defaultValues: LabelsSchema;
  onSubmit: (data: LabelsSchema) => Promise<void>;
  submitButtonText: string;
  isSubmitting: boolean;
  errorMessage: string;
}

export default function UpdateDocumentForm({
  defaultValues,
  onSubmit,
  submitButtonText,
  isSubmitting,
  errorMessage,
}: UpdateDocumentFormProps) {
  const form = useForm<LabelsSchema>({
    resolver: zodResolver(labelsSchema),
    defaultValues,
  });

  // Both fields use a raw-text buffer so we don't split/trim on every keystroke
  // (that would strip trailing spaces the moment the user types them, making it
  // impossible to type multi-word phrases). Split only at submit / chip render.
  const [uniqueWordsText, setUniqueWordsText] = useState<string>(
    (defaultValues.unique_words ?? []).join(", ")
  );
  const [uniquePhrasesText, setUniquePhrasesText] = useState<string>(
    (defaultValues.unique_phrases ?? []).join(", ")
  );

  const [uniqueWordsSearch, setUniqueWordsSearch] = useState<string>("");
  const [uniquePhrasesSearch, setUniquePhrasesSearch] = useState<string>("");

  const parseList = (buf: string): string[] =>
    buf.split(/[\n,]+/).map((s) => s.trim()).filter((s) => s.length > 0);

  const uniqueWordsList = useMemo(() => parseList(uniqueWordsText), [uniqueWordsText]);
  const uniquePhrasesList = useMemo(
    () => parseList(uniquePhrasesText),
    [uniquePhrasesText]
  );

  const filteredUniqueWords = useMemo(() => {
    const q = uniqueWordsSearch.trim().toLowerCase();
    return q
      ? uniqueWordsList.filter((w) => w.toLowerCase().includes(q))
      : uniqueWordsList;
  }, [uniqueWordsList, uniqueWordsSearch]);

  const filteredUniquePhrases = useMemo(() => {
    const q = uniquePhrasesSearch.trim().toLowerCase();
    return q
      ? uniquePhrasesList.filter((p) => p.toLowerCase().includes(q))
      : uniquePhrasesList;
  }, [uniquePhrasesList, uniquePhrasesSearch]);

  const removeUniqueWord = (word: string) => {
    setUniqueWordsText(uniqueWordsList.filter((w) => w !== word).join(", "));
  };

  const removeUniquePhrase = (phrase: string) => {
    setUniquePhrasesText(
      uniquePhrasesList.filter((p) => p !== phrase).join(", ")
    );
  };

  const handleFormSubmit = form.handleSubmit((data) => {
    const dedupedWords = Array.from(new Set(uniqueWordsList));
    const dedupedPhrases = Array.from(new Set(uniquePhrasesList));
    form.setValue("unique_words", dedupedWords);
    form.setValue("unique_phrases", dedupedPhrases);

    onSubmit({
      ...data,
      unique_words: dedupedWords,
      unique_phrases: dedupedPhrases,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{updateDocumentFormData.labels.label}</FormLabel>
              <FormControl>
                <Input {...field} required className="border dark:border-white" />
              </FormControl>
              {errorMessage && (
                <FormMessage className="text-red-500 text-sm">
                  {updateDocumentFormData.messages.error}
                </FormMessage>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{updateDocumentFormData.labels.fileName}</FormLabel>
              <FormControl>
                <Input {...field} required className="border dark:border-white" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active_turns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{updateDocumentFormData.labels.activeTurns}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="border dark:border-white"
                  value={
                    Array.isArray(field.value)
                      ? field.value.join(", ")
                      : field.value ?? ""
                  }
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={updateDocumentFormData.placeholders.activeTurns}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem className="flex flex-col gap-2 items-start space-x-0 space-y-0 py-4">
          <FormLabel>{updateDocumentFormData.labels.uniqueKeywords}</FormLabel>
          <Input
            type="text"
            placeholder="Search unique words..."
            value={uniqueWordsSearch}
            onChange={(e) => setUniqueWordsSearch(e.target.value)}
            className="border dark:border-white"
          />
          <FormControl>
            <Textarea
              value={uniqueWordsText}
              onChange={(e) => setUniqueWordsText(e.target.value)}
              placeholder={updateDocumentFormData.placeholders.uniqueKeywords}
              className="!ml-0 border dark:border-white"
            />
          </FormControl>
          {uniqueWordsList.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pt-1 w-full">
              {filteredUniqueWords.map((w) => (
                <Button
                  key={w}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeUniqueWord(w)}
                >
                  {w} ✕
                </Button>
              ))}
              {filteredUniqueWords.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No matches for &quot;{uniqueWordsSearch}&quot;
                </span>
              )}
            </div>
          )}
        </FormItem>

        <FormItem className="flex flex-col gap-2 items-start space-x-0 space-y-0 py-4">
          <FormLabel>{updateDocumentFormData.labels.uniquePhrases}</FormLabel>
          <Input
            type="text"
            placeholder="Search unique phrases..."
            value={uniquePhrasesSearch}
            onChange={(e) => setUniquePhrasesSearch(e.target.value)}
            className="border dark:border-white"
          />
          <FormControl>
            <Textarea
              value={uniquePhrasesText}
              onChange={(e) => setUniquePhrasesText(e.target.value)}
              placeholder={updateDocumentFormData.placeholders.uniquePhrases}
              className="!ml-0 border dark:border-white"
            />
          </FormControl>
          {uniquePhrasesList.length > 0 && (
            <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pt-1 w-full">
              {filteredUniquePhrases.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeUniquePhrase(p)}
                >
                  {p} ✕
                </Button>
              ))}
              {filteredUniquePhrases.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  No matches for &quot;{uniquePhrasesSearch}&quot;
                </span>
              )}
            </div>
          )}
        </FormItem>

        <FormField
          control={form.control}
          name="check_on_all_turns"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
              <FormControl>
                <Checkbox
                  id="check_on_all_turns"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="border dark:border-white"
                />
              </FormControl>
              <FormLabel htmlFor="check_on_all_turns">
                {updateDocumentFormData.labels.checkOnAllTurns}
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button disabled={isSubmitting} className="w-full relative" type="submit">
          {isSubmitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {isSubmitting
            ? updateDocumentFormData.buttons.loading
            : submitButtonText || updateDocumentFormData.buttons.submit}
        </Button>
      </form>
    </Form>
  );
}