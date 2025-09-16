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
import { useRef, useState } from "react";

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

  const [uniqueWords, setUniqueWords] = useState<string[]>(
    defaultValues.unique_words ?? []
  );

  const uniqueWordsRefs = useRef<HTMLTextAreaElement>(null);

  const handleFormSubmit = form.handleSubmit((data) => {
    const input = uniqueWordsRefs.current?.value.trim();
    if (input) {
      const newWords = input.split(/[\n,]+/).map((word) => word.trim());
      const updatedWords = Array.from(new Set([...uniqueWords, ...newWords]));
      setUniqueWords(updatedWords);
      form.setValue("unique_words", updatedWords);
    }

    onSubmit({ ...data, unique_words: uniqueWords });
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

        <FormItem className="flex flex-col gap-3 items-start space-x-3 space-y-0 py-4">
          <FormLabel>{updateDocumentFormData.labels.uniqueKeywords}</FormLabel>
          <FormControl>
            <Textarea
              ref={uniqueWordsRefs}
              value={uniqueWords.join(", ")}
              onChange={(e) =>
                setUniqueWords(
                  e.target.value.split(/[\n,]+/).map((w) => w.trim())
                )
              }
              placeholder={updateDocumentFormData.placeholders.uniqueKeywords}
              className="!ml-0 border dark:border-white"
            />
          </FormControl>
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