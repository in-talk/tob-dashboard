"use client";

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
import { clearAllKeywordsAlertData } from "@/constants";

interface ClearAllKeywordsAlertProps {
  isAlertOpen: boolean;
  setAlertOpen: (value: boolean) => void;
  handleClearAllKeywords: () => void;
}

function ClearAllKeywordsAlert({
  isAlertOpen,
  setAlertOpen,
  handleClearAllKeywords,
}: ClearAllKeywordsAlertProps) {
  const clearAllInputRef = useRef<HTMLInputElement>(null);

  function clearAll(event: React.MouseEvent) {
    event.preventDefault();
    const input = clearAllInputRef.current?.value.trim();

    if (input?.toLowerCase() !== clearAllKeywordsAlertData.input.requiredText) {
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
          className="text-white bg-red-700 hover:bg-red-900 hover:text-white"
        >
          {clearAllKeywordsAlertData.triggerButton}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{clearAllKeywordsAlertData.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {clearAllKeywordsAlertData.description}
            <Input
              ref={clearAllInputRef}
              className="mt-2"
              placeholder={clearAllKeywordsAlertData.input.placeholder}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {clearAllKeywordsAlertData.actions.cancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={clearAll}>
            {clearAllKeywordsAlertData.actions.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ClearAllKeywordsAlert;