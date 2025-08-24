"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { TrashIcon } from "@radix-ui/react-icons";
import { mutate } from "swr";
import {
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import { deleteDocumentData } from "@/constants";

interface DeleteDocumentProps {
  id: string;
  collectionType: string;
}

export default function DeleteDocument({
  id,
  collectionType,
}: DeleteDocumentProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `/api/dashboard?id=${id}&collectionType=${collectionType}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast({
          variant: "success",
          description: deleteDocumentData.toast.success.description,
        });
        mutate(`/api/dashboard?&collectionType=${collectionType}`);
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: deleteDocumentData.toast.error.title,
          description:
            errorData.message || deleteDocumentData.toast.error.unexpected,
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: deleteDocumentData.toast.error.title,
        description: deleteDocumentData.toast.error.server,
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-white bg-red-700 hover:bg-red-900 hover:text-white"
        >
          <TrashIcon className="h-4 w-4 mr-1" />{" "}
          {deleteDocumentData.button.delete}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{deleteDocumentData.dialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteDocumentData.dialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {deleteDocumentData.dialog.cancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>
            {deleteDocumentData.dialog.confirmDelete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
