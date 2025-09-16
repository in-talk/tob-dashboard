"use client";

import { useState, useRef, useCallback, memo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mutate } from "swr";

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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

import ClearAllKeywordsAlert from "./ClearAllKeywordsAlert";
import { LabelsSchema, labelsSchema } from "@/lib/zod";
import { useKeywords } from "@/hooks/use-keywords";
import { createDocumentFormData } from "@/constants";

interface CreateDocumentFormProps {
  defaultValues: LabelsSchema;
  submitButtonText: string;
  collectionType: string;
}

const CreateDocumentForm = memo(
  ({ defaultValues, submitButtonText, collectionType }: CreateDocumentFormProps) => {
    const form = useForm<LabelsSchema>({
      resolver: zodResolver(labelsSchema),
      defaultValues,
    });
    const {
      keywords,
      keywordInputRef,
      bulkInputRef,
      addKeyword,
      addBulkKeywords,
      removeKeyword,
      clearKeywords,
    } = useKeywords({
      form,
      initialKeywords: defaultValues.keywords,
      onClear: () => setAlertOpen(false),
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setDialogOpen] = useState(false);

    const uniqueWordsRef = useRef<HTMLTextAreaElement>(null);

    const getUniqueWords = useCallback((): string[] | undefined => {
      const input = uniqueWordsRef.current?.value.trim();
      if (!input) return;
      const newWords = input.split(/[\n,]+/).map((word) => word.trim());
      if (newWords.length > 0) {
        uniqueWordsRef.current!.value = "";
        return newWords;
      }
    }, []);

    const onSubmit = async (data: LabelsSchema) => {
      setIsSubmitting(true);
      try {
        const uniqueWords = getUniqueWords();

      const response = await fetch(
        `/api/dashboard?collectionType=${collectionType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            unique_words: uniqueWords,
            collectionType: collectionType,
          }),
        }
      );

        const responseData = await response.json();
        if (!response.ok)
          throw new Error(
            responseData.message || createDocumentFormData.messages.error.default
          );

        toast({
          variant: "success",
          description: createDocumentFormData.messages.success,
        });
        form.reset();
        mutate(`/api/dashboard?collectionType=${collectionType}`);
        setDialogOpen(false);
      } catch (error) {
        toast({
          variant: "destructive",
          description:
            error instanceof Error
              ? error.message
              : createDocumentFormData.messages.error.unexpected,
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    const isFormValid = Boolean(
      form.watch("label")?.trim() && form.watch("file_name")?.trim()
    );
    const filteredKeywords = keywords.filter((k) =>
      k.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{createDocumentFormData.form.label.label}</FormLabel>
                <FormControl>
                  <Input {...field} required className="border dark:border-white" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="file_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{createDocumentFormData.form.fileName.label}</FormLabel>
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
                <FormLabel>{createDocumentFormData.form.activeTurns.label}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={Array.isArray(field.value) ? field.value.join(", ") : field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={createDocumentFormData.form.activeTurns.placeholder}
                    className="border dark:border-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="check_on_all_turns"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3 py-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>{createDocumentFormData.form.checkOnAllTurns.label}</FormLabel>
              </FormItem>
            )}
          />

          <FormLabel>{createDocumentFormData.form.uniqueKeywords.label}</FormLabel>
          <FormControl>
            <Textarea
              ref={uniqueWordsRef}
              placeholder={createDocumentFormData.form.uniqueKeywords.placeholder}
              rows={3}
              className="border dark:border-white"
            />
          </FormControl>

          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isFormValid}>
                {createDocumentFormData.keywordsDialog.trigger}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-[825px] bg-white dark:bg-sidebar">
              <DialogHeader>
                <DialogTitle>{createDocumentFormData.keywordsDialog.title}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 mt-2">
                <FormLabel>{createDocumentFormData.keywordsDialog.singleInput.label}</FormLabel>
                <Input
                  ref={keywordInputRef}
                  type="text"
                  placeholder={createDocumentFormData.keywordsDialog.singleInput.placeholder}
                  onKeyDown={addKeyword}
                  className="border dark:border-white"
                />

                <FormLabel>{createDocumentFormData.keywordsDialog.bulkInput.label}</FormLabel>
                <Textarea
                  ref={bulkInputRef}
                  placeholder={createDocumentFormData.keywordsDialog.bulkInput.placeholder}
                  rows={3}
                  className="border dark:border-white"
                />
                <Button variant="outline" type="button" onClick={addBulkKeywords}>
                  {createDocumentFormData.keywordsDialog.bulkInput.button}
                </Button>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Input
                    type="text"
                    placeholder={createDocumentFormData.keywordsDialog.search.placeholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border dark:border-white"
                  />
                  <div className="overflow-y-auto h-[200px] flex flex-wrap gap-2">
                    {filteredKeywords.map((k) => (
                      <Button key={k} variant="outline" onClick={() => removeKeyword(k)}>
                        {k} ✕
                      </Button>
                    ))}
                  </div>
                  <ClearAllKeywordsAlert
                    isAlertOpen={isAlertOpen}
                    setAlertOpen={setAlertOpen}
                    handleClearAllKeywords={clearKeywords}
                  />
                </div>
              </div>

              <DialogClose asChild>
                <Button onClick={() => setDialogOpen(false)} variant="secondary">
                  {createDocumentFormData.keywordsDialog.saveButton}
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>

          <Button disabled={isSubmitting} className="w-full relative" type="submit">
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/50 rounded-md">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {isSubmitting
              ? createDocumentFormData.button.saving
              : submitButtonText || createDocumentFormData.button.submit}
          </Button>
        </form>
      </Form>
    );
  }
);

CreateDocumentForm.displayName = "CreateDocumentForm";
export default CreateDocumentForm;