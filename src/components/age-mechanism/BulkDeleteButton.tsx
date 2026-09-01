"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import CustomLoader from "@/components/ui/CustomLoader";

const CONFIRM_WORD = "delete";

type BulkDeleteButtonProps = {
  /** Number of currently selected rows. */
  count: number;
  /** Plural noun for the entities, e.g. "weird cases". */
  itemNoun: string;
  /** Performs the actual deletion. Should throw on failure. */
  onConfirm: () => Promise<void>;
};

/**
 * Destructive "Delete Selected (N)" action that requires the user to type the
 * word "delete" before the confirm button becomes enabled.
 */
export default function BulkDeleteButton({
  count,
  itemNoun,
  onConfirm,
}: BulkDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const matched = confirmText.trim().toLowerCase() === CONFIRM_WORD;

  const handleOpenChange = (next: boolean) => {
    if (deleting) return; // don't allow closing mid-delete
    setOpen(next);
    if (!next) setConfirmText("");
  };

  const handleConfirm = async () => {
    if (!matched || deleting) return;
    setDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
      setConfirmText("");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          className="text-white bg-red-700 hover:bg-red-900 hover:text-white shrink-0"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} {itemNoun}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {count} selected {itemNoun}. This
            action cannot be undone. Type{" "}
            <span className="font-semibold text-foreground">delete</span> below
            to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          autoFocus
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matched) {
              e.preventDefault();
              handleConfirm();
            }
          }}
          placeholder='Type "delete" to confirm'
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matched || deleting}
            onClick={(e) => {
              e.preventDefault(); // keep dialog open until the async work settles
              handleConfirm();
            }}
            className="bg-red-700 hover:bg-red-900 disabled:opacity-50"
          >
            {deleting ? (
              <>
                <span className="mr-3">Deleting...</span>
                <CustomLoader />
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
