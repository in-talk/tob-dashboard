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
