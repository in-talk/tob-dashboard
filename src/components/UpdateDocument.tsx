"use client";

import { useState } from "react";
import { mutate } from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { labels } from "@prisma/client";
import { Pencil1Icon } from "@radix-ui/react-icons";
import DocumentForm from "./DocumentForm";
import { toast } from "@/hooks/use-toast";
import { LabelsSchema } from "@/lib/zod";

export default function UpdateDocument({ document }: { document: labels }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);

  const onSubmit = async (data: LabelsSchema) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: document.id }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          description: responseData.message || "Failed to update document",
        });
      }
      toast({
        description: "Document updated successfully.",
      });
      setErrorMessage("");
      setDialogOpen(false);
      mutate("/api/dashboard");
    } catch (error) {
      console.error("Error updating document:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        description: errorMessage,
      });
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-blue-500 bg-blue-100 hover:text-blue-700 hover:bg-blue-200"
        >
          <Pencil1Icon className="h-4 w-4 mr-1" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Update Document</DialogTitle>
        </DialogHeader>
        {errorMessage && (
          <div className="text-red-500 text-sm mb-4">{errorMessage}</div>
        )}
        <DocumentForm
          defaultValues={{
            label: document.label,
            keywords: document.keywords,
            active_turns: [],
            file_name: document.file_name,
            check_on_all_turns: document.check_on_all_turns,
          }}
          onSubmit={onSubmit}
          submitButtonText="Update"
          keywordsButtonText="Update keywords"
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
