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
import { updateDocumentText } from "@/constants";

export default function UpdateDocument({
  document,
  collectionType,
}: {
  document: labels;
  collectionType: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDialogOpen, setDialogOpen] = useState(false);

  const onSubmit = useCallback(
    async (data: LabelsSchema) => {
      setIsSubmitting(true);
      try {
        const response = await fetch(
          `/api/dashboard?collectionType=${collectionType}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, id: document._id }),
          }
        );

        const responseData = await response.json();

        if (!response.ok || response.status === 409) {
          toast({
            variant: "destructive",
            description:
              responseData.message || updateDocumentText.toast.error,
          });
          setErrorMessage(responseData.message || updateDocumentText.toast.error);
          throw new Error(responseData.message || updateDocumentText.toast.error);
        }

        toast({
          variant: "success",
          description: updateDocumentText.toast.success,
        });
        setErrorMessage("");
        mutate(`/api/dashboard?collectionType=${collectionType}`);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "An unexpected error occurred"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [document._id, collectionType]
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-blue-500 bg-blue-100 hover:text-blue-700 hover:bg-blue-200"
        >
          <Pencil1Icon className="h-4 w-4 mr-1" />
          {updateDocumentText.dialog.trigger}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-sidebar">
        <DialogDescription>{updateDocumentText.dialog.description}</DialogDescription>
        <DialogHeader>
          <DialogTitle>{updateDocumentText.dialog.title}</DialogTitle>
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
          submitButtonText={updateDocumentText.submitButton.update}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
        />
      </DialogContent>
    </Dialog>
  );
}