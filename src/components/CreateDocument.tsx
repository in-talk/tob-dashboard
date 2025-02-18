"use client";
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

export default function CreateDocument() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add Document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          This form is used create new document with lable and add keywords
        </DialogDescription>
        <CreateDocumentForm
          defaultValues={{
            label: "",
            keywords: [],
            active_turns: [],
            unique_words: [],
            file_name: "",
            check_on_all_turns: false,
          }}
          submitButtonText="Create"
        />
      </DialogContent>
    </Dialog>
  );
}
