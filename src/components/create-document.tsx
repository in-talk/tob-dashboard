"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { documentSchema, type DocumentSchema } from "@/lib/zod";
import { useState } from "react";

import { mutate } from "swr";
import DocumentForm from "./document-form";
import { toast } from "@/hooks/use-toast";

export default function CreateDocument() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);

  const form = useForm<DocumentSchema>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      label: "",
      keywords: [], // Default to an empty array
      active_turns: [], // Default to an empty array
      file_name: "",
      check_on_all_turns: false, // Default boolean value
    },
  });

  const onSubmit = async (data: DocumentSchema) => {
    setIsSubmitting(true);
    try {
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
        description: "Yeyyyy, Document created successfully.",
      });
      form.reset();
      setDialogOpen(false);
      mutate("/api/dashboard");
      setErrorMessage("");
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        variant: "destructive",
        description: "Error creating document.",
      });
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
        </DialogHeader>
        {errorMessage && (
          <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
        )}
        <DocumentForm
          defaultValues={{
            label: "",
            keywords: [], // Default to an empty array
            active_turns: [], // Default to an empty array
            file_name: "",
            check_on_all_turns: false, // Default boolean value
          }}
          onSubmit={onSubmit}
          submitButtonText="Create"
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
