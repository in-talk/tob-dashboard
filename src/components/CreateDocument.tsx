"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateDocumentForm from "./CreateDocumentForm";
import { createDocumentData } from "@/constants";

interface CreateDocumentProps {
  collectionType: string;
}

const CreateDocument = memo(({ collectionType }: CreateDocumentProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">{createDocumentData.triggerButton}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-sidebar">
        <DialogHeader>
          <DialogTitle>{createDocumentData.dialog.title}</DialogTitle>
          <DialogDescription>
            {createDocumentData.dialog.description}
          </DialogDescription>
        </DialogHeader>

        <CreateDocumentForm
          collectionType={collectionType}
          defaultValues={{
            label: "",
            keywords: [],
            active_turns: [],
            unique_words: [],
            file_name: "",
            check_on_all_turns: false,
          }}
          submitButtonText={createDocumentData.form.submitButton}
        />
      </DialogContent>
    </Dialog>
  );
});

CreateDocument.displayName = "CreateDocument";

export default CreateDocument;