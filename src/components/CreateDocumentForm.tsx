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
import { Separator } from "./ui/separator";
import ClearAllKeywordsAlert from "./ClearAllKeywordsAlert";
import { Checkbox } from "./ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { mutate } from "swr";

interface CreateDocumentFormProps {
  defaultValues: LabelsSchema;
  submitButtonText: string;
}

export default function CreateDocumentForm({
  defaultValues,
  submitButtonText,
}: CreateDocumentFormProps) {
  const form = useForm<LabelsSchema>({
    resolver: zodResolver(labelsSchema),
    defaultValues,
  });
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues.keywords ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);

  const keywordInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);

  const onSubmit = async (data: LabelsSchema) => {
    setIsSubmitting(true);
    try {
      console.log('data=>', data)
      const response = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          description: "Failed to create document.",
        });
        throw new Error(responseData.message || "Failed to create document");
      }
      toast({
        variant: "success",
        description: "Yeyyyy, Document created successfully.",
      });
      form.reset();
      mutate("/api/dashboard");
      setErrorMessage("");
      setDialogOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleChangeUniqueWords = (e: any) => {
    const newValue = e.target.value;
    
    // Convert to array, trim whitespace, and filter empty values
    const newArray = newValue
      .split(',')
      .map((item: any) => item.trim())
      .filter((item: any) => item !== '');
      
      form.setValue("unique_words", [...newArray]);
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

  const isFormValid =
    form.watch("label")?.trim() && form.watch("file_name")?.trim();

  const filteredKeywords = keywords.filter((keyword) =>
    keyword.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearAllKeywords = async () => {
    setKeywords([]);
    form.setValue("keywords", []);
    setAlertOpen(false);
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
                <Input {...field} required />
              </FormControl>
              {errorMessage && (
                <FormMessage className="text-red-500 text-sm">
                  {errorMessage}
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
              <FormLabel>File name</FormLabel>
              <FormControl>
                <Input {...field} required />
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
              <FormLabel>Active Turns (comma-separated)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={
                    Array.isArray(field.value)
                      ? field.value.join(", ")
                      : field.value ?? ""
                  }
                  onChange={(e) => field.onChange(e.target.value)} // Store as string
                  placeholder="Enter numbers separated by commas, e.g., 1, 2, 3"
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
            <FormItem className="flex flex-row items-start space-x-3 space-y-0  py-4 ">
              <FormControl>
                <Checkbox
                  id="terms"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel htmlFor="terms">Check on all turns :</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unique_words"
          render={({ field }) => (
            <FormItem className="flex flex-col gap-3 items-start space-x-3 space-y-0  py-4 ">
              <FormLabel>Unique Keywords</FormLabel>
              <FormControl>
              <Textarea
                  {...field}
                  // value={field.value}
                  value={
                    Array.isArray(field.value)
                      ? field.value.join(", ")
                      : field.value ?? ""
                  }
                  onChange={handleChangeUniqueWords} // Store as string
                  placeholder="Enter unique words separated by commas, e.g., 1, 2, 3"
                  className="-m-0 w-full"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isFormValid}>Add Keywords</Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px] md:max-w-[825px] bg-white"
            aria-describedby=""
          >
            <DialogHeader>
              <DialogTitle>Add Keywords</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-[10px] mt-[10px]">
              <div className=" flex flex-col  gap-[10px] border-r-slate-100">
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
                    rows={3}
                  />
                </FormControl>
                <Button
                  variant="outline"
                  type="button"
                  onClick={addBulkKeywords}
                >
                  Add Bulk Keywords
                </Button>
              </div>
              <Separator />
              <div
                className="flex justify-between flex-col "
                style={{ gap: "10px", flexWrap: "wrap" }}
              >
                <div
                  className="flex mt-2"
                  style={{ gap: "20px", flexWrap: "wrap" }}
                >
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="overflow-y-auto h-[200px]">
                    {filteredKeywords.map((keyword, index) => (
                      <Button
                        variant={"outline"}
                        key={index}
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} ✕
                      </Button>
                    ))}
                  </div>
                </div>
                <ClearAllKeywordsAlert
                  isAlertOpen={isAlertOpen}
                  setAlertOpen={setAlertOpen}
                  handleClearAllKeywords={handleClearAllKeywords}
                />
              </div>
            </div>

            <DialogClose asChild>
              <Button onClick={() => setDialogOpen(false)} variant="secondary">
                Save
              </Button>
            </DialogClose>
          </DialogContent>
        </Dialog>

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
