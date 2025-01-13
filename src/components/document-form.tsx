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

import { type DocumentSchema, documentSchema } from "@/lib/zod";
import { useRef, useState } from "react";

interface DocumentFormProps {
  defaultValues: DocumentSchema;
  onSubmit: (data: DocumentSchema) => Promise<void>;
  submitButtonText: string;
  isSubmitting: boolean;
}

export default function DocumentForm({
  defaultValues,
  onSubmit,
  submitButtonText,
  isSubmitting,
}: DocumentFormProps) {
  const form = useForm<DocumentSchema>({
    resolver: zodResolver(documentSchema),
    defaultValues,
  });
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues.keywords ?? []
  ); // State for keywords
  const keywordInputRef = useRef<HTMLInputElement>(null); // Ref to access the input field

  const addKeyword = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default Enter behavior

      const input = keywordInputRef.current?.value.trim(); // Get and trim the input value
      if (input) {
        // Split the input into an array of keywords by commas
        const newKeywords = input
          .split(",")
          .map((keyword) => keyword.trim()) // Trim each keyword
          .filter((keyword) => keyword.length > 0); // Remove empty keywords

        if (newKeywords.length > 0) {
          setKeywords((prev) => [...prev, ...newKeywords]); // Add new keywords to state

          const currentKeywords = form.getValues("keywords") || []; // Get current keywords
          form.setValue("keywords", [...currentKeywords, ...newKeywords]); // Update form state

          if (keywordInputRef.current) {
            keywordInputRef.current.value = ""; // Clear input field
          }
        }
      }
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    const currentKeywords = form.getValues("keywords") || [];
    setKeywords((prev) =>
      prev.filter((keyword) => keyword !== keywordToRemove)
    );

    form.setValue(
      "keywords",
      currentKeywords.filter((keyword) => keyword !== keywordToRemove)
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Keywords Input */}
        <FormItem>
          <FormLabel>Keywords</FormLabel>
          <FormControl>
            <input
              ref={keywordInputRef}
              type="text"
              placeholder="Add keywords press Enter"
              onKeyDown={addKeyword}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </FormControl>
          <div className="flex mt-2" style={{ gap: "5px", flexWrap: "wrap" }}>
            {keywords.map((keyword, index) => (
              <Button
                variant={"outline"}
                key={index}
                onClick={() => removeKeyword(keyword)}
              >
                {keyword} ✕
              </Button>
            ))}
          </div>
          <FormMessage />
        </FormItem>

        <FormField
          control={form.control}
          name="file_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          disabled={isSubmitting}
          className="w-full relative"
          type="submit"
        >
          {isSubmitting && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {submitButtonText}
        </Button>
      </form>
    </Form>
  );
}
