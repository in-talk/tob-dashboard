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
import { useRef, useState } from "react";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface DocumentFormProps {
  defaultValues: LabelsSchema;
  onSubmit: (data: LabelsSchema) => Promise<void>;
  submitButtonText: string;
  isSubmitting: boolean;
  keywordsButtonText: string;
}

export default function DocumentForm({
  defaultValues,
  onSubmit,
  submitButtonText,
  isSubmitting,
  keywordsButtonText,
}: DocumentFormProps) {
  const form = useForm<LabelsSchema>({
    resolver: zodResolver(labelsSchema),
    defaultValues,
  });
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues.keywords ?? []
  ); // State for keywords
  const [isDialogOpen, setDialogOpen] = useState(false);
  const keywordInputRef = useRef<HTMLInputElement>(null); // Ref to access the input field
  const bulkInputRef = useRef<HTMLTextAreaElement>(null); // Ref for bulk input

  // const addKeyword = (event: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (event.key === "Enter") {
  //     event.preventDefault(); // Prevent default Enter behavior

  //     const input = keywordInputRef.current?.value.trim(); // Get and trim the input value
  //     if (input) {
  //       // Split the input into an array of keywords by commas
  //       const newKeywords = input
  //         .split(",")
  //         .map((keyword) => keyword.trim()) // Trim each keyword
  //         .filter((keyword) => keyword.length > 0); // Remove empty keywords

  //       if (newKeywords.length > 0) {
  //         setKeywords((prev) => [...prev, ...newKeywords]); // Add new keywords to state

  //         const currentKeywords = form.getValues("keywords") || []; // Get current keywords
  //         form.setValue("keywords", [...currentKeywords, ...newKeywords]); // Update form state

  //         if (keywordInputRef.current) {
  //           keywordInputRef.current.value = ""; // Clear input field
  //         }
  //       }
  //     }
  //   }
  // };

  // Single Keyword Input
  const addKeyword = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent default Enter behavior
      const input = keywordInputRef.current?.value.trim();
      if (input) {
        // Add a single keyword
        if (!keywords.includes(input)) {
          setKeywords((prev) => [...prev, input]);
          const currentKeywords = form.getValues("keywords") || [];
          form.setValue("keywords", [...currentKeywords, input]);
        }
        keywordInputRef.current!.value = "";
      }
    }
  };

  const addBulkKeywords = () => {
    const input = bulkInputRef.current?.value.trim();
    if (input) {
      // Split input by commas or new lines
      const newKeywords = input
        .split(/[\n,]+/)
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length > 0 && !keywords.includes(keyword)); // Remove duplicates
      if (newKeywords.length > 0) {
        setKeywords((prev) => [...prev, ...newKeywords]); // Update state
        const currentKeywords = form.getValues("keywords") || [];
        form.setValue("keywords", [...currentKeywords, ...newKeywords]);
      }
      bulkInputRef.current!.value = "";
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

        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>{keywordsButtonText}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px] bg-white">
            <DialogHeader>
              <DialogTitle>Add Keywords</DialogTitle>
            </DialogHeader>
            <FormLabel>Single Keyword Input</FormLabel>

            <input
              ref={keywordInputRef}
              type="text"
              placeholder="Add keywords press Enter"
              onKeyDown={addKeyword}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />

            <FormLabel>Bulk Keyword Input</FormLabel>
            <FormControl>
              <Textarea
                ref={bulkInputRef}
                placeholder="Add multiple keywords (comma-separated or one per line)"
                rows={8}
              />
            </FormControl>
            <Button variant="outline" type="button" onClick={addBulkKeywords}>
              Add Bulk Keywords
            </Button>
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
            <div>
              <Button onClick={() => setKeywords([])}>clear all</Button>
            </div>
            <DialogClose asChild>
              <Button onClick={() => setDialogOpen(false)} variant="secondary">
                Save
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

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
