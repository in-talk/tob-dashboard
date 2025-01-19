import React, { useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ClearAllKeywordsAlertProps {
  isAlertOpen: boolean;
  setAlertOpen: (value: boolean) => void;
  handleClearAllKeywords: () => Promise<void>;
}

function ClearAllKeywordsAlert({
  isAlertOpen,
  setAlertOpen,
  handleClearAllKeywords,
}: ClearAllKeywordsAlertProps) {
  const clearAllInputRef = useRef<HTMLInputElement>(null); // Ref to access the input field

  function clearAll(event: React.MouseEvent) {
    event.preventDefault();
    const input = clearAllInputRef.current?.value.trim();

    if (input && input.toLowerCase() !== "delete all") {
      setAlertOpen(false);
      return;
    }
    handleClearAllKeywords();
  }

  return (
    <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-white bg-red-700  hover:bg-red-900 hover:text-white"
        >
          Delete All
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            document from database.
            <Input
              ref={clearAllInputRef}
              className="mt-2"
              placeholder='Type " Delete all" to delete all keywords '
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => clearAll(e)}>
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ClearAllKeywordsAlert;
