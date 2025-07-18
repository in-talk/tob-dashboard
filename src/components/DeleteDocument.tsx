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

export default function DeleteDocument({
  id,
  collectionType,
}: {
  id: string;
  collectionType: string;
}) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/dashboard?id=${id}&collectionTye=${collectionType}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          variant: "success",
          description: "Document deleted successfully.",
        });
        mutate(`/api/dashboard?&collectionTye=${collectionType}`);
      } else {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: errorData.message || "An unexpected error occurred.",
        });
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Unable to connect to the server.",
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-white bg-red-700  hover:bg-red-900 hover:text-white"
        >
          <TrashIcon className="h-4 w-4 mr-1" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            document from database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
