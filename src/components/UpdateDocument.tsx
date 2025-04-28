"use client";

import { useCallback, useState } from "react";
import { mutate } from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Pencil1Icon } from "@radix-ui/react-icons";
import { toast } from "@/hooks/use-toast";
import { LabelsSchema } from "@/lib/zod";
import UpdateDocumentForm from "./UpdateDocumentForm";
import { labels } from "@/types/lables";

export default function UpdateDocument({ document }: { document: labels }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);
  const onSubmit = useCallback(
    async (data: LabelsSchema) => {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/dashboard", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, id: document._id }),
        });

        const responseData = await response.json();

        if (!response.ok) {
          toast({
            variant: "destructive",
            description: responseData.message || "Failed to update document",
          });
          throw new Error(responseData.message || "Failed to create document");
        }
        if (response.status === 409) {
          toast({
            variant: "destructive",
            description: responseData.message || "Failed to update document",
          });
          setErrorMessage(responseData.message);
          throw new Error(responseData.message);
        }
        toast({
          description: "Document updated successfully.",
        });
        setErrorMessage("");
        mutate("/api/dashboard");
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        setErrorMessage(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [document._id]
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-blue-500 bg-blue-100 hover:text-blue-700 hover:bg-blue-200"
        >
          <Pencil1Icon className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogDescription> Update document form</DialogDescription>
        <DialogHeader>
          <DialogTitle>Update Document</DialogTitle>
        </DialogHeader>
        <UpdateDocumentForm
          defaultValues={{
            label: document.label,
            keywords: document.keywords,
            active_turns: document.active_turns,
            unique_words: document.unique_words,
            file_name: document.file_name,
            check_on_all_turns: document.check_on_all_turns,
          }}
          onSubmit={onSubmit}
          submitButtonText="Update"
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      </DialogContent>
    </Dialog>
  );
}
